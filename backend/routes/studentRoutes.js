const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');

const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { requireStudent, requireOwnershipOrAdmin } = require('../middlewares/roleMiddleware');
const { validateRequestBody, validateParams, validateQuery, schemas } = require('../middlewares/validationMiddleware');
const { asyncHandler } = require('../middlewares/errorHandler');
const { AppError, NotFoundError, AuthorizationError } = require('../utils/errors');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// ============================================
// AI SERVICE HELPER FUNCTIONS
// ============================================

/**
 * Call AI service to predict readiness score
 */
async function predictReadinessScore(params) {
  const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const url = `${baseUrl}/predict-readiness-v2`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), parseInt(process.env.AI_SERVICE_TIMEOUT_MS) || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_SECRET}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError(
        `AI service error: ${response.status}`,
        response.status >= 500 ? 503 : 400,
        'AI_SERVICE_ERROR'
      );
    }

    const data = await response.json();

    // v2 response shape: { score, confidence, breakdown, trend }
    const score = Number(data?.score);
    const confidence = Number(data?.confidence ?? NaN);
    const breakdown = data?.breakdown ?? null;
    const trend = data?.trend ?? null;

    if (!Number.isFinite(score) || score < 0 || score > 100) {
      throw new AppError('Invalid readiness score from AI service', 500, 'AI_SERVICE_ERROR');
    }

    return { score, confidence, breakdown, trend };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new AppError('AI service request timeout', 503, 'AI_SERVICE_TIMEOUT');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Call AI service to analyze resume
 */
async function analyzeResume(resumeContent) {
  const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const url = `${baseUrl}/analyze-resume-v2`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), parseInt(process.env.AI_SERVICE_TIMEOUT_MS) || 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_SERVICE_SECRET}`,
      },
      body: JSON.stringify({ resume: resumeContent }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AppError('Resume analysis failed', 503, 'AI_SERVICE_ERROR');
    }

    // v2 returns { totalScore, sectionScores, strengths, improvements, suggestions }
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================
// STUDENT PROFILE ENDPOINTS
// ============================================

/**
 * GET /students/profile
 * Get current student's profile
 */
router.get(
  '/profile',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id })
      .populate('user', 'email firstName lastName');

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    res.status(200).json({
      status: 'success',
      data: profile,
      traceId: req.traceId,
    });
  })
);

/**
 * GET /students/:userId/profile
 * Get specific student's profile (admin or self)
 */
router.get(
  '/:userId/profile',
  requireOwnershipOrAdmin((req) => req.params.userId),
  asyncHandler(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      throw new AppError('Invalid user ID format', 400, 'INVALID_ID');
    }

    const profile = await StudentProfile.findOne({ user: req.params.userId })
      .populate('user', 'email firstName lastName');

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    res.status(200).json({
      status: 'success',
      data: profile,
      traceId: req.traceId,
    });
  })
);

/**
 * PATCH /students/profile
 * Update student profile
 */
router.patch(
  '/profile',
  validateRequestBody(schemas.studentProfileUpdateSchema),
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    // Update academic info
    if (req.validatedBody.department !== undefined) {
      profile.academicInfo.department = req.validatedBody.department;
    }
    if (req.validatedBody.graduationYear !== undefined) {
      profile.academicInfo.graduationYear = req.validatedBody.graduationYear;
    }
    if (req.validatedBody.gpa !== undefined) {
      profile.academicInfo.gpa = req.validatedBody.gpa;
    }

    // Update placement readiness
    if (req.validatedBody.targetCTC !== undefined) {
      profile.placementReadiness.targetCTC = req.validatedBody.targetCTC;
    }
    if (req.validatedBody.preferredRoles) {
      profile.placementReadiness.preferredRoles = req.validatedBody.preferredRoles;
    }
    if (req.validatedBody.preferredLocations) {
      profile.placementReadiness.preferredLocations = req.validatedBody.preferredLocations;
    }

    await profile.save();

    res.status(200).json({
      status: 'success',
      data: profile,
      message: 'Profile updated successfully',
      traceId: req.traceId,
    });
  })
);

// ============================================
// SKILL MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /students/skills
 * Get all student skills
 */
router.get(
  '/skills',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    res.status(200).json({
      status: 'success',
      data: {
        technical: profile.skillInventory.technical,
        soft: profile.skillInventory.soft,
      },
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/skills
 * Add a technical skill
 */
router.post(
  '/skills',
  validateRequestBody(schemas.addSkillSchema),
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const skill = {
      skillName: req.validatedBody.skillName,
      proficiencyLevel: req.validatedBody.proficiencyLevel,
      yearsOfExperience: req.validatedBody.yearsOfExperience || 0,
      endorsements: 0,
      endorsedBy: [],
      verificationStatus: 'unverified',
      certifications: req.validatedBody.certifications || [],
    };

    profile.skillInventory.technical.push(skill);
    await profile.save();

    res.status(201).json({
      status: 'success',
      data: skill,
      message: 'Skill added successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * DELETE /students/skills/:skillId
 * Remove a skill
 */
router.delete(
  '/skills/:skillId',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const skillIndex = profile.skillInventory.technical.findIndex(
      (s) => s._id.toString() === req.params.skillId
    );

    if (skillIndex === -1) {
      throw new NotFoundError('Skill');
    }

    profile.skillInventory.technical.splice(skillIndex, 1);
    await profile.save();

    res.status(200).json({
      status: 'success',
      message: 'Skill removed successfully',
      traceId: req.traceId,
    });
  })
);

// ============================================
// RESUME MANAGEMENT ENDPOINTS
// ============================================

/**
 * GET /students/resumes
 * Get all student resumes
 */
router.get(
  '/resumes',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    res.status(200).json({
      status: 'success',
      data: profile.resumes.map((r) => ({
        id: r._id,
        title: r.title,
        version: r.version,
        uploadedAt: r.uploadedAt,
        isDefault: r.isDefault,
      })),
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/resumes
 * Upload or create a new resume
 */
router.post(
  '/resumes',
  asyncHandler(async (req, res, next) => {
    const { title, sections } = req.body;

    if (!title || !sections) {
      throw new AppError('Title and sections are required', 400, 'VALIDATION_ERROR');
    }

    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const resume = {
      _id: new mongoose.Types.ObjectId(),
      title,
      version: profile.resumes.length + 1,
      uploadedAt: new Date(),
      isDefault: profile.resumes.length === 0,
      sections,
    };

    profile.resumes.push(resume);
    await profile.save();

    // Try to analyze with AI
    try {
      const analysis = await analyzeResume(sections);
      const resumeDoc = profile.resumes.find((r) => r._id.toString() === resume._id.toString());
      if (resumeDoc) {
        resumeDoc.aiAnalysis = {
          ...analysis,
          analyzedAt: new Date(),
        };
        await profile.save();
      }
    } catch (error) {
      console.warn('Resume analysis failed:', error.message);
    }

    res.status(201).json({
      status: 'success',
      data: resume,
      message: 'Resume created successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * DELETE /students/resumes/:resumeId
 * Delete a resume
 */
router.delete(
  '/resumes/:resumeId',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const resumeIndex = profile.resumes.findIndex(
      (r) => r._id.toString() === req.params.resumeId
    );

    if (resumeIndex === -1) {
      throw new NotFoundError('Resume');
    }

    profile.resumes.splice(resumeIndex, 1);
    await profile.save();

    res.status(200).json({
      status: 'success',
      message: 'Resume deleted successfully',
      traceId: req.traceId,
    });
  })
);

// ============================================
// MOCK INTERVIEW ENDPOINTS
// ============================================

/**
 * GET /students/mock-interviews
 * Get all mock interviews
 */
router.get(
  '/mock-interviews',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    res.status(200).json({
      status: 'success',
      data: profile.mockInterviews,
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/mock-interviews
 * Create a new mock interview session
 */
router.post(
  '/mock-interviews',
  asyncHandler(async (req, res, next) => {
    const { title, type, difficulty, questions } = req.body;

    if (!title || !type || !difficulty) {
      throw new AppError('Title, type, and difficulty are required', 400, 'VALIDATION_ERROR');
    }

    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const interview = {
      _id: new mongoose.Types.ObjectId(),
      title,
      type,
      difficulty,
      status: 'scheduled',
      scheduledAt: new Date(),
      questions: questions || [],
      responses: [],
      feedback: {},
    };

    profile.mockInterviews.push(interview);
    await profile.save();

    res.status(201).json({
      status: 'success',
      data: interview,
      message: 'Mock interview created successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/mock-interviews/:interviewId/start
 * Start a mock interview
 */
router.post(
  '/mock-interviews/:interviewId/start',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const interview = profile.mockInterviews.find(
      (i) => i._id.toString() === req.params.interviewId
    );

    if (!interview) {
      throw new NotFoundError('Mock interview');
    }

    interview.status = 'in-progress';
    interview.startedAt = new Date();
    await profile.save();

    res.status(200).json({
      status: 'success',
      data: interview,
      message: 'Mock interview started',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/mock-interviews/:interviewId/submit
 * Submit mock interview responses
 */
router.post(
  '/mock-interviews/:interviewId/submit',
  asyncHandler(async (req, res, next) => {
    const { responses } = req.body;

    if (!Array.isArray(responses)) {
      throw new AppError('Responses must be an array', 400, 'VALIDATION_ERROR');
    }

    const profile = await StudentProfile.findOne({ user: req.user.id });

    if (!profile) {
      throw new NotFoundError('Student profile');
    }

    const interview = profile.mockInterviews.find(
      (i) => i._id.toString() === req.params.interviewId
    );

    if (!interview) {
      throw new NotFoundError('Mock interview');
    }

    interview.responses = responses;
    interview.status = 'completed';
    interview.completedAt = new Date();
    interview.duration = Math.round((interview.completedAt - interview.startedAt) / 1000);

    await profile.save();

    res.status(200).json({
      status: 'success',
      data: interview,
      message: 'Mock interview submitted successfully',
      traceId: req.traceId,
    });
  })
);

module.exports = router;

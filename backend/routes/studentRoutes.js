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

// ============================================
// AI FEEDBACK FOR INTERVIEWS
// ============================================

/**
 * POST /students/mock-interviews/:interviewId/ai-feedback
 * Get AI feedback for a completed interview
 */
router.post(
  '/mock-interviews/:interviewId/ai-feedback',
  asyncHandler(async (req, res, next) => {
    const { type, questions, responses, timeTaken } = req.body;

    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    const interview = profile.mockInterviews.find(
      (i) => i._id.toString() === req.params.interviewId
    );
    if (!interview) throw new NotFoundError('Mock interview');

    const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let feedback;
    try {
      const aiResponse = await fetch(`${baseUrl}/interview-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_SERVICE_SECRET}`,
        },
        body: JSON.stringify({
          interview_type: type || interview.type,
          questions: questions || interview.questions.map((q) => q.questionText),
          responses: responses || interview.responses.map((r) => r.response),
          time_taken: timeTaken || [],
        }),
        signal: controller.signal,
      });

      if (!aiResponse.ok) throw new Error('AI service error');
      const aiData = await aiResponse.json();

      feedback = {
        overallScore: aiData.overall_score,
        communicationScore: aiData.communication_score,
        technicalScore: aiData.technical_score,
        analyticalScore: aiData.analytical_score,
        timeManagementScore: aiData.time_management_score,
        strengths: aiData.strengths || [],
        areasForImprovement: aiData.improvements || [],
        perQuestionFeedback: aiData.per_question_feedback || [],
        aiGeneratedAt: new Date(),
      };
    } catch (err) {
      // Fallback scoring if AI service unavailable
      const avgLen = (responses || []).reduce((s, r) => s + (r?.length ?? 0), 0) / Math.max(1, (responses || []).length);
      const baseScore = Math.min(85, 50 + Math.round(avgLen / 10));
      feedback = {
        overallScore: baseScore,
        communicationScore: baseScore * 0.9,
        technicalScore: baseScore * 0.95,
        analyticalScore: baseScore * 0.85,
        timeManagementScore: 70,
        strengths: ['Completed the interview session'],
        areasForImprovement: ['AI feedback unavailable — practice articulating answers clearly'],
        perQuestionFeedback: [],
        aiGeneratedAt: new Date(),
      };
    } finally {
      clearTimeout(timeoutId);
    }

    interview.feedback = feedback;
    await profile.save();

    res.status(200).json({
      status: 'success',
      data: feedback,
      traceId: req.traceId,
    });
  })
);

// ============================================
// RESUME AI ANALYSIS ENDPOINT
// ============================================

/**
 * POST /students/resumes/analyze
 * Analyze resume content with AI
 */
router.post(
  '/resumes/analyze',
  asyncHandler(async (req, res, next) => {
    const resumeData = req.body;

    const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const aiResponse = await fetch(`${baseUrl}/analyze-resume-v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_SERVICE_SECRET}`,
        },
        body: JSON.stringify(resumeData),
        signal: controller.signal,
      });

      if (!aiResponse.ok) throw new Error('AI service error');
      const analysis = await aiResponse.json();

      res.status(200).json({
        status: 'success',
        data: analysis,
        traceId: req.traceId,
      });
    } catch (err) {
      // Fallback analysis
      res.status(200).json({
        status: 'success',
        data: {
          score: 60,
          feedback: 'AI service unavailable. Basic analysis applied.',
          suggestions: ['Add quantified achievements', 'Include GitHub links', 'Expand project descriptions'],
          strengths: ['Resume structure is present'],
          improvements: ['Connect to AI service for detailed feedback'],
          section_scores: { personal_info: 8, summary: 8, experience: 12, education: 8, projects: 8, skills: 6, certifications: 5, format: 5 },
        },
        traceId: req.traceId,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  })
);

// ============================================
// PROFILE UPDATE (POST alias for PATCH)
// ============================================

/**
 * POST /students/profile/update
 * Update student profile (POST alias used by frontend)
 */
router.post(
  '/profile/update',
  validateRequestBody(schemas.studentProfileUpdateSchema),
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    if (req.validatedBody.department !== undefined) profile.academicInfo.department = req.validatedBody.department;
    if (req.validatedBody.graduationYear !== undefined) profile.academicInfo.graduationYear = req.validatedBody.graduationYear;
    if (req.validatedBody.gpa !== undefined) profile.academicInfo.gpa = req.validatedBody.gpa;
    if (req.validatedBody.targetCTC !== undefined) profile.placementReadiness.targetCTC = req.validatedBody.targetCTC;
    if (req.validatedBody.preferredRoles) profile.placementReadiness.preferredRoles = req.validatedBody.preferredRoles;
    if (req.validatedBody.preferredLocations) profile.placementReadiness.preferredLocations = req.validatedBody.preferredLocations;

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
// SKILL TESTS ENDPOINTS
// ============================================

/**
 * GET /students/skill-tests
 * Get all skill test results
 */
router.get(
  '/skill-tests',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    res.status(200).json({
      status: 'success',
      data: profile.skillTests || [],
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/skill-tests
 * Record a skill test result
 */
router.post(
  '/skill-tests',
  asyncHandler(async (req, res, next) => {
    const { skillName, testType, score, percentageScore, isPassed, totalQuestions, correctAnswers, duration } = req.body;

    if (!skillName) throw new AppError('skillName is required', 400, 'VALIDATION_ERROR');

    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    const testResult = {
      _id: new mongoose.Types.ObjectId(),
      skillName,
      testType: testType || 'quiz',
      status: isPassed ? 'passed' : 'failed',
      completedAt: new Date(),
      score: score || 0,
      percentageScore: percentageScore || 0,
      isPassed: Boolean(isPassed),
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || 0,
      duration: duration || 0,
      attemptNumber: (profile.skillTests || []).filter((t) => t.skillName === skillName).length + 1,
    };

    if (!profile.skillTests) profile.skillTests = [];
    profile.skillTests.push(testResult);

    // Award badge if passed
    if (isPassed) {
      const badgeName = `${skillName} [Verified]`;
      const hasBadge = (profile.badges || []).some((b) => b.name === badgeName);
      if (!hasBadge) {
        if (!profile.badges) profile.badges = [];
        profile.badges.push({ name: badgeName, description: `Passed ${skillName} assessment`, earnedAt: new Date() });
      }
    }

    await profile.save();

    res.status(201).json({
      status: 'success',
      data: testResult,
      message: isPassed ? 'Test passed! Badge awarded.' : 'Test result recorded.',
      traceId: req.traceId,
    });
  })
);

// ============================================
// SKILL DELETE (POST alias)
// ============================================

/**
 * POST /students/skills/:skillId/delete
 * Delete a skill (POST alias for DELETE)
 */
router.post(
  '/skills/:skillId/delete',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    const skillIndex = profile.skillInventory.technical.findIndex(
      (s) => s._id.toString() === req.params.skillId
    );
    if (skillIndex === -1) throw new NotFoundError('Skill');

    profile.skillInventory.technical.splice(skillIndex, 1);
    await profile.save();

    res.status(200).json({
      status: 'success',
      message: 'Skill removed successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /students/resumes/:resumeId/delete
 * Delete a resume (POST alias for DELETE)
 */
router.post(
  '/resumes/:resumeId/delete',
  asyncHandler(async (req, res, next) => {
    const profile = await StudentProfile.findOne({ user: req.user.id });
    if (!profile) throw new NotFoundError('Student profile');

    const resumeIndex = profile.resumes.findIndex(
      (r) => r._id.toString() === req.params.resumeId
    );
    if (resumeIndex === -1) throw new NotFoundError('Resume');

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
// AI FEATURE ENDPOINTS (proxy to AI service)
// ============================================

async function callAiService(path, body) {
  const baseUrl = (process.env.AI_SERVICE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AI_SERVICE_SECRET}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`AI service ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST /students/ai/roadmap
 */
router.post('/ai/roadmap', asyncHandler(async (req, res) => {
  try {
    const data = await callAiService('/generate-roadmap', req.body);
    res.status(200).json({ status: 'success', data, traceId: req.traceId });
  } catch {
    res.status(200).json({
      status: 'success',
      data: {
        target_role: req.body.target_role || 'Software Engineer',
        total_weeks: 24,
        total_xp_available: 3600,
        phases: [],
        insights: ['AI service unavailable. Please try again later.'],
      },
      traceId: req.traceId,
    });
  }
}));

/**
 * POST /students/ai/recommend-skills
 */
router.post('/ai/recommend-skills', asyncHandler(async (req, res) => {
  try {
    const data = await callAiService('/recommend-skills', req.body);
    res.status(200).json({ status: 'success', data, traceId: req.traceId });
  } catch {
    res.status(200).json({
      status: 'success',
      data: { target_role: req.body.target_role || 'Software Engineer', current_skill_count: 0, gap_count: 0, recommendations: [] },
      traceId: req.traceId,
    });
  }
}));

/**
 * POST /students/ai/predict-placement
 */
router.post('/ai/predict-placement', asyncHandler(async (req, res) => {
  try {
    const data = await callAiService('/predict-placement', req.body);
    res.status(200).json({ status: 'success', data, traceId: req.traceId });
  } catch {
    res.status(200).json({
      status: 'success',
      data: {
        placement_probability: 0.5,
        confidence_interval: { lower: 0.35, upper: 0.65 },
        estimated_placement_months: 4,
        factors_helping: [],
        factors_hindering: ['AI service unavailable'],
        recommended_actions: ['Try again later'],
        readiness_tier: 'medium',
      },
      traceId: req.traceId,
    });
  }
}));

/**
 * GET /students/gamification
 */
router.get('/gamification', asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user.id });
  if (!profile) throw new NotFoundError('Student profile');
  res.status(200).json({
    status: 'success',
    data: profile.gamification || { xp: 0, earnedBadgeIds: [] },
    traceId: req.traceId,
  });
}));

/**
 * POST /students/gamification/sync
 */
router.post('/gamification/sync', asyncHandler(async (req, res) => {
  const { xp, earnedBadgeIds } = req.body;
  const profile = await StudentProfile.findOne({ user: req.user.id });
  if (!profile) throw new NotFoundError('Student profile');
  if (!profile.gamification) profile.gamification = {};
  if (xp !== undefined && xp > (profile.gamification.xp || 0)) profile.gamification.xp = xp;
  if (Array.isArray(earnedBadgeIds)) {
    const existing = profile.gamification.earnedBadgeIds || [];
    profile.gamification.earnedBadgeIds = [...new Set([...existing, ...earnedBadgeIds])];
  }
  profile.markModified('gamification');
  await profile.save();
  res.status(200).json({ status: 'success', traceId: req.traceId });
}));

module.exports = router;

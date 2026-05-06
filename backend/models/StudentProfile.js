const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    academicInfo: {
      department: {
        type: String,
        trim: true,
        index: true,
      },
      graduationYear: {
        type: Number,
        min: 2000,
        max: 2100,
        index: true,
      },
      gpa: {
        type: Number,
        min: 0,
        max: 10,
        default: 0,
      },
      coursework: [
        {
          courseName: String,
          grade: String,
          semester: String,
        },
      ],
    },
    skillInventory: {
      technical: [
        {
          skillName: String,
          proficiencyLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
            default: 'beginner',
          },
          yearsOfExperience: Number,
          endorsements: {
            type: Number,
            default: 0,
          },
          endorsedBy: [mongoose.Schema.Types.ObjectId],
          verificationStatus: {
            type: String,
            enum: ['unverified', 'pending', 'verified'],
            default: 'unverified',
          },
          verifiedAt: Date,
          certifications: [String],
        },
      ],
      soft: [
        {
          skillName: String,
          proficiencyLevel: {
            type: String,
            enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          },
          endorsements: {
            type: Number,
            default: 0,
          },
          endorsedBy: [mongoose.Schema.Types.ObjectId],
        },
      ],
    },
    resumes: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        title: String,
        version: Number,
        fileUrl: String,
        fileSize: Number,
        uploadedAt: Date,
        isDefault: Boolean,
        sections: {
          personalInfo: {
            fullName: String,
            email: String,
            phone: String,
            location: String,
            linkedInUrl: String,
            portfolioUrl: String,
          },
          summary: String,
          experience: [
            {
              companyName: String,
              position: String,
              startDate: Date,
              endDate: Date,
              currentlyWorking: Boolean,
              description: String,
              skills: [String],
            },
          ],
          education: [
            {
              institution: String,
              degree: String,
              field: String,
              startDate: Date,
              endDate: Date,
              gpa: Number,
            },
          ],
          projects: [
            {
              projectName: String,
              description: String,
              technologies: [String],
              link: String,
              startDate: Date,
              endDate: Date,
            },
          ],
          certifications: [
            {
              name: String,
              issuer: String,
              issuedDate: Date,
              expiryDate: Date,
              credentialUrl: String,
            },
          ],
        },
        aiAnalysis: {
          score: Number,
          feedback: String,
          suggestions: [String],
          analyzedAt: Date,
        },
      },
    ],
    mockInterviews: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        title: String,
        type: {
          type: String,
          enum: ['technical', 'behavioral', 'system-design', 'practical'],
          default: 'technical',
        },
        difficulty: {
          type: String,
          enum: ['easy', 'medium', 'hard'],
        },
        status: {
          type: String,
          enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
          default: 'scheduled',
        },
        scheduledAt: Date,
        startedAt: Date,
        completedAt: Date,
        duration: Number,
        questions: [
          {
            questionId: String,
            question: String,
            category: String,
            difficulty: String,
          },
        ],
        responses: [
          {
            questionId: String,
            userResponse: String,
            audioTranscript: String,
          },
        ],
        feedback: {
          overallScore: Number,
          communicationScore: Number,
          technicalScore: Number,
          analyticalScore: Number,
          timeManagement: Number,
          strengths: [String],
          areasForImprovement: [String],
          detailedFeedback: String,
          aiGeneratedAt: Date,
        },
        mentorNotes: String,
        mentorId: mongoose.Schema.Types.ObjectId,
      },
    ],
    skillTests: [
      {
        _id: mongoose.Schema.Types.ObjectId,
        skillName: String,
        testType: {
          type: String,
          enum: ['coding', 'multiple-choice', 'practical'],
        },
        status: {
          type: String,
          enum: ['scheduled', 'in-progress', 'completed'],
        },
        attemptNumber: {
          type: Number,
          default: 1,
        },
        totalAttempts: {
          type: Number,
          default: 3,
        },
        startedAt: Date,
        completedAt: Date,
        duration: Number,
        totalQuestions: Number,
        correctAnswers: Number,
        score: Number,
        percentageScore: Number,
        passingScore: Number,
        isPassed: Boolean,
        responses: [
          {
            questionId: String,
            answer: String,
            isCorrect: Boolean,
          },
        ],
        certificateUrl: String,
        certificateIssuedAt: Date,
      },
    ],
    scores: {
      readinessScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      dsaScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      communicationScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      overallScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      lastUpdated: Date,
    },
    placementReadiness: {
      status: {
        type: String,
        enum: ['not-started', 'in-progress', 'ready', 'placed'],
        default: 'not-started',
        index: true,
      },
      targetCTC: Number,
      preferredRoles: [String],
      preferredLocations: [String],
      availableFrom: Date,
      jobsApplied: {
        type: Number,
        default: 0,
      },
      interviewsScheduled: {
        type: Number,
        default: 0,
      },
      offersReceived: {
        type: Number,
        default: 0,
      },
    },
    badges: [
      {
        badgeId: String,
        name: String,
        description: String,
        awardedAt: Date,
        criteria: String,
      },
    ],
    achievements: [
      {
        title: String,
        description: String,
        achievedAt: Date,
        category: String,
      },
    ],
    preferences: {
      profileVisibility: {
        type: String,
        enum: ['public', 'private', 'mentors-only'],
        default: 'private',
      },
      allowContactFromCompanies: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

// Indexes for performance
studentProfileSchema.index({ user: 1, 'academicInfo.department': 1 });
studentProfileSchema.index({ 'academicInfo.graduationYear': 1 });
studentProfileSchema.index({ 'placementReadiness.status': 1 });
studentProfileSchema.index({ 'scores.readinessScore': -1 });
studentProfileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);

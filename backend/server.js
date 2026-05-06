require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

// Middleware imports
const { requestLoggingMiddleware, errorLoggingMiddleware } = require('./middlewares/loggingMiddleware');
const { corsMiddleware, securityHeadersMiddleware, xssProtectionMiddleware, csrfProtectionMiddleware } = require('./middlewares/securityMiddleware');
const { generalLimiter } = require('./middlewares/rateLimitMiddleware');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middlewares/errorHandler');
const { authMiddleware } = require('./middlewares/authMiddleware');
const { requireAdmin } = require('./middlewares/roleMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');

// Model imports
const User = require('./models/User');
const StudentProfile = require('./models/StudentProfile');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student-os';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE SETUP - ORDER MATTERS
// ============================================

// 1. Logging middleware (for all requests)
app.use(requestLoggingMiddleware);
app.use(errorLoggingMiddleware);

// 2. Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// 3. Security middleware
app.use(securityHeadersMiddleware);
app.use(corsMiddleware);
app.use(xssProtectionMiddleware);
app.use(csrfProtectionMiddleware);

// 4. Rate limiting middleware
app.use(generalLimiter);

// ============================================
// HEALTH CHECK & STATUS ENDPOINTS
// ============================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'student-os-backend',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

app.get('/ready', asyncHandler(async (req, res, next) => {
  // Check database connectivity
  const dbState = mongoose.connection.readyState;
  const isConnected = dbState === 1;

  if (!isConnected) {
    return res.status(503).json({
      status: 'not_ready',
      message: 'Database connection unavailable',
      traceId: req.traceId,
    });
  }

  res.status(200).json({
    status: 'ready',
    database: 'connected',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
}));

// ============================================
// API ROUTES
// ============================================

// Authentication routes
app.use('/api/auth', authRoutes);

// Student routes
app.use('/api/students', studentRoutes);

// ============================================
// ADMIN ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/admin/analytics/students
 * Get all students with pagination, filtering, and sorting
 */
app.get(
  '/api/admin/analytics/students',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res, next) => {
    const {
      page = 1,
      limit = 10,
      sort = '-scores.readinessScore',
      department,
      graduationYear,
      status,
    } = req.query;

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};
    if (department) {
      filter['academicInfo.department'] = department;
    }
    if (graduationYear) {
      filter['academicInfo.graduationYear'] = parseInt(graduationYear);
    }
    if (status) {
      filter['placementReadiness.status'] = status;
    }

    // Execute query with pagination and sorting
    const students = await StudentProfile.find(filter)
      .populate('user', 'email firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    const total = await StudentProfile.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: students,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
      traceId: req.traceId,
    });
  })
);

/**
 * GET /api/admin/analytics/cohort-stats
 * Get cohort statistics by department and year
 */
app.get(
  '/api/admin/analytics/cohort-stats',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res, next) => {
    const stats = await StudentProfile.aggregate([
      {
        $group: {
          _id: {
            department: '$academicInfo.department',
            graduationYear: '$academicInfo.graduationYear',
          },
          totalStudents: { $sum: 1 },
          averageReadinessScore: { $avg: '$scores.readinessScore' },
          averageDSAScore: { $avg: '$scores.dsaScore' },
          placedCount: {
            $sum: {
              $cond: [{ $eq: ['$placementReadiness.status', 'placed'] }, 1, 0],
            },
          },
          readyCount: {
            $sum: {
              $cond: [{ $eq: ['$placementReadiness.status', 'ready'] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: { '_id.graduationYear': -1, '_id.department': 1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: stats,
      traceId: req.traceId,
    });
  })
);

/**
 * GET /api/admin/analytics/placement-readiness
 * Get placement readiness trends
 */
app.get(
  '/api/admin/analytics/placement-readiness',
  authMiddleware,
  requireAdmin,
  asyncHandler(async (req, res, next) => {
    const readinessTrends = await StudentProfile.aggregate([
      {
        $group: {
          _id: '$placementReadiness.status',
          count: { $sum: 1 },
          averageScore: { $avg: '$scores.readinessScore' },
          averageCTC: { $avg: '$placementReadiness.targetCTC' },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.status(200).json({
      status: 'success',
      data: readinessTrends,
      traceId: req.traceId,
    });
  })
);

// ============================================
// ERROR HANDLING MIDDLEWARE (ORDER MATTERS)
// ============================================

// 404 handler must come before global error handler
app.use(notFoundHandler);

// Global error handler must be last
app.use(errorHandler);

// ============================================
// DATABASE & SERVER INITIALIZATION
// ============================================

/**
 * Create demo users for testing (development only)
 */
async function ensureDemoUsers() {
  if (NODE_ENV === 'production') {
    return;
  }

  const demoStudentEmail = 'student@studentos.com';
  const demoAdminEmail = 'admin@studentos.com';

  // Check if demo users exist
  let demoStudent = await User.findOne({ email: demoStudentEmail });
  let demoAdmin = await User.findOne({ email: demoAdminEmail });

  // Create demo student if doesn't exist
  if (!demoStudent) {
    demoStudent = await User.create({
      email: demoStudentEmail,
      password: 'DemoPassword123!',
      firstName: 'Demo',
      lastName: 'Student',
      role: 'student',
      isEmailVerified: true,
    });
    console.log(`✓ Demo student created: ${demoStudentEmail} (password: DemoPassword123!)`);
  }

  // Create demo admin if doesn't exist
  if (!demoAdmin) {
    demoAdmin = await User.create({
      email: demoAdminEmail,
      password: 'AdminPassword123!',
      firstName: 'Demo',
      lastName: 'Admin',
      role: 'admin',
      isEmailVerified: true,
    });
    console.log(`✓ Demo admin created: ${demoAdminEmail} (password: AdminPassword123!)`);
  }

  // Create demo student profile if doesn't exist
  const demoProfile = await StudentProfile.findOne({ user: demoStudent._id });
  if (!demoProfile) {
    await StudentProfile.create({
      user: demoStudent._id,
      academicInfo: {
        department: 'Computer Science',
        graduationYear: 2027,
        gpa: 8.5,
      },
      skillInventory: {
        technical: [
          {
            skillName: 'JavaScript',
            proficiencyLevel: 'advanced',
            yearsOfExperience: 2,
          },
          {
            skillName: 'React',
            proficiencyLevel: 'intermediate',
            yearsOfExperience: 1,
          },
          {
            skillName: 'Data Structures',
            proficiencyLevel: 'advanced',
            yearsOfExperience: 1,
          },
        ],
      },
      scores: {
        readinessScore: 85,
        dsaScore: 78,
        communicationScore: 80,
        overallScore: 81,
      },
      placementReadiness: {
        status: 'ready',
        targetCTC: 800000,
        preferredRoles: ['Frontend Developer', 'Full Stack Developer'],
        preferredLocations: ['Bangalore', 'Hyderabad'],
      },
    });
    console.log('✓ Demo student profile created');
  }
}

/**
 * Connect to MongoDB and start server
 */
async function startServer() {
  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✓ MongoDB connected successfully');

    // Ensure demo users exist (development only)
    await ensureDemoUsers();

    // Start Express server
    app.listen(PORT, HOST, () => {
      console.log(
        `✓ Server running on ${NODE_ENV === 'production' ? 'production' : 'development'} mode`
      );
      console.log(`✓ Listening on http://${HOST}:${PORT}`);
      console.log(`✓ Health check: GET http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    console.error('✗ Server startup failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = app;

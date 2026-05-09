const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validateRequestBody } = require('../middlewares/validationMiddleware');
const { authLimiter, registerLimiter } = require('../middlewares/rateLimitMiddleware');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getCookieOptions } = require('../utils/tokens');
const {
  AppError,
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');
const { asyncHandler } = require('../middlewares/errorHandler');

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').trim(),
  lastName: z.string().min(1, 'Last name is required').trim(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /auth/register
 * Register a new user account
 */
router.post(
  '/register',
  registerLimiter,
  validateRequestBody(registerSchema),
  asyncHandler(async (req, res, next) => {
    const { email, password, firstName, lastName } = req.validatedBody;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: 'student',
      isEmailVerified: false,
    });

    await user.save();

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Set secure refresh token cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(201).json({
      status: 'success',
      data: {
        user: user.getPublicProfile(),
        accessToken,
      },
      message: 'User registered successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post(
  '/login',
  authLimiter,
  validateRequestBody(loginSchema),
  asyncHandler(async (req, res, next) => {
    const { email, password } = req.validatedBody;

    // Fetch user with password field selected
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    if (!user || !user.isActive) {
      // Don't reveal if user exists
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      throw new AppError(
        'Account is temporarily locked due to multiple failed login attempts. Please try again later.',
        429,
        'ACCOUNT_LOCKED'
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incLoginAttempts();
      throw new AuthenticationError('Invalid email or password');
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Update last login
    user.lastLogin = new Date();
    user.metadata.ipAddress = req.ip;
    user.metadata.userAgent = req.get('user-agent');
    user.metadata.loginHistory = user.metadata.loginHistory || [];
    user.metadata.loginHistory.push({
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    await user.save();

    // Generate tokens
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    // Set secure refresh token cookie
    res.cookie('refreshToken', refreshToken, getCookieOptions());

    res.status(200).json({
      status: 'success',
      data: {
        user: user.getPublicProfile(),
        accessToken,
      },
      message: 'Login successful',
      traceId: req.traceId,
    });
  })
);

/**
 * GET /auth/me
 * Get current authenticated user profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    const user = await User.findById(req.user.id);

    if (!user) {
      throw new NotFoundError('User');
    }

    res.status(200).json({
      status: 'success',
      data: {
        user: user.getPublicProfile(),
      },
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/refresh-token
 * Refresh access token using refresh token from cookie or body
 */
router.post(
  '/refresh-token',
  validateRequestBody(refreshTokenSchema.partial()),
  asyncHandler(async (req, res, next) => {
    // Get refresh token from cookie or request body
    let refreshToken = req.cookies?.refreshToken || req.validatedBody?.refreshToken;

    if (!refreshToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new AuthenticationError(error.message);
    }

    // Fetch user and verify token version
    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      throw new AuthenticationError('User not found or inactive');
    }

    if (decoded.tv !== user.tokenVersion) {
      throw new AuthenticationError('Session invalidated. Please login again.');
    }

    // Generate new access token
    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    // Update refresh token cookie
    res.cookie('refreshToken', newRefreshToken, getCookieOptions());

    res.status(200).json({
      status: 'success',
      data: {
        accessToken: newAccessToken,
      },
      message: 'Token refreshed successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/logout
 * Invalidate current session by incrementing token version
 */
router.post(
  '/logout',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { tokenVersion: 1 },
    });

    // Clear refresh token cookie
    res.clearCookie('refreshToken', getCookieOptions());

    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/verify-email
 * Verify email address using token
 */
router.post(
  '/verify-email',
  asyncHandler(async (req, res, next) => {
    const { token } = req.body;

    if (!token) {
      throw new ValidationError('Email verification token is required');
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Email verified successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/password-reset-request
 * Request password reset token
 */
router.post(
  '/password-reset-request',
  asyncHandler(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
      throw new ValidationError('Email is required');
    }

    const user = await User.findOne({ email });

    // Always return success to prevent user enumeration
    if (!user) {
      return res.status(200).json({
        status: 'success',
        message: 'If this email is registered, a password reset link has been sent',
        traceId: req.traceId,
      });
    }

    // Generate reset token
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // TODO: Send password reset email with token
    // await sendPasswordResetEmail(user.email, resetToken);

    res.status(200).json({
      status: 'success',
      message: 'If this email is registered, a password reset link has been sent',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/password-reset
 * Reset password using reset token
 */
router.post(
  '/password-reset',
  asyncHandler(async (req, res, next) => {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      throw new ValidationError('Token, password, and confirmation are required');
    }

    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    if (password !== confirmPassword) {
      throw new ValidationError('Passwords do not match');
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_TOKEN');
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      traceId: req.traceId,
    });
  })
);

/**
 * POST /auth/change-password
 * Change password for authenticated user
 */
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req, res, next) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      throw new ValidationError('Current password, new password, and confirmation are required');
    }
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters');
    }
    if (newPassword !== confirmPassword) {
      throw new ValidationError('New passwords do not match');
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) throw new NotFoundError('User');

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) throw new AuthenticationError('Current password is incorrect');

    user.password = newPassword;
    // Invalidate all existing sessions
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.clearCookie('refreshToken', getCookieOptions());

    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please log in again.',
      traceId: req.traceId,
    });
  })
);

module.exports = router;

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/tokens');
const { AuthenticationError } = require('../utils/errors');

/**
 * JWT authentication middleware
 * Verifies Bearer token from Authorization header
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return next(
        new AuthenticationError('Missing or invalid Authorization header. Expected: Bearer <token>')
      );
    }

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      return next(new AuthenticationError(error.message));
    }

    // Fetch user from database
    const user = await User.findById(decoded.sub).select(
      'firstName lastName email role isActive tokenVersion isEmailVerified'
    );

    if (!user) {
      return next(new AuthenticationError('User not found'));
    }

    if (!user.isActive) {
      return next(new AuthenticationError('User account is inactive'));
    }

    // Validate token version (used for token invalidation on logout/password change)
    if (decoded.tv !== user.tokenVersion) {
      return next(new AuthenticationError('Session invalidated. Please login again.'));
    }

    // Attach user and auth info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    };

    req.auth = {
      userId: user._id.toString(),
      role: user.role,
      tokenVersion: decoded.tv,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Doesn't fail if token is missing, but validates if present
 */
async function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (!token || scheme !== 'Bearer') {
      return next();
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      // Invalid token but optional, so just skip
      return next();
    }

    const user = await User.findById(decoded.sub).select(
      'firstName lastName email role isActive tokenVersion'
    );

    if (user && user.isActive && decoded.tv === user.tokenVersion) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };
    }

    next();
  } catch (error) {
    // Optional auth, so don't fail on error
    next();
  }
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
};

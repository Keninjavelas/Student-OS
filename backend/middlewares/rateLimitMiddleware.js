const { RateLimitError } = require('../utils/errors');

/**
 * In-memory rate limiter store (for development/single-instance deployment)
 * For production multi-instance deployments, use Redis
 */
const rateLimitStore = new Map();

/**
 * Clean up expired entries (runs periodically)
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up every minute
setInterval(cleanupExpiredEntries, 60000);

/**
 * Generic rate limiting middleware
 * @param {object} options - Configuration
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Max requests per window
 * @param {function} options.keyGenerator - Function to generate rate limit key from request
 * @param {string} options.message - Custom error message
 */
function createRateLimiter(options) {
  const {
    windowMs = 900000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress,
    message = 'Too many requests, please try again later',
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Initialize or reset if window expired
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Add rate limit info to response headers
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetTime = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (entry.count > maxRequests) {
      const error = new RateLimitError(resetTime);
      return next(error);
    }

    next();
  };
}

/**
 * General API rate limiter
 */
const generalLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  keyGenerator: (req) => {
    // If authenticated, use user ID; otherwise use IP
    return req.user?.id || (req.ip || req.connection.remoteAddress);
  },
  message: 'Too many requests, please try again later',
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS) || 5,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: 'Too many login attempts, please try again later',
});

/**
 * Very strict limiter for password reset
 */
const passwordResetLimiter = createRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 3,
  keyGenerator: (req) => req.validatedBody?.email || (req.ip || req.connection.remoteAddress),
  message: 'Too many password reset attempts, please try again later',
});

/**
 * Moderately strict limiter for user registration
 */
const registerLimiter = createRateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 10,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  message: 'Too many registration attempts, please try again later',
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registerLimiter,
};
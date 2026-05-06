const { AppError, ValidationError } = require('../utils/errors');

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
function errorHandler(err, req, res, next) {
  // Ensure error has required properties
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';
  err.timestamp = err.timestamp || new Date().toISOString();

  // Log error with trace ID
  logError(err, req);

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message,
    }));
    err = new ValidationError('Validation failed', details);
  }

  // Handle Mongoose cast errors (invalid ObjectId)
  if (err.name === 'CastError') {
    err = new AppError('Invalid resource ID format', 400, 'INVALID_ID');
  }

  // Handle Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    err = new AppError(`${field} already exists`, 409, 'DUPLICATE_ENTRY');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }

  if (err.name === 'TokenExpiredError') {
    err = new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Handle operational vs programming errors
  if (!err.isOperational) {
    // Programming error - don't leak details to client in production
    console.error('[PROGRAMMING ERROR]', err);
    err = new AppError(
      process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  // Send standardized error response
  res.status(err.statusCode).json({
    status: 'error',
    code: err.code,
    message: err.message,
    timestamp: err.timestamp,
    traceId: req.traceId,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      details: err.details,
    }),
  });
}

/**
 * 404 Not Found middleware
 * Should be placed after all route definitions
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
}

/**
 * Async error wrapper for route handlers
 * Catches promise rejections and passes them to error handler
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Log error with appropriate level
 */
function logError(err, req) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode,
    errorCode: err.code,
    message: err.message,
    userId: req.user?.id || 'anonymous',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  const logLevel = err.statusCode >= 500 ? 'error' : 'warn';

  if (process.env.LOG_FORMAT === 'json') {
    console[logLevel](JSON.stringify(logEntry));
  } else {
    console[logLevel](
      `[${logLevel.toUpperCase()}] [${logEntry.traceId}] ${err.message}`
    );
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  logError,
};
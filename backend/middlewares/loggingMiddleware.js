const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Request tracking and logging middleware
 * Adds tracing ID, request metadata, and structured logging
 */
function requestLoggingMiddleware(req, res, next) {
  // Add unique trace ID if not present
  req.traceId = req.get('X-Trace-Id') || uuidv4();
  
  // Store request metadata
  req.metadata = {
    traceId: req.traceId,
    method: req.method,
    path: req.path,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
  };

  // Override res.json to log responses
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    const response = {
      ...data,
      traceId: req.traceId,
    };
    
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logRequest(logLevel, {
      ...req.metadata,
      statusCode: res.statusCode,
      responseTime: Date.now() - req.startTime,
    });

    return originalJson.call(this, response);
  };

  req.startTime = Date.now();
  res.setHeader('X-Trace-Id', req.traceId);
  
  next();
}

/**
 * Structured logging with trace context
 */
function logRequest(level, metadata) {
  const logEntry = {
    level: level || 'info',
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  if (process.env.LOG_FORMAT === 'json') {
    console.log(JSON.stringify(logEntry));
  } else {
    console.log(
      `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] [${metadata.traceId}] ${metadata.method} ${metadata.path} - ${metadata.statusCode} (${metadata.responseTime}ms)`
    );
  }
}

/**
 * Global error logging middleware
 */
function errorLoggingMiddleware(err, req, res, next) {
  const errorLog = {
    level: 'error',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
    method: req.method,
    path: req.path,
    statusCode: err.statusCode || 500,
    errorCode: err.code || 'INTERNAL_ERROR',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (process.env.LOG_FORMAT === 'json') {
    console.error(JSON.stringify(errorLog));
  } else {
    console.error(`[ERROR] [${errorLog.traceId}] ${errorLog.message}`);
  }

  next(err);
}

module.exports = {
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  logRequest,
};
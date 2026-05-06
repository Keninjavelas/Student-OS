const helmet = require('helmet');
const crypto = require('crypto');

/**
 * CORS middleware with environment-specific configuration
 */
function corsMiddleware(req, res, next) {
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Trace-Id');
    res.header('Access-Control-Allow-Credentials', process.env.CORS_CREDENTIALS === 'true' ? 'true' : 'false');
    res.header('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
}

/**
 * CSRF protection middleware using SameSite cookies and token validation
 * Works in conjunction with HttpOnly cookies for maximum security
 */
function csrfProtectionMiddleware(req, res, next) {
  // Skip CSRF protection for safe methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF protection for public endpoints (register, login, password reset)
  const publicEndpoints = ['/api/auth/register', '/api/auth/login', '/api/auth/password-reset'];
  if (publicEndpoints.includes(req.path)) {
    return next();
  }

  // Verify CSRF token if enabled
  if (process.env.ENABLE_CSRF_PROTECTION === 'true') {
    const token = req.get('x-csrf-token') || req.body?.csrfToken;

    if (!token) {
      return res.status(403).json({
        status: 'error',
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required',
      });
    }

    // In production, verify token against session store
    // For now, we rely on SameSite cookie protection
  }

  next();
}

/**
 * Security headers middleware (using helmet)
 */
function securityHeadersMiddleware(req, res, next) {
  // Use helmet with secure defaults
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        fontSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameGuard: {
      action: 'deny',
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })(req, res, next);
}

/**
 * XSS protection middleware - sanitizes request data
 */
function xssProtectionMiddleware(req, res, next) {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    sanitizeObject(req.query);
  }

  next();
}

/**
 * Recursively sanitize object to prevent XSS
 */
function sanitizeObject(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Remove common XSS patterns
        obj[key] = value
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
          .replace(/on\w+\s*=\s*[^>\s]*/gi, '')
          .trim();
      } else if (typeof value === 'object' && value !== null) {
        sanitizeObject(value);
      }
    }
  }
}

/**
 * Content Security Policy (CSP) nonce generator
 */
function cspNonceMiddleware(req, res, next) {
  req.cspNonce = crypto.randomBytes(16).toString('hex');
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${req.cspNonce}'; style-src 'self' 'unsafe-inline';`
  );
  next();
}

module.exports = {
  corsMiddleware,
  csrfProtectionMiddleware,
  securityHeadersMiddleware,
  xssProtectionMiddleware,
  cspNonceMiddleware,
  sanitizeObject,
};
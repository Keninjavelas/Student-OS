const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-in-production';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const COOKIE_OPTIONS = {
  secure: process.env.COOKIE_SECURE === 'true',
  httpOnly: process.env.COOKIE_HTTP_ONLY === 'true',
  sameSite: process.env.COOKIE_SAME_SITE || 'strict',
  maxAge: parseInt(process.env.COOKIE_MAX_AGE) || 7 * 24 * 60 * 60 * 1000,
};

/**
 * Build JWT payload with essential user information
 */
function buildPayload(user) {
  return {
    sub: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tv: user.tokenVersion,
    iat: Math.floor(Date.now() / 1000),
  };
}

/**
 * Sign and return access token (short-lived, in memory or Authorization header)
 */
function signAccessToken(user) {
  const payload = buildPayload(user);
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    algorithm: 'HS256',
  });
}

/**
 * Sign and return refresh token (long-lived, in HttpOnly cookie)
 */
function signRefreshToken(user) {
  const payload = buildPayload(user);
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    algorithm: 'HS256',
    jti: crypto.randomBytes(16).toString('hex'),
  });
}

/**
 * Verify and decode access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify and decode refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET, {
      algorithms: ['HS256'],
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for inspection)
 */
function decodeToken(token) {
  return jwt.decode(token);
}

/**
 * Get secure cookie options for the current environment
 */
function getCookieOptions() {
  return {
    ...COOKIE_OPTIONS,
    path: '/',
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  buildPayload,
  getCookieOptions,
  COOKIE_OPTIONS,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY,
};

/**
 * Auth middleware and route handler unit tests
 * Run: npm test (from backend/)
 */

const { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } = require('../utils/tokens');
const { AppError, AuthenticationError, ValidationError } = require('../utils/errors');

// ─── Token utilities ──────────────────────────────────────────────────────────

describe('Token utilities', () => {
  const mockUser = { _id: 'user123', id: 'user123', role: 'student', tokenVersion: 0 };

  test('signAccessToken returns a string', () => {
    const token = signAccessToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  test('signRefreshToken returns a string', () => {
    const token = signRefreshToken(mockUser);
    expect(typeof token).toBe('string');
    expect(token.split('.').length).toBe(3);
  });

  test('verifyAccessToken decodes a valid token', () => {
    const token = signAccessToken(mockUser);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(mockUser._id.toString());
    expect(decoded.role).toBe(mockUser.role);
  });

  test('verifyAccessToken throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  test('verifyRefreshToken decodes a valid token', () => {
    const token = signRefreshToken(mockUser);
    const decoded = verifyRefreshToken(token);
    expect(decoded.sub).toBe(mockUser._id.toString());
  });

  test('verifyRefreshToken throws on invalid token', () => {
    expect(() => verifyRefreshToken('bad.token')).toThrow();
  });

  test('access token and refresh token are different', () => {
    const access = signAccessToken(mockUser);
    const refresh = signRefreshToken(mockUser);
    expect(access).not.toBe(refresh);
  });
});

// ─── Custom error classes ─────────────────────────────────────────────────────

describe('Custom error classes', () => {
  test('AppError has correct properties', () => {
    const err = new AppError('Something failed', 500, 'INTERNAL');
    expect(err.message).toBe('Something failed');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL');
    expect(err.isOperational).toBe(true);
  });

  test('AuthenticationError defaults to 401', () => {
    const err = new AuthenticationError('Unauthorized');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  test('ValidationError defaults to 400', () => {
    const err = new ValidationError('Bad input');
    expect(err.statusCode).toBe(400);
  });

  test('AppError is instance of Error', () => {
    const err = new AppError('test', 400, 'TEST');
    expect(err instanceof Error).toBe(true);
  });
});

// ─── Validation schemas ───────────────────────────────────────────────────────

describe('Validation schemas', () => {
  const { schemas } = require('../middlewares/validationMiddleware');

  test('registerSchema accepts valid input', () => {
    const result = schemas.registerSchema.safeParse({
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(true);
  });

  test('registerSchema rejects short password', () => {
    const result = schemas.registerSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(false);
  });

  test('registerSchema rejects invalid email', () => {
    const result = schemas.registerSchema.safeParse({
      email: 'not-an-email',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result.success).toBe(false);
  });

  test('loginSchema accepts valid credentials', () => {
    const result = schemas.loginSchema.safeParse({
      email: 'user@example.com',
      password: 'anypassword',
    });
    expect(result.success).toBe(true);
  });

  test('addSkillSchema accepts valid skill', () => {
    const result = schemas.addSkillSchema.safeParse({
      skillName: 'React',
      proficiencyLevel: 'advanced',
      yearsOfExperience: 2,
    });
    expect(result.success).toBe(true);
  });

  test('addSkillSchema rejects invalid proficiency level', () => {
    const result = schemas.addSkillSchema.safeParse({
      skillName: 'React',
      proficiencyLevel: 'superhero',
    });
    expect(result.success).toBe(false);
  });

  test('studentProfileUpdateSchema accepts partial update', () => {
    const result = schemas.studentProfileUpdateSchema.safeParse({
      department: 'Computer Science',
      gpa: 8.5,
    });
    expect(result.success).toBe(true);
  });

  test('studentProfileUpdateSchema rejects GPA > 10', () => {
    const result = schemas.studentProfileUpdateSchema.safeParse({ gpa: 11 });
    expect(result.success).toBe(false);
  });
});

// ─── Error handler middleware ─────────────────────────────────────────────────

describe('Error handler middleware', () => {
  const { errorHandler } = require('../middlewares/errorHandler');

  function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  }

  test('handles AppError with correct status code', () => {
    const err = new AppError('Not found', 404, 'NOT_FOUND');
    const res = mockRes();
    const next = jest.fn();
    errorHandler(err, {}, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'error' }));
  });

  test('handles generic Error with 500', () => {
    const err = new Error('Unexpected');
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('handles AuthenticationError with 401', () => {
    const err = new AuthenticationError('Token expired');
    const res = mockRes();
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

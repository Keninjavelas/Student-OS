const { z } = require('zod');
const { ValidationError } = require('../utils/errors');

/**
 * Request body validation middleware using Zod schemas
 * @param {z.ZodSchema} schema - Zod schema for validation
 */
function validateRequestBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return next(new ValidationError('Request validation failed', details));
      }
      next(error);
    }
  };
}

/**
 * Request query validation middleware using Zod schemas
 * @param {z.ZodSchema} schema - Zod schema for validation
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return next(new ValidationError('Query validation failed', details));
      }
      next(error);
    }
  };
}

/**
 * Request params validation middleware using Zod schemas
 * @param {z.ZodSchema} schema - Zod schema for validation
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.validatedParams = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        return next(new ValidationError('Params validation failed', details));
      }
      next(error);
    }
  };
}

// Reusable Zod schemas
const schemas = {
  // Authentication schemas
  registerSchema: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  }),

  loginSchema: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  updatePasswordSchema: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  // Profile schemas
  updateProfileSchema: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().optional(),
    bio: z.string().max(500).optional(),
    avatar: z.string().url().optional(),
  }),

  // Pagination schemas
  paginationSchema: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(10),
    sort: z.string().optional(),
    filter: z.string().optional(),
  }),

  // Student profile update schema
  studentProfileUpdateSchema: z.object({
    department: z.string().optional(),
    graduationYear: z.coerce.number().min(2000).max(2100).optional(),
    gpa: z.coerce.number().min(0).max(10).optional(),
    preferredRoles: z.array(z.string()).optional(),
    preferredLocations: z.array(z.string()).optional(),
    targetCTC: z.coerce.number().min(0).optional(),
  }),

  // Skill addition schema
  addSkillSchema: z.object({
    skillName: z.string().min(1, 'Skill name is required'),
    proficiencyLevel: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
    yearsOfExperience: z.coerce.number().min(0).optional(),
    certifications: z.array(z.string()).optional(),
  }),
};

module.exports = {
  validateRequestBody,
  validateQuery,
  validateParams,
  schemas,
};
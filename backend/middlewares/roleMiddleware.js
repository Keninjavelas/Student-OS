const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Role-based access control middleware
 * Ensures user has one of the required roles
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['admin', 'mentor'])
 */
function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return next(new AuthenticationError('Authentication required'));
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.auth.role)) {
      return next(
        new AuthorizationError(
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

/**
 * Admin-only access middleware
 */
function requireAdmin(req, res, next) {
  return roleMiddleware('admin')(req, res, next);
}

/**
 * Student-only access middleware
 */
function requireStudent(req, res, next) {
  return roleMiddleware('student')(req, res, next);
}

/**
 * Mentor-only access middleware
 */
function requireMentor(req, res, next) {
  return roleMiddleware('mentor')(req, res, next);
}

/**
 * Check if user is accessing their own resource
 * @param {function} idGetter - Function to extract resource ID from request (e.g., (req) => req.params.userId)
 */
function requireOwnershipOrAdmin(idGetter) {
  return (req, res, next) => {
    const resourceId = idGetter(req);
    const userId = req.user?.id;
    const userRole = req.auth?.role;

    if (userRole === 'admin') {
      return next();
    }

    if (userId !== resourceId) {
      return next(
        new AuthorizationError('You can only access your own resources')
      );
    }

    next();
  };
}

module.exports = {
  roleMiddleware,
  requireAdmin,
  requireStudent,
  requireMentor,
  requireOwnershipOrAdmin,
};

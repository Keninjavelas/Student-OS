function roleMiddleware(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ message: "Forbidden: insufficient permissions" });
    }

    return next();
  };
}

module.exports = roleMiddleware;

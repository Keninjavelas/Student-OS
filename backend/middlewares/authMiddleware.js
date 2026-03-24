const User = require("../models/User");
const { verifyAccessToken } = require("../utils/tokens");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Missing or invalid authorization header" });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("fullName email role isActive tokenVersion");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    if (decoded.tv !== user.tokenVersion) {
      return res.status(401).json({ message: "Session invalidated. Please login again." });
    }

    req.auth = {
      userId: user._id.toString(),
      role: user.role
    };
    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token", error: error.message });
  }
}

module.exports = authMiddleware;

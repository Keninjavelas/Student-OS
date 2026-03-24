const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const authMiddleware = require("../middlewares/authMiddleware");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/tokens");

const router = express.Router();

function toAuthResponse(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  return {
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role
    },
    accessToken,
    refreshToken
  };
}

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password, role = "student" } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "fullName, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!["student", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role must be student or admin" });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      passwordHash,
      role
    });

    return res.status(201).json(toAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.status(200).json(toAuthResponse(user));
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  return res.status(200).json({
    user: {
      _id: req.user._id,
      fullName: req.user.fullName,
      email: req.user.email,
      role: req.user.role
    }
  });
});

router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "refreshToken is required" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }
    if (decoded.tv !== user.tokenVersion) {
      return res.status(401).json({ message: "Session invalidated. Please login again." });
    }

    return res.status(200).json(toAuthResponse(user));
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token", error: error.message });
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.auth.userId, { $inc: { tokenVersion: 1 } });
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Logout failed", error: error.message });
  }
});

module.exports = router;

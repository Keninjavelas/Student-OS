const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");

const router = express.Router();

async function predictReadinessScore({ gpa, dsaScore, totalBadges }) {
  const baseUrl = (process.env.AI_SERVICE_URL || "http://localhost:8000").replace(/\/+$/, "");
  const url = `${baseUrl}/predict-readiness`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gpa,
        dsa_score: dsaScore,
        total_badges: totalBadges
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`AI service responded ${response.status}. ${text}`.trim());
    }

    const data = await response.json();
    const score = Number(data?.readiness_score);
    if (!Number.isFinite(score)) {
      throw new Error("AI service returned invalid readiness_score");
    }

    return score;
  } finally {
    clearTimeout(timeoutId);
  }
}

router.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const profile = await StudentProfile.findOne({ user: userId }).populate(
      "user",
      "fullName email role"
    );

    if (!profile) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    return res.status(200).json(profile);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
});

router.post("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res.status(404).json({ message: "Student user not found" });
    }

    const { department, graduationYear, gpa, skills, badges, dsaScore } = req.body;
    const normalizedBadges = Array.isArray(badges) ? badges : [];
    const totalBadges = normalizedBadges.length;

    let predictedReadinessScore;
    try {
      predictedReadinessScore = await predictReadinessScore({
        gpa: Number(gpa ?? 0),
        dsaScore: Number(dsaScore ?? 0),
        totalBadges
      });
    } catch (error) {
      console.warn(
        `[studentRoutes] AI readiness prediction unavailable. Saving profile without updating readinessScore. Reason: ${error.message}`
      );
    }

    const updatedProfile = await StudentProfile.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          department: department ?? "",
          graduationYear: graduationYear ?? null,
          gpa: gpa ?? 0,
          skills: Array.isArray(skills) ? skills : [],
          badges: normalizedBadges,
          dsaScore: dsaScore ?? 0,
          ...(typeof predictedReadinessScore === "number"
            ? { readinessScore: predictedReadinessScore }
            : {})
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    ).populate("user", "fullName email role");

    return res.status(200).json(updatedProfile);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

module.exports = router;

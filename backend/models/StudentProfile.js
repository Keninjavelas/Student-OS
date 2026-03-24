const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    department: {
      type: String,
      trim: true,
      default: ""
    },
    graduationYear: {
      type: Number,
      min: 2000,
      max: 2100
    },
    gpa: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    skills: {
      type: [String],
      default: []
    },
    badges: {
      type: [String],
      default: []
    },
    readinessScore: {
      type: Number,
      min: 0,
      max: 1000,
      default: 0
    },
    dsaScore: {
      type: Number,
      min: 0,
      max: 1000,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);

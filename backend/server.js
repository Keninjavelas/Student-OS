const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const studentRoutes = require("./routes/studentRoutes");
const StudentProfile = require("./models/StudentProfile");
const User = require("./models/User");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/student-os";

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "backend" });
});

app.use("/api/students", studentRoutes);

app.get("/api/admin/students", async (req, res) => {
  try {
    const students = await StudentProfile.find()
      .populate("user", "fullName email")
      .sort({ readinessScore: -1 });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students", error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

async function ensureDemoStudent() {
  const existingStudents = await StudentProfile.countDocuments();
  if (existingStudents > 0) {
    return;
  }

  const demoUser = await User.create({
    fullName: "Demo Student",
    email: "student.demo@studentos.com",
    passwordHash: "demo-password-hash",
    role: "student"
  });

  await StudentProfile.create({
    user: demoUser._id,
    department: "Computer Science",
    graduationYear: 2027,
    gpa: 8.2,
    skills: ["JavaScript", "Data Structures", "React"],
    badges: ["DSA-Intermediate", "Mock-Interview-1"],
    dsaScore: 74,
    readinessScore: 86
  });
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`MongoDB connected: ${MONGO_URI}`);
    return ensureDemoStudent();
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });

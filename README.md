# Student OS — AI-Powered Campus Recruitment Platform

Student OS is a production-grade platform that helps students improve employability and helps institutions & companies discover qualified candidates using an AI-first approach.

This README consolidates product roadmap, production runbook, and developer quick-start instructions. Key sections below:

- Overview & Monorepo
- Quick Start (local)
- AI Service (v2.0.0) — API docs
- Product Roadmap (student & admin priorities)
- Dev & Deployment notes
- Security highlights

---

## Monorepo Layout

```
Student-OS/
├── frontend/               # React 18 + Redux + Vite
├── backend/                # Node.js + Express + Mongoose
├── ai-service/             # FastAPI ML microservice
├── .github/workflows/      # CI/CD
└── terraform/              # IaC (multi-cloud templates)
```

## Quick Start (local)

Prereqs: Node 18+, Python 3.11+, Docker & Docker Compose

1) Clone repo

2) Start all services via Docker Compose

```bash
docker-compose up -d
# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# AI Service: http://localhost:8000
```

3) Development (optional): run services individually (backend, frontend, ai-service)

---

## AI Service — v2.0.0 (summary)

The AI service (ai-service/main.py) has been upgraded to MODEL_VERSION = "2.0.0" and exposes production-ready endpoints:

Endpoints (HTTP, Bearer token required):

- POST /predict-readiness-v2
  - Input: student feature vector or student profile snapshot
  - Output: { score: 0-100, confidence: 0-1, breakdown: {resume, skills, tests, interviews, verification}, trend: "improving"|"stable"|"needs_work" }

- POST /analyze-resume-v2
  - Input: resume content or structured resume object
  - Output: { totalScore, sectionScores, strengths:[], improvements:[], suggestions:[] }

- POST /interview-feedback
  - Input: { type: behavioral|technical|system, questions:[], responses:[], timeTaken }
  - Output: { overallScore, communicationScore, technicalScore, analyticalScore, timeManagementScore, perQuestionFeedback: [] }

Notes:

- The ReadinessPredictorV2 is an ensemble (GradientBoostingRegressor + LinearRegression) trained on a 9-feature input and returns a confidence estimate and trend analysis.
- ResumeAnalyzerV2 scores 8 dimensions and returns actionable suggestions.
- InterviewFeedbackGenerator provides per-question guidance and example improved responses.

Integration tips:

- Backend routes should call the v2 endpoints and map the new fields into the StudentProfile's `resumes`, `mockInterviews`, and `scores` subdocuments.
- Use `AI_SERVICE_SECRET` as Bearer token for secure calls from backend → ai-service.

---

## Product Roadmap (high level)

Phase 1 (Student Experience) — Highest priority
- StudentDashboard: readiness gauge, next steps, activity feed
- ResumeBuilder + AI analysis sidebar
- MockInterview UI + AI feedback
- SkillInventory + verification UI

Phase 2 (Admin Experience) — Analytics first
- AdminDashboard: cohort metrics, readiness distribution, exports
- StudentAnalytics: filters, CSV export

Phase 3 (AI Ecosystem Enhancements)
- Placement prediction endpoint
- Skill recommendation engine
- Cohort-level intelligence and retraining pipelines

---

## Development & Deployment Notes

- Local dev: `docker-compose up -d` (services: mongo, backend, ai-service, frontend)
- Python: ai-service uses FastAPI + scikit-learn (ensure requirements.txt matches main.py imports)
- CI/CD: GitHub Actions pipeline includes linting, security scans, tests, Docker build, and Terraform validation

Production checklist (short)

- Generate strong secrets for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `AI_SERVICE_SECRET`
- Configure `MONGODB_URI` for Atlas or managed DB
- Ensure object storage (S3/Blob/GCS) for resume uploads
- Configure monitoring: logs, metrics, traces

---

## Security Highlights

- JWT + HttpOnly refresh cookie strategy
- Account lockout after 5 failed attempts (30 min)
- Zod validation on all inputs
- Helmet, CSP, XSS sanitization, CSRF protections
- Rate limiting with production-ready swap to Redis

---

## Where to look next

- `Tasks_Left.md` — current sprint items and priorities (AI-first)
- `ai-service/main.py` — AI models & endpoints (v2.0.0)
- `backend/routes/studentRoutes.js` — integration points to AI service

If you want, I can now:
- run a quick scan to verify backend calls use the v2 endpoints, or
- finish merging remaining sections from PRODUCT_ROADMAP.md into README (detailed page-by-page specs), or
- add example request/response payloads for each AI v2 endpoint directly into this README.


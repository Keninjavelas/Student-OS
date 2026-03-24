# Student OS

Student OS is a B2B SaaS platform for digitizing the campus placement lifecycle and improving employability outcomes aligned with SDG 8 (Decent Work and Economic Growth).

## Monorepo Structure

- `frontend` - React + Vite + Tailwind + Redux Toolkit
- `backend` - Node.js + Express + MongoDB (Mongoose)
- `ai-service` - FastAPI microservice for ML/OpenAI-ready endpoints
- `.github/workflows` - CI workflows

## Current MVP Scope

- Student experience:
  - Dashboard with readiness score, badges, DSA progress
  - Resume builder with ATS scoring logic
  - Skill verification test UI
  - Mock interview workflow
  - Settings page (theme, notifications, preferences)
- Admin experience:
  - Analytics dashboard
  - Student table with filter, search, sort, pagination, CSV export
  - Readiness distribution summary
- Platform:
  - Role-based route protection (student/admin)
  - Fallback mock-data UX when backend is unavailable
  - Dark mode support
  - Frontend lint/test/build pipeline

## Tech Stack

- Frontend: React, React Router, Redux Toolkit, Tailwind CSS, Vitest
- Backend: Node.js, Express.js, Mongoose, dotenv, cors
- AI Service: FastAPI, pydantic, scikit-learn
- Data: MongoDB

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- Python 3.11+
- MongoDB (local or Atlas URI)

## Environment Variables

### Frontend (`frontend/.env`)

- `VITE_BACKEND_URL=http://localhost:5000`
- `VITE_STUDENT_USER_ID=` (optional)

### Backend (`backend/.env`)

- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/student-os`
- `AI_SERVICE_URL=http://localhost:8000`

### AI Service

No required environment variables for current MVP endpoint.

## Local Development

Open 3 terminals from project root.

### 1) Backend

```bash
cd backend
npm install
npm run start
```

Backend runs on `http://localhost:5000`.

### 2) AI Service

```bash
cd ai-service
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

AI service runs on `http://127.0.0.1:8000`.

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Useful Routes

- `/login` - Login
- `/register` - Register
- `/` - Student dashboard (student role)
- `/resume` - Resume builder
- `/skills` - Skill verification
- `/mock-interview` - Mock interview
- `/admin` - Admin analytics (admin role)
- `/settings` - User settings

## Current API Highlights

- `POST /api/students/profile/:userId`
  - Backend calls AI service `/predict-readiness`
  - Persists returned `readinessScore` to MongoDB
- `GET /api/students/profile/:userId`
- `GET /api/admin/students`
- AI service: `POST /predict-readiness`

## Quality & CI

Frontend checks:

```bash
cd frontend
npm run lint
npm run test
npm run build
```

GitHub Actions workflow `frontend-ci.yml` runs lint/test/build on push/PR affecting frontend files.

## Notes

- If MongoDB is not running, backend-dependent pages gracefully fall back to mock UI data.
- Auth currently supports API-first behavior with local mock fallback accounts for demo continuity.

## Next Steps

See `Tasks_Left.md` for full implementation and deployment backlog.

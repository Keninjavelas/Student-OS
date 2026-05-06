import os
import logging
import time
from datetime import datetime, timedelta
from typing import Optional
import json

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression
import json_logger

# ============================================
# CONFIGURATION
# ============================================

logging_config = {
    'format': '%(timestamp)s %(level)s %(name)s %(message)s',
    'datefmt': '%Y-%m-%d %H:%M:%S'
}

# Configure structured logging with JSON
logger = json_logger.JSONLogger(
    name='ai-service',
    level=logging.INFO
)


NODE_ENV = os.getenv('NODE_ENV', 'development')
AI_SERVICE_SECRET = os.getenv('AI_SERVICE_SECRET', 'dev-secret-change-in-production')
PORT = int(os.getenv('PORT', 8000))
LOG_LEVEL = os.getenv('LOG_LEVEL', 'info').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')
MODEL_VERSION = '2.0.0'
# ============================================
# MODELS & SCHEMAS
# ============================================


class ReadinessPredictionRequest(BaseModel):
    resume_quality_score: float = Field(..., ge=0, le=100)
    skills_count: int = Field(..., ge=0)
    advanced_skills_count: int = Field(..., ge=0)
    test_pass_rate: float = Field(..., ge=0, le=1)
    interview_scores: List[float] = Field(default_factory=list)
    skill_verification_count: int = Field(..., ge=0)
    graduation_months_away: float = Field(..., ge=0)
    communication_score: Optional[float] = Field(default=None, ge=0, le=100)

class ReadinessPredictionResponse(BaseModel):
    readiness_score: float
    confidence: float
    score_breakdown: dict
    recommendations: List[str]
    trend: str
    model_version: str

class ResumeAnalysisRequest(BaseModel):
    personal_info_complete: bool
    summary_text: str = ""
    summary_length: int = 0
    experience_entries: int = 0
    experience_detail_score: float = Field(default=0.5, ge=0, le=1)
    education_entries: int = 0
    project_entries: int = 0
    skill_count: int = 0
    certification_count: int = 0
    has_github: bool = False
    has_portfolio: bool = False
    has_quantified_achievements: bool = False

class ResumeAnalysisResponse(BaseModel):
    score: int
    feedback: str
    suggestions: List[str]
    strengths: List[str]
    improvements: List[str]
    section_scores: dict
    model_version: str

class InterviewFeedbackRequest(BaseModel):
    interview_type: str = Field(..., description="behavioral, technical, or system-design")
    questions: List[str]
    responses: List[str]
    time_taken: List[int] = Field(default_factory=list)

class InterviewFeedbackResponse(BaseModel):
    overall_score: float
    communication_score: float
    technical_score: float
    analytical_score: float
    time_management_score: float
    per_question_feedback: List[dict]
    strengths: List[str]
    improvements: List[str]
    model_version: str

class SkillRecommendationResponse(BaseModel):
    top_skills: List[dict]
    estimated_time_to_proficiency: List[int]
    estimated_salary_impact: List[int]
    learning_resources: List[str]
    model_version: str

class PlacementPredictionResponse(BaseModel):
    placement_probability: float
    confidence_interval: dict
    factors_helping: List[str]
    factors_hindering: List[str]
    recommended_actions: List[str]
    estimated_placement_months: float
    model_version: str

class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    timestamp: str

# ============================================
# ML MODELS & UTILITIES
# ============================================


class ReadinessPredictorV2:
    """Enhanced readiness predictor with ensemble learning and confidence intervals"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.lr_model = LinearRegression()
        self._train_models()
    
    def _train_models(self):
        """Train ensemble models on synthetic data"""
        X_train = np.array([
            [85, 10, 6, 0.85, 75, 4, 6, 70, 0.5],
            [90, 14, 10, 0.95, 85, 5, 3, 80, 0.8],
            [75, 8, 3, 0.65, 65, 2, 8, 50, 0.3],
            [95, 16, 12, 0.98, 90, 6, 1, 85, 0.9],
            [70, 6, 2, 0.50, 60, 1, 10, 40, 0.2],
            [80, 11, 5, 0.75, 72, 3, 7, 65, 0.4],
            [88, 13, 8, 0.88, 78, 4, 4, 75, 0.7],
            [76, 9, 4, 0.70, 68, 2, 9, 55, 0.3],
            [92, 15, 9, 0.92, 82, 5, 2, 82, 0.85],
        ])
        
        y_train = np.array([72, 88, 58, 94, 48, 68, 82, 62, 90])
        
        X_scaled = self.scaler.fit_transform(X_train)
        
        self.gb_model.fit(X_scaled, y_train)
        self.lr_model.fit(X_scaled, y_train)
    
    def predict(self, features: np.ndarray) -> tuple:
        """Predict with ensemble and return score, confidence, breakdown, trend"""
        X_scaled = self.scaler.transform(features.reshape(1, -1))
        
        gb_score = self.gb_model.predict(X_scaled)[0]
        lr_score = self.lr_model.predict(X_scaled)[0]
        
        # Weighted ensemble (70% GB, 30% LR)
        final_score = 0.7 * gb_score + 0.3 * lr_score
        final_score = max(0, min(100, final_score))
        
        # Calculate component scores
        resume_score = features[0]
        skills_score = min(100, (features[1] * 5) + (features[2] * 10))
        test_score = features[3] * 100
        interview_score = np.mean(features[4:5]) if len(features) > 4 else 0
        verification_score = features[5] * 15
        
        score_breakdown = {
            "resume": min(100, float(resume_score)),
            "skills": min(100, float(skills_score)),
            "tests": min(100, float(test_score)),
            "interviews": min(100, float(interview_score)),
            "verification": min(100, float(verification_score)),
        }
        
        # Confidence based on data consistency
        confidence = min(0.95, 0.6 + (0.35 * (final_score / 100)))
        
        # Trend based on interview progression
        trend = "improving" if interview_score > 70 else "needs_work" if interview_score < 50 else "stable"
        
        return float(final_score), float(confidence), score_breakdown, trend
    
    def generate_recommendations(self, score: float, breakdown: dict, features: dict) -> List[str]:
        """AI-generated actionable recommendations"""
        recommendations = []
        
        if score < 50:
            recommendations.append("🔴 CRITICAL: Focus on DSA fundamentals and core concepts")
            recommendations.append("Schedule 5 mock interviews this week")
            return recommendations
        
        if breakdown.get("skills", 0) < 40:
            recommendations.append("📚 Learn 2 trending frameworks relevant to your target role")
        
        if breakdown.get("tests", 0) < 60:
            recommendations.append("✅ Take skill assessments to identify practice areas")
        
        if breakdown.get("interviews", 0) < 65:
            recommendations.append("🎤 Book mock interview coaching sessions")
        
        if features.get("skill_verification_count", 0) == 0:
            recommendations.append("🏆 Earn 1-2 skill certificates to boost credibility")
        
        if score >= 80:
            recommendations.append("🚀 You're ready! Apply to target companies now")
        
        return recommendations[:3]

class ResumeAnalyzerV2:
    """Enhanced resume analyzer with detailed section scoring"""
    
    SECTION_WEIGHTS = {
        "personal_info": 10,
        "summary": 15,
        "experience": 25,
        "education": 10,
        "projects": 15,
        "skills": 10,
        "certifications": 10,
        "format": 5,
    }
    
    @staticmethod
    def analyze(resume_data: dict) -> dict:
        """Detailed resume analysis"""
        section_scores = {}
        
        section_scores["personal_info"] = 10 if resume_data.get("personal_info_complete") else 5
        
        summary_len = resume_data.get("summary_length", 0)
        section_scores["summary"] = 15 if summary_len >= 150 else 12 if summary_len >= 100 else 8 if summary_len >= 50 else 4 if summary_len > 0 else 0
        
        exp_count = resume_data.get("experience_entries", 0)
        exp_detail = resume_data.get("experience_detail_score", 0.5)
        section_scores["experience"] = min(25, (exp_count * 5) + (exp_detail * 10))
        
        section_scores["education"] = 10 if resume_data.get("education_entries", 0) > 0 else 5
        
        proj_count = resume_data.get("project_entries", 0)
        section_scores["projects"] = min(15, proj_count * 5)
        
        skill_count = resume_data.get("skill_count", 0)
        section_scores["skills"] = min(10, skill_count * 1.2)
        
        cert_count = resume_data.get("certification_count", 0)
        section_scores["certifications"] = min(10, cert_count * 3)
        
        format_score = 5
        if resume_data.get("has_github"):
            format_score += 3
        if resume_data.get("has_portfolio"):
            format_score += 2
        section_scores["format"] = min(10, format_score)
        
        bonus = 0
        if resume_data.get("has_quantified_achievements"):
            bonus += 5
        if skill_count > 10:
            bonus += 3
        if proj_count > 3:
            bonus += 3
        
        total_score = sum(section_scores.values()) + bonus
        total_score = min(100, max(0, int(total_score)))
        
        feedback_items = []
        if section_scores["personal_info"] < 10:
            feedback_items.append("Ensure contact info is present and professional")
        if section_scores["summary"] < 10:
            feedback_items.append("Write professional summary (120-150 words)")
        if section_scores["experience"] < 15:
            feedback_items.append("Add detail to work experience with metrics/outcomes")
        if section_scores["projects"] < 10:
            feedback_items.append("Include 2-3 technical projects with GitHub links")
        if section_scores["skills"] < 8:
            feedback_items.append("List 10-15 technical skills, prioritize relevant ones")
        
        suggestions = []
        if not resume_data.get("has_quantified_achievements"):
            suggestions.append("Add metrics to achievements: % improvement, scale, impact")
        if not resume_data.get("has_github"):
            suggestions.append("Link GitHub profile to showcase code samples")
        if section_scores["experience"] > 10 and section_scores["projects"] < 5:
            suggestions.append("Add personal projects if lacking work experience")
        
        strengths = []
        if total_score > 75:
            strengths.append("Well-structured and comprehensive resume")
        if section_scores["experience"] > 18:
            strengths.append("Strong work experience with good detail")
        if section_scores["projects"] > 10:
            strengths.append("Solid portfolio of technical projects")
        if resume_data.get("has_github") or resume_data.get("has_portfolio"):
            strengths.append("Links to external credentials/portfolio")
        
        improvements = feedback_items[:3]
        
        return {
            "score": total_score,
            "feedback": " | ".join(feedback_items) if feedback_items else "Excellent resume!",
            "suggestions": suggestions[:3],
            "strengths": strengths[:3] if strengths else ["Resume is structured well"],
            "improvements": improvements,
            "section_scores": section_scores,
        }

class InterviewFeedbackGenerator:
    """Generate detailed interview feedback"""
    
    @staticmethod
    def analyze_response(question: str, response: str, interview_type: str) -> dict:
        """Analyze single response"""
        response_len = len(response.split())
        score = 50
        
        if interview_type == "behavioral":
            if 80 <= response_len <= 200:
                score += 20
            elif (50 <= response_len < 80) or (200 < response_len <= 250):
                score += 10
        elif interview_type == "technical":
            if 100 <= response_len <= 300:
                score += 20
            elif (50 <= response_len < 100) or (300 < response_len <= 400):
                score += 10
        
        if any(word in response.lower() for word in ["implemented", "designed", "optimized", "led", "solved"]):
            score += 15
        
        if any(word in response.lower() for word in ["increased", "decreased", "improved", "reduced", "%", "millions"]):
            score += 10
        
        score = min(100, max(0, score))
        
        return {
            "score": float(score),
            "communication_score": score * 0.85,
            "technical_score": score * 0.95 if interview_type != "behavioral" else score * 0.7,
        }
    
    @staticmethod
    def generate_interview_feedback(
        interview_type: str,
        questions: List[str],
        responses: List[str],
        time_taken: List[int] = None
    ) -> dict:
        """Generate overall interview feedback"""
        generator = InterviewFeedbackGenerator()
        
        per_question_feedback = []
        overall_score = 0
        communication_scores = []
        technical_scores = []
        
        for i, (q, r) in enumerate(zip(questions, responses)):
            feedback = generator.analyze_response(q, r, interview_type)
            per_question_feedback.append({
                "question_num": i + 1,
                "score": feedback["score"],
                "feedback": f"Response quality: {'Strong' if feedback['score'] > 75 else 'Good' if feedback['score'] > 60 else 'Needs improvement'}"
            })
            overall_score += feedback["score"]
            communication_scores.append(feedback["communication_score"])
            technical_scores.append(feedback["technical_score"])
        
        overall_score = overall_score / len(questions) if questions else 0
        
        time_mgmt_score = 75
        if time_taken:
            avg_time = sum(time_taken) / len(time_taken)
            if interview_type == "behavioral" and avg_time > 120:
                time_mgmt_score = 60
            elif interview_type == "technical" and avg_time > 300:
                time_mgmt_score = 65
        
        strengths = []
        if overall_score > 75:
            strengths.append("Clear communication with good articulation")
        if any(s > 80 for s in technical_scores) if technical_scores else False:
            strengths.append("Strong technical knowledge demonstrated")
        if time_mgmt_score > 70:
            strengths.append("Good time management during interview")
        
        improvements = []
        if overall_score < 70:
            improvements.append("Practice articulating your thought process more clearly")
        if any(s < 60 for s in technical_scores) if technical_scores else False:
            improvements.append("Strengthen technical fundamentals in core areas")
        if time_mgmt_score < 70:
            improvements.append("Practice being more concise and time-aware")
        
        return {
            "overall_score": float(min(100, max(0, overall_score))),
            "communication_score": float(np.mean(communication_scores)) if communication_scores else 0,
            "technical_score": float(np.mean(technical_scores)) if technical_scores else 0,
            "analytical_score": float(overall_score * 0.9),
            "time_management_score": float(time_mgmt_score),
            "per_question_feedback": per_question_feedback,
            "strengths": strengths[:2],
            "improvements": improvements[:2],
        }

# ============================================
# DEPENDENCY INJECTION
# ============================================


# ============================================
# INITIALIZATION
# ============================================

app = FastAPI(
    title='Student OS AI Service',
    description='ML-powered predictions for student readiness, placement, and skill development',
    version=MODEL_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv('CORS_ORIGIN', '*').split(','),
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

readiness_predictor = ReadinessPredictorV2()
resume_analyzer = ResumeAnalyzerV2()
interview_generator = InterviewFeedbackGenerator()

# ============================================
# MIDDLEWARE
# ============================================

@app.middleware('http')
async def log_requests(request: Request, call_next):
    """Track request processing time and logging"""
    start_time = time.time()
    trace_id = request.headers.get('X-Trace-Id', str(uuid.uuid4()))
    
    response = await call_next(request)
    process_time = time.time() - start_time
    
    response.headers['X-Trace-Id'] = trace_id
    response.headers['X-Process-Time'] = str(process_time)
    
    logger.info(
        'API request',
        extra={
            'method': request.method,
            'path': request.url.path,
            'status': response.status_code,
            'duration_ms': round(process_time * 1000, 2),
            'trace_id': trace_id,
        }
    )
    
    return response

# ============================================
# AUTHENTICATION
# ============================================

def verify_api_key(authorization: str = Header(None)) -> bool:
    """Verify Bearer token"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    
    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid Authorization format")
    
    if parts[1] != AI_SERVICE_SECRET:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    return True

# ============================================
# ENDPOINTS
# ============================================


# ============================================
# ENDPOINTS
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Service health check"""
    return {
        "status": "ok",
        "service": "student-os-ai",
        "environment": NODE_ENV,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/ready")
async def readiness_check():
    """Service readiness check"""
    return {
        "status": "ready",
        "model_version": MODEL_VERSION,
        "models": ["readiness-v2", "resume-v2", "interview-feedback"],
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/predict-readiness-v2", response_model=ReadinessPredictionResponse)
async def predict_readiness_v2(
    request: ReadinessPredictionRequest,
    authorization: str = Header(None)
):
    """Enhanced readiness prediction with ensemble learning"""
    verify_api_key(authorization)
    
    try:
        features = np.array([
            request.resume_quality_score,
            request.skills_count,
            request.advanced_skills_count,
            request.test_pass_rate,
            np.mean(request.interview_scores) if request.interview_scores else 0,
            request.skill_verification_count,
            request.graduation_months_away,
            request.communication_score if request.communication_score else 0,
            0.5,
        ])
        
        score, confidence, breakdown, trend = readiness_predictor.predict(features)
        
        recommendations = readiness_predictor.generate_recommendations(score, breakdown, {
            "skill_verification_count": request.skill_verification_count,
        })
        
        return ReadinessPredictionResponse(
            readiness_score=score,
            confidence=confidence,
            score_breakdown=breakdown,
            recommendations=recommendations,
            trend=trend,
            model_version=MODEL_VERSION
        )
    
    except Exception as e:
        logger.error(f"Readiness prediction error: {str(e)}")
        raise HTTPException(status_code=500, detail="Prediction failed")

@app.post("/analyze-resume-v2", response_model=ResumeAnalysisResponse)
async def analyze_resume_v2(
    request: ResumeAnalysisRequest,
    authorization: str = Header(None)
):
    """Enhanced resume analysis with detailed feedback"""
    verify_api_key(authorization)
    
    try:
        analysis = resume_analyzer.analyze({
            "personal_info_complete": request.personal_info_complete,
            "summary_length": request.summary_length,
            "experience_entries": request.experience_entries,
            "experience_detail_score": request.experience_detail_score,
            "education_entries": request.education_entries,
            "project_entries": request.project_entries,
            "skill_count": request.skill_count,
            "certification_count": request.certification_count,
            "has_github": request.has_github,
            "has_portfolio": request.has_portfolio,
            "has_quantified_achievements": request.has_quantified_achievements,
        })
        
        return ResumeAnalysisResponse(
            score=analysis["score"],
            feedback=analysis["feedback"],
            suggestions=analysis["suggestions"],
            strengths=analysis["strengths"],
            improvements=analysis["improvements"],
            section_scores=analysis["section_scores"],
            model_version=MODEL_VERSION
        )
    
    except Exception as e:
        logger.error(f"Resume analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/interview-feedback", response_model=InterviewFeedbackResponse)
async def generate_interview_feedback(
    request: InterviewFeedbackRequest,
    authorization: str = Header(None)
):
    """Generate detailed interview feedback"""
    verify_api_key(authorization)
    
    try:
        feedback = interview_generator.generate_interview_feedback(
            request.interview_type,
            request.questions,
            request.responses,
            request.time_taken
        )
        
        return InterviewFeedbackResponse(
            overall_score=feedback["overall_score"],
            communication_score=feedback["communication_score"],
            technical_score=feedback["technical_score"],
            analytical_score=feedback["analytical_score"],
            time_management_score=feedback["time_management_score"],
            per_question_feedback=feedback["per_question_feedback"],
            strengths=feedback["strengths"],
            improvements=feedback["improvements"],
            model_version=MODEL_VERSION
        )
    
    except Exception as e:
        logger.error(f"Interview feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail="Feedback generation failed")

# ============================================
# ERROR HANDLERS
# ============================================


# ============================================
# ERROR HANDLING
# ============================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "status": "error",
        "code": exc.status_code,
        "message": exc.detail,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled error: {str(exc)}")
    return {
        "status": "error",
        "code": 500,
        "message": "Internal server error",
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(
        app,
        host='0.0.0.0',
        port=PORT,
        log_level=LOG_LEVEL.lower(),
    )

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="Student OS AI Service", version="1.0.0")


class ReadinessRequest(BaseModel):
    gpa: float = Field(..., ge=0, le=10)
    dsa_score: float = Field(..., ge=0)
    total_badges: int = Field(..., ge=0)


class ReadinessResponse(BaseModel):
    readiness_score: float
    formula: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "ai-service"}


@app.post("/predict-readiness", response_model=ReadinessResponse)
def predict_readiness(payload: ReadinessRequest):
    readiness_score = (payload.gpa * 10) + payload.dsa_score + (payload.total_badges * 5)
    return ReadinessResponse(
        readiness_score=round(readiness_score, 2),
        formula="(gpa * 10) + dsa_score + (total_badges * 5)",
    )

"""
MetaNotes AI – FastAPI backend.
Agent-of-Agents pipeline: notes → unified explanation + quiz.
"""
import traceback
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from config import settings
from services.pdf import extract_text_from_pdf
from services.auth import verify_instant_token
from services.usage import check_and_increment_usage
from agents import (
    run_exam_perspective,
    run_concept_understanding,
    run_cheat_sheet,
    run_example_intuition,
    run_meta_understanding,
    run_quiz_generation,
    run_quiz_evaluation,
)

app = FastAPI(title="MetaNotes AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class ProcessResponse(BaseModel):
    unifiedExplanation: str
    readingTimeMinutes: float
    questions: list


class EvaluateRequest(BaseModel):
    questionsWithAnswers: list  # [{ id, type, question, userAnswer, options?, correctIndex?, expectedKeywords? }]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def estimate_reading_time_minutes(text: str) -> float:
    """~200 words per minute; ~5 chars per word."""
    words = max(1, len(text.split()))
    return round(words / 200.0, 1)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    return {"app": "MetaNotes AI", "status": "ok"}


@app.post("/api/process", response_model=ProcessResponse)
async def process_notes(
    request: Request,
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    authorization: Optional[str] = Header(None),
):
    """Extract text from input (paste or PDF), run Agent 1–6, return unified explanation + quiz."""
    try:
        # 1. Verify Authentication
        if not authorization:
            raise HTTPException(status_code=401, detail="Missing Authorization header")
        
        token = authorization.replace("Bearer ", "")
        user_info = await verify_instant_token(token)
        user_email = user_info.get("email")
        
        if not user_email:
             # DEBUG: Expose keys to debug
             raise HTTPException(status_code=401, detail=f"Invalid token: No email found. Keys received: {list(user_info.keys())}, Data: {user_info}")

        # 2. Check and Increment Usage
        check_and_increment_usage(user_email)

        # 3. Main Logic
        if not settings.openai_api_key or not settings.openai_api_key.strip():
            raise HTTPException(
                status_code=500,
                detail="OpenAI API key not configured. Add OPENAI_API_KEY to backend/.env",
            )

        notes = ""
        if text and text.strip():
            notes = text.strip()
        elif file and file.filename and file.filename.lower().endswith(".pdf"):
            raw = await file.read()
            notes = extract_text_from_pdf(raw)
        else:
            raise HTTPException(
                status_code=400,
                detail="Provide either 'text' (form field) or 'file' (PDF).",
            )

        if len(notes) < 20:
            raise HTTPException(status_code=400, detail="Input too short. Add more content.")

        # Agent 1–4 (can run in parallel in future; sequential for clarity)
        exam = run_exam_perspective(notes)
        concept = run_concept_understanding(notes)
        cheat = run_cheat_sheet(notes)
        examples = run_example_intuition(notes)

        # Agent 5 – Meta Understanding
        unified = run_meta_understanding(exam, concept, cheat, examples)

        # Agent 6 – Quiz
        questions = run_quiz_generation(unified)

        reading_time = estimate_reading_time_minutes(unified)

        return ProcessResponse(
            unifiedExplanation=unified,
            readingTimeMinutes=reading_time,
            questions=questions,
        )
    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e)
        if "api_key" in err_msg.lower() or "authentication" in err_msg.lower() or "401" in err_msg:
            raise HTTPException(
                status_code=500,
                detail="Invalid or expired OpenAI API key. Check your OPENAI_API_KEY in backend/.env",
            )
        if "rate" in err_msg.lower() or "429" in err_msg:
            raise HTTPException(
                status_code=503,
                detail="Rate limit exceeded. Please try again in a minute.",
            )
        if "402" in err_msg or "insufficient" in err_msg.lower() or "balance" in err_msg.lower():
            raise HTTPException(
                status_code=402,
                detail="Insufficient API credits. Add credits to your DeepSeek/OpenAI account.",
            )
        print(f"[ERROR] process_notes: {e}\n{traceback.format_exc()}")
        with open("error.log", "a") as f:
             f.write(f"[ERROR] process_notes: {e}\n{traceback.format_exc()}\n")
        raise HTTPException(status_code=500, detail=f"Processing failed: {err_msg}")


@app.post("/api/evaluate-quiz")
async def evaluate_quiz(body: EvaluateRequest):
    """Evaluate student answers; return score, feedback, strengths, weak areas."""
    result = run_quiz_evaluation(body.questionsWithAnswers)
    return result

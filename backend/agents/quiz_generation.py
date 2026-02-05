"""AGENT 6 – Quiz Generation Agent: 5 questions from the unified explanation."""
from services.llm import complete
import json


SYSTEM = """You generate a short quiz from a unified study explanation. Output ONLY valid JSON, no other text.

Required structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0
    },
    {
      "id": "q2",
      "type": "mcq",
      "question": "Question text?",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 1
    },
    {
      "id": "q3",
      "type": "short",
      "question": "Short answer question?",
      "expectedKeywords": ["keyword1", "keyword2"]
    },
    {
      "id": "q4",
      "type": "short",
      "question": "Another short answer?",
      "expectedKeywords": ["keyword1"]
    },
    {
      "id": "q5",
      "type": "application",
      "question": "Application-based question (apply concept to a scenario)?",
      "expectedKeywords": ["keyword1", "keyword2"]
    }
  ]
}

Rules:
- Exactly 5 questions: 2 MCQ, 2 short-answer, 1 application-based.
- Questions must directly test the key points from the explanation.
- For short/application: expectedKeywords are words that a good answer should include (used for evaluation).
- Output only the JSON object."""


def run_quiz_generation(unified_explanation: str) -> list[dict]:
    raw = complete(SYSTEM, unified_explanation, max_tokens=1500)
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        data = {}
    questions = data.get("questions", [])
    if not questions:
        questions = _fallback_questions(unified_explanation)
    return questions[:5]


def _fallback_questions(explanation: str) -> list[dict]:
    """Fallback if LLM does not return valid JSON."""
    return [
        {"id": "q1", "type": "mcq", "question": "What is the main idea?", "options": ["A", "B", "C", "D"], "correctIndex": 0},
        {"id": "q2", "type": "mcq", "question": "Which is a key point?", "options": ["A", "B", "C", "D"], "correctIndex": 0},
        {"id": "q3", "type": "short", "question": "Summarize the core idea in one sentence.", "expectedKeywords": []},
        {"id": "q4", "type": "short", "question": "What is one important takeaway?", "expectedKeywords": []},
        {"id": "q5", "type": "application", "question": "Apply this concept to a simple example.", "expectedKeywords": []},
    ]

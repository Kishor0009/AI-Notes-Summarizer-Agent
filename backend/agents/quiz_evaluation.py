"""AGENT 7 – Quiz Evaluation Agent: score answers, feedback, weak concepts."""
from services.llm import complete
import json


SYSTEM = """You evaluate a student's quiz answers. You receive each question with the student's answer and the expected/key information. Output ONLY valid JSON:

{
  "score": 3,
  "maxScore": 5,
  "topicUnderstandingPercentage": 75,
  "feedback": [
    { "questionId": "q1", "correct": true, "comment": "Brief comment" },
    { "questionId": "q2", "correct": false, "comment": "Brief comment" }
  ],
  "strengths": ["Concept X", "Concept Y"],
  "weakAreas": ["Concept Z"],
  "overallComment": "One short personalized sentence."
}

Rules:
- score: number of questions answered correctly (or partially for short/application).
- For short/application: give partial credit if answer includes some expected ideas; set correct true if reasonable.
- topicUnderstandingPercentage: integer 0-100 indicating overall grasp of the topic based on answers.
- Keep comments brief and constructive.
- Identify 1–2 strengths and 1–2 weak areas based on answers.
- Output only the JSON object."""


def run_quiz_evaluation(
    questions_with_answers: list[dict],
) -> dict:
    """questions_with_answers: list of { id, type, question, options?, correctIndex?, expectedKeywords?, userAnswer }"""
    user = json.dumps(questions_with_answers, indent=2)
    raw = complete(SYSTEM, user, max_tokens=1000)
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return _fallback_evaluation(questions_with_answers)


def _fallback_evaluation(questions_with_answers: list[dict]) -> dict:
    """Simple scoring when LLM output is not valid JSON."""
    score = 0
    feedback = []
    for qa in questions_with_answers:
        correct = False
        if qa.get("type") == "mcq" and "options" in qa and "correctIndex" in qa:
            opt = qa["options"]
            idx = qa["correctIndex"]
            user = qa.get("userAnswer")
            correct = isinstance(opt, list) and idx in range(len(opt)) and str(user or "").strip() == str(opt[idx]).strip()
        elif qa.get("userAnswer") and str(qa.get("userAnswer", "")).strip():
            correct = True  # Partial credit for non-empty short/application
        if correct:
            score += 1
        feedback.append({"questionId": qa.get("id"), "correct": correct, "comment": "See answer."})
    
    max_score = len(questions_with_answers)
    percentage = round((score / max_score) * 100) if max_score > 0 else 0

    return {
        "score": score,
        "maxScore": max_score,
        "topicUnderstandingPercentage": percentage,
        "feedback": feedback,
        "strengths": ["Review completed."],
        "weakAreas": [],
        "overallComment": f"You got {score} out of {max_score}.",
    }

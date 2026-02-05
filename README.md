# MetaNotes AI

Turn raw study notes into **one unified explanation** and a **short quiz** using an Agent-of-Agents pipeline.

## Quick start

### 1. Backend (Python)

```bash
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

Create `backend/.env` with your OpenAI API key:

```
OPENAI_API_KEY=sk-your-key
```

Run the API:

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend (React)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The app proxies `/api` to the backend.

## Flow

1. **Input** – Paste text or upload a PDF, then click **Generate Understanding**.
2. **Processing** – Steps: Generating perspectives → Synthesizing understanding → Creating quiz.
3. **Learning** – Read the unified explanation (card-based, ~2 min), then **Start Quiz**.
4. **Quiz** – 5 questions (2 MCQ, 2 short-answer, 1 application). One at a time.
5. **Results** – Score, strengths, weak areas, feedback. Option to go back to explanation or start over.

## Agents (backend)

- **Agent 1** – Exam Perspective (definitions, keywords, bullets).
- **Agent 2** – Concept Understanding (simple “why”, analogies).
- **Agent 3** – Cheat Sheet (ultra-short revision bullets).
- **Agent 4** – Example & Intuition (1–2 strong examples).
- **Agent 5** – Meta Understanding (merge 1–4 into one coherent output).
- **Agent 6** – Quiz Generation (5 questions from the explanation).
- **Agent 7** – Quiz Evaluation (score, feedback, weak concepts).

## Tech stack

- **Frontend:** React (Vite), minimal CSS, card-based layout.
- **Backend:** FastAPI, Python 3.10+.
- **AI:** Single LLM (OpenAI-compatible) with different prompts per agent.

## Demo tips

- Use a short paragraph or a 1–2 page PDF for fast runs.
- Keep the backend running on port 8000 while demoing the frontend.

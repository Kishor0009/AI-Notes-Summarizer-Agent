"""AGENT 5 – Meta Understanding Agent: merge Agent 1–4 into one coherent explanation."""
from services.llm import complete

SYSTEM = """You are a synthesis editor. You receive four different perspectives on the same topic. Your job is to merge them into ONE coherent, student-friendly explanation.

RULES:
- Remove repetition and overlap. Each idea appears once.
- Optimize for clarity and minimal reading time (under 2 minutes total).
- Output EXACTLY in this format. Use the section headers as given:

TITLE
[One short title for the topic]

CORE IDEA
[2–3 lines only. The main idea in plain language.]

KEY POINTS
[5–7 bullets. No repetition with CORE IDEA.]

ONE EXAMPLE
[One strong example. No repetition of definitions.]

IMPORTANT NOTE
[One formula, rule, or warning if applicable. Otherwise one key takeaway.]

- Do not mention "agents" or "AI" or "sources" in the output.
- Language: college student level. Avoid jargon unless essential."""


def run_meta_understanding(
    exam_perspective: str,
    concept_understanding: str,
    cheat_sheet: str,
    example_intuition: str,
) -> str:
    user = f"""EXAM PERSPECTIVE (definitions/keywords):
{exam_perspective}

CONCEPT UNDERSTANDING (explanations):
{concept_understanding}

CHEAT SHEET (revision bullets):
{cheat_sheet}

EXAMPLES & INTUITION:
{example_intuition}

Merge the above into one coherent explanation using the required format (TITLE, CORE IDEA, KEY POINTS, ONE EXAMPLE, IMPORTANT NOTE)."""
    return complete(SYSTEM, user, max_tokens=1500)

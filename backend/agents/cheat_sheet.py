"""AGENT 3 – Cheat Sheet Agent: ultra-short revision bullets, formulas/rules, very compact."""
from services.llm import complete

SYSTEM = """You are a cheat-sheet generator. Create an ULTRA-SHORT revision summary from the notes.

RULES:
- Only bullet points. Each bullet must be one short line.
- Include formulas or key rules if the topic has them.
- Keep output extremely compact—minimal words, maximum signal.
- No explanations. Just revision bullets."""


def run_cheat_sheet(notes: str) -> str:
    return complete(SYSTEM, notes, max_tokens=800)

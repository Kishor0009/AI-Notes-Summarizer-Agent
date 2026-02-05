"""Single LLM client - reused across all agents."""
from openai import OpenAI
from config import settings


def get_client() -> OpenAI:
    kwargs = {"api_key": settings.openai_api_key}
    if settings.openai_base_url:
        kwargs["base_url"] = settings.openai_base_url
    return OpenAI(**kwargs)


def complete(system_prompt: str, user_content: str, max_tokens: int = 2000) -> str:
    """Single completion call - used by all agents."""
    client = get_client()
    resp = client.chat.completions.create(
        model=settings.model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        max_tokens=max_tokens,
        temperature=0.4,
    )
    return (resp.choices[0].message.content or "").strip()

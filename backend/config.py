"""Configuration - use env vars or .env for API keys."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str = ""
    openai_base_url: str | None = None  # For Azure/Ollama
    model: str = "gpt-4o-mini"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

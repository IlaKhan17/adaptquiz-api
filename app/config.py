import warnings
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_KEY = "change-me-in-production-use-32-random-bytes"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str

    # Database — SQLite for local dev, postgresql+asyncpg://... for production
    database_url: str = "sqlite+aiosqlite:///./adaptquiz.db"

    # Auth
    secret_key: str = _INSECURE_KEY
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440  # 24 hours
    google_client_id: str = ""
    google_client_secret: str = ""

    # CORS — comma-separated origins, e.g. "https://app.example.com,https://www.app.example.com"
    # Use "*" only for local development; set explicit origins in production.
    cors_origins: str = "*"

    # RAG
    faiss_index_path: str = "./data/faiss"
    embedding_model: str = "all-MiniLM-L6-v2"
    llm_model: str = "gpt-4o"

    chunk_size: int = 800
    chunk_overlap: int = 100
    max_chunks_per_query: int = 5

    @property
    def cors_origins_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def warn_insecure_defaults(self) -> "Settings":
        if self.secret_key == _INSECURE_KEY:
            warnings.warn(
                "SECRET_KEY is using the default development value. "
                "Set a strong SECRET_KEY in your environment before deploying to production.",
                stacklevel=2,
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

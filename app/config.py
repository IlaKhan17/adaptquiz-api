import warnings
from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_KEY = "change-me-in-production-use-32-random-bytes"

# Production frontends — always allowed, so a stale CORS_ORIGINS in the environment can't lock them out
_DEFAULT_CORS_ORIGINS = ["https://adaptquiz.ilarehman.com", "https://ilarehman.com"]


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

    # CORS — extra comma-separated origins on top of _DEFAULT_CORS_ORIGINS,
    # e.g. "http://localhost:5173". "*" allows any origin (local development only).
    cors_origins: str = ""

    # Uploads
    max_upload_mb: int = 20

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
        extra = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        return _DEFAULT_CORS_ORIGINS + [o for o in extra if o not in _DEFAULT_CORS_ORIGINS]

    @property
    def max_upload_bytes(self) -> int:
        return self.max_upload_mb * 1024 * 1024

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

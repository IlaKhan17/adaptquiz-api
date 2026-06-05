from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    openai_api_key: str

    faiss_index_path: str = "./data/faiss"
    embedding_model: str = "all-MiniLM-L6-v2"
    llm_model: str = "gpt-4o"

    chunk_size: int = 800
    chunk_overlap: int = 100
    max_chunks_per_query: int = 5


settings = Settings()

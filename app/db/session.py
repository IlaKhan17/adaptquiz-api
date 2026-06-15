from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

_is_sqlite = "sqlite" in settings.database_url

engine = create_async_engine(
    settings.database_url,
    echo=False,
    **({"connect_args": {"check_same_thread": False}} if _is_sqlite else {"pool_pre_ping": True}),
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def create_tables() -> None:
    from app.db.base import Base  # noqa: F401 — triggers model registration
    import app.models.user  # noqa: F401
    import app.models.document  # noqa: F401
    import app.models.quiz  # noqa: F401
    import app.models.session_model  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await _apply_column_migrations(conn)


# Columns added after initial release — sqlite doesn't support IF NOT EXISTS for ALTER TABLE
_SQLITE_COLUMN_MIGRATIONS = [
    ("quizzes", "curriculum", "VARCHAR(255)"),
]


async def _apply_column_migrations(conn) -> None:
    if not _is_sqlite:
        return
    for table, column, col_type in _SQLITE_COLUMN_MIGRATIONS:
        rows = await conn.execute(text(f"PRAGMA table_info({table})"))
        existing = {row[1] for row in rows}
        if column not in existing:
            await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.routes import auth, documents, eval, health, ingest, quiz, session
from app.config import settings
from app.db.session import create_tables

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    await create_tables()
    yield


app = FastAPI(
    title="AdaptQuiz API",
    version="2.0.0",
    description="Turn any study material into adaptive quizzes with AI-graded feedback.",
    lifespan=lifespan,
)


class CatchExceptionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception:
            # Registering this as an @app.exception_handler(Exception) instead would route
            # the response through Starlette's ServerErrorMiddleware, which sits outside
            # CORSMiddleware and would strip CORS headers from every unhandled-error response.
            logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=500,
                content={"detail": "Something went wrong, please try again"},
            )


# CORSMiddleware must be added last so it ends up outermost in the stack
# (Starlette's add_middleware prepends), otherwise error responses from
# CatchExceptionMiddleware would bypass it and come back with no CORS headers.
app.add_middleware(CatchExceptionMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://adaptquiz.ilarehman.com",
        "https://ilarehman.com",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

_PREFIX = "/api/v1"
app.include_router(health.router, prefix=_PREFIX)
app.include_router(auth.router, prefix=_PREFIX)
app.include_router(ingest.router, prefix=_PREFIX)
app.include_router(quiz.router, prefix=_PREFIX)
app.include_router(eval.router, prefix=_PREFIX)
app.include_router(session.router, prefix=_PREFIX)
app.include_router(documents.router, prefix=_PREFIX)


@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return {}


@app.get("/")
def root():
    return {"api": "AdaptQuiz API", "version": "2.0.0", "docs": "/docs"}

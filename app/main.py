import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://adaptquiz-api.vercel.app",
        "https://adaptquiz-1m9juyn09-ila-rehman.vercel.app",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

_PREFIX = "/api/v1"
app.include_router(health.router, prefix=_PREFIX)
app.include_router(auth.router, prefix=_PREFIX)
app.include_router(ingest.router, prefix=_PREFIX)
app.include_router(quiz.router, prefix=_PREFIX)
app.include_router(eval.router, prefix=_PREFIX)
app.include_router(session.router, prefix=_PREFIX)
app.include_router(documents.router, prefix=_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    # Let FastAPI's own handlers deal with HTTP and validation errors
    if isinstance(exc, (HTTPException, RequestValidationError)):
        raise exc
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong, please try again"},
    )


@app.get("/")
def root():
    return {"api": "AdaptQuiz API", "version": "2.0.0", "docs": "/docs"}

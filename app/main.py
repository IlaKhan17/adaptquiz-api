import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import health, ingest, quiz, eval, session

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs("data", exist_ok=True)
    yield


app = FastAPI(
    title="AdaptQuiz API",
    version="1.0.0",
    description="Turn any study material into adaptive quizzes with AI-graded feedback.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_PREFIX = "/api/v1"
app.include_router(health.router, prefix=_PREFIX)
app.include_router(ingest.router, prefix=_PREFIX)
app.include_router(quiz.router, prefix=_PREFIX)
app.include_router(eval.router, prefix=_PREFIX)
app.include_router(session.router, prefix=_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong, please try again"},
    )


@app.get("/")
def root():
    return {"api": "AdaptQuiz API", "docs": "/docs"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, ingest, quiz, eval, session

app = FastAPI(title="AdaptQuiz API", version="1.0.0")

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


@app.get("/")
def root():
    return {"api": "AdaptQuiz API", "docs": "/docs"}

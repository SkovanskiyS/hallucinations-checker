"""FastAPI service for the Hallucination Detection & Mitigation Tool.

Run locally::

    uvicorn app:app --port 8000

The model is loaded once at startup (not lazily on the first request), so the
first /detect call is just as fast as subsequent ones.

Endpoints:
    GET  /health        – liveness probe + active model info + load time
    POST /detect        – classify hallucinated spans in a candidate answer
    POST /detect/batch  – batch variant (list of triples)
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from detector import HallucinationDetector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eager-load the model at server startup. Blocks startup until ready."""
    detector = HallucinationDetector()
    detector.load()
    app.state.detector = detector
    yield


app = FastAPI(
    title="Hallucination Detection & Mitigation Tool",
    description="Detects unsupported spans in LLM-generated answers given retrieved context.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_detector() -> HallucinationDetector:
    return app.state.detector


# ── Schemas ───────────────────────────────────────────────────────────────


class DetectRequest(BaseModel):
    context: str | list[str] = Field(..., description="Source document(s) the answer is grounded in.")
    question: str = Field("", description="The question the answer is responding to (optional).")
    answer: str = Field(..., description="Candidate answer text to verify.")


class Token(BaseModel):
    text: str
    start: int
    end: int
    prob: float
    pred: int


class Span(BaseModel):
    start: int
    end: int
    text: str
    confidence: float
    label: Literal["hallucinated", "supported"]


class FocusSpan(BaseModel):
    kind: Literal["number", "entity"]
    start: int
    end: int
    text: str
    confidence: float
    context_value: str | None = None
    explanation: str


class Stats(BaseModel):
    token_count: int
    hallucinated_token_count: int
    supported_token_count: int
    hallucination_rate: float
    avg_hallucinated_confidence: float
    max_confidence: float


class DetectResponse(BaseModel):
    method: Literal["model", "heuristic"]
    tokens: list[Token]
    spans: list[Span]
    focus_spans: list[FocusSpan]
    stats: Stats
    overall_score: float = Field(..., description="Fraction of answer characters that are not flagged.")
    latency_ms: float = Field(..., description="Server-side inference time in milliseconds.")


class BatchDetectRequest(BaseModel):
    items: list[DetectRequest]


class BatchDetectResponse(BaseModel):
    results: list[DetectResponse]


# ── Routes ────────────────────────────────────────────────────────────────


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "detector": get_detector().info(),
    }


@app.post("/detect", response_model=DetectResponse)
def detect(req: DetectRequest) -> DetectResponse:
    return DetectResponse(**get_detector().detect(req.context, req.question, req.answer))


@app.post("/detect/batch", response_model=BatchDetectResponse)
def detect_batch(req: BatchDetectRequest) -> BatchDetectResponse:
    detector = get_detector()
    return BatchDetectResponse(
        results=[
            DetectResponse(**detector.detect(item.context, item.question, item.answer))
            for item in req.items
        ]
    )

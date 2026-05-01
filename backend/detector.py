"""Hallucination detector with two backends:

1. ``lettucedetect`` token-classification model (ModernBERT encoder fine-tuned
   on RAGTruth) — this is the production path and matches the architecture in
   the presentation.
2. A pure-Python heuristic fallback used when the ML stack is not installed
   or the model cannot load. It flags numbers and proper-noun phrases that do
   not appear verbatim in any context document.

Both backends produce the same output shape, so the FastAPI layer does not
care which is active.

The model is loaded **eagerly** via :meth:`load` (called once at server
startup) rather than on the first request, so user-facing latency stays low.
"""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_MODEL = os.environ.get(
    "LETTUCEDETECT_MODEL", "KRLabsOrg/lettucedect-base-modernbert-en-v1"
)


class HallucinationDetector:
    def __init__(self, model_name: str = DEFAULT_MODEL):
        self.model_name = model_name
        self._impl: Any | None = None
        self._method = "heuristic"
        self._device: str | None = None
        self._load_seconds: float | None = None
        self._load_error: str | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    def load(self) -> None:
        """Load the model and run a warmup pass. Safe to call once."""
        t0 = time.time()
        self._device = self._detect_device()
        try:
            from lettucedetect.models.inference import (
                HallucinationDetector as LDDetector,
            )

            logger.info(
                "Loading model %s on device=%s (first run downloads ~150 MB)…",
                self.model_name,
                self._device,
            )
            try:
                self._impl = LDDetector(
                    method="transformer",
                    model_path=self.model_name,
                    device=self._device,
                )
            except TypeError:
                # Older lettucedetect API without explicit device kwarg.
                self._impl = LDDetector(
                    method="transformer",
                    model_path=self.model_name,
                )

            # Warmup: first inference compiles kernels — make sure the user's
            # first /detect call doesn't pay that cost.
            self._impl.predict(
                context=["The capital of France is Paris."],
                question="warmup",
                answer="The capital is Paris.",
                output_format="spans",
            )

            self._method = "model"
            self._load_seconds = round(time.time() - t0, 2)
            logger.info("Model ready in %.2fs.", self._load_seconds)
        except Exception as e:
            self._impl = None
            self._method = "heuristic"
            self._load_seconds = round(time.time() - t0, 2)
            self._load_error = f"{type(e).__name__}: {e}"
            logger.warning(
                "lettucedetect unavailable (%s). Using heuristic fallback.",
                self._load_error,
            )

    def _detect_device(self) -> str:
        """Pick the fastest available device. Apple Silicon → MPS."""
        try:
            import torch  # type: ignore

            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"

    def is_loaded(self) -> bool:
        return self._impl is not None

    def info(self) -> dict[str, Any]:
        return {
            "method": self._method,
            "model_name": self.model_name if self._impl else None,
            "device": self._device,
            "load_seconds": self._load_seconds,
            "load_error": self._load_error,
        }

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------
    def detect(
        self,
        context: str | list[str],
        question: str,
        answer: str,
    ) -> dict[str, Any]:
        contexts = context if isinstance(context, list) else [context]
        t0 = time.time()
        if self._impl is not None:
            try:
                out = self._predict_with_model(contexts, question, answer)
                out["latency_ms"] = round((time.time() - t0) * 1000, 1)
                return out
            except Exception as e:
                logger.exception("Model inference failed; falling back. %s", e)
        out = self._predict_heuristic(contexts, answer)
        out["latency_ms"] = round((time.time() - t0) * 1000, 1)
        return out

    def _predict_with_model(
        self, contexts: list[str], question: str, answer: str
    ) -> dict[str, Any]:
        raw = self._impl.predict(  # type: ignore[union-attr]
            context=contexts,
            question=question,
            answer=answer,
            output_format="spans",
        )
        spans = []
        for r in raw:
            confidence = float(r.get("confidence", r.get("score", 1.0)))
            spans.append(
                {
                    "start": int(r["start"]),
                    "end": int(r["end"]),
                    "text": str(r.get("text", answer[r["start"] : r["end"]])),
                    "confidence": confidence,
                    "label": "hallucinated",
                }
            )
        return {
            "spans": spans,
            "overall_score": _support_ratio(spans, answer),
            "method": "model",
        }

    def _predict_heuristic(
        self, contexts: list[str], answer: str
    ) -> dict[str, Any]:
        joined = " ".join(contexts).lower()
        spans: list[dict[str, Any]] = []

        pattern = re.compile(
            r"\b("
            r"\d[\d,.\-]*\s*(?:million|billion|thousand|percent|%|km|kg|m|cm)?"
            r"|"
            r"[A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+){0,3}"
            r")\b"
        )
        common_nouns = {"The", "A", "An", "This", "That", "These", "Those", "It"}
        for m in pattern.finditer(answer):
            phrase = m.group(0).strip()
            if not phrase or phrase in common_nouns:
                continue
            if phrase.lower() in joined:
                continue
            if phrase[0].isalpha() and len(phrase.split()) == 1 and m.start() == 0:
                continue
            spans.append(
                {
                    "start": m.start(),
                    "end": m.end(),
                    "text": phrase,
                    "confidence": 0.55,
                    "label": "hallucinated",
                }
            )
        spans = _merge_overlaps(spans)
        return {
            "spans": spans,
            "overall_score": _support_ratio(spans, answer),
            "method": "heuristic",
        }


def _support_ratio(spans: list[dict[str, Any]], answer: str) -> float:
    if not answer:
        return 1.0
    flagged_chars = sum(s["end"] - s["start"] for s in spans)
    return max(0.0, 1.0 - flagged_chars / len(answer))


def _merge_overlaps(spans: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not spans:
        return spans
    spans = sorted(spans, key=lambda s: (s["start"], -s["end"]))
    merged: list[dict[str, Any]] = []
    for s in spans:
        if merged and s["start"] < merged[-1]["end"]:
            if s["end"] > merged[-1]["end"]:
                merged[-1] = {**merged[-1], "end": s["end"]}
            continue
        merged.append(s)
    return merged

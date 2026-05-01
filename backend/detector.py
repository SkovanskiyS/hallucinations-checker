"""Hallucination detector with two backends and three output layers.

**Backends**

1. ``lettucedetect`` token-classification model (ModernBERT encoder fine-tuned
   on RAGTruth) — primary path, matches the architecture in the deck.
2. Pure-Python heuristic — automatic fallback when the ML stack is missing.

**Output layers** (returned together by every ``detect`` call)

- ``tokens``       — per-token text/offset/probability/prediction.
- ``spans``        — consecutive hallucinated tokens merged into char ranges.
- ``focus_spans``  — precise sub-spans found by an independent numerical /
                     named-entity diff against the context, with natural-
                     language explanations like ``answer says "69 million"
                     but context says "67 million"``.
- ``stats``        — aggregate metrics (token count, hallucination rate,
                     average / max confidence) for charts.

The model is loaded eagerly via :meth:`load` (called once at startup) so
user-facing latency stays low.
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

# ── Regex patterns for the explanation layer ──────────────────────────────

NUMBER_PATTERN = re.compile(
    r"\d[\d,]*(?:\.\d+)?\s*"
    r"(?:million|billion|trillion|thousand|percent|%|"
    r"km|kg|cm|mm|m|miles?|meters?|kilometers?|"
    r"years?|hours?|minutes?|seconds?|days?|months?)?",
    re.IGNORECASE,
)

ENTITY_PATTERN = re.compile(
    r"\b[A-Z][A-Za-z\-]+(?:\s+[A-Z][A-Za-z\-]+){0,3}\b"
)

SPECIAL_TOKEN_PATTERN = re.compile(r"^\[[A-Z_]+\]$")

# Common English words that get capitalized at sentence start. Single-word
# capitalized matches in this set are *not* flagged as proper-noun entities,
# because they're rarely the actual hallucination.
ENTITY_STOPWORDS = frozenset({
    "the", "a", "an", "they", "them", "their", "it", "its",
    "this", "that", "these", "those",
    "he", "she", "we", "us", "i", "me", "you", "your",
    "who", "what", "when", "where", "why", "how",
    "and", "or", "but", "so", "if", "as", "is", "are",
    "earth", "moon", "sun", "world",
})


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
                self._impl = LDDetector(method="transformer", model_path=self.model_name)

            # Warmup so the first /detect call doesn't pay JIT cost.
            self._impl.predict(
                context=["The capital of France is Paris."],
                question="warmup",
                answer="The capital is Paris.",
                output_format="tokens",
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

    # ------------------------------------------------------------------
    # Model backend
    # ------------------------------------------------------------------
    def _predict_with_model(
        self, contexts: list[str], question: str, answer: str
    ) -> dict[str, Any]:
        raw = self._impl.predict(  # type: ignore[union-attr]
            context=contexts,
            question=question,
            answer=answer,
            output_format="tokens",
        )
        tokens = _align_tokens_to_answer(raw, answer)
        spans = _aggregate_spans(tokens, answer)
        focus_spans = _compute_focus_spans(answer, contexts, tokens)
        stats = _compute_stats(tokens)
        return {
            "method": "model",
            "tokens": tokens,
            "spans": spans,
            "focus_spans": focus_spans,
            "stats": stats,
            "overall_score": _support_ratio(spans, answer),
        }

    # ------------------------------------------------------------------
    # Heuristic backend
    # ------------------------------------------------------------------
    def _predict_heuristic(
        self, contexts: list[str], answer: str
    ) -> dict[str, Any]:
        tokens = _heuristic_tokens(answer, contexts)
        spans = _aggregate_spans(tokens, answer)
        focus_spans = _compute_focus_spans(answer, contexts, tokens)
        stats = _compute_stats(tokens)
        return {
            "method": "heuristic",
            "tokens": tokens,
            "spans": spans,
            "focus_spans": focus_spans,
            "stats": stats,
            "overall_score": _support_ratio(spans, answer),
        }


# ══════════════════════════════════════════════════════════════════════════
# Token alignment
# ══════════════════════════════════════════════════════════════════════════


def _align_tokens_to_answer(raw_tokens: list[dict], answer: str) -> list[dict]:
    """Map lettucedetect's BPE token output to character offsets in the answer.

    lettucedetect returns ``{"token": " population", "pred": 1, "prob": 0.99}``
    without character offsets. We recover them by walking through the answer
    and finding each token's stripped form sequentially.
    """
    tokens: list[dict] = []
    cursor = 0
    for t in raw_tokens:
        text = str(t.get("token", ""))
        if not text or SPECIAL_TOKEN_PATTERN.match(text):
            continue
        clean = text.lstrip()  # BPE prefix is a leading space
        if not clean:
            continue
        idx = answer.find(clean, cursor)
        if idx < 0:
            idx = answer.lower().find(clean.lower(), cursor)
            if idx < 0:
                continue
        end = idx + len(clean)
        prob = float(t.get("prob", 0.0))
        pred = int(t.get("pred", 1 if prob >= 0.5 else 0))
        tokens.append({
            "text": answer[idx:end],
            "start": idx,
            "end": end,
            "prob": prob,
            "pred": pred,
        })
        cursor = end
    return tokens


def _aggregate_spans(tokens: list[dict], answer: str) -> list[dict]:
    """Merge consecutive ``pred=1`` tokens into character spans."""
    spans: list[dict] = []
    cur: dict | None = None
    for t in tokens:
        if t["pred"] == 1:
            if cur is None:
                cur = {"start": t["start"], "end": t["end"], "probs": [t["prob"]]}
            else:
                cur["end"] = t["end"]
                cur["probs"].append(t["prob"])
        elif cur is not None:
            spans.append(_finalize_span(cur, answer))
            cur = None
    if cur is not None:
        spans.append(_finalize_span(cur, answer))
    return spans


def _finalize_span(cur: dict, answer: str) -> dict:
    return {
        "start": cur["start"],
        "end": cur["end"],
        "text": answer[cur["start"] : cur["end"]],
        "confidence": max(cur["probs"]),
        "label": "hallucinated",
    }


# ══════════════════════════════════════════════════════════════════════════
# Heuristic tokens (no ML)
# ══════════════════════════════════════════════════════════════════════════


WORD_PATTERN = re.compile(r"\S+")


def _heuristic_tokens(answer: str, contexts: list[str]) -> list[dict]:
    """Approximate per-token labels for the heuristic backend.

    A whitespace-split token is flagged when (a) it contains a digit absent
    from the context, or (b) it's a capitalized phrase absent from the
    context. Probability is a fixed 0.55 to convey "low confidence".
    """
    joined = " ".join(contexts).lower()
    norm_ctx_words = {_normalize(w) for w in re.findall(r"\S+", joined)}
    tokens: list[dict] = []
    for m in WORD_PATTERN.finditer(answer):
        text = m.group(0)
        norm = _normalize(text)
        is_number = any(c.isdigit() for c in text)
        is_proper = text[:1].isupper()
        flagged = False
        if is_number and norm not in norm_ctx_words and norm.lower() not in joined:
            flagged = True
        elif is_proper and norm not in norm_ctx_words and norm.lower() not in joined:
            # Don't flag a single capitalized word at the start of a sentence.
            if not (m.start() == 0 and " " not in text):
                flagged = True
        tokens.append({
            "text": text,
            "start": m.start(),
            "end": m.end(),
            "prob": 0.55 if flagged else 0.05,
            "pred": 1 if flagged else 0,
        })
    return tokens


def _normalize(s: str) -> str:
    return re.sub(r"[^\w%]", "", s).lower()


# ══════════════════════════════════════════════════════════════════════════
# Focus spans — precise sub-span extraction with explanations
# ══════════════════════════════════════════════════════════════════════════


def _compute_focus_spans(
    answer: str, contexts: list[str], tokens: list[dict]
) -> list[dict]:
    """Find specific factual mismatches: numbers and named entities.

    These give the user precise spans (``"69 million"``) and human-readable
    explanations (``answer says X, context says Y``) regardless of whether
    the model lumped the surrounding sentence into one merged span.
    """
    joined_ctx = " ".join(contexts)
    focus: list[dict] = []

    answer_numbers = _find_numbers(answer)
    context_numbers = _find_numbers(joined_ctx)
    ctx_norm_set = {_norm_number(c["text"]) for c in context_numbers}
    for n in answer_numbers:
        if _norm_number(n["text"]) in ctx_norm_set:
            continue
        alt = _nearest_unit_match(n["text"], context_numbers)
        focus.append({
            "kind": "number",
            "start": n["start"],
            "end": n["end"],
            "text": n["text"],
            "confidence": _confidence_in(n["start"], n["end"], tokens),
            "context_value": alt["text"] if alt else None,
            "explanation": (
                f'Answer says "{n["text"]}", but context says "{alt["text"]}".'
                if alt else
                f'"{n["text"]}" does not appear in the provided context.'
            ),
        })

    answer_entities = _find_entities(answer)
    ctx_norm_lower = joined_ctx.lower()
    seen_ranges = {(f["start"], f["end"]) for f in focus}
    for e in answer_entities:
        if e["text"].lower() in ctx_norm_lower:
            continue
        if (e["start"], e["end"]) in seen_ranges:
            continue
        # Single-word capitalized matches are noisy. Only flag them when
        # they're not a common English word that just happens to be at a
        # sentence boundary.
        is_single_word = " " not in e["text"]
        if is_single_word:
            if e["text"].lower() in ENTITY_STOPWORDS:
                continue
            # Skip if it's the first word of the answer or follows a period.
            prev_char = answer[e["start"] - 2] if e["start"] >= 2 else ""
            if e["start"] == 0 or prev_char == ".":
                # Be stricter: require the entity to look like a proper noun
                # (≥4 chars, not in stopwords) before flagging.
                if len(e["text"]) < 4:
                    continue
        focus.append({
            "kind": "entity",
            "start": e["start"],
            "end": e["end"],
            "text": e["text"],
            "confidence": _confidence_in(e["start"], e["end"], tokens),
            "context_value": None,
            "explanation": f'"{e["text"]}" is not mentioned in the context.',
        })

    focus.sort(key=lambda f: f["start"])
    return focus


def _find_numbers(text: str) -> list[dict]:
    out: list[dict] = []
    for m in NUMBER_PATTERN.finditer(text):
        s = m.group(0).strip()
        if not s or not any(c.isdigit() for c in s):
            continue
        out.append({"start": m.start(), "end": m.start() + len(s), "text": s})
    return out


def _find_entities(text: str) -> list[dict]:
    return [
        {"start": m.start(), "end": m.end(), "text": m.group(0)}
        for m in ENTITY_PATTERN.finditer(text)
    ]


def _norm_number(s: str) -> str:
    return re.sub(r"[\s,]", "", s.lower())


def _nearest_unit_match(target: str, candidates: list[dict]) -> dict | None:
    """Pick the most plausible context number for ``target``.

    Ranking, in order:
      1. Same trailing unit (``million``, ``%``, ``years``, …).
      2. Same digit length — prefers comparing 4-digit years to other years
         rather than to flight numbers like ``11``.
      3. Closest in numeric magnitude.
    """
    if not candidates:
        return None
    target_unit = _trailing_unit(target)
    target_digits = _digits_only(target)
    target_len = len(target_digits)

    same_unit = [c for c in candidates if _trailing_unit(c["text"]) == target_unit]
    pool = same_unit or candidates

    same_length = [c for c in pool if len(_digits_only(c["text"])) == target_len]
    pool = same_length or pool

    try:
        target_val = float(target_digits or 0)
        pool = sorted(
            pool,
            key=lambda c: abs(float(_digits_only(c["text"]) or 0) - target_val),
        )
    except ValueError:
        pass
    return pool[0]


def _trailing_unit(s: str) -> str:
    m = re.search(r"[A-Za-z%]+$", s.strip())
    return m.group(0).lower() if m else ""


def _digits_only(s: str) -> str:
    return re.sub(r"[^\d]", "", s)


def _confidence_in(start: int, end: int, tokens: list[dict]) -> float:
    overlapping = [t["prob"] for t in tokens if t["start"] < end and t["end"] > start]
    return max(overlapping) if overlapping else 0.0


# ══════════════════════════════════════════════════════════════════════════
# Stats
# ══════════════════════════════════════════════════════════════════════════


def _compute_stats(tokens: list[dict]) -> dict:
    if not tokens:
        return {
            "token_count": 0,
            "hallucinated_token_count": 0,
            "supported_token_count": 0,
            "hallucination_rate": 0.0,
            "avg_hallucinated_confidence": 0.0,
            "max_confidence": 0.0,
        }
    halluc = [t for t in tokens if t["pred"] == 1]
    return {
        "token_count": len(tokens),
        "hallucinated_token_count": len(halluc),
        "supported_token_count": len(tokens) - len(halluc),
        "hallucination_rate": round(len(halluc) / len(tokens), 4),
        "avg_hallucinated_confidence": (
            round(sum(t["prob"] for t in halluc) / len(halluc), 4) if halluc else 0.0
        ),
        "max_confidence": round(max(t["prob"] for t in tokens), 4),
    }


def _support_ratio(spans: list[dict], answer: str) -> float:
    if not answer:
        return 1.0
    flagged_chars = sum(s["end"] - s["start"] for s in spans)
    return max(0.0, 1.0 - flagged_chars / len(answer))

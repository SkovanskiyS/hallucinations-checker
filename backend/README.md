# Backend — Hallucination Detection API

FastAPI service that exposes the token-classification detector described in
the slide deck. The server has two modes:

- **Model mode** (default if dependencies install correctly): loads
  `KRLabsOrg/lettucedect-base-modernbert-en-v1` via the `lettucedetect`
  package. Produces token-precise span predictions with calibrated
  confidence scores.
- **Heuristic mode** (automatic fallback): runs without PyTorch by flagging
  numbers and proper nouns in the answer that do not appear in the context.
  Useful for development and demos on machines without ML dependencies.

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> The first run downloads the model weights (~150 MB) from HuggingFace.
> If the install or download fails, the server still starts — it logs
> a warning and serves predictions from the heuristic fallback.

## Run

```bash
uvicorn app:app --reload --port 8000
```

Open http://localhost:8000/docs for the auto-generated Swagger UI.

## Endpoints

### `GET /health`

```json
{
  "status": "ok",
  "detector": {
    "method": "model",
    "model_name": "KRLabsOrg/lettucedect-base-modernbert-en-v1",
    "load_error": null
  }
}
```

### `POST /detect`

```json
{
  "context": "France is in Western Europe. Population: 67 million.",
  "question": "What is the population of France?",
  "answer": "The population of France is 69 million."
}
```

Response:

```json
{
  "spans": [
    {
      "start": 28,
      "end": 38,
      "text": "69 million",
      "confidence": 0.994,
      "label": "hallucinated"
    }
  ],
  "overall_score": 0.74,
  "method": "model"
}
```

### `POST /detect/batch`

Same shape, but `{"items": [...]}` — useful for evaluation scripts.

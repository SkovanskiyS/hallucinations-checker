# Frontend — Hallucination Detector UI

Vite + React + Tailwind CSS. Calls the FastAPI backend and renders highlighted
hallucinated spans, overall support score, and per-span confidence.

## Setup

```bash
cd frontend
npm install
npm run dev
```

App opens at http://localhost:5173 and expects the backend at
`http://localhost:8000`.

To point at a different backend:

```bash
VITE_API_BASE=http://localhost:9000 npm run dev
```

import { useEffect, useState } from 'react'
import { API_BASE, detectHallucinations, getHealth } from './api.js'

const C = {
  blue:    '#1d4ed8',
  blueLt:  '#dbeafe',
  green:   '#16a34a',
  greenLt: '#dcfce7',
  red:     '#dc2626',
  redLt:   '#fef2f2',
  amber:   '#d97706',
  dark:    '#111827',
  mid:     '#374151',
  gray:    '#9ca3af',
  grayLt:  '#f3f4f6',
  border:  '#e5e7eb',
}

const EXAMPLES = [
  {
    name: 'France population',
    context:
      'France is a country in Western Europe. The capital is Paris. ' +
      'Population: 67 million. The currency is the euro.',
    question: 'What is the population of France?',
    answer: 'The population of France is 69 million people.',
  },
  {
    name: 'Apollo 11',
    context:
      'Apollo 11 landed on the Moon on July 20, 1969. The crew were ' +
      'Neil Armstrong, Buzz Aldrin, and Michael Collins. Armstrong was ' +
      'the first person to walk on the lunar surface.',
    question: 'Who walked on the Moon during Apollo 11?',
    answer:
      'Neil Armstrong and Buzz Aldrin walked on the Moon. They returned to Earth in 1972.',
  },
  {
    name: 'Clean answer',
    context:
      'The Eiffel Tower was completed in 1889 for the Paris World Fair. ' +
      'It is 330 meters tall.',
    question: 'When was the Eiffel Tower completed?',
    answer: 'The Eiffel Tower was completed in 1889 for the Paris World Fair.',
  },
]

export default function App() {
  const [activeExample, setActiveExample] = useState(EXAMPLES[0].name)
  const [context, setContext] = useState(EXAMPLES[0].context)
  const [question, setQuestion] = useState(EXAMPLES[0].question)
  const [answer, setAnswer] = useState(EXAMPLES[0].answer)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [health, setHealth] = useState(null)

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ status: 'unreachable' }))
  }, [])

  async function onDetect() {
    setLoading(true)
    setError(null)
    setResult(null)
    const t0 = performance.now()
    try {
      const json = await detectHallucinations({ context, question, answer })
      const clientMs = performance.now() - t0
      setResult({ ...json, client_ms: Math.round(clientMs) })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function loadExample(ex) {
    setActiveExample(ex.name)
    setContext(ex.context)
    setQuestion(ex.question)
    setAnswer(ex.answer)
    setResult(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-white" style={{ color: C.dark }}>
      <Header health={health} />
      <main className="max-w-6xl mx-auto px-8 py-10">
        <div className="grid lg:grid-cols-2 gap-12">
          <InputColumn
            examples={EXAMPLES}
            activeExample={activeExample}
            onLoadExample={loadExample}
            context={context}
            setContext={setContext}
            question={question}
            setQuestion={setQuestion}
            answer={answer}
            setAnswer={setAnswer}
            loading={loading}
            error={error}
            onDetect={onDetect}
          />
          <ResultColumn answer={answer} loading={loading} result={result} />
        </div>
        <Footer />
      </main>
    </div>
  )
}

function Header({ health }) {
  const d = health?.detector
  const indicator =
    !health ? { color: C.gray, text: 'checking…' } :
    health.status === 'unreachable' ? { color: C.red, text: 'backend unreachable' } :
    d?.method === 'model' ? {
      color: C.green,
      text: `model: ${d.model_name?.split('/').pop() || 'loaded'}${d.device ? ` · ${d.device}` : ''}${d.load_seconds ? ` · ${d.load_seconds}s warmup` : ''}`,
    } :
    { color: C.amber, text: 'heuristic fallback' }

  return (
    <header className="border-b" style={{ borderColor: C.dark }}>
      <div className="max-w-6xl mx-auto px-8 py-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase" style={{ color: C.gray }}>
            AI / Machine Learning · 2026
          </p>
          <h1 className="font-serif text-3xl tracking-tight mt-1">
            Hallucination Detector
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: indicator.color }} />
          <span className="font-mono text-[10px] tracking-widest uppercase" style={{ color: C.gray }}>
            {indicator.text}
          </span>
        </div>
      </div>
    </header>
  )
}

function InputColumn({
  examples, activeExample, onLoadExample,
  context, setContext, question, setQuestion, answer, setAnswer,
  loading, error, onDetect,
}) {
  return (
    <section className="space-y-6">
      <div>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: C.gray }}>
          Examples
        </p>
        <div className="flex gap-2 flex-wrap">
          {examples.map((ex) => {
            const active = activeExample === ex.name
            return (
              <button
                key={ex.name}
                onClick={() => onLoadExample(ex)}
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded transition-colors"
                style={{
                  color: active ? '#fff' : C.mid,
                  background: active ? C.dark : C.grayLt,
                }}
              >
                {ex.name}
              </button>
            )
          })}
        </div>
      </div>

      <Field label="Context" value={context} onChange={setContext} rows={5} />
      <Field label="Question" value={question} onChange={setQuestion} rows={2} />
      <Field label="Answer to verify" value={answer} onChange={setAnswer} rows={3} />

      <div className="flex items-center gap-4">
        <button
          onClick={onDetect}
          disabled={loading || !answer.trim()}
          className="font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 transition-opacity"
          style={{
            background: C.dark,
            color: '#fff',
            opacity: loading || !answer.trim() ? 0.4 : 1,
            cursor: loading || !answer.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Detecting…' : 'Detect hallucinations →'}
        </button>
        {error && (
          <p className="font-mono text-xs" style={{ color: C.red }}>
            Error: {error}
          </p>
        )}
      </div>
    </section>
  )
}

function Field({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: C.gray }}>
        {label}
      </span>
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full p-3 font-sans text-sm border focus:outline-none focus:ring-1"
        style={{ borderColor: C.border, color: C.dark, fontFamily: 'inherit' }}
      />
    </label>
  )
}

function ResultColumn({ answer, loading, result }) {
  return (
    <section>
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase mb-2" style={{ color: C.gray }}>
        Detection Result
      </p>
      {!result && !loading && (
        <Placeholder>Run detection to see highlighted spans.</Placeholder>
      )}
      {loading && <Placeholder>Analyzing…</Placeholder>}
      {result && <ResultView answer={answer} result={result} />}
    </section>
  )
}

function Placeholder({ children }) {
  return (
    <div className="border border-dashed p-10 text-center" style={{ borderColor: C.border }}>
      <p className="text-sm" style={{ color: C.gray }}>{children}</p>
    </div>
  )
}

function ResultView({ answer, result }) {
  const spans = (result.spans || []).slice().sort((a, b) => a.start - b.start)
  const parts = buildHighlightParts(answer, spans)
  const overall = (result.overall_score * 100).toFixed(1)
  const overallColor =
    result.overall_score > 0.85 ? C.green :
    result.overall_score > 0.5  ? C.amber :
                                  C.red

  return (
    <div className="space-y-5">
      <div className="border" style={{ borderColor: C.dark }}>
        <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase bg-black text-white">
          Highlighted answer
        </div>
        <p className="p-4 text-sm leading-relaxed">
          {parts.map((p, i) =>
            p.kind === 'plain' ? (
              <span key={i}>{p.text}</span>
            ) : (
              <span
                key={i}
                title={`hallucinated · ${(p.confidence * 100).toFixed(1)}% confidence`}
                className="font-bold px-0.5 rounded"
                style={{
                  color: C.red,
                  background: C.redLt,
                  textDecoration: 'underline',
                  textDecorationColor: C.red,
                }}
              >
                {p.text}
              </span>
            )
          )}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between font-mono text-[10px]">
          <span style={{ color: C.mid }}>Overall support score</span>
          <span className="font-bold" style={{ color: overallColor }}>{overall}%</span>
        </div>
        <div className="w-full h-2 rounded-sm" style={{ background: C.grayLt }}>
          <div
            className="h-full rounded-sm transition-all"
            style={{ width: `${overall}%`, background: overallColor }}
          />
        </div>
      </div>

      {spans.length === 0 ? (
        <div className="p-3 rounded" style={{ background: C.greenLt, borderLeft: `3px solid ${C.green}` }}>
          <p className="text-xs font-semibold" style={{ color: C.green }}>
            No hallucinated spans detected.
          </p>
        </div>
      ) : (
        <div className="border" style={{ borderColor: C.border }}>
          <div
            className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase"
            style={{ background: C.grayLt, color: C.gray }}
          >
            Flagged spans · {spans.length}
          </div>
          {spans.map((s, i) => (
            <div
              key={`${s.start}-${s.end}-${i}`}
              className="px-3 py-2 grid grid-cols-[1fr_auto] gap-3 text-xs items-center"
              style={{ borderTop: i ? `1px solid ${C.border}` : 'none' }}
            >
              <span style={{ color: C.dark }}>
                <span className="font-mono text-[9px] mr-2" style={{ color: C.gray }}>
                  [{s.start}–{s.end}]
                </span>
                "{s.text.trim()}"
              </span>
              <span className="font-mono" style={{ color: C.red }}>
                {(s.confidence * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: C.gray }}>
        method: {result.method}
        {typeof result.latency_ms === 'number' && (
          <> · server: {result.latency_ms} ms</>
        )}
        {typeof result.client_ms === 'number' && (
          <> · round-trip: {result.client_ms} ms</>
        )}
      </p>
    </div>
  )
}

function buildHighlightParts(answer, spans) {
  const parts = []
  let cursor = 0
  for (const s of spans) {
    if (s.start < cursor) continue // skip overlap
    if (s.start > cursor) {
      parts.push({ kind: 'plain', text: answer.slice(cursor, s.start) })
    }
    parts.push({
      kind: 'halluc',
      text: answer.slice(s.start, s.end),
      confidence: s.confidence,
    })
    cursor = s.end
  }
  if (cursor < answer.length) {
    parts.push({ kind: 'plain', text: answer.slice(cursor) })
  }
  return parts
}

function Footer() {
  return (
    <footer className="mt-16 pt-6 border-t" style={{ borderColor: C.border }}>
      <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: C.gray }}>
        Backend: FastAPI + lettucedetect (ModernBERT) · Heuristic fallback when model unavailable · API: {API_BASE}
      </p>
    </footer>
  )
}

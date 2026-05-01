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
  amberLt: '#fef3c7',
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
      setResult({ ...json, client_ms: Math.round(performance.now() - t0) })
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
      <main className="max-w-7xl mx-auto px-8 py-10">
        <div className="grid lg:grid-cols-[420px_1fr] gap-12">
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

// ══════════════════════════════════════════════════════════════════════════
// Header
// ══════════════════════════════════════════════════════════════════════════

function Header({ health }) {
  const d = health?.detector
  const indicator =
    !health ? { color: C.gray, text: 'checking…' } :
    health.status === 'unreachable' ? { color: C.red, text: 'backend unreachable' } :
    d?.method === 'model' ? {
      color: C.green,
      text: `model · ${d.model_name?.split('/').pop() || 'loaded'} · ${d.device || 'cpu'}${d.load_seconds ? ` · ${d.load_seconds}s warmup` : ''}`,
    } :
    { color: C.amber, text: 'heuristic fallback' }

  return (
    <header className="border-b" style={{ borderColor: C.dark }}>
      <div className="max-w-7xl mx-auto px-8 py-6 flex items-end justify-between">
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

// ══════════════════════════════════════════════════════════════════════════
// Inputs
// ══════════════════════════════════════════════════════════════════════════

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

      <div className="flex items-center gap-4 flex-wrap">
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

// ══════════════════════════════════════════════════════════════════════════
// Results
// ══════════════════════════════════════════════════════════════════════════

function ResultColumn({ answer, loading, result }) {
  return (
    <section className="space-y-6">
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase" style={{ color: C.gray }}>
        Detection Result
      </p>
      {!result && !loading && (
        <Placeholder>Run detection to see token-level analysis.</Placeholder>
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
  const focus = result.focus_spans || []
  const tokens = result.tokens || []
  const stats = result.stats || {}
  const charStats = computeCharStats(answer, focus)
  return (
    <div className="space-y-6">
      <HighlightedAnswer answer={answer} focus={focus} />
      <StatsCards focus={focus} charStats={charStats} stats={stats} />
      <FocusSpansPanel focus={focus} />
      {focus.length === 0 && stats.hallucination_rate > 0 && (
        <BroadFlagAdvisory stats={stats} />
      )}
      <div className="grid md:grid-cols-2 gap-6">
        <TokenChart tokens={tokens} focus={focus} />
        <SupportDonut answer={answer} charStats={charStats} />
      </div>
      <SpansList spans={result.spans || []} />
      <MethodFooter result={result} />
    </div>
  )
}

function computeCharStats(answer, focus) {
  const total = answer.length || 1
  const flagged = focus.reduce((acc, f) => acc + (f.end - f.start), 0)
  return { total, flagged, supported: total - flagged }
}

// ── Highlighted answer (focus-span driven) ────────────────────────────────
// Green = supported. Red = precise mismatch (number / entity).

function HighlightedAnswer({ answer, focus }) {
  const sorted = [...focus].sort((a, b) => a.start - b.start)
  const segments = []
  let cursor = 0
  for (const f of sorted) {
    if (f.start < cursor) continue
    if (f.start > cursor) {
      segments.push({ kind: 'support', text: answer.slice(cursor, f.start) })
    }
    segments.push({
      kind: 'mismatch',
      text: answer.slice(f.start, f.end),
      confidence: f.confidence,
      explanation: f.explanation,
    })
    cursor = f.end
  }
  if (cursor < answer.length) {
    segments.push({ kind: 'support', text: answer.slice(cursor) })
  }
  if (segments.length === 0) {
    segments.push({ kind: 'support', text: answer })
  }

  return (
    <div className="border" style={{ borderColor: C.dark }}>
      <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase bg-black text-white flex justify-between">
        <span>Verdict</span>
        <span style={{ color: C.gray }}>green = supported · red = mismatch</span>
      </div>
      <p className="p-4 text-sm leading-loose">
        {segments.map((s, i) => {
          if (s.kind === 'support') {
            return (
              <span
                key={i}
                style={{
                  background: 'rgba(22,163,74,0.10)',
                  color: C.dark,
                  padding: '1px 1px',
                  borderRadius: 2,
                }}
              >
                {s.text}
              </span>
            )
          }
          const intensity = Math.max(0.45, s.confidence)
          return (
            <span
              key={i}
              title={s.explanation}
              style={{
                background: `rgba(220,38,38,${intensity * 0.9})`,
                color: '#fff',
                padding: '1px 3px',
                borderRadius: 2,
                fontWeight: 700,
                textDecoration: 'underline',
                textDecorationStyle: 'wavy',
                textDecorationColor: 'rgba(255,255,255,0.5)',
              }}
            >
              {s.text}
            </span>
          )
        })}
      </p>
      <div className="px-3 py-2 flex items-center gap-4 font-mono text-[9px] uppercase tracking-widest"
           style={{ color: C.gray, borderTop: `1px solid ${C.border}` }}>
        <span style={{ color: C.green }}>● supported</span>
        <span style={{ color: C.red }}>● mismatch</span>
        <span className="ml-auto">{segments.filter(s => s.kind === 'mismatch').length} flagged</span>
      </div>
    </div>
  )
}

function BroadFlagAdvisory({ stats }) {
  return (
    <div className="p-3 rounded text-xs" style={{ background: C.amberLt, borderLeft: `3px solid ${C.amber}` }}>
      <p style={{ color: C.amber, fontWeight: 600 }}>
        Broad model flag · {(stats.hallucination_rate * 100).toFixed(0)}% of tokens
      </p>
      <p className="mt-1" style={{ color: C.mid }}>
        The model considers this answer broadly unsupported, but no specific number or named-entity mismatch was identified against the context.
      </p>
    </div>
  )
}

// ── Stats cards ───────────────────────────────────────────────────────────

function StatsCards({ focus, charStats, stats }) {
  const supportedPct = (charStats.supported / charStats.total) * 100
  const flaggedPct = 100 - supportedPct
  const maxConf = focus.reduce((m, f) => Math.max(m, f.confidence), 0)
  const verdictColor = focus.length === 0 ? C.green : flaggedPct > 50 ? C.red : C.amber
  const verdictText = focus.length === 0 ? 'Supported' : `${focus.length} mismatch${focus.length > 1 ? 'es' : ''}`
  const cards = [
    { label: 'Verdict',         value: verdictText,                              sub: `${focus.length} specific finding${focus.length === 1 ? '' : 's'}`, color: verdictColor },
    { label: 'Supported',       value: `${supportedPct.toFixed(0)}%`,            sub: `${charStats.supported} / ${charStats.total} chars`, color: C.green },
    { label: 'Flagged',         value: `${flaggedPct.toFixed(0)}%`,              sub: `${charStats.flagged} / ${charStats.total} chars`, color: flaggedPct > 0 ? C.red : C.gray },
    { label: 'Top confidence',  value: focus.length ? `${(maxConf * 100).toFixed(1)}%` : '—', sub: focus.length ? 'highest mismatch' : 'no mismatches', color: C.blue },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="pt-3 px-3 pb-3" style={{ borderTop: `2px solid ${c.color}`, background: C.grayLt }}>
          <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: C.gray }}>{c.label}</p>
          <p className="font-serif text-2xl font-semibold mt-1" style={{ color: c.color }}>{c.value}</p>
          {c.sub && <p className="font-mono text-[9px] mt-0.5" style={{ color: C.gray }}>{c.sub}</p>}
        </div>
      ))}
    </div>
  )
}

// ── Focus spans / explanations ────────────────────────────────────────────

function FocusSpansPanel({ focus }) {
  if (!focus.length) return null
  return (
    <div className="border" style={{ borderColor: C.amber, borderWidth: 1 }}>
      <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase flex justify-between"
           style={{ background: C.amberLt, color: C.amber, borderBottom: `1px solid ${C.amber}30` }}>
        <span>Specific mismatches</span>
        <span>{focus.length}</span>
      </div>
      <div>
        {focus.map((f, i) => (
          <div key={i} className="px-4 py-3 grid grid-cols-[auto_1fr_auto] gap-4 items-start"
               style={{ borderTop: i ? `1px solid ${C.border}` : 'none' }}>
            <span className="font-mono text-[9px] uppercase tracking-widest mt-0.5 px-1.5 py-0.5 rounded"
                  style={{ background: f.kind === 'number' ? C.blueLt : C.grayLt, color: f.kind === 'number' ? C.blue : C.mid }}>
              {f.kind}
            </span>
            <div>
              <p className="text-sm leading-snug">
                <span className="font-bold px-1 rounded" style={{ background: C.redLt, color: C.red }}>
                  "{f.text}"
                </span>
                <span className="font-mono text-[9px] ml-2" style={{ color: C.gray }}>
                  [{f.start}–{f.end}]
                </span>
              </p>
              <p className="text-xs mt-1.5" style={{ color: C.mid }}>{f.explanation}</p>
            </div>
            <span className="font-mono text-xs font-bold" style={{ color: C.red }}>
              {(f.confidence * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Token confidence histogram ────────────────────────────────────────────

function TokenChart({ tokens, focus }) {
  if (!tokens.length) return null
  const W = 360
  const H = 160
  const PAD_L = 8
  const PAD_R = 8
  const PAD_T = 14
  const PAD_B = 28
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const barW = innerW / tokens.length
  const gap = barW > 6 ? 1.5 : 0.5

  // A token is part of a precise mismatch if it overlaps any focus_span.
  const isFocus = (t) => (focus || []).some(f => t.start < f.end && t.end > f.start)

  return (
    <div className="border" style={{ borderColor: C.border }}>
      <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase flex justify-between"
           style={{ background: C.grayLt, color: C.gray }}>
        <span>Raw model probability per token</span>
        <span style={{ color: C.gray }}>red = precise mismatch</span>
      </div>
      <div className="p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1.0].map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={PAD_T + innerH * (1 - v)} x2={W - PAD_R} y2={PAD_T + innerH * (1 - v)}
                    stroke={C.border} strokeDasharray="2,3"/>
              <text x={W - PAD_R} y={PAD_T + innerH * (1 - v) - 2} textAnchor="end"
                    fontSize="7" fontFamily="ui-monospace,monospace" fill={C.gray}>
                {(v * 100).toFixed(0)}%
              </text>
            </g>
          ))}
          {/* 0.5 threshold */}
          <line x1={PAD_L} y1={PAD_T + innerH * 0.5} x2={W - PAD_R} y2={PAD_T + innerH * 0.5}
                stroke={C.amber} strokeDasharray="3,3" strokeWidth="0.8"/>
          {/* Bars: red if token overlaps a focus_span (precise mismatch),
              amber if model-flagged but not in focus, green if supported. */}
          {tokens.map((t, i) => {
            const x = PAD_L + i * barW + gap / 2
            const h = Math.max(1, t.prob * innerH)
            const y = PAD_T + innerH - h
            const inFocus = isFocus(t)
            let fill
            if (inFocus) fill = `rgba(220,38,38,${0.55 + t.prob * 0.45})`
            else if (t.pred === 1) fill = `rgba(217,119,6,0.55)`
            else fill = `rgba(22,163,74,0.6)`
            return (
              <rect key={i} x={x} y={y} width={Math.max(0.5, barW - gap)} height={h}
                    fill={fill}>
                <title>{`"${t.text}" — pred=${t.pred} prob=${(t.prob * 100).toFixed(1)}%${inFocus ? ' · in focus span' : ''}`}</title>
              </rect>
            )
          })}
          {/* X-axis labels (only some, to avoid clutter) */}
          {tokens.map((t, i) => {
            if (tokens.length > 18 && i % Math.ceil(tokens.length / 12) !== 0) return null
            const x = PAD_L + i * barW + barW / 2
            const label = t.text.replace(/\s+/g, '').slice(0, 8)
            if (!label) return null
            return (
              <text key={`l${i}`} x={x} y={H - 14} textAnchor="middle" fontSize="7"
                    fontFamily="ui-monospace,monospace" fill={C.gray}
                    transform={tokens.length > 12 ? `rotate(-45 ${x} ${H - 14})` : undefined}>
                {label}
              </text>
            )
          })}
          <text x={PAD_L} y={H - 2} fontSize="7" fontFamily="ui-monospace,monospace" fill={C.gray}>
            tokens (left → right)
          </text>
        </svg>
      </div>
    </div>
  )
}

// ── Supported vs hallucinated donut ───────────────────────────────────────

function SupportDonut({ answer, charStats }) {
  if (!charStats || !charStats.total) return null
  const halluc = charStats.flagged
  const total = charStats.total
  const supported = charStats.supported
  const r = 48
  const cx = 70
  const cy = 70
  const circ = 2 * Math.PI * r
  const hallucFrac = halluc / total
  const supportedFrac = supported / total
  const dashH = circ * hallucFrac
  const dashS = circ * supportedFrac

  return (
    <div className="border" style={{ borderColor: C.border }}>
      <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase"
           style={{ background: C.grayLt, color: C.gray }}>
        Answer composition
      </div>
      <div className="p-3 flex items-center gap-6">
        <svg viewBox="0 0 140 140" width="140" height="140">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.grayLt} strokeWidth="14"/>
          {hallucFrac > 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.red} strokeWidth="14"
                    strokeDasharray={`${dashH} ${circ - dashH}`} strokeDashoffset={circ / 4}
                    transform={`rotate(0 ${cx} ${cy})`}/>
          )}
          {supportedFrac > 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.green} strokeWidth="14"
                    strokeDasharray={`${dashS} ${circ - dashS}`}
                    strokeDashoffset={circ / 4 - dashH}
                    transform={`rotate(0 ${cx} ${cy})`}/>
          )}
          <text x={cx} y={cy - 2} textAnchor="middle" fontSize="20" fontFamily="Georgia,serif"
                fontWeight="600" fill={hallucFrac > 0.5 ? C.red : C.green}>
            {(supportedFrac * 100).toFixed(0)}%
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fontSize="8" fontFamily="ui-monospace,monospace" fill={C.gray}>
            SUPPORTED
          </text>
        </svg>
        <div className="space-y-2 flex-1">
          <Legend color={C.green} label="Supported"   value={`${supported} chars`} pct={supportedFrac}/>
          <Legend color={C.red}   label="Mismatched"  value={`${halluc} chars`}    pct={hallucFrac}/>
          <p className="font-mono text-[9px] mt-3 pt-3" style={{ color: C.gray, borderTop: `1px solid ${C.border}` }}>
            Total: {total} characters
          </p>
        </div>
      </div>
    </div>
  )
}

function Legend({ color, label, value, pct }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-2 h-2 rounded-sm" style={{ background: color }}/>
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: C.mid }}>{label}</span>
        <span className="font-mono text-[10px] ml-auto" style={{ color }}>{(pct * 100).toFixed(0)}%</span>
      </div>
      <p className="font-mono text-[9px] ml-4" style={{ color: C.gray }}>{value}</p>
    </div>
  )
}

// ── All flagged spans (existing) ─────────────────────────────────────────

function SpansList({ spans }) {
  if (!spans.length) {
    return (
      <div className="p-3 rounded" style={{ background: C.greenLt, borderLeft: `3px solid ${C.green}` }}>
        <p className="text-xs font-semibold" style={{ color: C.green }}>
          No hallucinated spans detected.
        </p>
      </div>
    )
  }
  return (
    <div className="border" style={{ borderColor: C.border }}>
      <div className="px-3 py-2 font-mono text-[10px] tracking-[0.18em] uppercase flex justify-between"
           style={{ background: C.grayLt, color: C.gray }}>
        <span>Merged hallucinated spans</span>
        <span>{spans.length}</span>
      </div>
      {spans.map((s, i) => (
        <div key={`${s.start}-${s.end}-${i}`}
             className="px-3 py-2 grid grid-cols-[1fr_auto] gap-3 text-xs items-center"
             style={{ borderTop: i ? `1px solid ${C.border}` : 'none' }}>
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
  )
}

// ── Method footer ─────────────────────────────────────────────────────────

function MethodFooter({ result }) {
  return (
    <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: C.gray }}>
      method: {result.method}
      {typeof result.latency_ms === 'number' && <> · server: {result.latency_ms} ms</>}
      {typeof result.client_ms === 'number' && <> · round-trip: {result.client_ms} ms</>}
    </p>
  )
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

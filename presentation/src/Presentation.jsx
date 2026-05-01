import { useState, useEffect } from 'react'

// ── Semantic colour tokens ────────────────────────────────────────
const C = {
  blue:    '#1d4ed8',
  blueLt:  '#dbeafe',
  blueMd:  '#1e3a8a',
  green:   '#16a34a',
  greenLt: '#dcfce7',
  red:     '#dc2626',
  redLt:   '#fef2f2',
  dark:    '#111827',
  mid:     '#374151',
  gray:    '#9ca3af',
  grayLt:  '#f3f4f6',
  border:  '#e5e7eb',
}

// ── Primitives ────────────────────────────────────────────────────
function Label({ children }) {
  return <p className="font-mono text-[10px] tracking-[0.18em] uppercase mb-5" style={{ color: C.gray }}>{children}</p>
}
function SlideHeading({ children }) {
  return <h2 className="font-serif text-4xl leading-tight tracking-tight text-black mb-0">{children}</h2>
}
function Rule() { return <hr className="border-t border-black w-full mt-3 mb-6" /> }
function ThinRule() { return <hr className="w-full my-3" style={{ borderTop: `1px solid ${C.border}` }} /> }
function Bullet({ color, children }) {
  return (
    <div className="flex gap-3 items-start text-sm">
      <span style={{ color: color || C.dark, opacity: 0.5 }} className="mt-0.5 shrink-0">—</span>
      <span className="leading-snug" style={{ color: C.mid }}>{children}</span>
    </div>
  )
}

// ── Coloured architecture SVG ─────────────────────────────────────
function ColorArchDiagram() {
  const BW = 108, BH = 52, GAP = 32, START = 8, CY = 58
  const stages = [
    { lines: ['Context', 'Question', 'Answer'], sub: 'Input triple',    fill: '#dbeafe', stroke: '#1d4ed8', tc: '#1e3a8a' },
    { lines: ['HF', 'Tokenizer'],               sub: 'Sub-word tokens', fill: '#111827', stroke: '#111827', tc: '#f9fafb' },
    { lines: ['Encoder', '4 K ctx'],            sub: 'ModernBERT',      fill: '#111827', stroke: '#111827', tc: '#f9fafb' },
    { lines: ['Token', 'Classifier'],           sub: 'Binary 0 / 1',   fill: '#111827', stroke: '#111827', tc: '#f9fafb' },
    { lines: ['Span', 'Aggregator'],            sub: 'Group spans',     fill: '#111827', stroke: '#111827', tc: '#f9fafb' },
    { lines: null,                              sub: 'Confidence score', isOutput: true },
  ]
  const W = START * 2 + stages.length * BW + (stages.length - 1) * GAP

  return (
    <svg viewBox={`0 0 ${W} 130`} className="w-full" style={{ maxHeight: 130 }}>
      {stages.map((s, i) => {
        const bx = START + i * (BW + GAP)
        const by = CY - BH / 2
        const midX = bx + BW / 2
        const tipX = bx + BW + GAP

        if (s.isOutput) return (
          <g key={i}>
            <rect x={bx} y={by}           width={BW} height={BH/2} fill="#dcfce7" stroke="#16a34a" strokeWidth="1"/>
            <text x={midX} y={by+BH/4+5}  textAnchor="middle" fontSize="10" fontFamily="Georgia,serif" fill="#16a34a" fontWeight="600">check Supported</text>
            <rect x={bx} y={by+BH/2}      width={BW} height={BH/2} fill="#fef2f2" stroke="#dc2626" strokeWidth="1"/>
            <text x={midX} y={by+3*BH/4+5} textAnchor="middle" fontSize="10" fontFamily="Georgia,serif" fill="#dc2626" fontWeight="600">x Hallucinated</text>
            <text x={midX} y={CY+BH/2+14} textAnchor="middle" fontSize="8" fontFamily="ui-monospace,monospace" fill="#9ca3af">{s.sub}</text>
          </g>
        )

        return (
          <g key={i}>
            <rect x={bx} y={by} width={BW} height={BH} fill={s.fill} stroke={s.stroke} strokeWidth="1"/>
            {s.lines.map((line, li) => (
              <text key={li} x={midX} y={by+(BH/(s.lines.length+1))*(li+1)+4}
                textAnchor="middle" fontSize="11" fontFamily="Georgia,serif" fill={s.tc}>{line}</text>
            ))}
            <text x={midX} y={CY+BH/2+14} textAnchor="middle" fontSize="8" fontFamily="ui-monospace,monospace" fill="#9ca3af">{s.sub}</text>
            {i < stages.length - 1 && (
              <g>
                <line x1={bx+BW+2} y1={CY} x2={tipX-8} y2={CY} stroke={i===0?'#1d4ed8':'#374151'} strokeWidth="1.5"/>
                <polygon points={`${tipX-8},${CY-4} ${tipX},${CY} ${tipX-8},${CY+4}`} fill={i===0?'#1d4ed8':'#374151'}/>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── English results bar chart (real F1 from RAGTruth benchmark) ──
function ResultsBarChart() {
  const data = [
    { label: 'Llama-3-8B (fine-tuned LLM)',  value: 83.9,  sub: 'RAG-HAT paper',          color: '#374151', hi: false },
    { label: 'Our Token Classifier',          value: 79.22, sub: 'lettucedetect-large-v1',  color: '#1d4ed8', hi: true  },
    { label: 'Llama-2-13B (fine-tuned LLM)', value: 78.7,  sub: 'RAGTruth paper',           color: '#374151', hi: false },
    { label: 'Luna (encoder-based)',          value: 65.4,  sub: 'prev. encoder SOTA',       color: '#9ca3af', hi: false },
    { label: 'GPT-4 (prompted judge)',        value: 63.4,  sub: 'LLM-as-judge baseline',    color: '#9ca3af', hi: false },
  ]
  const maxV=90, LW=230, bAW=330, bH=24, gap=18
  const W=LW+bAW+110, H=data.length*(bH+gap)+20

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 210 }}>
      <line x1={LW} y1={8} x2={LW} y2={H-4} stroke="#e5e7eb" strokeWidth="1"/>
      {[60,70,80].map(v => {
        const x=LW+(v/maxV)*bAW
        return (
          <g key={v}>
            <line x1={x} y1={8} x2={x} y2={H-4} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3,3"/>
            <text x={x} y={H} textAnchor="middle" fontSize="8" fontFamily="ui-monospace,monospace" fill="#9ca3af">{v}%</text>
          </g>
        )
      })}
      {data.map((d,i) => {
        const y=10+i*(bH+gap), bw=(d.value/maxV)*bAW
        return (
          <g key={d.label}>
            <text x={LW-8} y={y+bH/2+1} textAnchor="end" fontSize="11" fontFamily="Georgia,serif"
              fill={d.hi?'#1d4ed8':'#111827'} fontWeight={d.hi?'700':'400'}>{d.label}</text>
            <text x={LW-8} y={y+bH/2+12} textAnchor="end" fontSize="8" fontFamily="ui-monospace,monospace" fill="#9ca3af">{d.sub}</text>
            <rect x={LW} y={y+3} width={bAW} height={bH-6} fill="#f3f4f6"/>
            <rect x={LW} y={y+3} width={bw}  height={bH-6} fill={d.color} opacity={d.hi?1:0.8}/>
            {d.hi && <rect x={LW} y={y+3} width={bw} height={bH-6} fill="none" stroke="#1d4ed8" strokeWidth="1.5"/>}
            <text x={LW+bw+5} y={y+bH/2+4} fontSize="11" fontFamily="ui-monospace,monospace"
              fill={d.hi?'#1d4ed8':'#374151'} fontWeight={d.hi?'700':'400'}>{d.value}%</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Multilingual grouped bar chart (real data from EuroBERT.md) ──
function MultilingualChart() {
  const data = [
    { lang: 'Chinese', ours: 77.27, gpt: 60.23, delta: 17.04 },
    { lang: 'German',  ours: 74.95, gpt: 60.91, delta: 14.04 },
    { lang: 'Italian', ours: 74.71, gpt: 61.06, delta: 13.65 },
    { lang: 'Polish',  ours: 73.05, gpt: 59.27, delta: 13.78 },
    { lang: 'Spanish', ours: 73.25, gpt: 62.40, delta: 10.85 },
    { lang: 'French',  ours: 73.13, gpt: 62.37, delta: 10.76 },
  ]
  const maxV=85, LW=72, bAW=310, bH=12, gap=5, rowGap=12
  const rowH=bH*2+gap+rowGap, W=LW+bAW+86, H=data.length*rowH+28

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 270 }}>
      <rect x={LW} y={2} width={10} height={10} fill="#1d4ed8"/>
      <text x={LW+14} y={11} fontSize="9" fontFamily="ui-monospace,monospace" fill="#111827">EuroBERT-610M (ours)</text>
      <rect x={LW+175} y={2} width={10} height={10} fill="#9ca3af" opacity="0.8"/>
      <text x={LW+189} y={11} fontSize="9" fontFamily="ui-monospace,monospace" fill="#111827">GPT-4.1-mini</text>
      {data.map((d,i) => {
        const baseY=24+i*rowH
        const oursW=(d.ours/maxV)*bAW
        const gptW=(d.gpt/maxV)*bAW
        return (
          <g key={d.lang}>
            <text x={LW-6} y={baseY+bH+3} textAnchor="end" fontSize="11" fontFamily="Georgia,serif" fill="#111827">{d.lang}</text>
            <rect x={LW} y={baseY}        width={bAW} height={bH} fill="#f3f4f6"/>
            <rect x={LW} y={baseY+bH+gap} width={bAW} height={bH} fill="#f3f4f6"/>
            <rect x={LW} y={baseY}        width={oursW} height={bH} fill="#1d4ed8"/>
            <text x={LW+oursW+4} y={baseY+bH-1} fontSize="8.5" fontFamily="ui-monospace,monospace" fill="#1d4ed8">{d.ours}%</text>
            <rect x={LW} y={baseY+bH+gap} width={gptW} height={bH} fill="#9ca3af" opacity="0.8"/>
            <text x={LW+gptW+4} y={baseY+bH*2+gap} fontSize="8.5" fontFamily="ui-monospace,monospace" fill="#9ca3af">{d.gpt}%</text>
            <rect x={LW+bAW+6} y={baseY+1} width={46} height={bH*2+gap-2} rx="2" fill="#dcfce7"/>
            <text x={LW+bAW+29} y={baseY+bH+3} textAnchor="middle" fontSize="9.5"
              fontFamily="ui-monospace,monospace" fill="#16a34a" fontWeight="bold">+{d.delta}%</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Demo mock (colour-coded) ──────────────────────────────────────
function DemoMock() {
  return (
    <div className="w-full max-w-3xl text-sm font-sans border" style={{ borderColor: '#111827' }}>
      <div className="px-4 py-2 font-mono text-[10px] tracking-[0.18em] uppercase bg-black text-white">
        Hallucination Detector — Live Demo
      </div>
      <div className="grid grid-cols-2">
        <div className="p-4 space-y-3" style={{ borderRight: '1px solid #111827' }}>
          <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#9ca3af' }}>Input</p>
          <div>
            <p className="font-mono text-[9px] uppercase mb-1" style={{ color: '#9ca3af' }}>Context</p>
            <p className="text-xs leading-relaxed">
              France is in Western Europe.
              Population: <span className="font-bold px-0.5 rounded" style={{ color: '#16a34a', background: '#dcfce7' }}>67 million</span>.
            </p>
          </div>
          <hr className="my-3" style={{ borderTop: '1px solid #e5e7eb' }}/>
          <div>
            <p className="font-mono text-[9px] uppercase mb-1" style={{ color: '#9ca3af' }}>Answer to verify</p>
            <p className="text-xs">The population of France is 69 million.</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <p className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#9ca3af' }}>Detection result</p>
          <p className="text-xs leading-relaxed">
            The population of France is{' '}
            <span className="relative inline-block">
              <span className="font-bold px-0.5 rounded" style={{ color: '#dc2626', background: '#fef2f2', textDecoration: 'underline', textDecorationColor: '#dc2626' }}>
                69 million
              </span>
              <span className="absolute -top-4 left-0 font-mono text-[7px] tracking-wide uppercase whitespace-nowrap" style={{ color: '#dc2626' }}>hallucinated</span>
            </span>.
          </p>
          <hr className="my-3" style={{ borderTop: '1px solid #e5e7eb' }}/>
          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px]">
              <span style={{ color: '#374151' }}>Confidence</span>
              <span className="font-bold" style={{ color: '#dc2626' }}>99.4%</span>
            </div>
            <div className="w-full h-2 rounded-sm" style={{ background: '#f3f4f6' }}>
              <div className="h-full rounded-sm" style={{ width: '99.4%', background: '#dc2626' }}/>
            </div>
            <p className="font-mono text-[8px] pt-1" style={{ color: '#9ca3af' }}>Span "69 million" · char 31–71 · context says 67M</p>
          </div>
          <hr className="my-3" style={{ borderTop: '1px solid #e5e7eb' }}/>
          <p className="text-xs">
            <span className="font-mono text-[8px] uppercase tracking-wide" style={{ color: '#9ca3af' }}>Suggestion: </span>
            Population is <span className="font-bold" style={{ color: '#16a34a' }}>67 million</span>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// SLIDES
// ══════════════════════════════════════════════════════════════════

function Slide01() {
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-10" style={{ color: '#9ca3af' }}>
        AI / Machine Learning · May 2026
      </p>
      <h1 className="font-serif text-6xl leading-none tracking-tight text-black">Hallucination Detection</h1>
      <h1 className="font-serif text-6xl leading-tight tracking-tight text-black mb-8">&amp; Mitigation Tool</h1>
      <div className="w-20 border-t-2 border-black mb-10"/>
      <div className="flex gap-3 mb-8 flex-wrap">
        {[['Token Classification','#1d4ed8','#dbeafe'],['Self-Consistency','#374151','#f3f4f6'],['Retrieval Verification','#16a34a','#dcfce7']].map(([t,tc,bg]) => (
          <span key={t} className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded" style={{ color: tc, background: bg }}>{t}</span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-16 gap-y-2 font-sans text-sm" style={{ color: '#374151' }}>
        <span>Anastasiia Igorevna Shaposhnikova</span>
        <span>Samandar Shukurov</span>
        <span>Marakhimov Bakhtiyorjon Akromjon ogli</span>
        <span>Fayzullo Lutpillaev</span>
        <span>Masharipov Jakhongir Alisher o'g'li</span>
      </div>
    </div>
  )
}

function Slide02() {
  const pts = [
    ['Confident but wrong',          'LLMs produce fluent, authoritative text that is factually incorrect. Users have no built-in error signal.'],
    ['RAG does not fully solve it',  'Even with retrieved context, models can contradict or omit source material, silently producing wrong answers.'],
    ['Token-level errors propagate', 'A single fabricated span in a medical report or legal brief can lead to harmful real-world decisions.'],
    ['No reliability score',         'Standard LLM outputs carry no confidence metric. Users cannot distinguish supported claims from inventions.'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Introduction</Label>
      <SlideHeading>The Hallucination Problem</SlideHeading>
      <Rule />
      <div className="space-y-5">
        {pts.map(([h,b]) => (
          <div key={h} className="grid grid-cols-[210px_1fr] gap-8 items-start pl-3" style={{ borderLeft: '3px solid #fca5a530' }}>
            <span className="font-serif text-sm font-semibold" style={{ color: '#111827' }}>{h}</span>
            <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide03() {
  const modes = [
    ['Factual Fabrication',    'Model asserts a claim with no basis in retrieved context — e.g., citing a non-existent statistic.'],
    ['Context Contradiction',  'Model ignores or misreads retrieved passages, producing an answer that directly contradicts the source.'],
    ['Omission Hallucination', 'Critical caveats present in context are silently dropped, creating a misleading partial truth.'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Introduction</Label>
      <SlideHeading>Why It Matters</SlideHeading>
      <Rule />
      <div className="grid grid-cols-3 gap-6 mt-2">
        {modes.map(([h,b]) => (
          <div key={h} className="p-5 space-y-3" style={{ border: '1px solid #fca5a560', borderTop: '3px solid #dc2626' }}>
            <p className="font-serif text-sm font-semibold" style={{ color: '#111827' }}>{h}</p>
            <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{b}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 p-4" style={{ background: '#fef2f2', borderLeft: '3px solid #dc2626' }}>
        <p className="text-sm" style={{ color: '#374151' }}>
          <span className="font-serif font-semibold" style={{ color: '#dc2626' }}>Empirically: </span>
          up to 27% of sentences in RAG-generated answers contain at least one unsupported claim.
          In high-stakes domains the cost of a single undetected hallucination can be severe.
        </p>
      </div>
    </div>
  )
}

function Slide04() {
  const objs = [
    ['01','Detect',    '#dc2626','Identify unsupported text spans at token level — not just sentence-level binary flags.'],
    ['02','Score',     '#1d4ed8','Produce a per-span confidence score so users can rank and triage findings.'],
    ['03','Explain',   '#374151','Surface which retrieved context supports or contradicts each generated claim.'],
    ['04','Mitigate',  '#16a34a','Apply self-consistency sampling and external re-verification to reduce hallucination rate.'],
    ['05','Interface', '#374151','Real-time REST API + interactive UI for integration into production RAG pipelines.'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Objectives</Label>
      <SlideHeading>What We Set Out to Build</SlideHeading>
      <Rule />
      <div className="space-y-5">
        {objs.map(([num,head,color,body]) => (
          <div key={num} className="grid grid-cols-[32px_150px_1fr] gap-5 items-start">
            <span className="font-mono text-[9px] pt-0.5" style={{ color: '#9ca3af' }}>{num}</span>
            <span className="font-serif text-sm font-semibold px-2 py-0.5 rounded" style={{ color, background: color+'18' }}>{head}</span>
            <span className="text-sm leading-relaxed" style={{ color: '#374151' }}>{body}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide05() {
  const rows = [
    ['NLI Baseline',                 '0.61','Fast, lightweight',       'Sentence-level only; no span boundaries',   false],
    ['LLM-as-Judge (GPT-4)',         '0.63','High accuracy, flexible', 'Slow ~2 s/ex · > 100 B parameters',         false],
    ['Luna (sentence encoder)',      '0.65','Good precision',          '512-token context cap; coarse granularity',  false],
    ['Llama-2-13B (fine-tuned LLM)', '0.79','Strong F1',               'Huge model, slow, costly fine-tuning',       false],
    ['Our Token Classifier',         '0.79','Token precision, 4 K ctx','Fine-tuning required; English-first v1',     true ],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>System Design</Label>
      <SlideHeading>Existing Approaches &amp; Tradeoffs</SlideHeading>
      <Rule />
      <table className="w-full text-sm border-collapse mt-1">
        <thead>
          <tr style={{ borderBottom: '1px solid #111827' }}>
            {['Approach','F1','Strength','Limitation'].map(h => (
              <th key={h} className="text-left font-mono text-[9px] tracking-[0.15em] uppercase pb-2.5 pr-8 font-normal" style={{ color: '#9ca3af' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([app,f1,str,lim,hi]) => (
            <tr key={app} style={{ borderBottom: '1px solid #e5e7eb', background: hi ? '#dbeafe70' : 'transparent' }}>
              <td className="py-2.5 pr-8 font-serif" style={{ color: hi?'#1d4ed8':'#111827', fontWeight: hi?700:400 }}>{app}</td>
              <td className="py-2.5 pr-8 font-mono text-xs" style={{ color: hi?'#1d4ed8':'#374151' }}>{f1}</td>
              <td className="py-2.5 pr-8 text-xs" style={{ color: '#374151' }}>{str}</td>
              <td className="py-2.5 text-xs" style={{ color: '#374151' }}>{lim}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs mt-4" style={{ color: '#9ca3af' }}>Example-level F1 on RAGTruth benchmark.</p>
    </div>
  )
}

function Slide06() {
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>System Design</Label>
      <SlideHeading>System Architecture</SlideHeading>
      <Rule />
      <div className="mt-2"><ColorArchDiagram /></div>
      <div className="mt-6 grid grid-cols-3 gap-8 text-xs">
        {[['#1d4ed8','Input','Context documents, natural-language question, and candidate answer — passed as a structured triple to the tokenizer.'],
          ['#111827','Encoder','ModernBERT processes context + answer jointly (up to 4 096 tokens), producing contextual embeddings per token.'],
          ['#16a34a','Output','Green = supported span. Red = hallucinated span with character offsets and per-span confidence score.'],
        ].map(([color,head,desc]) => (
          <div key={head} className="pl-3" style={{ borderLeft: `3px solid ${color}` }}>
            <p className="font-serif font-semibold text-sm mb-1" style={{ color }}>{head}</p>
            <p style={{ color: '#374151' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide07() {
  const tokens = [
    ['The','0','0.02',false],['population','0','0.01',false],['of','0','0.01',false],
    ['France','0','0.02',false],['is','0','0.03',false],
    ['69','1','0.994',true],['million','1','0.991',true],['.','0','0.04',false],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>System Design</Label>
      <SlideHeading>Token-Level Classification</SlideHeading>
      <Rule />
      <div className="grid grid-cols-2 gap-12 mt-1">
        <div className="space-y-5">
          <div>
            <p className="font-serif text-sm font-semibold mb-1">Why token-level?</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              Sentence-level methods flag whole sentences. Token-level classification pinpoints the exact unsupported phrase — essential for user trust and targeted mitigation.
            </p>
          </div>
          <div>
            <p className="font-serif text-sm font-semibold mb-2">Label scheme</p>
            <div className="flex gap-3">
              <span className="font-mono text-xs px-2 py-1 rounded" style={{ color: '#16a34a', background: '#dcfce7' }}>0 = supported</span>
              <span className="font-mono text-xs px-2 py-1 rounded" style={{ color: '#dc2626', background: '#fef2f2' }}>1 = hallucinated</span>
            </div>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#374151' }}>Context tokens are masked from the loss. Only answer token positions are supervised.</p>
          </div>
          <div>
            <p className="font-serif text-sm font-semibold mb-1">Training</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>Token-level cross-entropy on answer positions only. LR = 1x10^-5 · 6 epochs · batch 8 · single A100.</p>
          </div>
        </div>
        <div className="border font-mono text-xs" style={{ borderColor: '#111827' }}>
          <div className="px-4 py-2 text-[9px] tracking-widest uppercase bg-black text-white">Prediction example</div>
          <div className="px-4 py-2 text-[9px]" style={{ color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>context: "...population of France is 67 million."</div>
          <div className="grid grid-cols-3 px-4 py-1.5 text-[9px]" style={{ borderBottom: '1px solid #e5e7eb', color: '#9ca3af' }}>
            <span>token</span><span>label</span><span>prob</span>
          </div>
          {tokens.map(([tok,pred,prob,hal]) => (
            <div key={tok} className="grid grid-cols-3 px-4 py-1.5"
              style={{ background: hal?'#fef2f2':'#f0fdf4', color: hal?'#dc2626':'#16a34a', fontWeight: hal?'700':'400', borderBottom: '1px solid #e5e7eb' }}>
              <span>"{tok}"</span><span>{pred}</span><span>{prob}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Slide08() {
  const stages = [
    ['Stage 1','#1d4ed8','Token Classifier',  'Fast single-pass detection — binary label per answer token'],
    ['Stage 2','#374151','Self-Consistency',   'Sample N responses; flag spans appearing in >=k/N generations'],
    ['Stage 3','#374151','Retrieval Check',    'Re-query knowledge base for flagged spans; re-score support evidence'],
    ['Output', '#16a34a','Mitigation Report',  'Grounded corrections + calibrated confidence scores per span'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>System Design</Label>
      <SlideHeading>Self-Consistency &amp; Retrieval Verification</SlideHeading>
      <Rule />
      <div className="grid grid-cols-2 gap-12 mt-1">
        <div className="space-y-5">
          <div>
            <p className="font-serif text-sm font-semibold mb-1">Self-Consistency Scoring</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              We sample N independent responses for the same query. A span is high-risk when flagged in k/N or more generations.
            </p>
          </div>
          <div className="p-4 rounded font-mono text-xs space-y-1" style={{ background: '#f3f4f6' }}>
            <span style={{ color: '#1d4ed8' }}>consistency_score</span><span style={{ color: '#374151' }}> = flagged / N</span><br/>
            <span style={{ color: '#9ca3af' }}>threshold k = 0.5  (tunable)</span><br/>
            <span style={{ color: '#9ca3af' }}>default N = 5 samples</span>
          </div>
          <div>
            <p className="font-serif text-sm font-semibold mb-1">External Re-Verification</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              Flagged spans trigger a re-retrieval pass. If no supporting document is found, a grounded corrective suggestion is emitted.
            </p>
          </div>
        </div>
        <div className="space-y-3 pt-1">
          {stages.map(([stage,color,head,desc],i,arr) => (
            <div key={stage}>
              <div className="flex gap-4 items-start p-3 rounded" style={{ background: color+'12', borderLeft: `3px solid ${color}` }}>
                <span className="font-mono text-[9px] uppercase tracking-wide mt-0.5 w-14 shrink-0" style={{ color: '#9ca3af' }}>{stage}</span>
                <div>
                  <p className="font-serif text-sm font-semibold" style={{ color }}>{head}</p>
                  <p className="text-xs leading-snug mt-0.5" style={{ color: '#374151' }}>{desc}</p>
                </div>
              </div>
              {i < arr.length-1 && <p className="font-mono text-xs ml-[72px] mt-1" style={{ color: '#e5e7eb' }}>down</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Slide09() {
  const cfg = [
    ['Architecture',   'Long-context encoder (ModernBERT-style)', false],
    ['Context window', '4 096 tokens',                            true ],
    ['Task',           'Token-level binary classification',        false],
    ['Epochs',         '6',                                        true ],
    ['Batch size',     '8',                                        false],
    ['Learning rate',  '1 x 10^-5',                               true ],
    ['Optimizer',      'AdamW',                                    false],
    ['Loss',           'Token-level cross-entropy',                false],
    ['Hardware',       'Single NVIDIA A100 GPU',                   false],
    ['Validation',     'Example-level F1 on RAGTruth dev split',   false],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Implementation</Label>
      <SlideHeading>Dataset &amp; Training Pipeline</SlideHeading>
      <Rule />
      <div className="grid grid-cols-2 gap-12 mt-1">
        <div className="space-y-5">
          <div>
            <p className="font-serif text-sm font-semibold mb-1">RAGTruth Benchmark</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              Large-scale dataset of RAG-style QA examples with token-level hallucination annotations spanning news, Wikipedia, finance, and biomedical domains.
            </p>
          </div>
          <div>
            <p className="font-serif text-sm font-semibold mb-1">Preprocessing</p>
            <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
              Context + answer concatenated with separator token. Answer token positions identified; character-span labels aligned to sub-word tokens via offset mapping. Sliding window for long documents.
            </p>
          </div>
        </div>
        <div className="border" style={{ borderColor: '#e5e7eb' }}>
          <div className="px-4 py-2 font-mono text-[9px] tracking-widest uppercase" style={{ background: '#f3f4f6', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>Training configuration</div>
          {cfg.map(([k,v,hi]) => (
            <div key={k} className="flex justify-between px-4 py-2 text-xs" style={{ borderBottom: '1px solid #e5e7eb', background: hi?'#dbeafe50':'transparent' }}>
              <span style={{ color: '#9ca3af' }}>{k}</span>
              <span className="font-mono" style={{ color: hi?'#1d4ed8':'#374151' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Slide10() {
  const stack = [
    ['Core ML',       '#1d4ed8','Python 3.11 · PyTorch 2.x · HuggingFace Transformers + Datasets'],
    ['Inference API', '#374151','FastAPI · Pydantic · Uvicorn — REST endpoint, JSON span output'],
    ['Consistency',   '#374151','Custom sampler: N-pass generation + agreement scoring module'],
    ['Demo UI',       '#16a34a','Streamlit — context input, answer field, highlighted span output'],
    ['Testing',       '#9ca3af','pytest · integration tests on real model inference (no mocks)'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Implementation</Label>
      <SlideHeading>Implementation Stack</SlideHeading>
      <Rule />
      <div className="grid grid-cols-2 gap-12 mt-1">
        <div className="space-y-3">
          {stack.map(([layer,color,desc]) => (
            <div key={layer} className="flex gap-3 items-start p-3 rounded" style={{ background: color+'10', borderLeft: `3px solid ${color}` }}>
              <div>
                <p className="font-serif text-sm font-semibold" style={{ color }}>{layer}</p>
                <p className="text-xs leading-relaxed" style={{ color: '#374151' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border font-mono text-xs" style={{ borderColor: '#e5e7eb' }}>
          <div className="px-4 py-2 text-[9px] tracking-widest uppercase" style={{ background: '#f3f4f6', color: '#9ca3af', borderBottom: '1px solid #e5e7eb' }}>Module layout</div>
          <div className="px-4 py-3 leading-relaxed space-y-0.5" style={{ color: '#374151' }}>
            <p style={{ color: '#111827' }}>halludetect/</p>
            {[['data/','RAGTruth loader, preprocessing'],['model/','encoder fine-tuning, inference.py'],
              ['consistency/','self-consistency sampler'],['retrieval/','external re-verification'],
              ['api/','FastAPI, span aggregation'],['ui/','Streamlit demo'],['tests/','unit + integration tests']].map(([f,d]) => (
              <p key={f} className="pl-4 text-[10px]">
                <span style={{ color: '#1d4ed8' }}>{f}</span>
                <span style={{ color: '#9ca3af' }}>  -- {d}</span>
              </p>
            ))}
            <p className="pt-1" style={{ color: '#111827' }}>scripts/</p>
            <p className="pl-4 text-[10px]" style={{ color: '#9ca3af' }}>train.py · evaluate.py · start_api.py</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Slide11() {
  const stats = [
    ['+21.2%','F1 over GPT-4 prompted judge',           '#1d4ed8'],
    ['+13.8%','F1 over Luna (prev. encoder SOTA)',        '#1d4ed8'],
    ['30x',   'smaller than best LLM judges at equal F1','#16a34a'],
    ['30-60', 'examples / second on a single GPU',        '#16a34a'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-14 max-w-5xl mx-auto w-full">
      <Label>Results</Label>
      <SlideHeading>English Benchmark — RAGTruth</SlideHeading>
      <Rule />
      <div className="mt-1"><ResultsBarChart /></div>
      <div className="grid grid-cols-4 gap-4 mt-5">
        {stats.map(([val,desc,color]) => (
          <div key={val} className="pt-3" style={{ borderTop: `2px solid ${color}` }}>
            <p className="font-serif text-2xl font-semibold tracking-tight" style={{ color }}>{val}</p>
            <p className="text-xs mt-1 leading-snug" style={{ color: '#9ca3af' }}>{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide12() {
  return (
    <div className="h-full flex flex-col justify-center px-20 py-14 max-w-5xl mx-auto w-full">
      <Label>Results</Label>
      <SlideHeading>Multilingual Benchmark — EuroBERT</SlideHeading>
      <Rule />
      <div className="grid grid-cols-[1fr_200px] gap-10 mt-1 items-start">
        <div><MultilingualChart /></div>
        <div className="space-y-4">
          <div className="p-4 rounded" style={{ background: '#dbeafe' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: '#9ca3af' }}>Model</p>
            <p className="font-serif text-sm font-semibold" style={{ color: '#1d4ed8' }}>EuroBERT-610M</p>
            <p className="text-xs mt-1" style={{ color: '#374151' }}>8 K token context window</p>
          </div>
          <div className="p-4 rounded" style={{ background: '#dcfce7' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Best delta</p>
            <p className="font-serif text-2xl font-bold" style={{ color: '#16a34a' }}>+17.04%</p>
            <p className="text-xs mt-0.5" style={{ color: '#374151' }}>Chinese vs GPT-4.1-mini</p>
          </div>
          <div className="p-4 rounded" style={{ background: '#f3f4f6' }}>
            <p className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: '#9ca3af' }}>Languages</p>
            <p className="font-serif text-sm font-semibold" style={{ color: '#111827' }}>7 languages</p>
            <p className="text-xs mt-0.5" style={{ color: '#374151' }}>EN · DE · FR · ES · IT · PL · ZH</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Slide13() {
  return (
    <div className="h-full flex flex-col justify-center px-20 py-14 max-w-5xl mx-auto w-full">
      <Label>Results</Label>
      <SlideHeading>Interactive Demo</SlideHeading>
      <Rule />
      <div className="flex justify-center mt-1"><DemoMock /></div>
      <p className="text-xs text-center mt-4 font-mono" style={{ color: '#9ca3af' }}>
        <span className="px-2 py-0.5 rounded mr-2" style={{ background: '#f3f4f6' }}>streamlit run ui/demo.py</span>
        <span className="px-2 py-0.5 rounded" style={{ background: '#f3f4f6' }}>POST /detect -- JSON spans + confidence</span>
      </p>
    </div>
  )
}

function Slide14() {
  const achieved = [
    'Token-level detection — F1 79.22% on RAGTruth',
    '+13.8% F1 over Luna, the previous encoder SOTA',
    'Multilingual: up to +17 F1 points vs GPT-4.1-mini judge',
    'Self-consistency verification for ensemble mitigation',
    '30x smaller than LLM judges · 30-60 ex/s throughput',
    'REST API + interactive Streamlit UI',
  ]
  const future = [
    'Calibrated confidence intervals (temperature scaling)',
    'Closed-loop RAG: detections trigger automatic re-retrieval',
    'Domain fine-tuning: medical, legal, finance corpora',
    'TinyLettuce variants (17M-68M) for edge deployment',
    'Span-level explanation: highlight contradicting context',
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Conclusion</Label>
      <SlideHeading>Conclusion &amp; Future Work</SlideHeading>
      <Rule />
      <div className="grid grid-cols-2 gap-12 mt-2">
        <div className="space-y-3">
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: '#9ca3af' }}>Achieved</p>
          {achieved.map(item => <Bullet key={item} color="#16a34a">{item}</Bullet>)}
        </div>
        <div className="space-y-3">
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase" style={{ color: '#9ca3af' }}>Future work</p>
          {future.map(item => <Bullet key={item} color="#1d4ed8">{item}</Bullet>)}
        </div>
      </div>
    </div>
  )
}

function Slide15() {
  const members = [
    ['Anastasiia Igorevna Shaposhnikova',    'Research Lead',    '#1d4ed8','Literature review, problem formulation, evaluation methodology, benchmarking strategy'],
    ['Marakhimov Bakhtiyorjon Akromjon ogli','Data Engineering', '#374151','RAGTruth ingestion pipeline, token-label alignment, dataset preprocessing scripts'],
    ["Masharipov Jakhongir Alisher o'g'li",  'Model Engineering','#374151','Encoder fine-tuning, training scripts, hyperparameter search, model evaluation'],
    ['Samandar Shukurov',                    'Backend & API',    '#16a34a','FastAPI inference service, span aggregation, self-consistency scoring pipeline'],
    ['Fayzullo Lutpillaev',                  'Frontend & Demo',  '#16a34a','Streamlit UI, span visualization, integration tests, live demo preparation'],
  ]
  return (
    <div className="h-full flex flex-col justify-center px-20 py-16 max-w-5xl mx-auto w-full">
      <Label>Contributions</Label>
      <SlideHeading>Individual Contributions</SlideHeading>
      <Rule />
      <table className="w-full border-collapse mt-1">
        <thead>
          <tr style={{ borderBottom: '1px solid #111827' }}>
            {['Member','Role','Key Contributions'].map(h => (
              <th key={h} className="text-left font-mono text-[9px] tracking-[0.15em] uppercase pb-2.5 pr-8 font-normal" style={{ color: '#9ca3af' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map(([name,role,color,contrib]) => (
            <tr key={name} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td className="py-3 pr-8 font-serif text-sm leading-snug">{name}</td>
              <td className="py-3 pr-8">
                <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ color, background: color+'18' }}>{role}</span>
              </td>
              <td className="py-3 text-xs leading-snug" style={{ color: '#374151' }}>{contrib}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// DECK CONTROLLER
// ══════════════════════════════════════════════════════════════════

const SLIDES = [
  Slide01, Slide02, Slide03, Slide04, Slide05,
  Slide06, Slide07, Slide08, Slide09, Slide10,
  Slide11, Slide12, Slide13, Slide14, Slide15,
]

export default function Presentation() {
  const [current, setCurrent] = useState(0)
  const total = SLIDES.length

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); setCurrent(c => Math.min(c+1, total-1)) }
      if (e.key === 'ArrowLeft')                   { e.preventDefault(); setCurrent(c => Math.max(c-1, 0)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [total])

  const SlideComponent = SLIDES[current]

  return (
    <div className="relative bg-white text-black overflow-hidden"
      style={{ width: '100vw', height: '56.25vw', maxHeight: '100vh', maxWidth: '177.78vh', margin: '0 auto' }}>

      {/* Blue progress bar */}
      <div className="absolute top-0 left-0 right-0 flex z-10" style={{ height: 3 }}>
        {SLIDES.map((_,i) => (
          <div key={i} className="flex-1 transition-all duration-300"
            style={{ background: i <= current ? '#1d4ed8' : '#e5e7eb' }}/>
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute top-5 right-7 font-mono text-[10px] tracking-[0.15em] z-10 select-none"
        style={{ color: '#9ca3af' }}>
        {String(current+1).padStart(2,'0')} / {String(total).padStart(2,'0')}
      </div>

      {/* Current slide */}
      <div className="w-full h-full"><SlideComponent /></div>

      {/* Navigation buttons */}
      <div className="absolute bottom-5 right-7 flex gap-5 z-10">
        <button onClick={() => setCurrent(c => Math.max(c-1,0))} disabled={current===0}
          className="font-mono text-[9px] tracking-[0.15em] uppercase cursor-pointer transition-opacity"
          style={{ color: '#9ca3af', opacity: current===0 ? 0.15 : 0.6 }}>Prev</button>
        <button onClick={() => setCurrent(c => Math.min(c+1,total-1))} disabled={current===total-1}
          className="font-mono text-[9px] tracking-[0.15em] uppercase cursor-pointer transition-opacity"
          style={{ color: '#9ca3af', opacity: current===total-1 ? 0.15 : 0.6 }}>Next</button>
      </div>

      <p className="absolute bottom-5 left-7 font-mono text-[9px] select-none" style={{ color: '#e5e7eb' }}>
        arrow keys or space to navigate
      </p>
    </div>
  )
}

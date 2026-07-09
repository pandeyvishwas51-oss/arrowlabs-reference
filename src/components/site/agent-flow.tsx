'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cpu,
  ScanSearch,
  Sparkles,
  PenLine,
  ImageIcon,
  Clapperboard,
  Brain,
  ShieldCheck,
  Link2,
  Check,
  Loader2,
} from 'lucide-react'

/*
  Agentic control room: a self-running visualization of the multi-agent
  pipeline. Replays a scripted trace on a loop: each step flips an agent's
  status and streams a line into the live console. Pure client state +
  framer-motion; no backend, no images required for the flow itself.
*/

type Status = 'idle' | 'running' | 'done'

const AGENTS = [
  { id: 'cmo', name: 'AI CMO', role: 'Plans the campaign', icon: Cpu },
  { id: 'research', name: 'Research', role: 'Scrapes + mines reviews', icon: ScanSearch },
  { id: 'strategist', name: 'Strategist', role: 'Ranks ad angles', icon: Sparkles },
  { id: 'copywriter', name: 'Copywriter', role: 'Writes the listing', icon: PenLine },
  { id: 'photo', name: 'PhotoLab', role: 'Renders imagery', icon: ImageIcon },
  { id: 'video', name: 'VideoLab', role: 'Assembles UGC video', icon: Clapperboard },
  { id: 'brand', name: 'Brand Brain', role: 'Keeps it on-brand', icon: Brain },
  { id: 'qa', name: 'QA + Human', role: 'Safety + final review', icon: ShieldCheck },
] as const

type AgentId = (typeof AGENTS)[number]['id']

// Scripted trace. Each step sets an agent's status and (optionally) logs a line.
const STEPS: { agent: AgentId; status: Status; line?: string; tok?: number }[] = [
  { agent: 'cmo', status: 'running', line: 'Planning campaign for asin B08N5WRWNW', tok: 1200 },
  { agent: 'research', status: 'running', line: 'Fetching 1,000 reviews · RainforestAPI + SERP', tok: 2400 },
  { agent: 'research', status: 'running', line: 'Mined 214 pain-points, 38 buyer keywords', tok: 1800 },
  { agent: 'research', status: 'done', line: 'handoff → Strategist', tok: 300 },
  { agent: 'strategist', status: 'running', line: 'Scoring 14 ad angles against the ICP', tok: 2100 },
  { agent: 'strategist', status: 'done', line: 'Top angle: Social Proof (94) · Before/After (87)', tok: 900 },
  { agent: 'copywriter', status: 'running', line: 'Drafting title · 5 bullets · full A+ module', tok: 3200 },
  { agent: 'brand', status: 'running', line: 'Enforcing tone, palette + banned-claims list', tok: 1400 },
  { agent: 'copywriter', status: 'done', line: 'Copy locked · reading-grade 6.2', tok: 700 },
  { agent: 'photo', status: 'running', line: 'Rendering 6 lifestyle scenes · gpt-image-2', tok: 5200 },
  { agent: 'photo', status: 'running', line: 'Scene 4/6 upscaled to 4K', tok: 2600 },
  { agent: 'video', status: 'running', line: 'Assembling UGC cut · Veo-3 + voiceover', tok: 6100 },
  { agent: 'photo', status: 'done', line: '6 hero + lifestyle stills approved', tok: 400 },
  { agent: 'video', status: 'done', line: 'Rendered 8s cut · captions auto-synced', tok: 500 },
  { agent: 'brand', status: 'done', line: 'Brand-consistency score 98%', tok: 350 },
  { agent: 'qa', status: 'running', line: 'Running safety + marketplace-policy checks', tok: 1900 },
  { agent: 'qa', status: 'done', line: '14 assets approved, campaign ready ✓', tok: 250 },
  { agent: 'cmo', status: 'done', line: 'Done in 47s · 14 assets · $0 (trial)', tok: 200 },
]

const TAG_COLOR: Record<AgentId, string> = {
  cmo: '#8B7BFF',
  research: '#6D5EF6',
  strategist: '#9E5CF2',
  copywriter: '#C24BF0',
  photo: '#E24BF0',
  video: '#F0519A',
  brand: '#7E6BF8',
  qa: '#FF5C7A',
}

function statusFromSteps(steps: typeof STEPS, cursor: number): Record<AgentId, Status> {
  const map = Object.fromEntries(AGENTS.map((a) => [a.id, 'idle'])) as Record<AgentId, Status>
  for (let i = 0; i <= cursor && i < steps.length; i++) map[steps[i].agent] = steps[i].status
  return map
}

export function AgentFlow() {
  const [cursor, setCursor] = useState(-1)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setCursor((c) => {
        const next = c + 1
        // when the trace finishes, hold a beat then replay from the top
        if (next > STEPS.length) return -1
        if (next === STEPS.length) return STEPS.length // brief "complete" hold
        return next
      })
    }, 950)
    return () => clearInterval(id)
  }, [])

  const shown = Math.min(Math.max(cursor + 1, 0), STEPS.length)
  const statuses = statusFromSteps(STEPS, Math.min(cursor, STEPS.length - 1))
  const visibleLogs = cursor < 0 ? [] : STEPS.slice(0, shown).slice(-7)
  const tokens = STEPS.slice(0, shown).reduce((s, x) => s + (x.tok || 0), 0)
  const elapsed = (shown * 2.6).toFixed(1)
  const progress = Math.round((shown / STEPS.length) * 100)

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [cursor])

  return (
    <div className="relative overflow-hidden rounded-3xl glass-strong p-5 sm:p-7">
      {/* ambient blooms */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-brand-gradient opacity-20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-brand-gradient opacity-15 blur-3xl" />

      {/* Header */}
      <div className="relative mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1.5">
            <Link2 className="h-3.5 w-3.5 text-accent" />
            <span className="label-mono text-[11px]">amazon.com/dp/</span>
            <span className="text-xs font-semibold">B08N5WRWNW</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            agents live
          </span>
        </div>
        <div className="flex items-center gap-5">
          <Stat label="elapsed" value={`${elapsed}s`} />
          <Stat label="steps" value={`${shown}/${STEPS.length}`} />
          <Stat label="tokens" value={tokens.toLocaleString()} />
        </div>
      </div>

      {/* progress rail */}
      <div className="relative mb-6 h-1 w-full overflow-hidden rounded-full bg-black/5">
        <motion.div
          className="h-full rounded-full bg-brand-gradient"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      <div className="relative grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        {/* Agent roster */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-1">
          {AGENTS.map((a) => {
            const st = statuses[a.id]
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-300 ${
                  st === 'running'
                    ? 'border-transparent ring-gradient bg-white shadow-[0_10px_30px_-16px_rgba(109,94,246,0.6)]'
                    : st === 'done'
                      ? 'border-border/50 bg-white/70'
                      : 'border-border/40 bg-white/40 opacity-70'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    st === 'idle' ? 'bg-muted text-muted-foreground' : 'bg-brand-gradient text-white'
                  }`}
                >
                  <a.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{a.name}</div>
                  <div className="label-mono truncate text-[10px] text-muted-foreground">{a.role}</div>
                </div>
                <StatusChip status={st} />
              </div>
            )
          })}
        </div>

        {/* Live trace console */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#2a2158] bg-[#140d2b]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="label-mono text-[10px] text-white/40">orchestrator · trace</span>
          </div>
          <div
            ref={logRef}
            className="h-[300px] space-y-2 overflow-hidden px-4 py-3 font-mono text-[12px] leading-relaxed sm:h-[340px]"
          >
            {visibleLogs.length === 0 && (
              <div className="text-white/40">$ arrowlabs run --asin B08N5WRWNW</div>
            )}
            {visibleLogs.map((s, i) => {
              const agent = AGENTS.find((a) => a.id === s.agent)!
              const isLast = i === visibleLogs.length - 1
              return (
                <motion.div
                  key={`${cursor}-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2"
                >
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{ background: `${TAG_COLOR[s.agent]}22`, color: TAG_COLOR[s.agent] }}
                  >
                    {agent.name}
                  </span>
                  <span className="text-white/85">
                    {s.line}
                    {isLast && s.status === 'running' && (
                      <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-white/70" />
                    )}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-base font-semibold tabular leading-none">{value}</div>
      <div className="label-mono text-[9px] text-muted-foreground">{label}</div>
    </div>
  )
}

function StatusChip({ status }: { status: Status }) {
  if (status === 'running') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-semibold text-white">
        <Loader2 className="h-3 w-3 animate-spin" />
        running
      </span>
    )
  }
  if (status === 'done') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
        <Check className="h-3 w-3" />
        done
      </span>
    )
  }
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      queued
    </span>
  )
}

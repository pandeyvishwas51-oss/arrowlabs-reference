// Fixed ambient background behind all content - Linear-style.
// Layers: aurora mesh gradient + drifting orbs + panning perspective grid +
// fine dot grid. All slow, GPU-friendly, and disabled under prefers-reduced-motion.

export function BackgroundFX() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Aurora mesh - soft morphing color wash */}
      <div className="aurora opacity-90" />

      {/* Drifting colored orbs - violet / magenta / coral give the page life */}
      <div
        className="blob animate-drift-1"
        style={{ width: '560px', height: '560px', top: '-140px', right: '-120px', background: 'var(--grad-1)', opacity: 0.22 }}
      />
      <div
        className="blob animate-drift-2"
        style={{ width: '620px', height: '620px', top: '38vh', left: '-220px', background: 'var(--grad-2)', opacity: 0.16 }}
      />
      <div
        className="blob animate-drift-3"
        style={{ width: '480px', height: '480px', bottom: '-120px', right: '18%', background: 'var(--grad-3)', opacity: 0.18 }}
      />
      <div
        className="blob animate-drift-1"
        style={{ width: '420px', height: '420px', top: '60vh', right: '-100px', background: 'var(--grad-1)', opacity: 0.14 }}
      />

      {/* Panning perspective grid - masked to fade at edges */}
      <div className="absolute inset-0 grid-lines" />

      {/* Fine dot grid overlay */}
      <div className="absolute inset-0 dot-grid opacity-30" />
    </div>
  )
}

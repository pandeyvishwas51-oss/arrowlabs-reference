// ArrowLabs logo - a rounded "lab" frame (ink) enclosing an upward-right growth
// arrow (vermillion). The mark reads as momentum + engineering precision:
// commerce creative, generated and pointed up-and-to-the-right.
// Works on white and dark backgrounds via currentColor + --accent.

export function Logo({ className = '', showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="relative top-0.5"
      >
        <defs>
          <linearGradient id="logo-grad" x1="4" y1="28" x2="28" y2="4" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6D5EF6" />
            <stop offset="0.52" stopColor="#E24BF0" />
            <stop offset="1" stopColor="#FF5C7A" />
          </linearGradient>
        </defs>
        {/* Gradient lab tile */}
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#logo-grad)" />
        {/* Growth arrow shaft, lower-left to upper-right */}
        <path d="M10 22 L22 10" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
        {/* Arrowhead */}
        <path
          d="M14.5 9.5 L22.5 9.5 L22.5 17.5"
          stroke="white"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {showWordmark && (
        <span className="font-display text-[22px] font-medium tracking-tight text-foreground">
          Arrow<span className="text-gradient">Labs</span>
        </span>
      )}
    </span>
  )
}

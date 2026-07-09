'use client'

const brands = [
  'CeraVe',
  'Owala',
  'Sony',
  'Gymshark',
  'Ninja',
  'Anker',
  'PRIME',
  'The Ordinary',
  'Bose',
  'Logitech',
  'Soundcore',
  'HydroFlask',
]

export function Marquee() {
  return (
    <section className="hairline-t hairline-b overflow-hidden py-5">
      <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-6 lg:px-10">
        <span className="label-mono shrink-0 hidden md:block">Trusted by →</span>
        <div className="relative flex-1 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
          <div className="flex w-max animate-marquee items-center gap-12 whitespace-nowrap">
            {[...brands, ...brands].map((b, i) => (
              <span
                key={i}
                className="font-display text-base font-medium tracking-[0.1em] text-muted-foreground/70"
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

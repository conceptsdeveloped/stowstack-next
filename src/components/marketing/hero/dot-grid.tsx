export function DotGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      {/* Three infinite radial-gradient orbs. Hidden on mobile (`hidden sm:block`)
          because they're a measurable perf hit in the Facebook in-app browser
          on iPhone-class devices — three full-screen blurred gradients
          compositing 24/7 stutters the scroll on the very segment that's 80%
          of homepage traffic. Desktop keeps the ambient feel. */}
      <div className="hidden sm:block absolute w-[500px] h-[500px] rounded-full" style={{ top: "10%", left: "5%", background: "radial-gradient(circle, var(--accent-glow), transparent 70%)", animation: "hero-orb-drift 12s ease-in-out infinite alternate" }} />
      <div className="hidden sm:block absolute w-[400px] h-[400px] rounded-full" style={{ bottom: "5%", right: "0%", background: "radial-gradient(circle, var(--color-blue-light), transparent 70%)", animation: "hero-orb-drift 10s ease-in-out infinite alternate-reverse" }} />
      <div className="hidden sm:block absolute w-[200px] h-[200px] rounded-full" style={{ top: "40%", right: "20%", background: "radial-gradient(circle, var(--color-green-light), transparent 70%)", animation: "hero-orb-drift 14s ease-in-out infinite alternate" }} />
    </div>
  );
}

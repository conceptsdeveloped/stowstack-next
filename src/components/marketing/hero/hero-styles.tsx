export function HeroStyles() {
  return (
    <style>{`
      @keyframes hero-float-a{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes hero-float-b{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes hero-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes hero-glow-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
      @keyframes hero-shimmer{0%{background-position:200% 0}50%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes hero-orb-drift{0%{transform:translate(0,0)}100%{transform:translate(30px,-20px)}}
      @keyframes hero-live-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.7)}}
      @keyframes hero-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes hero-scroll-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
      @keyframes hero-pipeline-flow{0%{width:0}100%{width:100%}}
      @keyframes hero-border-glow{0%,100%{box-shadow:0 0 0 1px rgba(181,139,63,0.08),0 20px 50px rgba(0,0,0,0.07)}50%{box-shadow:0 0 0 1px rgba(181,139,63,0.2),0 20px 60px rgba(181,139,63,0.08),0 40px 100px rgba(0,0,0,0.04)}}
      @keyframes hero-blur-in{0%{opacity:0;filter:blur(8px);transform:translateY(16px)}100%{opacity:1;filter:blur(0);transform:translateY(0)}}
      @keyframes hero-scale-in{0%{opacity:0;transform:scale(0.85)}100%{opacity:1;transform:scale(1)}}
      @keyframes hero-slide-right{0%{opacity:0;transform:translateX(-24px)}100%{opacity:1;transform:translateX(0)}}
      @keyframes hero-slide-left{0%{opacity:0;transform:translateX(24px)}100%{opacity:1;transform:translateX(0)}}
      @keyframes hero-rotate-in{0%{opacity:0;transform:rotate(-3deg) scale(0.95)}100%{opacity:1;transform:rotate(0) scale(1)}}
      @keyframes hero-number-pop{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
      @keyframes hero-draw-check{0%{stroke-dashoffset:24}100%{stroke-dashoffset:0}}
      @keyframes hero-bar-fill{0%{width:0}100%{width:var(--bar-width)}}
      @keyframes hero-card-lift{0%{box-shadow:0 1px 3px rgba(0,0,0,0.04)}100%{box-shadow:0 8px 24px rgba(0,0,0,0.08)}}
      @keyframes hero-ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes hero-badge-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      /* Tiny "value just changed" pulse — used on the demo dashboard's
         stat values so each month tick reads as a live update, not a
         silent re-render. */
      @keyframes hero-value-flash{0%{color:var(--accent);transform:translateY(-1px)}60%{transform:translateY(0)}100%{color:var(--color-dark);transform:translateY(0)}}
      @keyframes hero-cta-pulse{0%,100%{box-shadow:0 0 0 0 var(--accent-glow)}50%{box-shadow:0 0 0 6px transparent}}
      .stat-cell{padding:16px 12px 18px}
      @media (min-width:480px){.stat-cell{padding:20px 16px 22px}}
      @media (min-width:768px){.stat-cell{padding:22px 20px 24px}}
      /* "proves" gradient text. Defined here (not inline) so the
         .urbit-landing [style*="linear-gradient"] kill-switch in
         globals.css doesn't strip it. */
      .hero-proves-gradient{
        background-image:linear-gradient(135deg,var(--accent),var(--color-blue),var(--accent-hover));
        background-size:200% 200%;
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
        -webkit-text-fill-color:transparent;
        animation:hero-gradient-shift 3s ease-in-out infinite;
      }
      /* Scoped reduce-motion override — kills hero's looping animations
         (float, pulse, shimmer, gradient shift, scroll bounce) while
         leaving fade-in transitions intact at a much shorter duration. */
      @media (prefers-reduced-motion: reduce) {
        #hero *, #hero *::before, #hero *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          animation-delay: 0ms !important;
        }
      }
    `}</style>
  );
}

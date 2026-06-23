"use client";

import { animate, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

export function Counter({ value }: { value: string }) {
  const m = value.match(/^([^\d]*)([\d,]+)(.*)$/);
  const has = !!m;
  const prefix = m?.[1] ?? "";
  const raw = m?.[2] ?? "";
  const suffix = m?.[3] ?? "";
  const grouped = raw.includes(",");
  const target = has ? parseInt(raw.replace(/,/g, ""), 10) : 0;

  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!has || !inView) return;
    const controls = animate(0, target, {
      duration: 1.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, has]);

  // Ensure the printed PDF shows final values even if the section was never
  // scrolled into view (the count-up otherwise leaves it at 0).
  useEffect(() => {
    if (!has) return;
    const toEnd = () => flushSync(() => setN(target));
    window.addEventListener("beforeprint", toEnd);
    return () => window.removeEventListener("beforeprint", toEnd);
  }, [has, target]);

  if (!has) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref}>
      {prefix}
      {grouped ? n.toLocaleString("en-US") : n}
      {suffix}
    </span>
  );
}

"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

/**
 * LazyMotion in strict mode: every primitive uses the lightweight `m.*`
 * components, and the animation feature bundle loads once here. Importing
 * the full `motion.*` namespace inside the tree throws in dev — that's the
 * point; it keeps the homepage motion bundle small on purpose.
 */
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

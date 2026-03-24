"use client";

import { useState, useEffect, useCallback } from "react";

interface AnimatedTextCycleProps {
  words: string[];
  interval?: number;
  className?: string;
}

export default function AnimatedTextCycle({
  words,
  interval = 3000,
  className = "",
}: AnimatedTextCycleProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const next = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % words.length);
      setIsAnimating(false);
    }, 400);
  }, [words.length]);

  useEffect(() => {
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [next, interval]);

  return (
    <span className={`inline-flex overflow-hidden ${className}`}>
      <span
        className={`inline-block transition-all duration-400 ease-in-out ${
          isAnimating
            ? "translate-y-full opacity-0 blur-[2px]"
            : "translate-y-0 opacity-100 blur-0"
        }`}
        style={{ color: "var(--accent)" }}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
}

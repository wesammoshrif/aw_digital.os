"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Zählt eine Zahl beim Erscheinen sanft hoch — „numbers that breathe".
 * Monospace-tabellarisch, damit kein Layout-Shift entsteht.
 */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 650,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const shownRef = useRef(0); // zuletzt gerenderter Wert (für saubere Unterbrechung)
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(safe);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      const val = from + (safe - from) * eased;
      shownRef.current = val;
      setDisplay(val);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = safe;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Bei Unterbrechung vom zuletzt gezeigten Wert weiter (kein Sprung).
      fromRef.current = shownRef.current;
    };
  }, [safe, duration]);

  const formatted = display.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={"tabular " + className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/** Animates the leading number of a value like "4+" or "120k" when it scrolls into view. */
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const m = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  // null = show the real value (server HTML, no JS, before it scrolls into view).
  const [n, setN] = useState<number | null>(null);

  useEffect(() => {
    if (!m) return;
    const target = parseFloat(m[2]);
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / duration);
          setN(target * (1 - Math.pow(1 - k, 3)));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  if (!m) return <span>{value}</span>;
  const decimals = m[2].includes(".") ? m[2].split(".")[1].length : 0;
  return (
    <span ref={ref} className="tabular-nums">
      {m[1]}
      {n === null ? m[2] : n.toFixed(decimals)}
      {m[3]}
    </span>
  );
}

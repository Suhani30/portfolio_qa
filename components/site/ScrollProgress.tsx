"use client";

import { useEffect, useRef } from "react";

/** Thin gradient bar under the nav showing how far through the page you are. */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[55] h-[3px]">
      <div ref={ref} className="h-full origin-left scale-x-0 bg-gradient-to-r from-pass-400 via-teal-400 to-amber-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]" />
    </div>
  );
}

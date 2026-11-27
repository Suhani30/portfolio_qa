"use client";

import { useEffect } from "react";

/** Cards glow where the cursor is; `.tilt` cards also tilt in 3D. */
export default function Spotlight() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let tilted: HTMLElement | null = null;
    const untilt = () => {
      if (tilted) tilted.style.transform = "";
      tilted = null;
    };
    const onMove = (e: PointerEvent) => {
      const card = (e.target as HTMLElement | null)?.closest?.<HTMLElement>(".card");
      if (!card) return untilt();
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
      if (reduce || !card.classList.contains("tilt")) return untilt();
      if (tilted && tilted !== card) untilt();
      tilted = card;
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 6).toFixed(2)}deg) translateY(-2px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", untilt);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", untilt);
    };
  }, []);
  return null;
}

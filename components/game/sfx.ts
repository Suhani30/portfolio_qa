"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Shared, synthesized sound effects for all mini-games: no audio files needed. */

export type Sfx = "squash" | "win" | "coin" | "bonus" | "sail";

const MUTE_KEY = "games:muted";
const MUTE_EVENT = "games:muted-change";

const NOTES: Record<Sfx, { f: number[]; gap: number; type: OscillatorType; len: number }> = {
  squash: { f: [520, 260], gap: 0.05, type: "square", len: 0.14 },
  win: { f: [523, 659, 784, 1047], gap: 0.11, type: "triangle", len: 0.16 },
  coin: { f: [988, 1319], gap: 0.06, type: "square", len: 0.1 },
  bonus: { f: [659, 784, 988, 1319], gap: 0.07, type: "triangle", len: 0.14 },
  sail: { f: [330, 392], gap: 0.12, type: "sine", len: 0.25 },
};

/** Mute state shared across games (synced via localStorage + a window event). */
export function useMuted(defaultMuted = false): [boolean, (m: boolean) => void] {
  const [muted, setMuted] = useState(defaultMuted);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MUTE_KEY);
      setMuted(saved === null ? defaultMuted : saved === "1");
    } catch {}
    const on = (e: Event) => setMuted((e as CustomEvent<boolean>).detail);
    window.addEventListener(MUTE_EVENT, on);
    return () => window.removeEventListener(MUTE_EVENT, on);
  }, [defaultMuted]);
  const set = useCallback((m: boolean) => {
    try {
      localStorage.setItem(MUTE_KEY, m ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent(MUTE_EVENT, { detail: m }));
  }, []);
  return [muted, set];
}

export function useSfx(muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(
    (kind: Sfx) => {
      if (muted || typeof window === "undefined") return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current ??= new AC();
        const ctx = ctxRef.current;
        const n = NOTES[kind];
        n.f.forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const t = ctx.currentTime + i * n.gap;
          o.type = n.type;
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + n.len);
          o.connect(g).connect(ctx.destination);
          o.start(t);
          o.stop(t + n.len + 0.02);
        });
      } catch {}
    },
    [muted]
  );
}

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

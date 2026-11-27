"use client";

import { useEffect, useMemo, useState } from "react";
import { ACHIEVEMENTS, useCoinExplorer } from "./CoinExplorer";
import { useGameSettings } from "./settings";
import { fmtTime } from "./sfx";

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.6,
        char: ["🪙", "✨", "🌴", "⭐"][i % 4],
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="absolute top-[-30px] animate-confetti text-xl" style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s` }}>
          {p.char}
        </span>
      ))}
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" className="stroke-ink-200 dark:stroke-ink-800" />
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3" strokeLinecap="round" stroke="#f59e0b" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className="transition-[stroke-dashoffset] duration-700" />
    </svg>
  );
}

export default function CoinHUD() {
  const q = useCoinExplorer();
  const g = useGameSettings();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (!q.coins) return;
    setBump(true);
    const t = setTimeout(() => setBump(false), 350);
    return () => clearTimeout(t);
  }, [q.coins]);

  const winOpen = !!q.finishedAt && !q.celebrated;
  const { dismissCelebration } = q;
  useEffect(() => {
    if (!winOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismissCelebration();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [winOpen, dismissCelebration]);

  if (!q.enabled || !q.totalCoins) return null;

  const pct = q.collected.length / q.totalCoins;
  const done = !!q.finishedAt;
  const showWin = done && !q.celebrated;
  const elapsed = q.startedAt && q.finishedAt ? Math.round((q.finishedAt - q.startedAt) / 1000) : 0;

  return (
    <>
      {q.toast && (
        <div role="status" className="pointer-events-none fixed left-1/2 top-20 z-[65] -translate-x-1/2 animate-pop whitespace-nowrap rounded-full border border-amber-300/40 bg-white/95 px-4 py-2 text-sm font-medium text-ink-900 shadow-xl backdrop-blur dark:bg-ink-900/95 dark:text-white">
          {q.toast}
        </div>
      )}

      <div className="fixed bottom-5 left-5 z-[60] flex flex-col items-start gap-2">
        {open && (
          <div className="w-[min(320px,calc(100vw-2.5rem))] animate-pop rounded-2xl border border-ink-200 bg-white/95 p-4 shadow-2xl shadow-ink-900/10 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/95 dark:shadow-black/50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">🏝 Island Explorer</p>
                <p className="mt-0.5 text-xs text-ink-500">Every section is an island. Tap the 🪙 coins to collect them.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close panel" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center font-mono">
              <div className="rounded-xl bg-amber-400/10 p-2">
                <p className="text-[10px] uppercase text-ink-500">score</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">{q.coins}</p>
              </div>
              <div className="rounded-xl bg-ink-500/10 p-2">
                <p className="text-[10px] uppercase text-ink-500">coins</p>
                <p className="text-lg font-semibold">
                  {q.collected.length}
                  <span className="text-xs text-ink-400">/{q.totalCoins}</span>
                </p>
              </div>
              <div className="rounded-xl bg-pass-500/10 p-2">
                <p className="text-[10px] uppercase text-ink-500">islands</p>
                <p className="text-lg font-semibold text-pass-600 dark:text-pass-400">
                  {q.cleared.length}
                  <span className="text-xs text-ink-400">/{q.islands.length}</span>
                </p>
              </div>
            </div>

            <p className="mb-1.5 mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-500">islands · tap to travel</p>
            <ul className="max-h-44 space-y-1 overflow-y-auto pr-1">
              {q.islands.map((isl, i) => {
                const all = q.coinList.filter((c) => c.island === isl.id);
                const got = all.filter((c) => q.collected.includes(c.id)).length;
                const cleared = q.cleared.includes(isl.id);
                const here = q.current === isl.id;
                return (
                  <li key={isl.id}>
                    <button
                      onClick={() => q.scrollToIsland(isl.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-ink-100 dark:hover:bg-ink-800 ${here ? "bg-amber-400/10" : ""}`}
                    >
                      <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md font-mono text-[10px] font-bold ${cleared ? "bg-pass-500 text-white dark:text-ink-950" : here ? "bg-amber-400 text-ink-950" : "bg-ink-100 text-ink-500 dark:bg-ink-800"}`}>
                        {cleared ? "✓" : i + 1}
                      </span>
                      <span className="flex-1 truncate">{isl.name}</span>
                      <span className="font-mono text-[10px] text-ink-500">
                        {got}/{all.length}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {g.achievements && (
              <>
                <p className="mb-1.5 mt-4 font-mono text-[10px] uppercase tracking-wider text-ink-500">
                  achievements · {q.achievements.length}/{ACHIEVEMENTS.length}
                </p>
                <div className="flex gap-1.5">
                  {ACHIEVEMENTS.map((a) => {
                    const got = q.achievements.includes(a.id);
                    return (
                      <span
                        key={a.id}
                        title={`${a.title}: ${a.desc}`}
                        className={`grid h-9 flex-1 place-items-center rounded-lg text-lg transition ${got ? "bg-amber-400/15 ring-1 ring-amber-400/40" : "bg-ink-100 opacity-40 grayscale dark:bg-ink-800"}`}
                      >
                        {a.icon}
                      </span>
                    );
                  })}
                </div>
              </>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={() => q.setMuted(!q.muted)} className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs transition hover:border-ink-400 dark:border-ink-700">
                {q.muted ? "🔇 Sound off" : "🔊 Sound on"}
              </button>
              <button
                onClick={() => {
                  if (window.confirm("Reset your coins and achievements?")) q.reset();
                }}
                className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs text-ink-500 transition hover:border-red-400 hover:text-red-500 dark:border-ink-700"
              >
                ↺ Reset progress
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className={`group flex items-center gap-2.5 rounded-full border border-amber-300/50 bg-white/90 py-1.5 pl-1.5 pr-4 shadow-xl shadow-amber-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 dark:bg-ink-900/90 dark:shadow-black/40 ${bump ? "scale-110" : ""}`}
        >
          <span className="relative grid h-9 w-9 place-items-center">
            <Ring pct={pct} />
            <span className="iq-coin-static" />
          </span>
          <span className="text-left leading-tight">
            <span className="block font-mono text-sm font-semibold tabular-nums text-ink-900 dark:text-white">{q.coins} coins</span>
            <span className="hidden font-mono text-[10px] text-ink-500 sm:block">
              {done ? "all islands cleared 🏁" : `${q.cleared.length}/${q.islands.length} islands · tap to explore`}
            </span>
          </span>
        </button>
      </div>

      {showWin && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm" onClick={q.dismissCelebration}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ce-win" className="w-full max-w-md animate-pop overflow-hidden rounded-2xl border border-amber-400/30 bg-white shadow-2xl dark:bg-ink-900">
              <div className="bg-gradient-to-br from-amber-400 via-teal-500 to-pass-500 p-6 text-center text-white">
                <p className="text-4xl">🏆</p>
                <h2 id="ce-win" className="mt-2 text-2xl font-semibold tracking-tight">
                  {g.finishTitle}
                </h2>
              </div>
              <div className="p-6 text-center">
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="rounded-xl bg-amber-400/10 p-3">
                    <p className="text-[10px] uppercase text-ink-500">score</p>
                    <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">{q.coins}</p>
                  </div>
                  <div className="rounded-xl bg-pass-500/10 p-3">
                    <p className="text-[10px] uppercase text-ink-500">islands</p>
                    <p className="text-xl font-semibold text-pass-600 dark:text-pass-400">{q.cleared.length}</p>
                  </div>
                  <div className="rounded-xl bg-sky-500/10 p-3">
                    <p className="text-[10px] uppercase text-ink-500">time</p>
                    <p className="text-xl font-semibold text-sky-600 dark:text-sky-400">{fmtTime(elapsed)}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{g.finishMessage}</p>
                <div className="mt-5 flex gap-3">
                  <a href="#contact" onClick={q.dismissCelebration} className="btn-primary flex-1">
                    Let&apos;s work together
                  </a>
                  <button onClick={q.dismissCelebration} className="btn-ghost">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

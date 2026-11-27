"use client";

import { useEffect, useMemo, useState } from "react";
import { useIslandQuest, type Dir } from "./IslandQuest";
import { fmtTime } from "./sfx";

function PadButton({ dir, label, className = "" }: { dir: Dir; label: string; className?: string }) {
  const { press } = useIslandQuest();
  const on = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    press(dir, true);
  };
  const off = () => press(dir, false);
  return (
    <button
      type="button"
      aria-label={dir}
      onPointerDown={on}
      onPointerUp={off}
      onPointerCancel={off}
      onLostPointerCapture={off}
      onContextMenu={(e) => e.preventDefault()}
      className={`grid h-9 w-9 select-none place-items-center rounded-lg border border-ink-200 bg-white text-sm text-ink-700 transition active:scale-90 active:border-pass-500 active:bg-pass-500/10 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-200 ${className}`}
      style={{ touchAction: "none" }}
    >
      {label}
    </button>
  );
}

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

export default function IslandHUD() {
  const q = useIslandQuest();
  const [now, setNow] = useState(() => Date.now());
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!q.active || q.finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [q.active, q.finishedAt]);

  if (!q.enabled || !q.active) return null;

  const elapsed = q.startedAt ? Math.max(0, Math.round(((q.finishedAt ?? now) - q.startedAt) / 1000)) : 0;
  const total = q.coinList.length;
  const maxCoins = total + q.islands.length * q.islandBonus;
  const currentIsland = q.islands.find((i) => i.id === q.current);
  const won = !!q.finishedAt;

  return (
    <>
      {/* Toast */}
      {q.toast && (
        <div className="pointer-events-none fixed left-1/2 top-20 z-[65] -translate-x-1/2 animate-pop rounded-full border border-amber-300/40 bg-white/95 px-4 py-2 text-sm font-medium text-ink-900 shadow-xl backdrop-blur dark:bg-ink-900/95 dark:text-white">
          {q.toast}
        </div>
      )}

      {/* HUD */}
      <div className="fixed bottom-5 right-5 z-[60] w-[min(300px,calc(100vw-2.5rem))] animate-pop rounded-2xl border border-ink-200 bg-white/95 shadow-2xl shadow-ink-900/10 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/95 dark:shadow-black/50">
        <div className="flex items-center justify-between px-4 pt-3">
          <button onClick={() => setCollapsed((c) => !c)} className="flex items-center gap-2 text-sm font-semibold" aria-expanded={!collapsed}>
            🏝 Island Quest
            <span className={`text-[10px] text-ink-400 transition-transform ${collapsed ? "" : "rotate-180"}`}>▲</span>
          </button>
          <span className="font-mono text-sm tabular-nums text-ink-600 dark:text-ink-300">{fmtTime(elapsed)}</span>
        </div>

        <div className="flex items-end justify-between px-4 pt-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">coins</p>
            <p className="flex items-center gap-1.5 text-2xl font-semibold tabular-nums">
              <span className="iq-coin-static" />
              {q.coins}
              <span className="text-xs font-normal text-ink-400">/ {maxCoins}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-500">islands cleared</p>
            <p className="font-mono text-lg font-semibold text-pass-600 dark:text-pass-400">
              {q.cleared.length}
              <span className="text-xs text-ink-400"> / {q.islands.length}</span>
            </p>
          </div>
        </div>

        {!collapsed && (
          <div className="px-4 pb-4">
            <p className="mt-2 truncate font-mono text-[11px] text-amber-600 dark:text-amber-400">
              {currentIsland ? `📍 ${currentIsland.name}` : "📍 At sea"}
            </p>

            {/* Island map */}
            <ol className="mt-2 flex gap-1" aria-label="Island map">
              {q.islands.map((isl, i) => {
                const done = q.cleared.includes(isl.id);
                const here = q.current === isl.id;
                const seen = q.visited.includes(isl.id);
                return (
                  <li key={isl.id} className="flex-1">
                    <button
                      onClick={() => q.sailTo(isl.id)}
                      disabled={q.sailing || won}
                      title={`Sail to ${isl.name}`}
                      className={`h-6 w-full rounded-md font-mono text-[10px] font-semibold transition hover:scale-110 disabled:hover:scale-100 ${
                        done
                          ? "bg-pass-500 text-white dark:text-ink-950"
                          : here
                            ? "bg-amber-400 text-ink-950 ring-2 ring-amber-400/40"
                            : seen
                              ? "bg-amber-400/25 text-amber-700 dark:text-amber-300"
                              : "bg-ink-100 text-ink-400 dark:bg-ink-800"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </button>
                  </li>
                );
              })}
            </ol>

            <div className="mt-3 flex items-center gap-3">
              {/* D-pad */}
              <div className="grid grid-cols-3 gap-1">
                <span />
                <PadButton dir="up" label="▲" />
                <span />
                <PadButton dir="left" label="◀" />
                <PadButton dir="boost" label="⚡" className="!text-amber-500" />
                <PadButton dir="right" label="▶" />
                <span />
                <PadButton dir="down" label="▼" />
                <span />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <button
                  onClick={q.sailNext}
                  disabled={q.sailing || won}
                  className="rounded-lg bg-sky-500 py-2 text-xs font-semibold text-white transition hover:bg-sky-400 disabled:opacity-40"
                >
                  ⛵ Sail to next island
                </button>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => q.setMuted(!q.muted)}
                    aria-label={q.muted ? "Unmute" : "Mute"}
                    className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs transition hover:border-ink-400 dark:border-ink-700"
                  >
                    {q.muted ? "🔇" : "🔊"}
                  </button>
                  <button onClick={q.quit} className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs text-ink-500 transition hover:border-red-400 hover:text-red-500 dark:border-ink-700">
                    Quit
                  </button>
                </div>
              </div>
            </div>
            <p className="mt-2.5 hidden font-mono text-[10px] text-ink-500 sm:block">Arrows / WASD to walk · Shift to sprint</p>
          </div>
        )}
      </div>

      {/* Victory */}
      {won && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="iq-win" className="w-full max-w-md animate-pop overflow-hidden rounded-2xl border border-amber-400/30 bg-white shadow-2xl dark:bg-ink-900">
              <div className="bg-gradient-to-br from-sky-500 via-teal-500 to-pass-500 p-6 text-center text-white">
                <p className="text-4xl">🏆</p>
                <h2 id="iq-win" className="mt-2 text-2xl font-semibold tracking-tight">
                  Voyage complete!
                </h2>
                <p className="mt-1 text-sm text-white/85">You explored every island of this portfolio.</p>
              </div>
              <div className="p-6 text-center">
                <div className="grid grid-cols-3 gap-3 font-mono">
                  <div className="rounded-xl bg-amber-400/10 p-3">
                    <p className="text-[10px] uppercase text-ink-500">coins</p>
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
                <p className="mt-5 text-sm text-ink-600 dark:text-ink-300">Every island checked and every coin collected: that's full test coverage.</p>
                <div className="mt-5 flex gap-3">
                  <a href="#contact" onClick={q.quit} className="btn-primary flex-1">
                    Let&apos;s work together
                  </a>
                  <button onClick={q.start} className="btn-ghost">
                    Sail again
                  </button>
                </div>
                <button onClick={q.quit} className="mt-4 text-xs text-ink-500 underline-offset-2 hover:underline">
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

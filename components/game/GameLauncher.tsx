"use client";

import { useEffect, useState } from "react";
import { useBugHunt } from "./BugHuntProvider";
import { useIslandQuest } from "./IslandQuest";
import { fmtTime } from "./sfx";

/** Floating "Play" button and game picker. Only one game runs at a time. */
export default function GameLauncher() {
  const bug = useBugHunt();
  const iq = useIslandQuest();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const bugOn = bug.enabled && bug.total > 0;
  const iqOn = iq.enabled && iq.islands.length > 0;
  if (!bugOn && !iqOn) return null;
  if (bug.active || iq.active) return null;

  const games = (bugOn ? 1 : 0) + (iqOn ? 1 : 0);

  const startBug = () => {
    iq.quit();
    bug.start();
    setOpen(false);
  };
  const startIsland = () => {
    bug.quit();
    iq.start();
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full border border-ink-200 bg-white/90 py-2 pl-2 pr-4 text-sm shadow-xl shadow-ink-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-pass-500/50 dark:border-ink-800 dark:bg-ink-900/90 dark:shadow-black/40"
      >
        <span className="relative grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-pass-400 to-sky-500 text-base transition group-hover:rotate-12">
          🎮
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
        </span>
        <span className="text-left leading-tight">
          <span className="block font-medium text-ink-900 dark:text-white">Play while you browse</span>
          <span className="block font-mono text-[10px] text-ink-500">
            {games} mini-game{games > 1 ? "s" : ""} · explore & win
          </span>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gl-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl animate-pop rounded-2xl border border-ink-200 bg-white p-6 shadow-2xl sm:p-8 dark:border-ink-800 dark:bg-ink-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-pass-600 dark:text-pass-400">arcade.spec.ts</p>
                <h2 id="gl-title" className="mt-1 text-2xl font-semibold tracking-tight">
                  Pick a game
                </h2>
                <p className="mt-1 text-sm text-ink-500">Explore the whole portfolio while you play.</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800">
                ✕
              </button>
            </div>

            <div className={`mt-6 grid gap-4 ${games > 1 ? "sm:grid-cols-2" : ""}`}>
              {iqOn && (
                <button
                  onClick={startIsland}
                  className="group relative overflow-hidden rounded-xl border border-ink-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-lg dark:border-ink-800"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-20 transition group-hover:rotate-12 group-hover:opacity-40">🏝</div>
                  <p className="text-3xl">🏝</p>
                  <h3 className="mt-3 font-semibold">Island Quest</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                    Each section is an island. Walk a QA bot across all <b>{iq.islands.length}</b> of them, or sail between them, and collect every coin.
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-[11px] text-ink-500">
                    <li>🪙 {iq.coinsPerIsland} coins per island</li>
                    {iq.islandBonus > 0 && <li>🎁 +{iq.islandBonus} bonus for each island cleared</li>}
                    <li>⌨ Arrows / WASD · 📱 on-screen pad</li>
                  </ul>
                  <span className="mt-4 inline-flex rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white">Set sail →</span>
                </button>
              )}
              {bugOn && (
                <button
                  onClick={startBug}
                  className="group relative overflow-hidden rounded-xl border border-ink-200 p-5 text-left transition hover:-translate-y-0.5 hover:border-red-400 hover:shadow-lg dark:border-ink-800"
                >
                  <div className="pointer-events-none absolute -right-6 -top-6 text-7xl opacity-20 transition group-hover:rotate-12 group-hover:opacity-40">🐞</div>
                  <p className="text-3xl">🐞</p>
                  <h3 className="mt-3 font-semibold">Bug Hunt</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                    <b>{bug.total} bugs</b> have crept into this portfolio. Find and squash them all before release, against the clock.
                  </p>
                  <ul className="mt-3 space-y-1 font-mono text-[11px] text-ink-500">
                    <li>🖱 Click or tap to squash</li>
                    <li>💡 Hints when you are stuck</li>
                    <li>🏅 Your time sets your QA rank{bug.bestTime !== null ? ` · best ${fmtTime(bug.bestTime)}` : ""}</li>
                  </ul>
                  <span className="mt-4 inline-flex rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white">Start hunting →</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

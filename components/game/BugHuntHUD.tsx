"use client";

import { useEffect, useMemo, useState } from "react";
import { useBugHunt } from "./BugHuntProvider";
import { fmtTime as fmt } from "./sfx";
import { useGameSettings } from "./settings";

function rank(sec: number, t: { principal: number; senior: number; engineer: number }) {
  if (sec <= t.principal) return { title: "Principal QA", note: "Nothing escapes you. Zero defects in production." };
  if (sec <= t.senior) return { title: "Senior QA Engineer", note: "Fast, thorough and ready for release day." };
  if (sec <= t.engineer) return { title: "QA Engineer", note: "Solid coverage, every bug in the tracker." };
  return { title: "QA Intern", note: "You found them all, and that's what counts." };
}

const BugGlyph = ({ className = "h-4 w-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <rect x="7" y="8" width="10" height="12" rx="5" />
    <path d="M12 8v12M9 5l1.5 2M15 5l-1.5 2M3 13h4M17 13h4M4 8l3 2M20 8l-3 2M4 19l3-2M20 19l-3-2" />
  </svg>
);

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 2.2 + Math.random() * 1.6,
        color: ["#10b981", "#34d399", "#f59e0b", "#3b82f6", "#ec4899", "#a855f7"][i % 6],
        size: 6 + Math.random() * 6,
        rot: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute top-[-20px] animate-confetti rounded-sm"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.45,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export default function BugHuntHUD() {
  const { enabled, active, found, total, bugIds, startedAt, finishedAt, bestTime, muted, start, quit, setMuted } = useBugHunt();
  const [now, setNow] = useState(() => Date.now());
  const [dismissedWin, setDismissedWin] = useState(false);
  const [hintMsg, setHintMsg] = useState("");
  const [introOpen, setIntroOpen] = useState(false);
  const g = useGameSettings();

  useEffect(() => {
    if (!active || finishedAt) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [active, finishedAt]);

  useEffect(() => {
    if (!finishedAt) setDismissedWin(false);
  }, [finishedAt]);

  if (!enabled || total === 0) return null;

  const elapsed = startedAt ? Math.max(0, Math.round(((finishedAt ?? now) - startedAt) / 1000)) : 0;
  const pct = total ? (found.length / total) * 100 : 0;
  const won = active && !!finishedAt;

  const hint = () => {
    const remaining = bugIds.filter((id) => !found.includes(id));
    if (!remaining.length) return;
    // Pick the remaining bug closest to the current viewport
    const els = remaining
      .map((id) => document.querySelector<HTMLElement>(`[data-bug-id="${id}"]`))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const mid = window.innerHeight / 2;
    els.sort((a, b) => Math.abs(a.getBoundingClientRect().top - mid) - Math.abs(b.getBoundingClientRect().top - mid));
    const el = els[0];
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("bug-hint");
    setTimeout(() => el.classList.remove("bug-hint"), 2200);
    const section = el.closest("section")?.id;
    setHintMsg(section ? `Look around #${section}` : "Over here!");
    setTimeout(() => setHintMsg(""), 2200);
  };

  /* ---------- idle: its own button ---------- */
  if (!active) {
    return (
      <>
        <button
          onClick={() => setIntroOpen(true)}
          className="group fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full border border-red-400/30 bg-white/90 py-1.5 pl-1.5 pr-4 text-sm shadow-xl shadow-ink-900/10 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-red-400/60 dark:bg-ink-900/90 dark:shadow-black/40"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-full bg-red-500/10 text-red-500 transition group-hover:rotate-12">
            <BugGlyph className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 font-mono text-[9px] font-bold text-white">{total}</span>
          </span>
          <span className="text-left leading-tight">
            <span className="block font-medium text-ink-900 dark:text-white">{g.bugButtonLabel || "Bug Hunt"}</span>
            <span className="hidden font-mono text-[10px] text-ink-500 sm:block">{total} bugs hiding · play</span>
          </span>
        </button>

        {introOpen && (
          <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm" onClick={() => setIntroOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="bh-title"
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md animate-pop rounded-2xl border border-ink-200 bg-white p-7 shadow-2xl dark:border-ink-800 dark:bg-ink-900"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-red-500/10 text-red-500">
                  <BugGlyph className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-pass-600 dark:text-pass-400">mini-game · {total} bugs</p>
                  <h2 id="bh-title" className="text-xl font-semibold tracking-tight">
                    {g.bugButtonLabel || "Bug Hunt"}
                  </h2>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{g.bugIntro}</p>
              <ul className="mt-4 space-y-1.5 font-mono text-xs text-ink-500">
                <li>▸ Click or tap a bug to squash it</li>
                {g.bugHints && <li>▸ Stuck? Use Hint to jump to the nearest one</li>}
                <li>▸ Your time decides your QA rank</li>
              </ul>
              {bestTime !== null && (
                <p className="mt-4 text-xs text-ink-500">
                  Your best time: <span className="font-mono font-semibold text-pass-600 dark:text-pass-400">{fmt(bestTime)}</span>
                </p>
              )}
              <div className="mt-6 flex gap-3">
                <button
                  autoFocus
                  onClick={() => {
                    setIntroOpen(false);
                    start();
                  }}
                  className="btn-primary flex-1"
                >
                  Start hunting
                </button>
                <button onClick={() => setIntroOpen(false)} className="btn-ghost">
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------- active: HUD ---------- */
  const r = rank(elapsed, { principal: g.rankPrincipal, senior: g.rankSenior, engineer: g.rankEngineer });
  return (
    <>
      <div className="fixed bottom-5 right-5 z-[60] w-[min(320px,calc(100vw-2.5rem))] animate-pop rounded-2xl border border-ink-200 bg-white/95 p-4 shadow-2xl shadow-ink-900/10 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-900/95 dark:shadow-black/50">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-red-500">
              <BugGlyph />
            </span>
            Bug Hunt
          </span>
          <span className="font-mono text-sm tabular-nums text-ink-600 dark:text-ink-300">{fmt(elapsed)}</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between font-mono text-xs">
          <span className="text-ink-500">bugs fixed</span>
          <span>
            <span className="text-base font-semibold text-pass-600 dark:text-pass-400">{found.length}</span>
            <span className="text-ink-400"> / {total}</span>
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
          <div className="h-full rounded-full bg-gradient-to-r from-pass-500 to-teal-400 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 flex gap-1">
          {bugIds.map((id) => (
            <span key={id} className={`h-1 flex-1 rounded-full transition-colors ${found.includes(id) ? "bg-pass-500" : "bg-red-500/40"}`} />
          ))}
        </div>

        {hintMsg && <p className="mt-2 font-mono text-[11px] text-amber-600 dark:text-amber-400">{hintMsg}</p>}

        <div className="mt-3 flex items-center gap-2">
          {g.bugHints && (
          <button onClick={hint} disabled={won} className="flex-1 rounded-lg border border-ink-200 py-1.5 text-xs font-medium transition hover:border-amber-400 hover:text-amber-600 disabled:opacity-40 dark:border-ink-700 dark:hover:text-amber-400">
            💡 Hint
          </button>
          )}
          <button
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs transition hover:border-ink-400 dark:border-ink-700"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={quit} className="rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs text-ink-500 transition hover:border-red-400 hover:text-red-500 dark:border-ink-700">
            Quit
          </button>
        </div>
      </div>

      {won && !dismissedWin && (
        <>
          <Confetti />
          <div className="fixed inset-0 z-[80] grid place-items-center bg-ink-950/60 p-5 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="bh-win" className="w-full max-w-md animate-pop overflow-hidden rounded-2xl border border-pass-500/30 bg-white shadow-2xl dark:bg-ink-900">
              <div className="border-b border-ink-200 bg-ink-950 p-5 font-mono text-[12.5px] text-ink-300 dark:border-ink-800">
                <p>
                  <span className="text-pass-400">➜</span> qa run --suite=portfolio
                </p>
                <p className="mt-1">
                  <span className="rounded bg-pass-500/20 px-1.5 text-[10.5px] font-semibold text-pass-300">PASS</span> {total}/{total} bugs fixed in{" "}
                  {fmt(elapsed)}
                </p>
                <p className="mt-1 text-pass-400">✓ Release approved</p>
              </div>
              <div className="p-7 text-center">
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink-500">your rank</p>
                <h2 id="bh-win" className="mt-1 bg-gradient-to-r from-pass-500 to-teal-400 bg-clip-text text-3xl font-semibold tracking-tight text-transparent">
                  {r.title}
                </h2>
                <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">{r.note}</p>
                <div className="mt-5 flex justify-center gap-6 font-mono text-xs">
                  <div>
                    <p className="text-ink-500">time</p>
                    <p className="text-lg font-semibold">{fmt(elapsed)}</p>
                  </div>
                  <div>
                    <p className="text-ink-500">best</p>
                    <p className="text-lg font-semibold text-pass-600 dark:text-pass-400">{bestTime !== null ? fmt(bestTime) : "-"}</p>
                  </div>
                </div>
                <p className="mt-6 text-sm text-ink-600 dark:text-ink-300">Liked hunting bugs? This is my day job.</p>
                <div className="mt-4 flex gap-3">
                  <a
                    href="#contact"
                    onClick={() => {
                      setDismissedWin(true);
                      quit();
                    }}
                    className="btn-primary flex-1"
                  >
                    Hire the real QA
                  </a>
                  <button onClick={start} className="btn-ghost">
                    Play again
                  </button>
                </div>
                <button
                  onClick={() => {
                    setDismissedWin(true);
                    quit();
                  }}
                  className="mt-4 text-xs text-ink-500 underline-offset-2 hover:underline"
                >
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

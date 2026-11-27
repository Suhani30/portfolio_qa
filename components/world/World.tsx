"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameSettings, SiteContent } from "@/lib/types";
import { useMuted, useSfx } from "@/components/game/sfx";
import { createWorld, type WorldApi } from "./engine";
import IslandPanel, { type IslandInfo } from "./IslandPanel";

type Props = {
  c: SiteContent;
  g: GameSettings;
  islands: IslandInfo[];
  onExit: (reason?: string) => void;
  onReady: () => void;
};

const KIND_ICON: Record<string, string> = {
  home: "🏠",
  about: "🌸",
  work: "🧪",
  experience: "🏰",
  skills: "💎",
  credentials: "📜",
  contact: "💌",
  custom: "✨",
};

export default function World({ c, g, islands, onExit, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const apiRef = useRef<WorldApi | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const labelEls = useRef<(HTMLElement | null)[]>([]);
  const [here, setHere] = useState<number | null>(null);
  const [panel, setPanel] = useState<number | null>(null);
  const [bubble, setBubble] = useState("");
  const [muted, setMuted] = useMuted(!g.sound);
  const play = useSfx(muted);
  const playRef = useRef(play);
  playRef.current = play;
  const per = Math.max(1, Math.min(12, Math.round(g.coinsPerIsland) || 1));
  const storeKey = `world:coins:v1:${per}`;
  const total = islands.length * per;
  const [collected, setCollected] = useState<string[]>([]);
  const collectedRef = useRef<string[]>([]);
  const name = g.botName || "Testy";

  const say = useCallback((text: string, ms = 2800) => {
    setBubble(text);
    window.setTimeout(() => setBubble((b) => (b === text ? "" : b)), ms);
  }, []);

  /* ---------- start the 3D world ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let saved: string[] = [];
    try {
      saved = JSON.parse(localStorage.getItem(storeKey) || "[]");
    } catch {}
    collectedRef.current = saved;
    setCollected(saved);
    let api: WorldApi;
    try {
      api = createWorld(canvas, {
        islands: islands.map((i) => ({ id: i.id, name: i.name, kind: i.kind })),
        coinsPerIsland: per,
        collected: saved,
        dark: document.documentElement.classList.contains("dark"),
        catName: name,
        onIsland: (i) => {
          setHere(i);
          if (i !== null) {
            setPanel(i);
            playRef.current("sail");
          }
        },
        onCoin: (id) => {
          if (collectedRef.current.includes(id)) return;
          const next = [...collectedRef.current, id];
          collectedRef.current = next;
          setCollected(next);
          try {
            localStorage.setItem(storeKey, JSON.stringify(next));
          } catch {}
          playRef.current("coin");
          if (next.length === total) {
            window.setTimeout(() => playRef.current("win"), 400);
            say(g.finishTitle || "Full coverage achieved! 🏆", 4500);
          }
        },
        onSay: (t) => say(t),
        onPet: () => {
          playRef.current("meow");
          const lines = ["Purrr… 💗", "Meow! 🐾", "Prrrt? 😸", "More coins, please! 🪙"];
          say(lines[Math.floor(Math.random() * lines.length)]);
        },
      });
    } catch {
      onExit("Your browser can't show the 3D world, so here is the classic page.");
      return;
    }
    apiRef.current = api;
    if (bubbleRef.current) api.setBubble(bubbleRef.current);
    labelEls.current.forEach((el, i) => api.setLabel(i, el));
    const ready = window.setTimeout(onReady, 300);
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const greet = window.setTimeout(
      () => say(touch ? `Meow! I'm ${name}. Tap anywhere to walk me, or tap an island 🏝` : `Meow! I'm ${name}. Walk me with WASD / arrows, or click an island 🏝`, 5200),
      3200
    );
    const onVis = () => api.setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearTimeout(ready);
      window.clearTimeout(greet);
      document.removeEventListener("visibilitychange", onVis);
      api.dispose();
      apiRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- keyboard: Esc closes the panel, E / Enter opens it ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "Escape") setPanel(null);
      else if ((e.key === "e" || e.key === "E" || (e.key === "Enter" && t === document.body)) && here !== null) setPanel(here);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [here]);

  const walkTo = (i: number) => {
    if (i < 0 || i >= islands.length) return;
    setPanel(null);
    if (i === here) {
      setPanel(i);
      return;
    }
    apiRef.current?.walkToIsland(i);
    say(`Off to ${islands[i].name}! 🐾`, 2000);
  };

  const resetCoins = () => {
    collectedRef.current = [];
    setCollected([]);
    apiRef.current?.setCollected([]);
    try {
      localStorage.removeItem(storeKey);
    } catch {}
  };

  const coinsOn = (id: string) => collected.filter((k) => k.startsWith(`${id}-`)).length;
  const open = panel !== null ? islands[panel] : null;

  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-ink-950 text-ink-900 dark:text-ink-100">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none select-none outline-none" aria-label="3D island world" />

      {/* floating island labels (positioned by the engine) */}
      <div className="pointer-events-none absolute inset-0">
        {islands.map((isl, i) => (
          <button
            key={isl.id}
            ref={(el) => {
              labelEls.current[i] = el;
              apiRef.current?.setLabel(i, el);
            }}
            onClick={() => walkTo(i)}
            className={`world-label pointer-events-auto absolute left-0 top-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold shadow-lg backdrop-blur-md transition-colors ${
              here === i
                ? "border-pass-300 bg-pass-500/90 text-white"
                : "border-white/60 bg-white/75 text-ink-800 hover:bg-white dark:border-white/15 dark:bg-ink-900/70 dark:text-ink-100 dark:hover:bg-ink-800/90"
            }`}
            style={{ visibility: "hidden" }}
          >
            <span>{KIND_ICON[isl.kind] ?? "✨"}</span>
            {isl.name}
            <span className="font-mono text-[10px] opacity-75">
              {coinsOn(isl.id)}/{per}🪙
            </span>
          </button>
        ))}
        <div ref={bubbleRef} className="absolute left-0 top-0" style={{ visibility: "hidden" }}>
          {bubble && (
            <div className="animate-pop max-w-[260px] rounded-2xl rounded-bl-md border border-white/70 bg-white/95 px-3.5 py-2 text-xs font-medium text-ink-800 shadow-xl dark:border-white/10 dark:bg-ink-900/95 dark:text-ink-100">
              {bubble}
            </div>
          )}
        </div>
      </div>

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/50 bg-white/70 p-1.5 shadow-lg sm:py-2 sm:pl-2 sm:pr-4 backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/70">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pass-400 via-mauve-400 to-periwinkle-400 text-sm font-bold text-white shadow">
            {c.profile.name
              .split(/\s+/)
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-semibold">{c.profile.name}</p>
            <p className="text-[11px] text-ink-500 dark:text-ink-300">{c.profile.role}</p>
          </div>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/70 px-3 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/70" title="Coins collected">
            <span className="iq-coin-static" />
            <span className="font-mono text-sm font-semibold">
              {collected.length}
              <span className="text-ink-400">/{total}</span>
            </span>
            {collected.length > 0 && (
              <button onClick={resetCoins} className="ml-1 text-[10px] text-ink-400 underline-offset-2 hover:underline" aria-label="Reset coins">
                reset
              </button>
            )}
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className="grid h-10 w-10 place-items-center rounded-2xl border border-white/50 bg-white/70 text-base shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/70"
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <button onClick={() => onExit()} className="rounded-2xl border border-white/50 bg-white/70 px-3.5 py-2 text-xs font-semibold shadow-lg backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-ink-900/70 dark:hover:bg-ink-800">
            📄 <span className="hidden sm:inline">Classic view</span>
            <span className="sm:hidden">Classic</span>
          </button>
        </div>
      </div>

      {/* section details */}
      {open && panel !== null && (
        <aside
          key={open.id}
          className="world-panel animate-pop absolute inset-x-2 bottom-[84px] max-h-[52vh] overflow-hidden rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-ink-900/80 sm:inset-x-auto sm:bottom-[104px] sm:right-5 sm:top-24 sm:max-h-none sm:w-[420px]"
          role="dialog"
          aria-label={`${open.name}: ${open.label}`}
        >
          <div className="flex h-full max-h-[inherit] flex-col">
            <header className="relative overflow-hidden border-b border-white/50 px-5 pb-4 pt-5 dark:border-white/10">
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-pass-200/70 via-mauve-200/60 to-periwinkle-200/70 dark:from-pass-500/20 dark:via-mauve-500/15 dark:to-periwinkle-500/20" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-mauve-700 dark:text-mauve-200">
                    Island {String(panel + 1).padStart(2, "0")} · {open.label}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
                    {KIND_ICON[open.kind] ?? "✨"} {open.name}
                  </h2>
                </div>
                <button onClick={() => setPanel(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-ink-600 hover:bg-white dark:bg-white/10 dark:text-ink-200" aria-label="Close">
                  ✕
                </button>
              </div>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <IslandPanel island={open} c={c} />
            </div>
            <footer className="flex items-center justify-between gap-2 border-t border-white/50 px-4 py-3 text-xs dark:border-white/10">
              <button disabled={panel === 0} onClick={() => walkTo(panel - 1)} className="rounded-full px-3 py-1.5 font-medium text-ink-600 hover:bg-white/70 disabled:opacity-30 dark:text-ink-300 dark:hover:bg-white/10">
                ← {panel > 0 ? islands[panel - 1].name : "Start"}
              </button>
              <button
                disabled={panel === islands.length - 1}
                onClick={() => walkTo(panel + 1)}
                className="rounded-full bg-gradient-to-r from-pass-500 via-mauve-500 to-periwinkle-500 px-4 py-1.5 font-semibold text-white shadow disabled:opacity-30"
              >
                {panel < islands.length - 1 ? `Walk to ${islands[panel + 1].name} →` : "Last island"}
              </button>
            </footer>
          </div>
        </aside>
      )}

      {/* reopen the panel when it was closed */}
      {here !== null && panel === null && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[100px] flex justify-center sm:bottom-[112px]">
          <button
            onClick={() => setPanel(here)}
            className="animate-pop pointer-events-auto rounded-full bg-gradient-to-r from-pass-500 via-mauve-500 to-periwinkle-500 px-5 py-2.5 text-sm font-semibold text-white shadow-xl"
          >
            📖 Read about {islands[here].label} <span className="ml-1 hidden font-mono text-[10px] opacity-80 sm:inline">E</span>
          </button>
        </div>
      )}

      {/* island dock */}
      <nav className="absolute inset-x-0 bottom-0 p-3 sm:p-5" aria-label="Islands">
        <div className="mx-auto flex max-w-max items-center gap-1.5 overflow-x-auto rounded-3xl border border-white/50 bg-white/70 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/70">
          {islands.map((isl, i) => (
            <button
              key={isl.id}
              onClick={() => walkTo(i)}
              className={`flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-left transition ${
                here === i ? "bg-gradient-to-br from-pass-500 via-mauve-500 to-periwinkle-500 text-white shadow-md" : "hover:bg-white/80 dark:hover:bg-white/10"
              }`}
              aria-current={here === i ? "location" : undefined}
            >
              <span className="text-lg leading-none">{KIND_ICON[isl.kind] ?? "✨"}</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[10px] font-mono opacity-70">{String(i + 1).padStart(2, "0")}</span>
                <span className="block text-xs font-semibold">{isl.label}</span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 hidden text-center text-[11px] font-medium text-white/90 drop-shadow sm:block">
          WASD / arrow keys to walk · click to move · drag to look around · scroll to zoom · click {name} to pet
        </p>
      </nav>
    </div>
  );
}

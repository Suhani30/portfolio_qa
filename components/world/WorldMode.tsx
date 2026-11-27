"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { GameSettings, SiteContent } from "@/lib/types";
import type { IslandInfo } from "./IslandPanel";

/* Chooses between the 3D island world and the classic page.
 * The classic page is always rendered by the server underneath, so search
 * engines, screen readers and visitors without WebGL still get everything.
 * The visitor's choice is remembered in the browser. */

const World = dynamic(() => import("./World"), { ssr: false });
const KEY = "view-mode";

type Mode = "world" | "classic";

export default function WorldMode({ c, g, islands }: { c: SiteContent; g: GameSettings; islands: IslandInfo[] }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [splash, setSplash] = useState(g.world3d);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!g.world3d) return setMode("classic");
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(KEY);
    } catch {}
    const webgl = (() => {
      try {
        const cv = document.createElement("canvas");
        return !!(cv.getContext("webgl2") || cv.getContext("webgl"));
      } catch {
        return false;
      }
    })();
    const m: Mode = webgl && saved !== "classic" ? "world" : "classic";
    setMode(m);
    if (m === "classic") setSplash(false);
  }, [g.world3d]);

  // lock page scrolling behind the world
  useEffect(() => {
    if (mode !== "world") return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    html.dataset.world = "1"; // tells the classic page's games to stand down
    return () => {
      html.style.overflow = prev;
      delete html.dataset.world;
    };
  }, [mode]);

  const choose = useCallback((m: Mode, why?: string) => {
    setMode(m);
    if (m === "classic") setSplash(false);
    else setSplash(true);
    if (why) setNote(why);
    try {
      localStorage.setItem(KEY, m);
    } catch {}
  }, []);

  if (!g.world3d) return null;

  return (
    <>
      {splash && (
        <div id="world-splash" className="fixed inset-0 z-[95] grid place-items-center bg-gradient-to-br from-periwinkle-300 via-mauve-300 to-pass-300 transition-opacity duration-700 dark:from-[#1b1846] dark:via-[#4d3470] dark:to-[#a0609a]">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 animate-bounce text-5xl">🐱</div>
            <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-[0.3em] text-white drop-shadow">Loading the islands…</p>
          </div>
        </div>
      )}

      {mode === "world" && <World c={c} g={g} islands={islands} onExit={(why) => choose("classic", why)} onReady={() => setSplash(false)} />}

      {mode === "classic" && (
        <button
          onClick={() => choose("world")}
          className="fixed right-4 top-20 z-[55] flex items-center gap-2 rounded-full bg-gradient-to-r from-pass-500 via-mauve-500 to-periwinkle-500 px-4 py-2 text-xs font-semibold text-white shadow-xl shadow-mauve-900/20 transition hover:scale-105"
        >
          🏝 Explore in 3D
        </button>
      )}

      {note && mode === "classic" && (
        <div role="status" className="fixed left-1/2 top-20 z-[56] -translate-x-1/2 rounded-full bg-ink-900/90 px-4 py-2 text-xs text-white shadow-lg">
          {note}
          <button className="ml-3 opacity-70 hover:opacity-100" onClick={() => setNote("")} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
    </>
  );
}

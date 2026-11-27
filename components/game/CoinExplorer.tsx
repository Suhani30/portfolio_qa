"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMuted, useSfx } from "./sfx";
import { useGameSettings } from "./settings";
import type { IslandNames } from "@/lib/types";

/* =====================================================================
 * Coin Explorer: built into the page (no start button).
 * Every <section> in <main> is an island with coins. Visitors tap a coin
 * and the QA bot companion runs over to collect it. Clearing an island
 * pays a bonus, and achievements unlock along the way.
 * ===================================================================== */

export type Island = { id: string; name: string; top: number; height: number };
export type Coin = { id: string; island: string; x: number; y: number };

type Saved = {
  collected: string[];
  cleared: string[];
  visited: string[];
  achievements: string[];
  coins: number;
  startedAt: number | null;
  finishedAt: number | null;
  celebrated: boolean;
};

export type Achievement = { id: string; icon: string; title: string; desc: string };
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first", icon: "🪙", title: "First coin", desc: "Collect your first coin" },
  { id: "island", icon: "🏝", title: "Island cleared", desc: "Collect every coin on one island" },
  { id: "hopper", icon: "🧭", title: "Island hopper", desc: "Visit every island" },
  { id: "half", icon: "💰", title: "Treasure hunter", desc: "Collect half of all coins" },
  { id: "full", icon: "🏆", title: "Full coverage", desc: "Collect every coin" },
];

type Ctx = Saved & {
  enabled: boolean;
  islands: Island[];
  coinList: Coin[];
  totalCoins: number;
  maxScore: number;
  current: string | null;
  muted: boolean;
  setMuted: (m: boolean) => void;
  toast: string;
  reset: () => void;
  scrollToIsland: (id: string) => void;
  dismissCelebration: () => void;
};

const Ctx = createContext<Ctx | null>(null);
const empty: Saved = { collected: [], cleared: [], visited: [], achievements: [], coins: 0, startedAt: null, finishedAt: null, celebrated: false };

const RADII = [
  "46% 54% 42% 58% / 6% 5% 7% 6%",
  "58% 42% 55% 45% / 5% 7% 5% 8%",
  "40% 60% 48% 52% / 7% 6% 8% 5%",
  "52% 48% 60% 40% / 6% 8% 6% 7%",
];

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function CoinExplorerProvider({ children }: { children: React.ReactNode }) {
  const g = useGameSettings();
  const enabled = g.coinExplorer;
  const perIsland = Math.max(1, Math.min(12, Math.round(g.coinsPerIsland) || 1));
  const coinValue = Math.max(1, Math.round(g.coinValue) || 1);
  const bonus = Math.max(0, Math.round(g.islandBonus) || 0);
  const storeKey = `coins:v1:${perIsland}`;

  const rootRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Saved>(empty);
  const [islands, setIslands] = useState<Island[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [current, setCurrent] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [bubble, setBubble] = useState("");
  const [queued, setQueued] = useState<string[]>([]);
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [muted, setMuted] = useMuted(!g.sound);
  const play = useSfx(muted);

  /* ---------- persistence ---------- */
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem(storeKey);
      setState(s ? { ...empty, ...(JSON.parse(s) as Saved) } : empty);
    } catch {}
    loaded.current = true;
  }, [storeKey]);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(storeKey, JSON.stringify(state));
    } catch {}
  }, [state, storeKey]);

  /* ---------- measure islands ---------- */
  const names = g.islandNames as IslandNames & Record<string, string>;
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top + window.scrollY;
    const secs = Array.from(root.querySelectorAll<HTMLElement>("main > section[id]"));
    setIslands(
      secs.map((s) => {
        const r = s.getBoundingClientRect();
        const name = names[s.id] || `${s.dataset.island || s.id} Isle`;
        return { id: s.id, name, top: r.top + window.scrollY - rootTop, height: r.height };
      })
    );
    setSize({ w: root.clientWidth, h: root.scrollHeight });
  }, [names]);

  useEffect(() => {
    if (!enabled) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    if (rootRef.current) ro.observe(rootRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, measure]);

  /* ---------- coin layout ---------- */
  const coinList = useMemo<Coin[]>(() => {
    const out: Coin[] = [];
    const w = size.w;
    if (!w) return out;
    const gutter = (w - 1152) / 2;
    islands.forEach((isl, i) => {
      const r = seeded(i * 977 + 31);
      const usable = Math.max(120, isl.height - 220);
      for (let j = 0; j < perIsland; j++) {
        const side = (j + i) % 2 === 0;
        let x: number;
        if (gutter > 90) {
          const cx = side ? gutter / 2 : w - gutter / 2;
          x = cx + (r() - 0.5) * gutter * 0.45;
        } else {
          x = side ? 18 : w - 18;
        }
        const y = isl.top + 120 + usable * ((j + 0.5) / perIsland) + (r() - 0.5) * 50;
        out.push({ id: `${isl.id}-${j}`, island: isl.id, x, y });
      }
    });
    return out;
  }, [islands, size.w, perIsland]);

  /* ---------- helpers ---------- */
  const stateRef = useRef(state);
  stateRef.current = state;
  const coinsRef = useRef(coinList);
  coinsRef.current = coinList;
  const islandsRef = useRef(islands);
  islandsRef.current = islands;
  const playRef = useRef(play);
  playRef.current = play;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? "" : t)), 2600);
  }, []);
  const say = useCallback((msg: string) => {
    setBubble(msg);
    window.setTimeout(() => setBubble((b) => (b === msg ? "" : b)), 2600);
  }, []);
  const pop = useCallback((x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, x, y, text }]);
    window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 950);
  }, []);

  const collect = useCallback(
    (c: Coin) => {
      const s = stateRef.current;
      if (s.collected.includes(c.id)) {
        setQueued((q) => q.filter((id) => id !== c.id));
        return;
      }
      const collected = [...s.collected, c.id];
      let coins = s.coins + coinValue;
      let cleared = s.cleared;
      pop(c.x, c.y, `+${coinValue}`);
      playRef.current("coin");
      const own = coinsRef.current.filter((k) => k.island === c.island);
      if (!cleared.includes(c.island) && own.every((k) => collected.includes(k.id))) {
        cleared = [...cleared, c.island];
        coins += bonus;
        const isl = islandsRef.current.find((i) => i.id === c.island);
        window.setTimeout(() => {
          playRef.current("bonus");
          flash(`🏝 ${isl?.name ?? "Island"} cleared!${bonus ? ` +${bonus} bonus` : ""}`);
          if (bonus) pop(c.x, c.y - 28, `+${bonus} BONUS`);
        }, 200);
      }
      const finished = collected.length >= coinsRef.current.length && coinsRef.current.length > 0;
      const next: Saved = {
        ...s,
        collected,
        cleared,
        coins,
        startedAt: s.startedAt ?? Date.now(),
        finishedAt: finished ? Date.now() : s.finishedAt,
      };
      stateRef.current = next;
      setState(next);
      setQueued((q) => q.filter((id) => id !== c.id));
      if (finished) window.setTimeout(() => playRef.current("win"), 600);
    },
    [coinValue, bonus, flash, pop]
  );

  const onCoinClick = useCallback(
    (c: Coin) => {
      if (!g.showBot) return collect(c);
      setQueued((q) => (q.includes(c.id) ? q : [...q, c.id]));
    },
    [g.showBot, collect]
  );

  /* ---------- achievements ---------- */
  useEffect(() => {
    if (!enabled || !g.achievements || !coinList.length || !islands.length) return;
    const s = state;
    const tests: Record<string, boolean> = {
      first: s.collected.length >= 1,
      island: s.cleared.length >= 1,
      hopper: s.visited.length >= islands.length,
      half: s.collected.length >= Math.ceil(coinList.length / 2),
      full: s.collected.length >= coinList.length,
    };
    const fresh = ACHIEVEMENTS.filter((a) => tests[a.id] && !s.achievements.includes(a.id));
    if (!fresh.length) return;
    setState((prev) => ({ ...prev, achievements: [...prev.achievements, ...fresh.map((a) => a.id)] }));
    fresh.forEach((a, i) => window.setTimeout(() => flash(`${a.icon} Achievement unlocked: ${a.title}`), 900 + i * 2700));
  }, [state, enabled, g.achievements, coinList.length, islands.length, flash]);

  /* ---------- which island is in view ---------- */
  const currentRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !islands.length) return;
    const onScroll = () => {
      const root = rootRef.current;
      if (!root) return;
      const rootTop = root.getBoundingClientRect().top + window.scrollY;
      const y = window.scrollY - rootTop + window.innerHeight * 0.5;
      const isl = islandsRef.current.find((i) => y >= i.top && y < i.top + i.height);
      if (!isl || isl.id === currentRef.current) return;
      const first = currentRef.current === null;
      currentRef.current = isl.id;
      setCurrent(isl.id);
      const s = stateRef.current;
      if (s.visited.includes(isl.id)) return;
      const next = { ...s, visited: [...s.visited, isl.id] };
      stateRef.current = next;
      setState(next);
      if (g.arrivalMessages && !first) {
        if (g.showBot) say(`Welcome to ${isl.name}! 🏝`);
        else flash(`⚓ ${isl.name}`);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, islands.length, g.arrivalMessages, g.showBot, say, flash]);

  /* ---------- bot companion loop ---------- */
  const queuedRef = useRef(queued);
  queuedRef.current = queued;
  useEffect(() => {
    if (!enabled || !g.showBot) return;
    const p = { x: -1, y: -1 };
    let facing = 1;
    let raf = 0;
    let last = performance.now();
    const step = (t: number) => {
      const dt = Math.min(48, t - last) / 16.67;
      last = t;
      const root = rootRef.current;
      const w = root?.clientWidth ?? window.innerWidth;
      const rootTop = (root?.getBoundingClientRect().top ?? 0) + window.scrollY;
      const gutter = (w - 1152) / 2;
      const target = coinsRef.current.find((c) => c.id === queuedRef.current[0]);
      const home = { x: gutter > 110 ? gutter / 2 : 30, y: window.scrollY - rootTop + window.innerHeight * 0.74 };
      if (p.x < 0) {
        p.x = home.x;
        p.y = home.y;
      }
      let moving = false;
      if (target) {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        const dist = Math.hypot(dx, dy);
        const speed = Math.max(9, dist * 0.08) * dt;
        if (dist <= speed + 4) {
          p.x = target.x;
          p.y = target.y;
          collect(target);
        } else {
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;
          if (Math.abs(dx) > 1) facing = dx < 0 ? -1 : 1;
        }
        moving = true;
      } else {
        const dx = home.x - p.x;
        const dy = home.y - p.y;
        if (Math.hypot(dx, dy) > 2) {
          p.x += dx * Math.min(1, 0.09 * dt);
          p.y += dy * Math.min(1, 0.09 * dt);
          if (Math.abs(dx) > 2) facing = dx < 0 ? -1 : 1;
          moving = Math.hypot(dx, dy) > 6;
        }
      }
      const el = botRef.current;
      if (el) {
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        el.dataset.moving = moving ? "1" : "0";
        el.dataset.facing = facing < 0 ? "left" : "right";
        el.dataset.side = p.x > w * 0.55 ? "right" : "left";
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [enabled, g.showBot, collect]);

  /* ---------- greet once ---------- */
  useEffect(() => {
    if (!enabled || !g.showBot || !coinList.length) return;
    const t = window.setTimeout(() => {
      if (stateRef.current.collected.length === 0) say(`Hi, I'm ${g.botName || "Testy"}! Tap a 🪙 and I'll grab it.`);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [enabled, g.showBot, g.botName, coinList.length, say]);

  const reset = useCallback(() => {
    setQueued([]);
    stateRef.current = empty;
    setState(empty);
    currentRef.current = null;
    setCurrent(null);
  }, []);

  const scrollToIsland = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const dismissCelebration = useCallback(() => setState((s) => ({ ...s, celebrated: true })), []);

  const totalCoins = coinList.length;
  const maxScore = totalCoins * coinValue + islands.length * bonus;

  const value = useMemo<Ctx>(
    () => ({ ...state, enabled, islands, coinList, totalCoins, maxScore, current, muted, setMuted, toast, reset, scrollToIsland, dismissCelebration }),
    [state, enabled, islands, coinList, totalCoins, maxScore, current, muted, setMuted, toast, reset, scrollToIsland, dismissCelebration]
  );

  return (
    <Ctx.Provider value={value}>
      <div ref={rootRef} className="relative isolate">
        {enabled && g.showScenery && <Terrain islands={islands} coinList={coinList} state={state} current={current} />}
        {children}
        {enabled && (
          <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden">
            {coinList
              .filter((c) => !state.collected.includes(c.id))
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-label="Collect coin"
                  onClick={() => onCoinClick(c)}
                  className={`iq-coin-btn pointer-events-auto absolute ${queued.includes(c.id) ? "iq-coin-claimed" : ""}`}
                  style={{ left: c.x, top: c.y }}
                >
                  <span className="iq-coin" />
                </button>
              ))}
            {pops.map((p) => (
              <span
                key={p.id}
                className="absolute -translate-x-1/2 animate-float-up whitespace-nowrap rounded-md bg-amber-400 px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink-950 shadow"
                style={{ left: p.x, top: p.y - 22 }}
              >
                {p.text}
              </span>
            ))}
            {g.showBot && (
              <div ref={botRef} className="iq-bot absolute left-0 top-0 will-change-transform" data-moving="0" data-facing="right" aria-hidden>
                {bubble && (
                  <div className="iq-bubble absolute bottom-[38px] left-1/2 w-max max-w-[220px] animate-pop rounded-xl border border-ink-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-800 shadow-lg dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100">
                    {bubble}
                  </div>
                )}
                <QABot />
              </div>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export function useCoinExplorer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCoinExplorer must be used inside CoinExplorerProvider");
  return ctx;
}

/* ---------- visuals ---------- */

function Terrain({ islands, coinList, state, current }: { islands: Island[]; coinList: Coin[]; state: Saved; current: string | null }) {
  return (
    <div className="iq-ocean pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {islands.map((isl, i) => {
        const all = coinList.filter((c) => c.island === isl.id);
        const got = all.filter((c) => state.collected.includes(c.id)).length;
        const done = state.cleared.includes(isl.id);
        return (
          <div
            key={isl.id}
            className={`iq-island absolute ${current === isl.id ? "iq-island-active" : ""} ${done ? "iq-island-cleared" : ""}`}
            style={{ top: isl.top + 14, height: Math.max(80, isl.height - 28), left: "1.2%", right: "1.2%", borderRadius: RADII[i % RADII.length] }}
          >
            <div
              className="absolute left-5 flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-100/80 px-3 py-1 font-mono text-[11px] font-semibold text-amber-900 shadow-sm backdrop-blur dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200"
              style={{ top: i === 0 ? 74 : 14 }}
            >
              <span>{done ? "🏁" : "🏝"}</span>
              <span>
                {String(i + 1).padStart(2, "0")} · {isl.name}
              </span>
              <span className="opacity-70">{done ? "cleared" : `${got}/${all.length} 🪙`}</span>
            </div>
            <span className="iq-palm absolute bottom-3 right-6 text-2xl opacity-60">🌴</span>
          </div>
        );
      })}
    </div>
  );
}

function QABot() {
  return (
    <div className="relative -ml-[20px] -mt-[28px] h-[40px] w-[40px]">
      <div className="iq-bot-body absolute inset-0">
        <svg viewBox="0 0 44 44" className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]">
          <line x1="22" y1="4" x2="22" y2="10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="4" r="2.6" fill="#34d399" className="iq-antenna" />
          <rect x="8" y="10" width="28" height="20" rx="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.6" />
          <rect x="12" y="14" width="20" height="10" rx="5" fill="#0f172a" />
          <circle cx="18" cy="19" r="2.2" fill="#34d399" />
          <circle cx="26" cy="19" r="2.2" fill="#34d399" />
          <rect x="13" y="30" width="18" height="8" rx="3" fill="#10b981" stroke="#0f172a" strokeWidth="1.4" />
          <path d="M19 33.5l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="38" width="5" height="4" rx="1.5" fill="#0f172a" className="iq-leg-l" />
          <rect x="25" y="38" width="5" height="4" rx="1.5" fill="#0f172a" className="iq-leg-r" />
        </svg>
      </div>
      <span className="absolute -bottom-1 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
    </div>
  );
}

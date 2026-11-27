"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMuted, useSfx } from "./sfx";

/* =====================================================================
 * Island Quest
 * Every <section> inside <main> becomes an island. The visitor walks a
 * small QA bot (arrow keys / WASD / on-screen pad) or sails between
 * islands, collecting coins. Clearing an island pays a bonus.
 * ===================================================================== */

export type Island = { id: string; name: string; top: number; height: number };
export type Coin = { id: string; island: string; x: number; y: number };
export type Dir = "up" | "down" | "left" | "right" | "boost";

type Persisted = {
  active: boolean;
  startedAt: number | null;
  finishedAt: number | null;
  collected: string[];
  cleared: string[];
  visited: string[];
  coins: number;
};

type Ctx = Persisted & {
  enabled: boolean;
  islands: Island[];
  coinList: Coin[];
  coinsPerIsland: number;
  islandBonus: number;
  current: string | null;
  sailing: boolean;
  muted: boolean;
  setMuted: (m: boolean) => void;
  start: () => void;
  quit: () => void;
  press: (d: Dir, on: boolean) => void;
  sailTo: (islandId: string) => void;
  sailNext: () => void;
  toast: string;
};

const IslandContext = createContext<Ctx | null>(null);
const STORE = "islandquest:v1";

const ISLAND_NAMES: Record<string, string> = {
  top: "Launch Bay",
  about: "Origin Isle",
  work: "Case Study Cove",
  experience: "Timeline Reef",
  skills: "Toolchain Atoll",
  credentials: "Scholar Key",
  contact: "Contact Cape",
};

const initial: Persisted = { active: false, startedAt: null, finishedAt: null, collected: [], cleared: [], visited: [], coins: 0 };

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

const KEYMAP: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ShiftLeft: "boost",
  ShiftRight: "boost",
};

const RADII = [
  "46% 54% 42% 58% / 6% 5% 7% 6%",
  "58% 42% 55% 45% / 5% 7% 5% 8%",
  "40% 60% 48% 52% / 7% 6% 8% 5%",
  "52% 48% 60% 40% / 6% 8% 6% 7%",
];

export function IslandQuestProvider({
  enabled,
  coinsPerIsland,
  islandBonus,
  children,
}: {
  enabled: boolean;
  coinsPerIsland: number;
  islandBonus: number;
  children: React.ReactNode;
}) {
  const perIsland = Math.max(1, Math.min(12, Math.round(coinsPerIsland) || 1));
  const bonus = Math.max(0, Math.round(islandBonus) || 0);

  const rootRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Persisted>(initial);
  const [islands, setIslands] = useState<Island[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [current, setCurrent] = useState<string | null>(null);
  const [sailing, setSailing] = useState(false);
  const [toast, setToast] = useState("");
  const [pops, setPops] = useState<{ id: number; x: number; y: number; text: string }[]>([]);
  const [muted, setMuted] = useMuted();
  const play = useSfx(muted);

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE);
      if (s) {
        const saved = JSON.parse(s) as Persisted;
        if (saved.active && !saved.finishedAt) setState({ ...initial, ...saved });
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }, [state]);

  /* ---------- measure islands from the DOM ---------- */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const rootTop = root.getBoundingClientRect().top + window.scrollY;
    const secs = Array.from(root.querySelectorAll<HTMLElement>("main > section[id]"));
    setIslands(
      secs.map((s) => {
        const r = s.getBoundingClientRect();
        const name = ISLAND_NAMES[s.id] ?? `${s.dataset.island || s.id} Isle`;
        return { id: s.id, name, top: r.top + window.scrollY - rootTop, height: r.height };
      })
    );
    setSize({ w: root.clientWidth, h: root.scrollHeight });
  }, []);

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

  /* ---------- coin layout (deterministic per island) ---------- */
  const coinList = useMemo<Coin[]>(() => {
    const out: Coin[] = [];
    const w = size.w;
    if (!w) return out;
    const gutter = (w - 1152) / 2;
    islands.forEach((isl, i) => {
      const r = seeded(i * 977 + 31);
      const usable = Math.max(120, isl.height - 200);
      for (let j = 0; j < perIsland; j++) {
        let x: number;
        if (gutter > 80) {
          const side = (j + i) % 2 === 0;
          const cx = side ? gutter / 2 : w - gutter / 2;
          x = cx + (r() - 0.5) * gutter * 0.5;
        } else {
          x = w * (0.08 + r() * 0.84);
        }
        const y = isl.top + 110 + usable * ((j + 0.5) / perIsland) + (r() - 0.5) * 50;
        out.push({ id: `${isl.id}-${j}`, island: isl.id, x, y });
      }
    });
    return out;
  }, [islands, size.w, perIsland]);

  /* ---------- refs for the game loop ---------- */
  const pos = useRef({ x: 0, y: 0 });
  const facing = useRef(1);
  const keys = useRef(new Set<Dir>());
  const sail = useRef<null | { fx: number; fy: number; tx: number; ty: number; t0: number; dur: number }>(null);
  const coinsRef = useRef(coinList);
  const islandsRef = useRef(islands);
  const stateRef = useRef(state);
  const sizeRef = useRef(size);
  const currentRef = useRef<string | null>(null);
  coinsRef.current = coinList;
  islandsRef.current = islands;
  stateRef.current = state;
  sizeRef.current = size;
  const playRef = useRef(play);
  playRef.current = play;

  const flash = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? "" : t)), 2400);
  }, []);

  const pop = useCallback((x: number, y: number, text: string) => {
    const id = Date.now() + Math.random();
    setPops((p) => [...p, { id, x, y, text }]);
    window.setTimeout(() => setPops((p) => p.filter((q) => q.id !== id)), 900);
  }, []);

  const collect = useCallback(
    (c: Coin) => {
      const s = stateRef.current;
      if (s.collected.includes(c.id)) return;
      const collected = [...s.collected, c.id];
      let coins = s.coins + 1;
      let cleared = s.cleared;
      pop(c.x, c.y, "+1");
      playRef.current("coin");

      const islandCoins = coinsRef.current.filter((k) => k.island === c.island);
      if (!cleared.includes(c.island) && islandCoins.every((k) => collected.includes(k.id))) {
        cleared = [...cleared, c.island];
        coins += bonus;
        const isl = islandsRef.current.find((i) => i.id === c.island);
        window.setTimeout(() => {
          playRef.current("bonus");
          flash(`🏝 ${isl?.name ?? "Island"} cleared!${bonus ? `  +${bonus} bonus` : ""}`);
          if (bonus) pop(c.x, c.y - 30, `+${bonus} BONUS`);
        }, 180);
      }
      const finished = collected.length >= coinsRef.current.length && coinsRef.current.length > 0;
      const next = { ...s, collected, coins, cleared, finishedAt: finished ? Date.now() : s.finishedAt };
      stateRef.current = next;
      setState(next);
      if (finished) window.setTimeout(() => playRef.current("win"), 500);
    },
    [bonus, flash, pop]
  );

  /* ---------- controls ---------- */
  const press = useCallback((d: Dir, on: boolean) => {
    if (on) keys.current.add(d);
    else keys.current.delete(d);
  }, []);

  const sailTo = useCallback(
    (islandId: string) => {
      const isl = islandsRef.current.find((i) => i.id === islandId);
      if (!isl) return;
      const target =
        coinsRef.current.find((c) => c.island === islandId && !stateRef.current.collected.includes(c.id)) ??
        coinsRef.current.find((c) => c.island === islandId);
      const tx = target ? target.x : sizeRef.current.w / 2;
      const ty = target ? target.y - 60 : isl.top + 120;
      const p = pos.current;
      const dist = Math.hypot(tx - p.x, ty - p.y);
      sail.current = { fx: p.x, fy: p.y, tx, ty, t0: performance.now(), dur: Math.min(2200, 500 + dist * 0.6) };
      setSailing(true);
      playRef.current("sail");
    },
    []
  );

  const sailNext = useCallback(() => {
    const list = islandsRef.current;
    const s = stateRef.current;
    const idx = Math.max(0, list.findIndex((i) => i.id === currentRef.current));
    const ordered = [...list.slice(idx + 1), ...list.slice(0, idx + 1)];
    const next = ordered.find((i) => !s.cleared.includes(i.id)) ?? list[(idx + 1) % list.length];
    if (next) sailTo(next.id);
  }, [sailTo]);

  const start = useCallback(() => {
    measure();
    const w = rootRef.current?.clientWidth ?? window.innerWidth;
    pos.current = { x: w / 2, y: window.scrollY + window.innerHeight * 0.55 };
    currentRef.current = null;
    const next = { ...initial, active: true, startedAt: Date.now() };
    stateRef.current = next;
    setState(next);
  }, [measure]);

  const quit = useCallback(() => {
    keys.current.clear();
    sail.current = null;
    setSailing(false);
    setCurrent(null);
    stateRef.current = initial;
    setState(initial);
  }, []);

  /* ---------- keyboard ---------- */
  const running = enabled && state.active && !state.finishedAt;
  useEffect(() => {
    if (!running) return;
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      const d = KEYMAP[e.code];
      if (!d || isTyping(e.target)) return;
      if (d !== "boost") e.preventDefault();
      keys.current.add(d);
    };
    const up = (e: KeyboardEvent) => {
      const d = KEYMAP[e.code];
      if (d) keys.current.delete(d);
    };
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, [running]);

  /* ---------- the game loop ---------- */
  useEffect(() => {
    if (!running) return;
    // Spawn the bot in view if it has no position yet (e.g. resumed run)
    if (!pos.current.x && !pos.current.y) {
      pos.current = { x: (rootRef.current?.clientWidth ?? window.innerWidth) / 2, y: window.scrollY + window.innerHeight * 0.55 };
    }
    let raf = 0;
    let last = performance.now();

    const step = (t: number) => {
      const dt = Math.min(48, t - last) / 16.67;
      last = t;
      const p = pos.current;
      const { w, h } = sizeRef.current;
      const rootTop = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      let moved = false;

      if (sail.current) {
        const s = sail.current;
        const k = Math.min(1, (t - s.t0) / s.dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        facing.current = s.tx < s.fx ? -1 : 1;
        p.x = s.fx + (s.tx - s.fx) * e;
        p.y = s.fy + (s.ty - s.fy) * e;
        moved = true;
        if (k >= 1) {
          sail.current = null;
          setSailing(false);
        }
      } else {
        const k = keys.current;
        let dx = 0;
        let dy = 0;
        if (k.has("left")) dx -= 1;
        if (k.has("right")) dx += 1;
        if (k.has("up")) dy -= 1;
        if (k.has("down")) dy += 1;
        if (dx || dy) {
          // If the visitor scrolled away, bring the bot to where they are looking
          const vy = p.y + rootTop - window.scrollY;
          if (vy < -60 || vy > window.innerHeight + 60) p.y = window.scrollY - rootTop + window.innerHeight * 0.5;
          const len = Math.hypot(dx, dy);
          const speed = 5 * dt * (k.has("boost") ? 1.9 : 1);
          p.x = Math.max(18, Math.min((w || window.innerWidth) - 18, p.x + (dx / len) * speed));
          p.y = Math.max(70, Math.min((h || document.body.scrollHeight) - 24, p.y + (dy / len) * speed));
          if (dx) facing.current = dx < 0 ? -1 : 1;
          moved = true;
        }
      }

      // Camera follows the bot
      if (moved) {
        const vh = window.innerHeight;
        const vy = p.y + rootTop - window.scrollY;
        if (vy < vh * 0.3) window.scrollTo({ top: p.y + rootTop - vh * 0.3, behavior: "instant" });
        else if (vy > vh * 0.7) window.scrollTo({ top: p.y + rootTop - vh * 0.7, behavior: "instant" });
      }

      const el = charRef.current;
      if (el) {
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        el.dataset.moving = moved ? "1" : "0";
        el.dataset.facing = facing.current < 0 ? "left" : "right";
      }

      // Coins
      const collected = stateRef.current.collected;
      for (const c of coinsRef.current) {
        if (!collected.includes(c.id) && Math.abs(c.x - p.x) < 30 && Math.abs(c.y - p.y) < 30) collect(c);
      }

      // Which island are we on?
      const isl = islandsRef.current.find((i) => p.y >= i.top && p.y < i.top + i.height);
      if (isl && isl.id !== currentRef.current) {
        currentRef.current = isl.id;
        setCurrent(isl.id);
        const s = stateRef.current;
        if (!s.visited.includes(isl.id)) {
          const next = { ...s, visited: [...s.visited, isl.id] };
          stateRef.current = next;
          setState(next);
          flash(`⚓ Landed on ${isl.name}`);
        }
      }

      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [running, collect, flash]);

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      enabled,
      islands,
      coinList,
      coinsPerIsland: perIsland,
      islandBonus: bonus,
      current,
      sailing,
      muted,
      setMuted,
      start,
      quit,
      press,
      sailTo,
      sailNext,
      toast,
    }),
    [state, enabled, islands, coinList, perIsland, bonus, current, sailing, muted, setMuted, start, quit, press, sailTo, sailNext, toast]
  );

  const show = enabled && state.active;

  return (
    <IslandContext.Provider value={value}>
      <div ref={rootRef} className="relative isolate">
        {show && <Terrain islands={islands} coinList={coinList} collected={state.collected} cleared={state.cleared} current={current} />}
        {children}
        {show && (
          <div className="pointer-events-none absolute inset-0 z-[45] overflow-hidden" aria-hidden>
            {coinList
              .filter((c) => !state.collected.includes(c.id))
              .map((c) => (
                <span key={c.id} className="iq-coin absolute" style={{ left: c.x, top: c.y }} />
              ))}
            {pops.map((p) => (
              <span
                key={p.id}
                className="absolute -translate-x-1/2 animate-float-up whitespace-nowrap rounded-md bg-amber-400 px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink-950 shadow"
                style={{ left: p.x, top: p.y - 20 }}
              >
                {p.text}
              </span>
            ))}
            <div ref={charRef} className="iq-bot absolute left-0 top-0 will-change-transform" data-moving="0" data-facing="right">
              <QABot sailing={sailing} />
            </div>
          </div>
        )}
      </div>
    </IslandContext.Provider>
  );
}

export function useIslandQuest() {
  const ctx = useContext(IslandContext);
  if (!ctx) throw new Error("useIslandQuest must be used inside IslandQuestProvider");
  return ctx;
}

/* ---------- visuals ---------- */

function Terrain({
  islands,
  coinList,
  collected,
  cleared,
  current,
}: {
  islands: Island[];
  coinList: Coin[];
  collected: string[];
  cleared: string[];
  current: string | null;
}) {
  return (
    <div className="iq-ocean pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {islands.map((isl, i) => {
        const all = coinList.filter((c) => c.island === isl.id);
        const got = all.filter((c) => collected.includes(c.id)).length;
        const done = cleared.includes(isl.id);
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
            <span className="iq-palm absolute bottom-3 right-6 text-2xl opacity-70">🌴</span>
          </div>
        );
      })}
    </div>
  );
}

function QABot({ sailing }: { sailing: boolean }) {
  return (
    <div className="relative -ml-[22px] -mt-[30px] h-[44px] w-[44px]">
      <div className="iq-bot-body absolute inset-0">
        <svg viewBox="0 0 44 44" className="h-full w-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]">
          <line x1="22" y1="4" x2="22" y2="10" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <circle cx="22" cy="4" r="2.6" fill="#34d399" className="iq-antenna" />
          <rect x="8" y="10" width="28" height="20" rx="8" fill="#f8fafc" stroke="#0f172a" strokeWidth="1.6" />
          <rect x="12" y="14" width="20" height="10" rx="5" fill="#0f172a" />
          <circle cx="18" cy="19" r="2.2" fill="#34d399" className="iq-eye" />
          <circle cx="26" cy="19" r="2.2" fill="#34d399" className="iq-eye" />
          <rect x="13" y="30" width="18" height="8" rx="3" fill="#10b981" stroke="#0f172a" strokeWidth="1.4" />
          <path d="M19 33.5l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="14" y="38" width="5" height="4" rx="1.5" fill="#0f172a" className="iq-leg-l" />
          <rect x="25" y="38" width="5" height="4" rx="1.5" fill="#0f172a" className="iq-leg-r" />
        </svg>
      </div>
      {sailing && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-2xl">⛵</span>}
      <span className="iq-shadow absolute -bottom-1 left-1/2 h-1.5 w-7 -translate-x-1/2 rounded-full bg-black/25 blur-[2px]" />
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMuted, useSfx } from "./sfx";
import { useGameSettings } from "./settings";
import type { IslandNames } from "@/lib/types";

/* =====================================================================
 * Coin Explorer: built into the page (no start button).
 * Every <section> in <main> is an island with coins. Visitors tap a coin
 * and the chubby cat companion walks over to collect it (visitors can also
 * click anywhere to walk it there, or steer it with the arrow keys). Clearing an island
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
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Update saved state from the latest value and keep stateRef in sync. */
  const update = useCallback((fn: (s: Saved) => Saved) => {
    const next = fn(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  /* ---------- persistence ---------- */
  // The key whose saved data is in `state`. Saving waits until the loaded
  // state has been committed, so a mount never writes `empty` over real progress.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  useEffect(() => {
    let next = empty;
    try {
      const s = localStorage.getItem(storeKey);
      if (s) next = { ...empty, ...(JSON.parse(s) as Saved) };
    } catch {}
    stateRef.current = next;
    setState(next);
    setLoadedKey(storeKey);
  }, [storeKey]);
  useEffect(() => {
    if (loadedKey !== storeKey) return;
    try {
      localStorage.setItem(storeKey, JSON.stringify(state));
    } catch {}
  }, [state, storeKey, loadedKey]);

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
    const perRow = Math.max(1, Math.floor((w - 40) / 44));
    islands.forEach((isl, i) => {
      const r = seeded(i * 977 + 31);
      const usable = Math.max(120, isl.height - 220);
      for (let j = 0; j < perIsland; j++) {
        let x: number;
        let y: number;
        if (gutter > 90) {
          // Wide screens: coins sit in the empty side gutters.
          const side = (j + i) % 2 === 0;
          const cx = side ? gutter / 2 : w - gutter / 2;
          x = cx + (r() - 0.5) * gutter * 0.45;
          y = isl.top + 120 + usable * ((j + 0.5) / perIsland) + (r() - 0.5) * 50;
        } else {
          // Narrow screens have no gutters, so coins sit in the empty padding
          // band at the bottom of each section, never on top of links or cards.
          // The hero has no bottom padding, so its coins use the top padding of
          // the next section, below that section's name sign.
          const row = Math.floor(j / perRow);
          const inRow = Math.min(perRow, perIsland - row * perRow);
          x = 20 + ((w - 40) * ((j % perRow) + 0.5)) / inRow;
          y = i === 0 ? isl.top + isl.height + 54 + row * 24 : isl.top + isl.height - 66 + row * 36;
        }
        out.push({ id: `${isl.id}-${j}`, island: isl.id, x, y });
      }
    });
    return out;
  }, [islands, size.w, perIsland]);

  /* ---------- helpers ---------- */
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
      const finished = coinsRef.current.length > 0 && coinsRef.current.every((k) => collected.includes(k.id));
      const next: Saved = {
        ...s,
        collected,
        cleared,
        coins,
        startedAt: s.startedAt ?? Date.now(),
        finishedAt: finished ? Date.now() : s.finishedAt,
      };
      update(() => next);
      setQueued((q) => q.filter((id) => id !== c.id));
      if (finished) window.setTimeout(() => playRef.current("win"), 600);
    },
    [coinValue, bonus, flash, pop, update]
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
    const got = coinList.filter((c) => s.collected.includes(c.id)).length;
    const tests: Record<string, boolean> = {
      first: s.collected.length >= 1,
      island: s.cleared.length >= 1,
      hopper: islands.every((i) => s.visited.includes(i.id)),
      half: got >= Math.ceil(coinList.length / 2),
      full: got >= coinList.length,
    };
    const fresh = ACHIEVEMENTS.filter((a) => tests[a.id] && !s.achievements.includes(a.id));
    if (!fresh.length) return;
    update((prev) => ({ ...prev, achievements: [...prev.achievements, ...fresh.map((a) => a.id)] }));
    fresh.forEach((a, i) => window.setTimeout(() => flash(`${a.icon} Achievement unlocked: ${a.title}`), 900 + i * 2700));
  }, [state, enabled, g.achievements, coinList, islands, flash, update]);

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
      if (stateRef.current.visited.includes(isl.id)) return;
      update((s) => ({ ...s, visited: [...s.visited, isl.id] }));
      if (g.arrivalMessages && !first) {
        if (g.showBot) say(`Meow! Welcome to ${isl.name} 🏝`);
        else flash(`⚓ ${isl.name}`);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, islands.length, g.arrivalMessages, g.showBot, say, flash, update]);

  /* ---------- cat companion loop ---------- */
  // The cat always walks on its four paws at a steady pace. It walks to coins
  // the visitor taps, to any empty spot they click, and can be steered with the
  // arrow keys. While walking on the visitor's command it picks up every coin
  // it touches. Left alone it breathes, blinks and now and then wanders a few
  // steps, and it comes back if the page is scrolled away from it.
  const queuedRef = useRef(queued);
  queuedRef.current = queued;
  const keyboard = g.botKeyboard;
  const clickToWalk = g.botClickToWalk;
  const goalRef = useRef<{ x: number; y: number } | null>(null);
  const hopRef = useRef(0);
  useEffect(() => {
    if (!enabled || !g.showBot) return;
    const WALK = 2.4; // px per 60fps frame (~145px/s): a walk, never a run
    const STEER = 3.2; // arrow-key walking speed
    const REACH = 26; // pick-up radius in px
    const p = { x: -1, y: -1 };
    const held = { left: false, right: false, up: false, down: false };
    let returning = false;
    let wander: { x: number; y: number } | null = null;
    let idleSince = performance.now();
    let nextWander = 5000 + Math.random() * 5000;
    let facing = 1;
    let raf = 0;
    let last = performance.now();
    const root = rootRef.current;

    const stopOthers = () => {
      returning = false;
      wander = null;
      if (queuedRef.current.length) {
        queuedRef.current = [];
        setQueued([]);
      }
    };

    /* arrow keys */
    const KEYS: Record<string, keyof typeof held> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
    const typing = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const k = KEYS[e.key];
      if (!k || e.altKey || e.ctrlKey || e.metaKey || typing(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return; // a dialog is open
      if (document.documentElement.dataset.world) return; // the 3D world is in charge
      e.preventDefault();
      held[k] = true;
      goalRef.current = null;
      stopOthers();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = KEYS[e.key];
      if (k) held[k] = false;
    };
    const release = () => {
      held.left = held.right = held.up = held.down = false;
    };

    /* click / tap on empty space: walk there */
    const INTERACTIVE = 'a,button,input,textarea,select,label,summary,video,audio,iframe,[role="button"],[contenteditable="true"],[tabindex]:not([tabindex="-1"]),.iq-bot';
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || !root) return;
      const t = e.target as HTMLElement | null;
      if (!t || t.closest(INTERACTIVE)) return;
      if (window.getSelection()?.toString()) return; // the visitor is selecting text
      for (let el: HTMLElement | null = t; el && el !== root; el = el.parentElement) {
        if (getComputedStyle(el).position === "fixed") return; // HUD panels, nav bar
      }
      const r = root.getBoundingClientRect();
      const x = Math.max(16, Math.min(r.width - 16, e.clientX - r.left));
      const y = Math.max(40, Math.min(root.scrollHeight - 10, e.clientY - r.top));
      stopOthers();
      goalRef.current = { x, y };
      mark(x, y);
    };

    if (keyboard) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      window.addEventListener("blur", release);
    }
    if (clickToWalk) root?.addEventListener("click", onClick);

    const walkTo = (tx: number, ty: number, speed: number) => {
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= speed) {
        p.x = tx;
        p.y = ty;
        return true;
      }
      p.x += (dx / dist) * speed;
      p.y += (dy / dist) * speed;
      if (Math.abs(dx) > 0.5) facing = dx < 0 ? -1 : 1;
      return false;
    };

    const step = (t: number) => {
      const dt = Math.min(48, t - last) / 16.67;
      last = t;
      const w = root?.clientWidth ?? window.innerWidth;
      const h = root?.scrollHeight ?? document.documentElement.scrollHeight;
      const rootTop = (root?.getBoundingClientRect().top ?? 0) + window.scrollY;
      const viewTop = window.scrollY - rootTop;
      const vh = window.innerHeight;
      const gutter = (w - 1152) / 2;
      const home = { x: gutter > 110 ? gutter / 2 : 34, y: viewTop + vh * 0.74 };
      if (p.x < 0) {
        p.x = home.x;
        p.y = home.y;
      }

      let target = coinsRef.current.find((c) => c.id === queuedRef.current[0]);
      if (!target && queuedRef.current.length) {
        const live = queuedRef.current.filter((id) => coinsRef.current.some((c) => c.id === id));
        queuedRef.current = live;
        setQueued(live);
        target = coinsRef.current.find((c) => c.id === live[0]);
      }
      if (target) goalRef.current = null;

      let moving = false;
      let commanded = false; // moving because the visitor asked: may pick up coins
      const kx = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const ky = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (kx || ky) {
        // Arrow keys: walk that way and keep the cat on screen.
        const len = Math.hypot(kx, ky);
        p.x = Math.max(16, Math.min(w - 16, p.x + (kx / len) * STEER * dt));
        p.y = Math.max(40, Math.min(h - 10, p.y + (ky / len) * STEER * dt));
        if (kx) facing = kx;
        moving = commanded = true;
        const sy = p.y - viewTop;
        if (sy < vh * 0.2) window.scrollBy(0, sy - vh * 0.2);
        else if (sy > vh * 0.8) window.scrollBy(0, sy - vh * 0.8);
      } else if (target) {
        // Walk all the way to the tapped coin.
        if (walkTo(target.x, target.y, WALK * dt)) collect(target);
        moving = commanded = true;
      } else if (goalRef.current) {
        // Walk to the clicked spot.
        if (walkTo(goalRef.current.x, goalRef.current.y, WALK * dt)) goalRef.current = null;
        moving = commanded = true;
      } else {
        const sy = p.y - viewTop;
        if (!returning && (sy < -40 || sy > vh + 40)) {
          // Scrolled away: come back in from the nearest screen edge.
          returning = true;
          wander = null;
          p.y = sy < 0 ? viewTop - 40 : viewTop + vh + 40;
          p.x = home.x;
        }
        if (returning) {
          returning = !walkTo(home.x, home.y, WALK * 1.4 * dt);
          moving = returning;
        } else if (wander) {
          // A few lazy steps nearby, so the cat never looks frozen.
          if (walkTo(wander.x, wander.y, WALK * 0.55 * dt)) wander = null;
          moving = !!wander;
        } else if (t - idleSince > nextWander && !document.hidden) {
          const span = gutter > 110 ? Math.min(70, gutter / 2 - 24) : 40;
          wander = {
            x: Math.max(16, Math.min(w - 16, home.x + (Math.random() * 2 - 1) * span)),
            y: Math.max(viewTop + vh * 0.35, Math.min(viewTop + vh * 0.85, p.y + (Math.random() * 2 - 1) * 60)),
          };
          nextWander = 6000 + Math.random() * 7000;
        }
      }
      if (moving && !wander) idleSince = t;

      if (commanded) {
        const done = stateRef.current.collected;
        const hit = coinsRef.current.find((c) => !done.includes(c.id) && Math.hypot(c.x - p.x, c.y - p.y) <= REACH);
        if (hit) {
          collect(hit);
          hopRef.current = t + 380;
        }
      }

      const el = botRef.current;
      if (el) {
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        el.dataset.moving = moving ? "1" : "0";
        el.dataset.facing = facing < 0 ? "left" : "right";
        el.dataset.side = p.x > w * 0.55 ? "right" : "left";
        el.dataset.hop = t < hopRef.current ? "1" : "0";
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", release);
      root?.removeEventListener("click", onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, g.showBot, keyboard, clickToWalk, collect]);

  /* paw-print marker where the visitor clicked */
  const [marks, setMarks] = useState<{ id: number; x: number; y: number }[]>([]);
  function mark(x: number, y: number) {
    const id = Date.now() + Math.random();
    setMarks((m) => [...m.slice(-3), { id, x, y }]);
    window.setTimeout(() => setMarks((m) => m.filter((k) => k.id !== id)), 1400);
  }

  /* pet the cat */
  const pet = useCallback(() => {
    playRef.current("meow");
    hopRef.current = performance.now() + 380;
    const lines = ["Purrr… 💚", "Meow! 🐾", "Prrrt? 😸", "More coins, please! 🪙"];
    say(lines[Math.floor(Math.random() * lines.length)]);
  }, [say]);

  /* ---------- greet once ---------- */
  useEffect(() => {
    if (!enabled || !g.showBot || !coinList.length) return;
    const t = window.setTimeout(() => {
      if (stateRef.current.collected.length > 0) return;
      const name = g.botName || "Testy";
      const keys = keyboard && !window.matchMedia("(pointer: coarse)").matches;
      const ways = [clickToWalk ? "click anywhere" : "", keys ? "use the arrow keys" : ""].filter(Boolean).join(" or ");
      say(`Meow! I'm ${name}. Tap a 🪙${ways ? `, ${ways}` : ""} and I'll walk there.`);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [enabled, g.showBot, g.botName, keyboard, clickToWalk, coinList.length, say]);

  const reset = useCallback(() => {
    setQueued([]);
    update(() => empty);
    currentRef.current = null;
    setCurrent(null);
  }, [update]);

  const scrollToIsland = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const dismissCelebration = useCallback(() => update((s) => ({ ...s, celebrated: true })), [update]);

  const totalCoins = coinList.length;
  const maxScore = totalCoins * coinValue + islands.length * bonus;

  // Saved ids can belong to sections that were since hidden or removed:
  // count only the coins and islands that exist now.
  const view = useMemo<Saved>(() => {
    if (!coinList.length) return state;
    const coinIds = new Set(coinList.map((c) => c.id));
    const islandIds = new Set(islands.map((i) => i.id));
    return {
      ...state,
      collected: state.collected.filter((id) => coinIds.has(id)),
      cleared: state.cleared.filter((id) => islandIds.has(id)),
      visited: state.visited.filter((id) => islandIds.has(id)),
    };
  }, [state, coinList, islands]);

  const value = useMemo<Ctx>(
    () => ({ ...view, enabled, islands, coinList, totalCoins, maxScore, current, muted, setMuted, toast, reset, scrollToIsland, dismissCelebration }),
    [view, enabled, islands, coinList, totalCoins, maxScore, current, muted, setMuted, toast, reset, scrollToIsland, dismissCelebration]
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
            {marks.map((m) => (
              <span key={m.id} className="cat-mark absolute" style={{ left: m.x, top: m.y }} aria-hidden>
                <PawPrint />
              </span>
            ))}
            {g.showBot && (
              <div ref={botRef} className="iq-bot absolute left-0 top-0 will-change-transform" data-moving="0" data-facing="right" data-hop="0" aria-hidden>
                {bubble && (
                  <div className="iq-bubble absolute bottom-[56px] left-1/2 w-max max-w-[240px] animate-pop rounded-2xl border border-amber-200/70 bg-white/95 px-3 py-1.5 text-xs font-medium text-ink-800 shadow-lg shadow-amber-900/10 backdrop-blur dark:border-amber-300/20 dark:bg-ink-900/95 dark:text-ink-100">
                    {bubble}
                  </div>
                )}
                <ChubbyCat onPet={pet} />
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

/** A chubby orange tabby, side view, facing right. Feet sit at the anchor point. */
function ChubbyCat({ onPet }: { onPet: () => void }) {
  return (
    <div className="relative -ml-[38px] -mt-[58px] h-[62px] w-[76px]">
      <span className="cat-shadow absolute bottom-[1px] left-1/2 h-[7px] w-[52px] -translate-x-1/2 rounded-[50%] bg-black/25 blur-[2px] dark:bg-black/50" />
      <div className="iq-bot-body absolute inset-0">
        <svg viewBox="0 0 80 64" className="cat-rig h-full w-full overflow-visible" onClick={onPet}>
          <defs>
            <radialGradient id="cat-fur" cx="45%" cy="30%" r="75%">
              <stop offset="0" stopColor="#ffb766" />
              <stop offset="0.6" stopColor="#f3913a" />
              <stop offset="1" stopColor="#d96f1f" />
            </radialGradient>
            <radialGradient id="cat-head" cx="40%" cy="35%" r="70%">
              <stop offset="0" stopColor="#ffc07a" />
              <stop offset="0.65" stopColor="#f59a44" />
              <stop offset="1" stopColor="#dc7424" />
            </radialGradient>
            <linearGradient id="cat-leg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f08d36" />
              <stop offset="1" stopColor="#e07b28" />
            </linearGradient>
          </defs>

          {/* tail */}
          <g className="cat-tail">
            <path d="M17 38 C 6 36, 2 26, 6 15 C 8 10, 13 10, 12 15 C 10 22, 12 30, 20 33 Z" fill="url(#cat-fur)" stroke="#c4621a" strokeWidth="0.8" />
            <path d="M6.5 19 q3 1 5 -1 M7 25 q3 1 5.5 -1.5" stroke="#c4621a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <circle cx="9" cy="12.5" r="3" fill="#fff1dc" />
          </g>

          {/* far legs (darker, behind the body) */}
          <g className="cat-leg cat-leg-bf" style={{ transformOrigin: "28px 44px" }}>
            <rect x="24.5" y="42" width="8" height="16" rx="4" fill="#c96a20" />
            <ellipse cx="29" cy="58.3" rx="5" ry="3" fill="#ecd9bf" />
          </g>
          <g className="cat-leg cat-leg-ff" style={{ transformOrigin: "55px 44px" }}>
            <rect x="51.5" y="42" width="8" height="16" rx="4" fill="#c96a20" />
            <ellipse cx="56" cy="58.3" rx="5" ry="3" fill="#ecd9bf" />
          </g>

          {/* body */}
          <g className="cat-body">
            <ellipse cx="40" cy="38" rx="27" ry="18" fill="url(#cat-fur)" stroke="#c4621a" strokeWidth="0.8" />
            <ellipse cx="43" cy="46" rx="18" ry="8.5" fill="#fff1dc" opacity="0.95" />
            <path d="M28 22 q2 6 -1 11 M36 20.5 q2 6 -1 11.5 M44 21 q2 5 -1 10" stroke="#c4621a" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.85" />
            <ellipse cx="34" cy="28" rx="9" ry="4" fill="#fff" opacity="0.18" />
          </g>

          {/* near legs */}
          <g className="cat-leg cat-leg-bn" style={{ transformOrigin: "23px 45px" }}>
            <rect x="19" y="43" width="9" height="16" rx="4.5" fill="url(#cat-leg)" stroke="#c4621a" strokeWidth="0.6" />
            <ellipse cx="23.5" cy="59" rx="5.6" ry="3.2" fill="#fff1dc" stroke="#e2c7a3" strokeWidth="0.6" />
          </g>
          <g className="cat-leg cat-leg-fn" style={{ transformOrigin: "50px 45px" }}>
            <rect x="46" y="43" width="9" height="16" rx="4.5" fill="url(#cat-leg)" stroke="#c4621a" strokeWidth="0.6" />
            <ellipse cx="50.5" cy="59" rx="5.6" ry="3.2" fill="#fff1dc" stroke="#e2c7a3" strokeWidth="0.6" />
          </g>

          {/* head */}
          <g className="cat-head" style={{ transformOrigin: "58px 34px" }}>
            <g className="cat-ear cat-ear-back" style={{ transformOrigin: "57px 17px" }}>
              <path d="M51 19 L54 5.5 L62 14 Z" fill="#e5802c" stroke="#c4621a" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M53.5 16 L55 9.5 L59 14 Z" fill="#f6a5a5" />
            </g>
            <g className="cat-ear cat-ear-front" style={{ transformOrigin: "70px 16px" }}>
              <path d="M65 14 L72.5 4.5 L75 18 Z" fill="#f08d36" stroke="#c4621a" strokeWidth="0.8" strokeLinejoin="round" />
              <path d="M67.5 14 L72 8.5 L73.3 16 Z" fill="#f6a5a5" />
            </g>
            <ellipse cx="63" cy="28" rx="15.5" ry="14" fill="url(#cat-head)" stroke="#c4621a" strokeWidth="0.8" />
            <path d="M58 15.5 q1 3 0 5.5 M63 15 q0.5 3 0 5.5 M68 16 q-0.5 2.5 -1 5" stroke="#c4621a" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity="0.8" />
            {/* muzzle + cheeks */}
            <ellipse cx="68" cy="34" rx="8.5" ry="6" fill="#fff1dc" />
            <ellipse cx="57" cy="33" rx="3.2" ry="2" fill="#f7a8a0" opacity="0.6" />
            <ellipse cx="76" cy="31.5" rx="2" ry="1.6" fill="#f7a8a0" opacity="0.55" />
            {/* eyes */}
            <g className="cat-eyes" style={{ transformOrigin: "67px 26px" }}>
              <ellipse cx="62" cy="26" rx="2.9" ry="3.5" fill="#1f2937" />
              <ellipse cx="72.5" cy="25.5" rx="2.5" ry="3.3" fill="#1f2937" />
              <circle cx="63" cy="24.6" r="1.1" fill="#fff" />
              <circle cx="73.3" cy="24.2" r="0.95" fill="#fff" />
              <circle cx="61.3" cy="27.4" r="0.5" fill="#fff" opacity="0.8" />
            </g>
            {/* nose, mouth, whiskers */}
            <path d="M68.6 30.4 h3.4 l-1.7 2 z" fill="#e7787a" />
            <path d="M70.3 32.4 q-1.2 2.2 -3 1.4 M70.3 32.4 q1.2 2.2 3 1.4" stroke="#7c3f1d" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            <path d="M74 33 l8 -1.5 M74 34.5 l8 1 M62 33.5 l-8 -1 M62 35 l-7.5 1.5" stroke="#7c3f1d" strokeWidth="0.55" strokeLinecap="round" opacity="0.55" />
          </g>

          {/* collar with a little bell */}
          <path d="M51 38.5 q8 4.5 18 1.5" stroke="#ec7fb5" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g className="cat-bell" style={{ transformOrigin: "60px 42px" }}>
            <circle cx="60" cy="44" r="2.6" fill="#fbbf24" stroke="#b45309" strokeWidth="0.7" />
            <path d="M58.6 44.6 h2.8" stroke="#b45309" strokeWidth="0.6" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function PawPrint() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-amber-500/80">
      <ellipse cx="12" cy="15.5" rx="5" ry="4.2" fill="currentColor" />
      <circle cx="6" cy="10" r="2.2" fill="currentColor" />
      <circle cx="10" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="14.5" cy="6.5" r="2.2" fill="currentColor" />
      <circle cx="18.3" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useMuted, useSfx } from "./sfx";

/** Number of bug hiding spots placed across the page (see <Bug slot={…} />). */
export const MAX_BUGS = 18;

type State = {
  active: boolean;
  found: string[];
  startedAt: number | null;
  finishedAt: number | null;
};

type Ctx = State & {
  enabled: boolean;
  bugCount: number;
  total: number;
  bugIds: string[];
  muted: boolean;
  bestTime: number | null;
  register: (id: string) => () => void;
  squash: (id: string) => void;
  start: () => void;
  quit: () => void;
  setMuted: (m: boolean) => void;
};

const BugHuntContext = createContext<Ctx | null>(null);
const STORE = "bughunt:v2";
const BEST = "bughunt:best";

const initial: State = { active: false, found: [], startedAt: null, finishedAt: null };

export function BugHuntProvider({
  enabled,
  bugCount,
  children,
}: {
  enabled: boolean;
  bugCount: number;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>(initial);
  const [bugIds, setBugIds] = useState<string[]>([]);
  const [muted, setMuted] = useMuted();
  const [bestTime, setBestTime] = useState<number | null>(null);
  const play = useSfx(muted);
  const count = Math.max(1, Math.min(MAX_BUGS, Math.round(bugCount) || 1));

  // Restore an in-progress run (so a refresh mid-game doesn't lose it)
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORE);
      if (s) {
        const saved = JSON.parse(s) as State;
        if (saved.active && !saved.finishedAt) setState({ ...initial, ...saved });
      }
      const b = localStorage.getItem(`${BEST}:${count}`);
      setBestTime(b ? Number(b) : null);
    } catch {}
  }, [count]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(state));
    } catch {}
  }, [state]);

  const register = useCallback((id: string) => {
    setBugIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
    return () => setBugIds((ids) => ids.filter((x) => x !== id));
  }, []);

  const total = bugIds.length;

  const squash = useCallback(
    (id: string) => {
      setState((s) => {
        if (!s.active || s.found.includes(id)) return s;
        const found = [...s.found, id];
        const done = found.length >= total && total > 0;
        return done ? { ...s, found, finishedAt: Date.now() } : { ...s, found };
      });
      play("squash");
    },
    [total, play]
  );

  // When a run finishes: record best time (per bug count) and play the jingle
  const prevFinished = useRef<number | null>(null);
  useEffect(() => {
    if (state.finishedAt && state.finishedAt !== prevFinished.current && state.startedAt) {
      const time = Math.round((state.finishedAt - state.startedAt) / 1000);
      setBestTime((b) => {
        const best = b === null ? time : Math.min(b, time);
        try {
          localStorage.setItem(`${BEST}:${count}`, String(best));
        } catch {}
        return best;
      });
      play("win");
    }
    prevFinished.current = state.finishedAt;
  }, [state.finishedAt, state.startedAt, play, count]);

  const start = useCallback(() => setState({ active: true, found: [], startedAt: Date.now(), finishedAt: null }), []);
  const quit = useCallback(() => setState(initial), []);

  const value = useMemo<Ctx>(
    () => ({ ...state, enabled, bugCount: count, total, bugIds, muted, bestTime, register, squash, start, quit, setMuted }),
    [state, enabled, count, total, bugIds, muted, bestTime, register, squash, start, quit, setMuted]
  );

  return <BugHuntContext.Provider value={value}>{children}</BugHuntContext.Provider>;
}

export function useBugHunt() {
  const ctx = useContext(BugHuntContext);
  if (!ctx) throw new Error("useBugHunt must be used inside BugHuntProvider");
  return ctx;
}

"use client";

import { useEffect, useState } from "react";
import { useBugHunt } from "./BugHuntProvider";

const VARIANTS = [
  { body: "#ef4444", label: "NullPointer" },
  { body: "#f59e0b", label: "Off-by-one" },
  { body: "#a855f7", label: "Race condition" },
  { body: "#3b82f6", label: "Flaky test" },
  { body: "#ec4899", label: "CSS overflow" },
  { body: "#14b8a6", label: "Memory leak" },
  { body: "#f97316", label: "500 error" },
  { body: "#84cc16", label: "Broken link" },
];

/**
 * A hidden bug for the Bug Hunt mini-game.
 * Place it inside a `relative` container and position it with `className`.
 * `slot` (0-based) decides whether it is used: only slots below the bug count
 * configured in Admin → Games are active.
 */
export default function Bug({ id, slot, className = "" }: { id: string; slot: number; className?: string }) {
  const { enabled, active, found, register, squash, bugCount } = useBugHunt();
  const [splat, setSplat] = useState(false);
  const v = VARIANTS[slot % VARIANTS.length];
  const inUse = enabled && slot < bugCount;

  useEffect(() => {
    if (!inUse) return;
    return register(id);
  }, [inUse, id, register]);

  useEffect(() => {
    if (!active) setSplat(false);
  }, [active]);

  if (!inUse || !active) return null;
  const isFound = found.includes(id);
  if (isFound && !splat) return null;

  const onHit = () => {
    if (splat) return;
    setSplat(true);
    squash(id);
    setTimeout(() => setSplat(false), 900);
  };

  return (
    <div className={`absolute z-20 ${className}`} data-bug-id={id}>
      {splat ? (
        <div className="pointer-events-none relative h-10 w-10">
          <svg viewBox="0 0 40 40" className="absolute inset-0 animate-splat">
            <path
              d="M20 6l3 8 8-4-4 8 9 2-9 3 5 8-8-4-1 9-3-8-6 6 1-9-9 1 7-6-7-5 9 0-3-8 7 5z"
              fill={v.body}
              opacity="0.85"
            />
          </svg>
          <span className="absolute -top-6 left-1/2 -translate-x-1/2 animate-float-up whitespace-nowrap rounded bg-pass-500 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
            FIXED +1
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onHit}
          aria-label={`Squash bug: ${v.label}`}
          title={v.label}
          className="group relative grid h-10 w-10 cursor-crosshair place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-pass-500"
        >
          <span className="absolute inset-0 animate-ping rounded-full opacity-20" style={{ background: v.body }} />
          <svg viewBox="0 0 32 32" className="relative h-8 w-8 animate-crawl drop-shadow-lg transition-transform group-hover:scale-125">
            <g stroke="#111" strokeWidth="1.6" strokeLinecap="round" className="origin-center">
              <path d="M10 13L5 10M10 17H4M10 21l-5 3M22 13l5-3M22 17h6M22 21l5 3" />
              <path d="M13 8l-2-4M19 8l2-4" />
            </g>
            <ellipse cx="16" cy="18" rx="7" ry="9" fill={v.body} stroke="#111" strokeWidth="1.4" />
            <circle cx="16" cy="9.5" r="4" fill="#1f2937" />
            <path d="M16 11v15" stroke="#111" strokeWidth="1.2" opacity="0.5" />
            <circle cx="13" cy="16" r="1.4" fill="#111" opacity="0.6" />
            <circle cx="19" cy="21" r="1.4" fill="#111" opacity="0.6" />
            <circle cx="14.5" cy="9" r="0.9" fill="#fff" />
            <circle cx="17.5" cy="9" r="0.9" fill="#fff" />
          </svg>
        </button>
      )}
    </div>
  );
}

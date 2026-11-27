"use client";

import { useEffect, useState } from "react";

export default function Terminal({ command, lines }: { command: string; lines: string[] }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i > lines.length) clearInterval(id);
    }, 520);
    return () => clearInterval(id);
  }, [lines]);

  const done = shown > lines.length;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-ink-900/10 transition-transform duration-500 hover:-translate-y-1 dark:border-ink-800 dark:bg-ink-900/80 dark:shadow-black/40">
      <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[11px] text-ink-400">release-check</span>
      </div>

      <div className="relative space-y-2 p-5 font-mono text-[12.5px] leading-relaxed sm:text-[13px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 animate-scan bg-gradient-to-b from-transparent via-pass-400/[0.06] to-transparent" />
        <p className="text-ink-500 dark:text-ink-400">
          <span className="text-pass-600 dark:text-pass-400">➜</span>{" "}
          <span className="text-ink-900 dark:text-ink-100">{command}</span>
        </p>
        <p className="pb-1 text-ink-400 dark:text-ink-500">Running {lines.length} suites…</p>

        {lines.map((line, i) => (
          <p
            key={i}
            className={`flex items-start gap-2 transition-all duration-500 ${
              i < shown ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
            }`}
          >
            <span className="rounded bg-pass-500/15 px-1.5 text-[10.5px] font-semibold leading-5 text-pass-700 dark:text-pass-300">
              PASS
            </span>
            <span className="flex-1 text-ink-700 dark:text-ink-200">{line}</span>
            <span className="hidden text-ink-400 sm:inline">{(0.42 + ((i * 37) % 90) / 100).toFixed(2)}s</span>
          </p>
        ))}

        <div
          className={`border-t border-dashed border-ink-200 pt-3 transition-opacity duration-500 dark:border-ink-700 ${
            done ? "opacity-100" : "opacity-0"
          }`}
        >
          <p className="text-ink-600 dark:text-ink-300">
            Suites: <span className="font-semibold text-pass-600 dark:text-pass-400">{lines.length} passed</span>,{" "}
            {lines.length} total
          </p>
          <p className="text-ink-600 dark:text-ink-300">
            Status: <span className="font-semibold text-pass-600 dark:text-pass-400">ready to ship</span>
            <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-blink bg-pass-500" />
          </p>
        </div>
      </div>
    </div>
  );
}

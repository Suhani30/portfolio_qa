/** Infinite scrolling strip of tools. Pauses on hover. */
export default function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="group relative overflow-hidden border-y border-ink-200/70 bg-ink-50/50 py-4 dark:border-ink-900 dark:bg-ink-900/30 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
      <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused]">
        {row.map((t, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-ink-200 bg-white px-4 py-1.5 font-mono text-xs text-ink-600 transition hover:border-pass-500/50 hover:text-pass-700 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-300 dark:hover:text-pass-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pass-500" />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

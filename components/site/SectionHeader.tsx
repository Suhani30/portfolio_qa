import Reveal from "./Reveal";

export default function SectionHeader({
  index,
  file,
  title,
  intro,
}: {
  index: string;
  file: string;
  title: string;
  intro?: string;
}) {
  return (
    <Reveal className="mb-12 max-w-3xl">
      <div className="mb-4 flex items-center gap-3">
        <span className="kicker">{index}</span>
        <span className="h-px w-8 bg-pass-500/50" />
        <span className="font-mono text-xs text-ink-500 dark:text-ink-400">{file}</span>
      </div>
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl dark:text-white">
        {title}
      </h2>
      {intro && <p className="mt-4 text-pretty text-base leading-relaxed text-ink-600 dark:text-ink-400">{intro}</p>}
    </Reveal>
  );
}

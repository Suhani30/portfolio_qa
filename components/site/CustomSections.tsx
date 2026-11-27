import type { CustomSection } from "@/lib/types";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { ArrowUpRight } from "./Icons";

export default function CustomSections({ sections }: { sections: CustomSection[] }) {
  const visible = sections.filter((s) => s.visible);
  if (!visible.length) return null;

  return (
    <>
      {visible.map((s, si) => (
        <section key={s.id} id={s.id} data-island={s.label} className="relative border-t border-ink-200/70 py-24 sm:py-28 dark:border-ink-900">
          <div className="container-x">
            <SectionHeader
              index={String(7 + si).padStart(2, "0")}
              file={`${s.id}.md`}
              title={s.heading || s.label}
              intro={s.intro || undefined}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.items.map((it, i) => {
                const body = (
                  <div className="card card-hover group h-full p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold tracking-tight text-ink-950 dark:text-white">{it.title}</h3>
                      {it.link && <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 group-hover:text-pass-500" />}
                    </div>
                    {it.subtitle && <p className="mt-1 font-mono text-xs text-pass-700 dark:text-pass-400">{it.subtitle}</p>}
                    {it.description && <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{it.description}</p>}
                  </div>
                );
                return (
                  <Reveal key={i} delay={(i % 3) * 70}>
                    {it.link ? (
                      <a href={it.link} target="_blank" rel="noreferrer" className="block h-full">
                        {body}
                      </a>
                    ) : (
                      body
                    )}
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

import type { SkillGroup } from "@/lib/types";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import Bug from "@/components/game/Bug";

const levelLabel = ["", "Working", "Proficient", "Advanced"];

export default function Skills({ groups }: { groups: SkillGroup[] }) {
  return (
    <section id="skills" className="relative border-t border-ink-200/70 py-24 sm:py-32 dark:border-ink-900">
      <div className="container-x relative">
        <Bug id="skills-legend" slot={14} className="right-4 top-0" />
        <SectionHeader
          index="04"
          file="toolchain.config.ts"
          title="Toolchain"
          intro="These are the tools I reach for every day, grouped by the layer of the product they protect."
        />

        <div className="mb-6 flex flex-wrap items-center gap-5 font-mono text-[11px] text-ink-500">
          {[1, 2, 3].map((l) => (
            <span key={l} className="flex items-center gap-2">
              <span className="flex gap-0.5">
                {[1, 2, 3].map((s) => (
                  <span key={s} className={`h-1.5 w-3 rounded-full ${s <= l ? "bg-pass-500" : "bg-ink-200 dark:bg-ink-800"}`} />
                ))}
              </span>
              {levelLabel[l]}
            </span>
          ))}
        </div>

        <div className="relative grid gap-4 md:grid-cols-2">
          <Bug id="skills" slot={6} className="-bottom-6 right-[20%]" />
          {groups.map((g, i) => (
            <Reveal key={g.id} delay={(i % 2) * 80}>
              <div className="card card-hover h-full p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white">{g.group}</h3>
                  <span className="font-mono text-xs text-ink-400">{g.items.length} tools</span>
                </div>
                {g.description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{g.description}</p>}
                <ul className="mt-6 divide-y divide-ink-100 dark:divide-ink-800/80">
                  {g.items.map((s) => {
                    const lvl = Math.max(1, Math.min(3, Number(s.level) || 1));
                    return (
                      <li key={s.name} className="group/row flex items-center justify-between gap-4 py-2.5">
                        <span className="text-sm text-ink-700 transition-colors group-hover/row:text-ink-950 dark:text-ink-300 dark:group-hover/row:text-white">
                          {s.name}
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="hidden font-mono text-[11px] text-ink-400 sm:inline">{levelLabel[lvl]}</span>
                          <span className="flex gap-0.5" aria-label={levelLabel[lvl]}>
                            {[1, 2, 3].map((n) => (
                              <span
                                key={n}
                                className={`h-1.5 w-4 rounded-full transition-colors ${n <= lvl ? "bg-pass-500" : "bg-ink-200 dark:bg-ink-800"}`}
                              />
                            ))}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

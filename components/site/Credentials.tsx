import type { Education, Training } from "@/lib/types";
import Reveal from "./Reveal";
import Bug from "@/components/game/Bug";

export default function Credentials({ education, training }: { education: Education[]; training: Training[] }) {
  if (!education.length && !training.length) return null;
  return (
    <section id="credentials" className="relative border-t border-ink-200/70 py-24 sm:py-28 dark:border-ink-900">
      <div className="container-x relative grid gap-14 lg:grid-cols-[1fr_1.6fr]">
        <Bug id="credentials" slot={7} className="-top-10 left-[40%]" />
        <Bug id="credentials-b" slot={15} className="-bottom-12 right-[12%]" />
        <div>
          <Reveal>
            <div className="mb-4 flex items-center gap-3">
              <span className="kicker">05</span>
              <span className="h-px w-8 bg-pass-500/50" />
              <span className="font-mono text-xs text-ink-500">education.md</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl dark:text-white">Education</h2>
          </Reveal>
          <div className="mt-8 space-y-4">
            {education.map((e, i) => (
              <Reveal key={e.id} delay={i * 70}>
                <div className="card card-hover p-5">
                  <p className="font-mono text-xs text-ink-500">{e.period}</p>
                  <h3 className="mt-2 font-semibold text-ink-950 dark:text-white">{e.degree}</h3>
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{e.institution}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <div>
          <Reveal>
            <div className="mb-4 flex items-center gap-3">
              <span className="kicker">06</span>
              <span className="h-px w-8 bg-pass-500/50" />
              <span className="font-mono text-xs text-ink-500">training.md</span>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl dark:text-white">Training & certification</h2>
          </Reveal>
          <div className="mt-8 space-y-4">
            {training.map((t, i) => (
              <Reveal key={t.id} delay={i * 70}>
                <div className="card card-hover p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-ink-950 dark:text-white">{t.title}</h3>
                    {t.period && <span className="font-mono text-xs text-ink-500">{t.period}</span>}
                  </div>
                  <p className="text-sm text-pass-700 dark:text-pass-400">{t.provider}</p>
                  {t.description && <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{t.description}</p>}
                  {t.topics.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {t.topics.map((x) => (
                        <span key={x} className="chip">{x}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

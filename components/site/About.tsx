import type { About as AboutT } from "@/lib/types";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { Check } from "./Icons";
import Bug from "@/components/game/Bug";

const lifecycle = ["Requirement", "Test plan", "Execute", "Report", "Verify fix", "Release"];

export default function About({ about, softSkills }: { about: AboutT; softSkills: string[] }) {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="container-x">
        <SectionHeader index="01" file="about.spec.ts" title={about.heading} />

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="relative space-y-5">
            <Bug id="about-lifecycle" slot={10} className="-bottom-8 right-[20%]" />
            {about.paragraphs.map((p, i) => (
              <Reveal key={i} delay={i * 80}>
                <p className="text-pretty text-[17px] leading-relaxed text-ink-600 dark:text-ink-300">{p}</p>
              </Reveal>
            ))}

            <Reveal delay={240} className="pt-4">
              <p className="mb-3 font-mono text-xs text-ink-500">{"// how I work, every sprint"}</p>
              <ol className="flex flex-wrap items-center gap-y-2 font-mono text-xs">
                {lifecycle.map((step, i) => (
                  <li key={step} className="flex items-center">
                    <span className="rounded-md border border-ink-200 bg-white px-2.5 py-1.5 text-ink-700 transition-colors hover:border-pass-500/50 hover:text-pass-700 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:text-pass-300">
                      <span className="mr-1.5 text-ink-400">{String(i + 1).padStart(2, "0")}</span>
                      {step}
                    </span>
                    {i < lifecycle.length - 1 && <span className="mx-1.5 text-ink-300 dark:text-ink-600">→</span>}
                  </li>
                ))}
              </ol>
            </Reveal>

            {softSkills.length > 0 && (
              <Reveal delay={300} className="flex flex-wrap gap-2 pt-4">
                {softSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600 dark:border-ink-800 dark:text-ink-400"
                  >
                    {s}
                  </span>
                ))}
              </Reveal>
            )}
          </div>

          <div className="relative grid gap-4 sm:grid-cols-2">
            <Bug id="about-cards" slot={2} className="-right-2 -top-6" />
            {about.highlights.map((h, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="card card-hover group h-full p-6">
                  <span className="mb-5 grid h-9 w-9 place-items-center rounded-lg bg-pass-500/10 text-pass-600 transition-colors group-hover:bg-pass-500 group-hover:text-white dark:text-pass-400 dark:group-hover:text-ink-950">
                    <Check />
                  </span>
                  <h3 className="font-semibold tracking-tight text-ink-950 dark:text-white">{h.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{h.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

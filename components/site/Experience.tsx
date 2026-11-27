import type { Experience } from "@/lib/types";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { Check } from "./Icons";
import Bug from "@/components/game/Bug";

export default function ExperienceSection({ items }: { items: Experience[] }) {
  return (
    <section id="experience" className="relative border-t border-ink-200/70 py-24 sm:py-32 dark:border-ink-900">
      <div className="container-x relative">
        <Bug id="experience" slot={5} className="right-2 top-0" />
        <SectionHeader
          index="03"
          file="experience.log"
          title="Experience"
          intro="I moved from systems and data work into dedicated QA, and now own quality on multi-module products."
        />

        <Bug id="experience-timeline" slot={13} className="-bottom-10 left-[40%]" />
        <ol className="relative space-y-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-gradient-to-b before:from-pass-500/60 before:via-ink-200 before:to-transparent md:before:left-[calc(11rem+7px)] dark:before:via-ink-800">
          {items.map((e, i) => {
            const current = /present|current|now/i.test(e.end);
            return (
              <Reveal as="li" key={e.id} delay={i * 60} className="relative grid gap-3 pl-8 md:grid-cols-[11rem_1fr] md:gap-0 md:pl-0">
                <div className="pt-1 font-mono text-xs text-ink-500 md:pr-10 md:text-right">
                  <div>{e.start} —</div>
                  <div className={current ? "font-medium text-pass-600 dark:text-pass-400" : ""}>{e.end}</div>
                </div>

                <span
                  className={`absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-2 md:left-[11rem] ${
                    current
                      ? "border-pass-500 bg-pass-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]"
                      : "border-ink-300 bg-white dark:border-ink-600 dark:bg-ink-950"
                  }`}
                />

                <div className="card card-hover p-6 md:ml-10">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-lg font-semibold tracking-tight text-ink-950 dark:text-white">
                      {e.role} <span className="font-normal text-ink-400">@</span>{" "}
                      <span className="text-ink-700 dark:text-ink-200">{e.company}</span>
                    </h3>
                    <span className="font-mono text-xs text-ink-500">{e.location}</span>
                  </div>
                  {e.summary && <p className="mt-3 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{e.summary}</p>}
                  {e.achievements.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {e.achievements.map((a, j) => (
                        <li key={j} className="flex gap-2.5 text-sm leading-relaxed text-ink-700 dark:text-ink-300">
                          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-pass-500" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                  {e.tags.length > 0 && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {e.tags.map((t) => (
                        <span key={t} className="chip">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

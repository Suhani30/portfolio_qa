import type { Project } from "@/lib/types";
import SectionHeader from "./SectionHeader";
import Reveal from "./Reveal";
import { ArrowUpRight, Check } from "./Icons";

function FeaturedCard({ p, i }: { p: Project; i: number }) {
  return (
    <Reveal as="article" delay={i * 60}>
      <div className="card card-hover group relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pass-500/0 blur-3xl transition-colors duration-700 group-hover:bg-pass-500/10" />
        <div className="relative grid gap-8 p-7 sm:p-9 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          <div className="flex flex-col">
            <div className="flex items-center gap-3 font-mono text-xs text-ink-500">
              <span className="text-pass-600 dark:text-pass-400">CASE {String(i + 1).padStart(2, "0")}</span>
              <span className="h-px w-6 bg-ink-300 dark:bg-ink-700" />
              <span>{p.category}</span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink-950 sm:text-3xl dark:text-white">{p.title}</h3>
            {p.organization && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{p.organization}</p>}
            <p className="mt-5 text-pretty leading-relaxed text-ink-600 dark:text-ink-300">{p.summary}</p>

            <div className="mt-6 flex flex-wrap gap-1.5 lg:mt-auto lg:pt-8">
              {p.tags.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
            {p.link && (
              <a href={p.link} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-pass-700 hover:underline dark:text-pass-400">
                View project <ArrowUpRight />
              </a>
            )}
          </div>

          <div className="space-y-5 rounded-xl border border-ink-200 bg-ink-50/70 p-6 dark:border-ink-800 dark:bg-ink-950/50">
            {p.challenge && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">Risk</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-300">{p.challenge}</p>
              </div>
            )}
            {p.approach && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-sky-600 dark:text-sky-400">My approach</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-300">{p.approach}</p>
              </div>
            )}
            {p.coverage.length > 0 && (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-pass-600 dark:text-pass-400">Coverage</p>
                <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
                  {p.coverage.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-pass-500 text-white dark:text-ink-950">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function SmallCard({ p, i }: { p: Project; i: number }) {
  const Inner = (
    <div className="card card-hover group flex h-full flex-col p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink-500">{p.category}</span>
        {p.link && (
          <ArrowUpRight className="h-4 w-4 text-ink-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-pass-500" />
        )}
      </div>
      <h3 className="mt-3 font-semibold tracking-tight text-ink-950 dark:text-white">{p.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600 dark:text-ink-400">{p.summary}</p>
      {p.approach && <p className="mt-3 text-sm leading-relaxed text-ink-500 dark:text-ink-500">{p.approach}</p>}
      <div className="mt-5 flex flex-wrap gap-1.5">
        {p.tags.map((t) => (
          <span key={t} className="chip">{t}</span>
        ))}
      </div>
    </div>
  );
  return (
    <Reveal delay={(i % 3) * 70}>
      {p.link ? (
        <a href={p.link} target="_blank" rel="noreferrer" className="block h-full">
          {Inner}
        </a>
      ) : (
        Inner
      )}
    </Reveal>
  );
}

export default function Projects({ projects }: { projects: Project[] }) {
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <section id="work" className="border-t border-ink-200/70 py-24 sm:py-32 dark:border-ink-900">
      <div className="container-x">
        <SectionHeader
          index="02"
          file="case-studies.spec.ts"
          title="Products I've helped ship, and how I tested them."
          intro="Each case shows the main risk, how I tested against it and what my test coverage protected."
        />

        <div className="space-y-6">
          {featured.map((p, i) => (
            <FeaturedCard key={p.id} p={p} i={i} />
          ))}
        </div>

        {rest.length > 0 && (
          <>
            <Reveal className="mb-6 mt-20 flex items-end justify-between gap-4">
              <h3 className="text-xl font-semibold tracking-tight text-ink-950 dark:text-white">More products & automation labs</h3>
              <span className="font-mono text-xs text-ink-500">{rest.length} items</span>
            </Reveal>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((p, i) => (
                <SmallCard key={p.id} p={p} i={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

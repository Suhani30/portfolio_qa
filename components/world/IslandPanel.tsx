"use client";

import type { SiteContent } from "@/lib/types";

/* Section details shown when the cat arrives on an island. Compact layouts of
 * the same content the classic page shows, sized for a side drawer. */

export type IslandInfo = { id: string; name: string; kind: string; label: string; sectionId?: string };

const H = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-6 mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-pass-600 dark:text-pass-300">{children}</h3>
);
const Chip = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-mauve-300/40 bg-mauve-100/60 px-2.5 py-0.5 text-[11px] font-medium text-mauve-800 dark:border-mauve-400/25 dark:bg-mauve-400/10 dark:text-mauve-100">
    {children}
  </span>
);
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] ${className}`}>{children}</div>
);

export default function IslandPanel({ island, c }: { island: IslandInfo; c: SiteContent }) {
  const p = c.profile;
  switch (island.kind) {
    case "home":
      return (
        <div>
          {p.availability && (
            <span className="inline-flex items-center gap-2 rounded-full border border-pass-400/40 bg-pass-400/10 px-3 py-1 text-xs font-medium text-pass-700 dark:text-pass-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pass-500" />
              {p.availability}
            </span>
          )}
          <p className="mt-4 text-sm text-ink-500 dark:text-ink-300">
            {p.name} · {p.role} · {p.location}
          </p>
          <p className="mt-2 bg-gradient-to-r from-pass-500 via-mauve-500 to-periwinkle-500 bg-clip-text text-2xl font-semibold leading-tight tracking-tight text-transparent">
            {p.tagline}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{p.intro}</p>
          {c.stats.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {c.stats.map((s) => (
                <Card key={s.label} className="!p-3">
                  <p className="text-2xl font-semibold text-ink-900 dark:text-white">{s.value}</p>
                  <p className="text-[11px] leading-snug text-ink-500 dark:text-ink-300">{s.label}</p>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            {p.email && (
              <a href={`mailto:${p.email}`} className="btn-primary">
                Email me
              </a>
            )}
            {p.resumeUrl && (
              <a href={p.resumeUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                Résumé
              </a>
            )}
            {p.linkedin && (
              <a href={p.linkedin} target="_blank" rel="noreferrer" className="btn-ghost">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      );

    case "about":
      return (
        <div>
          <p className="text-lg font-semibold leading-snug text-ink-900 dark:text-white">{c.about.heading}</p>
          {c.about.paragraphs.map((t, i) => (
            <p key={i} className="mt-3 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
              {t}
            </p>
          ))}
          {c.about.highlights.length > 0 && (
            <>
              <H>Highlights</H>
              <div className="space-y-2">
                {c.about.highlights.map((h) => (
                  <Card key={h.title} className="!p-3">
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">{h.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-600 dark:text-ink-300">{h.description}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
          {c.softSkills.length > 0 && (
            <>
              <H>Soft skills</H>
              <div className="flex flex-wrap gap-1.5">
                {c.softSkills.map((s) => (
                  <Chip key={s}>{s}</Chip>
                ))}
              </div>
            </>
          )}
        </div>
      );

    case "work": {
      const featured = c.projects.filter((x) => x.featured);
      const others = c.projects.filter((x) => !x.featured);
      return (
        <div className="space-y-3">
          {featured.map((x) => (
            <Card key={x.id}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-periwinkle-600 dark:text-periwinkle-300">
                {x.category}
                {x.organization ? ` · ${x.organization}` : ""}
              </p>
              <p className="mt-1 text-base font-semibold text-ink-900 dark:text-white">{x.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{x.summary}</p>
              <dl className="mt-3 space-y-2 text-xs leading-relaxed">
                {x.challenge && (
                  <div>
                    <dt className="font-semibold text-pass-600 dark:text-pass-300">Risk</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{x.challenge}</dd>
                  </div>
                )}
                {x.approach && (
                  <div>
                    <dt className="font-semibold text-mauve-600 dark:text-mauve-300">My approach</dt>
                    <dd className="text-ink-700 dark:text-ink-200">{x.approach}</dd>
                  </div>
                )}
              </dl>
              {x.coverage.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-ink-700 dark:text-ink-200">
                  {x.coverage.map((k) => (
                    <li key={k} className="flex gap-2">
                      <span className="text-pass-500">✓</span>
                      {k}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {x.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
              {x.link && (
                <a href={x.link} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-medium text-pass-600 underline-offset-2 hover:underline dark:text-pass-300">
                  View project →
                </a>
              )}
            </Card>
          ))}
          {others.length > 0 && (
            <>
              <H>More products & labs</H>
              {others.map((x) => (
                <Card key={x.id} className="!p-3">
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{x.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600 dark:text-ink-300">{x.summary}</p>
                </Card>
              ))}
            </>
          )}
        </div>
      );
    }

    case "experience":
      return (
        <ol className="relative space-y-4 border-l-2 border-mauve-300/50 pl-5 dark:border-mauve-400/30">
          {c.experience.map((e, i) => (
            <li key={e.id} className="relative">
              <span className={`absolute -left-[27px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white/70 dark:ring-ink-900/70 ${i === 0 ? "bg-pass-500" : "bg-mauve-400"}`} />
              <p className="font-mono text-[11px] text-ink-500 dark:text-ink-400">
                {e.start} – {e.end} · {e.location}
              </p>
              <p className="mt-0.5 text-base font-semibold text-ink-900 dark:text-white">{e.role}</p>
              <p className="text-sm font-medium text-periwinkle-600 dark:text-periwinkle-300">{e.company}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{e.summary}</p>
              {e.achievements.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-ink-700 dark:text-ink-200">
                  {e.achievements.map((a) => (
                    <li key={a} className="flex gap-2">
                      <span className="text-pass-500">▸</span>
                      {a}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {e.tags.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </div>
            </li>
          ))}
        </ol>
      );

    case "skills":
      return (
        <div className="space-y-3">
          {c.skills.map((g) => (
            <Card key={g.id}>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">{g.group}</p>
              {g.description && <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{g.description}</p>}
              <ul className="mt-3 space-y-2">
                {g.items.map((s) => (
                  <li key={s.name}>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-800 dark:text-ink-100">{s.name}</span>
                      <span className="font-mono text-ink-400">{s.level}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-mauve-100 dark:bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-pass-400 via-mauve-400 to-periwinkle-400" style={{ width: `${Math.max(0, Math.min(100, s.level))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      );

    case "credentials":
      return (
        <div>
          {c.education.length > 0 && <H>Education</H>}
          <div className="space-y-2">
            {c.education.map((e) => (
              <Card key={e.id} className="!p-3">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{e.degree}</p>
                <p className="text-xs text-ink-600 dark:text-ink-300">
                  {e.institution} · {e.period}
                </p>
              </Card>
            ))}
          </div>
          {c.training.length > 0 && <H>Training</H>}
          <div className="space-y-2">
            {c.training.map((t) => (
              <Card key={t.id} className="!p-3">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{t.title}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {t.provider} · {t.period}
                </p>
                {t.description && <p className="mt-1.5 text-xs leading-relaxed text-ink-700 dark:text-ink-200">{t.description}</p>}
                {t.topics.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.topics.map((x) => (
                      <Chip key={x}>{x}</Chip>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      );

    case "contact":
      return (
        <div>
          <p className="text-xl font-semibold leading-snug text-ink-900 dark:text-white">{c.contact.heading}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{c.contact.message}</p>
          <div className="mt-5 space-y-2">
            {p.email && (
              <a href={`mailto:${p.email}`} className="btn-primary w-full">
                {c.contact.cta || "Email me"}
              </a>
            )}
            {p.email && <p className="text-center font-mono text-xs text-ink-500 dark:text-ink-400">{p.email}</p>}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {p.linkedin && (
                <a href={p.linkedin} target="_blank" rel="noreferrer" className="btn-ghost">
                  LinkedIn
                </a>
              )}
              {p.github && (
                <a href={p.github} target="_blank" rel="noreferrer" className="btn-ghost">
                  GitHub
                </a>
              )}
              {p.phone && (
                <a href={`tel:${p.phone.replace(/\s+/g, "")}`} className="btn-ghost">
                  Call
                </a>
              )}
              {p.resumeUrl && (
                <a href={p.resumeUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                  Résumé
                </a>
              )}
            </div>
          </div>
        </div>
      );

    default: {
      const s = c.customSections.find((x) => x.id === island.sectionId);
      if (!s) return null;
      return (
        <div>
          <p className="text-lg font-semibold text-ink-900 dark:text-white">{s.heading}</p>
          {s.intro && <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{s.intro}</p>}
          <div className="mt-4 space-y-2">
            {s.items.map((it, i) => (
              <Card key={i} className="!p-3">
                <p className="text-sm font-semibold text-ink-900 dark:text-white">{it.title}</p>
                {it.subtitle && <p className="text-xs text-ink-500 dark:text-ink-400">{it.subtitle}</p>}
                {it.description && <p className="mt-1 text-xs leading-relaxed text-ink-700 dark:text-ink-200">{it.description}</p>}
                {it.link && (
                  <a href={it.link} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs font-medium text-pass-600 hover:underline dark:text-pass-300">
                    Open →
                  </a>
                )}
              </Card>
            ))}
          </div>
        </div>
      );
    }
  }
}

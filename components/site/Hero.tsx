import type { Profile, Stat } from "@/lib/types";
import Terminal from "./Terminal";
import { ArrowRight, Github, Linkedin, Pin } from "./Icons";

function splitTagline(t: string): [string, string] {
  const idx = t.search(/[,—–:]/);
  if (idx === -1) return [t, ""];
  return [t.slice(0, idx + 1), t.slice(idx + 1).trim()];
}

const iconBtn =
  "grid h-10 w-10 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-950 dark:hover:bg-ink-900 dark:hover:text-white";

export default function Hero({ profile, stats }: { profile: Profile; stats: Stat[] }) {
  const [lead, rest] = splitTagline(profile.tagline);

  return (
    <section id="top" className="relative overflow-hidden pt-28 sm:pt-36">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-pass-500/10 blur-3xl dark:bg-pass-500/[0.08]" />

      <div className="container-x relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <div>
            <div className="mb-7 flex animate-fade-up flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-pass-500/30 bg-pass-500/10 px-3 py-1 text-xs font-medium text-pass-700 dark:text-pass-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pass-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-pass-500" />
                </span>
                {profile.availability}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-500 dark:text-ink-400">
                <Pin className="h-3.5 w-3.5" /> {profile.location}
              </span>
            </div>

            <p className="animate-fade-up font-mono text-sm text-ink-500 [animation-delay:80ms] dark:text-ink-400">
              {profile.name} <span className="text-ink-300 dark:text-ink-600">/</span>{" "}
              <span className="text-ink-800 dark:text-ink-200">{profile.role}</span>
            </p>

            <h1 className="mt-4 animate-fade-up text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink-950 [animation-delay:140ms] sm:text-5xl lg:text-[3.5rem] dark:text-white">
              {lead}{" "}
              {rest && (
                <span className="bg-gradient-to-r from-pass-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent dark:from-pass-300 dark:via-pass-400 dark:to-teal-300">
                  {rest}
                </span>
              )}
            </h1>

            <p className="mt-6 max-w-xl animate-fade-up text-pretty text-lg leading-relaxed text-ink-600 [animation-delay:220ms] dark:text-ink-400">
              {profile.intro}
            </p>

            <div className="mt-9 flex animate-fade-up flex-wrap items-center gap-3 [animation-delay:300ms]">
              <a href="#work" className="btn-primary group">
                View case studies
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href="#contact" className="btn-ghost">
                Get in touch
              </a>
              {profile.resumeUrl && (
                <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="btn-ghost">
                  Résumé
                </a>
              )}
              <div className="ml-1 flex items-center gap-1">
                {profile.github && (
                  <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub" className={iconBtn}>
                    <Github className="h-[18px] w-[18px]" />
                  </a>
                )}
                {profile.linkedin && (
                  <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className={iconBtn}>
                    <Linkedin className="h-[17px] w-[17px]" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:350ms]">
            <Terminal command={profile.terminalCommand} lines={profile.terminalLines} />
          </div>
        </div>

        {stats.length > 0 && (
          <dl className="mt-20 grid animate-fade-up grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink-200 bg-ink-200 [animation-delay:450ms] lg:grid-cols-4 dark:border-ink-800 dark:bg-ink-800">
            {stats.map((s, i) => (
              <div
                key={i}
                className="group relative flex flex-col-reverse bg-white p-6 transition-colors hover:bg-ink-50 dark:bg-ink-950 dark:hover:bg-ink-900"
              >
                <dt className="mt-1 text-sm text-ink-500 dark:text-ink-400">{s.label}</dt>
                <dd className="text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl dark:text-white">{s.value}</dd>
                <span className="absolute inset-x-6 bottom-0 h-px origin-left scale-x-0 bg-pass-500 transition-transform duration-500 group-hover:scale-x-100" />
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

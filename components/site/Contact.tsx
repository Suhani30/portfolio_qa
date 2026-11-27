import type { Contact as ContactT, Profile } from "@/lib/types";
import Reveal from "./Reveal";
import CopyButton from "./CopyButton";
import { ArrowUpRight, Github, Linkedin, Mail, Phone } from "./Icons";

export default function Contact({ contact, profile }: { contact: ContactT; profile: Profile }) {
  const rows = [
    profile.email && { icon: <Mail />, label: "Email", value: profile.email, href: `mailto:${profile.email}` },
    profile.phone && { icon: <Phone />, label: "Phone", value: profile.phone, href: `tel:${profile.phone.replace(/\s/g, "")}` },
    profile.linkedin && { icon: <Linkedin />, label: "LinkedIn", value: "View profile", href: profile.linkedin },
    profile.github && { icon: <Github />, label: "GitHub", value: profile.github.replace(/^https?:\/\/(www\.)?/, ""), href: profile.github },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href: string }[];

  return (
    <section id="contact" className="border-t border-ink-200/70 py-24 sm:py-32 dark:border-ink-900">
      <div className="container-x">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-ink-200 bg-ink-950 p-8 text-white sm:p-12 lg:p-16 dark:border-ink-800">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
            <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-pass-500/20 blur-3xl" />

            <div className="relative grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-end">
              <div>
                <p className="kicker !text-pass-400">{"// contact.spec.ts"}</p>
                <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{contact.heading}</h2>
                <p className="mt-5 max-w-xl text-pretty leading-relaxed text-ink-300">{contact.message}</p>
                {profile.email && (
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <a
                      href={`mailto:${profile.email}`}
                      className="btn group bg-pass-400 text-ink-950 hover:bg-pass-300 focus-visible:ring-offset-ink-950"
                    >
                      {contact.cta}
                      <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </a>
                    <CopyButton value={profile.email} />
                  </div>
                )}
              </div>

              <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur">
                {rows.map((r) => (
                  <li key={r.label}>
                    <a
                      href={r.href}
                      target={r.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/5 text-ink-300 transition-colors group-hover:bg-pass-400 group-hover:text-ink-950">
                        {r.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[11px] uppercase tracking-wider text-ink-500">{r.label}</span>
                        <span className="block truncate text-sm text-ink-100">{r.value}</span>
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-ink-600 transition-colors group-hover:text-pass-400" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { Check, Close, Menu } from "./Icons";

export default function Nav({ name, links }: { name: string; links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const sections = links
      .map((l) => document.querySelector(l.href))
      .filter((el): el is Element => !!el);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`));
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, [links]);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open
          ? "border-b border-ink-200/70 bg-white/75 backdrop-blur-xl dark:border-ink-800/70 dark:bg-ink-950/70"
          : "border-b border-transparent"
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between">
        <a href="#top" className="group flex items-center gap-2.5" aria-label="Back to top">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-ink-950 font-mono text-xs font-semibold text-white transition-transform group-hover:-rotate-6 dark:bg-white dark:text-ink-950">
            {initials}
            <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-pass-500 text-white ring-2 ring-white dark:ring-ink-950">
              <Check className="h-2.5 w-2.5" />
            </span>
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">{name}</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                active === l.href
                  ? "text-ink-950 dark:text-white"
                  : "text-ink-500 hover:text-ink-950 dark:text-ink-400 dark:hover:text-white"
              }`}
            >
              {active === l.href && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-pass-500 align-middle" />}
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 md:hidden dark:border-ink-800"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <Close /> : <Menu />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="border-t border-ink-200 md:hidden dark:border-ink-800">
          <div className="container-x flex flex-col py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-900"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

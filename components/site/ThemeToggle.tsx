"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "./Icons";

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 text-ink-600 transition hover:border-ink-400 hover:text-ink-950 dark:border-ink-800 dark:text-ink-300 dark:hover:border-ink-600 dark:hover:text-white"
    >
      {dark ? <Sun /> : <Moon />}
    </button>
  );
}

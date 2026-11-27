"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SiteContent } from "@/lib/types";
import { sections } from "./schema";
import { FieldGrid } from "./FieldEditor";
import ThemeToggle from "@/components/site/ThemeToggle";
import { ArrowUpRight, Check } from "@/components/site/Icons";

type Toast = { kind: "ok" | "err"; text: string } | null;

/* ================= Login ================= */
function Login({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) onDone();
    else setError("That password didn't pass. Try again.");
  };

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-5">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-pass-500/10 blur-3xl" />
      <form onSubmit={submit} className="card relative w-full max-w-sm animate-fade-up p-8 shadow-2xl shadow-black/10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-950 text-white dark:bg-white dark:text-ink-950">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-semibold tracking-tight">Portfolio CMS</h1>
            <p className="text-xs text-ink-500">Sign in to edit your site</p>
          </div>
        </div>
        <label htmlFor="pw" className="text-[13px] font-medium text-ink-700 dark:text-ink-300">Password</label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-ink-200 bg-white px-3 py-2.5 text-sm focus:border-pass-500 focus:outline-none focus:ring-4 focus:ring-pass-500/10 dark:border-ink-800 dark:bg-ink-950"
        />
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        <button disabled={busy || !password} className="btn-primary mt-5 w-full disabled:opacity-50">
          {busy ? "Checking…" : "Sign in"}
        </button>
        <p className="mt-5 text-center text-xs text-ink-500">
          The default password is <code className="font-mono text-ink-700 dark:text-ink-300">admin123</code>. Change it under Settings.
        </p>
      </form>
    </div>
  );
}

/* ================= Settings panel ================= */
function Settings({ content, onImport, notify }: { content: SiteContent; onImport: (c: SiteContent) => void; notify: (t: Toast) => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setCurrent("");
      setNext("");
      notify({ kind: "ok", text: "Password updated" });
    } else notify({ kind: "err", text: data.error || "Could not update password" });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio-content-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as SiteContent;
      if (!data.profile || !Array.isArray(data.projects)) throw new Error();
      onImport(data);
      notify({ kind: "ok", text: "Imported. Review it, then click Save to publish." });
    } catch {
      notify({ kind: "err", text: "That file isn't valid portfolio content" });
    }
  };

  const input =
    "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm focus:border-pass-500 focus:outline-none focus:ring-4 focus:ring-pass-500/10 dark:border-ink-800 dark:bg-ink-950";

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="font-semibold">Change password</h3>
        <p className="mt-1 text-sm text-ink-500">Use at least 8 characters.</p>
        <form onSubmit={changePw} className="mt-5 grid gap-4 sm:grid-cols-2">
          <input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} className={input} />
          <input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} className={input} />
          <div className="sm:col-span-2">
            <button className="btn-primary disabled:opacity-50" disabled={!current || next.length < 8}>Update password</button>
          </div>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold">Backup & restore</h3>
        <p className="mt-1 text-sm text-ink-500">Download all content as JSON, or load a backup into the editor.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={exportJson} className="btn-ghost">Export JSON</button>
          <button onClick={() => fileRef.current?.click()} className="btn-ghost">Import JSON</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ================= Main app ================= */
export default function AdminApp() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [content, setContent] = useState<SiteContent | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [active, setActive] = useState(sections[0].id);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [navOpen, setNavOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/content", { cache: "no-store" });
    const data = (await res.json()) as SiteContent;
    setContent(data);
    setSaved(JSON.stringify(data));
  }, []);

  useEffect(() => {
    fetch("/api/auth/login", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAuthed(Boolean(d.authenticated)));
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed, load]);

  const dirty = useMemo(() => content !== null && JSON.stringify(content) !== saved, [content, saved]);

  const notify = useCallback((t: Toast) => {
    setToast(t);
    if (t) setTimeout(() => setToast(null), 3200);
  }, []);

  const save = useCallback(async () => {
    if (!content || saving) return;
    setSaving(true);
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(JSON.stringify(content));
      notify({ kind: "ok", text: "Saved. Your site is updated." });
    } else if (res.status === 401) {
      setAuthed(false);
    } else {
      const d = await res.json().catch(() => ({}));
      notify({ kind: "err", text: d.error || "Save failed" });
    }
  }, [content, saving, notify]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [save, dirty]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthed(false);
    setContent(null);
  };

  if (authed === null) {
    return <div className="grid min-h-screen place-items-center font-mono text-sm text-ink-500">Loading…</div>;
  }
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (!content) {
    return <div className="grid min-h-screen place-items-center font-mono text-sm text-ink-500">Loading content…</div>;
  }

  const section = sections.find((s) => s.id === active);
  const counts: Record<string, number | undefined> = {
    stats: content.stats.length,
    projects: content.projects.length,
    experience: content.experience.length,
    skills: content.skills.length,
    credentials: content.education.length + content.training.length,
    custom: content.customSections.length,
  };

  const navItems = [...sections.map((s) => ({ id: s.id, label: s.label })), { id: "settings", label: "Settings" }];

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-200 bg-white transition-transform dark:border-ink-800 dark:bg-ink-900 lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-ink-200 px-5 dark:border-ink-800">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-950 text-white dark:bg-white dark:text-ink-950">
            <Check className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{content.profile.name}</p>
            <p className="font-mono text-[11px] text-ink-500">portfolio cms</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navItems.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setActive(n.id);
                setNavOpen(false);
                window.scrollTo({ top: 0 });
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                active === n.id
                  ? "bg-ink-950 text-white dark:bg-pass-400/10 dark:text-pass-300"
                  : "text-ink-600 hover:bg-ink-100 hover:text-ink-950 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-white"
              } ${n.id === "settings" ? "mt-4" : ""}`}
            >
              {n.label}
              {counts[n.id] !== undefined && (
                <span className={`font-mono text-[11px] ${active === n.id ? "opacity-70" : "text-ink-400"}`}>{counts[n.id]}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-ink-200 p-3 dark:border-ink-800">
          <a href="/" target="_blank" className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
            View live site <ArrowUpRight />
          </a>
          <button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-600 hover:bg-ink-100 dark:text-ink-400 dark:hover:bg-ink-800">
            Sign out
          </button>
        </div>
      </aside>
      {navOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setNavOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-ink-200 bg-white/80 px-5 backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/80 sm:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setNavOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg border border-ink-200 lg:hidden dark:border-ink-800" aria-label="Open menu">
              ☰
            </button>
            <span className="inline-flex items-center gap-2 font-mono text-xs text-ink-500">
              <span className={`h-2 w-2 rounded-full ${dirty ? "bg-amber-400" : "bg-pass-500"}`} />
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {dirty && (
              <button onClick={() => setContent(JSON.parse(saved))} className="btn-ghost hidden sm:inline-flex">
                Discard
              </button>
            )}
            <button onClick={save} disabled={!dirty || saving} className="btn-primary disabled:opacity-40">
              {saving ? "Saving…" : "Save"}
              <kbd className="hidden rounded border border-white/20 px-1 font-mono text-[10px] opacity-70 sm:inline dark:border-ink-950/20">Ctrl S</kbd>
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
          <div className="mb-8">
            <p className="kicker">{active === "settings" ? "account" : "content"}</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{section?.label ?? "Settings"}</h1>
            <p className="mt-2 text-sm text-ink-500">{section?.description ?? "Password, backups and imports."}</p>
          </div>

          {section ? (
            <div key={section.id} className="animate-fade-up space-y-8">
              {section.fields.map((f) => (
                <div key={f.key} className={f.type === "group" ? "card p-6" : ""}>
                  {f.type === "group" && section.fields.length > 1 && (
                    <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-ink-500">{f.label}</h2>
                  )}
                  <FieldGrid
                    fields={f.type === "group" ? f.fields : [f]}
                    value={(f.type === "group" ? (content as unknown as Record<string, Record<string, unknown>>)[f.key] : (content as unknown as Record<string, unknown>)) ?? {}}
                    onChange={(v) =>
                      setContent((c) =>
                        c ? ({ ...c, [f.key]: f.type === "group" ? v : (v as Record<string, unknown>)[f.key] } as SiteContent) : c
                      )
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <Settings content={content} onImport={setContent} notify={notify} />
          )}
        </main>
      </div>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 animate-fade-up rounded-xl border px-4 py-3 text-sm shadow-xl ${
            toast.kind === "ok"
              ? "border-pass-500/30 bg-white text-ink-900 dark:bg-ink-900 dark:text-ink-100"
              : "border-red-500/30 bg-white text-red-600 dark:bg-ink-900 dark:text-red-400"
          }`}
        >
          <span className="mr-2">{toast.kind === "ok" ? "✓" : "!"}</span>
          {toast.text}
        </div>
      )}
    </div>
  );
}

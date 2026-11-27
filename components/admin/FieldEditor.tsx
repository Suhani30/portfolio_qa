"use client";

import { useState } from "react";
import type { Field } from "./schema";

type Obj = Record<string, unknown>;

const inputCls =
  "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-pass-500 focus:outline-none focus:ring-4 focus:ring-pass-500/10 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-100";

const iconBtn =
  "grid h-7 w-7 place-items-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-ink-800 dark:hover:text-white";

function Label({ field, htmlFor }: { field: Field; htmlFor?: string }) {
  return (
    <div className="mb-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-700 dark:text-ink-300">
        {field.label}
      </label>
      {field.help && <p className="mt-0.5 text-xs text-ink-500">{field.help}</p>}
    </div>
  );
}

function isWide(f: Field) {
  return f.type === "group" || f.type === "list" || ("wide" in f && f.wide) || f.type === "boolean";
}

/* ---------- tag input ---------- */
function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  return (
    <div className={`${inputCls} flex min-h-[42px] flex-wrap items-center gap-1.5 py-1.5`}>
      {value.map((t, i) => (
        <span key={`${t}-${i}`} className="inline-flex items-center gap-1 rounded-md bg-pass-500/10 px-2 py-0.5 text-xs font-medium text-pass-700 dark:text-pass-300">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={add}
        placeholder={value.length ? "" : "Type and press Enter"}
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none"
      />
    </div>
  );
}

/* ---------- multi-line string list ---------- */
function LinesInput({ value, onChange, label }: { value: string[]; onChange: (v: string[]) => void; label: string }) {
  const set = (i: number, v: string) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [it] = next.splice(i, 1);
    next.splice(i + d, 0, it);
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((line, i) => (
        <div key={i} className="group flex items-start gap-2">
          <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-[11px] text-ink-400">{i + 1}</span>
          <textarea
            value={line}
            rows={line.length > 90 ? 3 : 1}
            onChange={(e) => set(i, e.target.value)}
            className={`${inputCls} resize-y`}
            aria-label={`${label} ${i + 1}`}
          />
          <div className="mt-1.5 flex shrink-0 opacity-60 transition group-hover:opacity-100">
            <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className={iconBtn} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className={`${iconBtn} hover:!text-red-500`} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove">×</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="ml-7 rounded-md border border-dashed border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-500 transition hover:border-pass-500 hover:text-pass-600 dark:border-ink-700"
      >
        + Add line
      </button>
    </div>
  );
}

/* ---------- toggle ---------- */
function Toggle({ value, onChange, label, help }: { value: boolean; onChange: (v: boolean) => void; label: string; help?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-ink-200 bg-white px-4 py-3 text-left transition hover:border-ink-300 dark:border-ink-800 dark:bg-ink-950 dark:hover:border-ink-700"
      role="switch"
      aria-checked={value}
    >
      <span>
        <span className="block text-sm font-medium text-ink-800 dark:text-ink-200">{label}</span>
        {help && <span className="mt-0.5 block text-xs text-ink-500">{help}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-pass-500" : "bg-ink-200 dark:bg-ink-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/* ---------- repeatable list ---------- */
function ListEditor({ field, value, onChange, depth }: { field: Extract<Field, { type: "list" }>; value: Obj[]; onChange: (v: Obj[]) => void; depth: number }) {
  const [open, setOpen] = useState<number | null>(null);

  const update = (i: number, item: Obj) => onChange(value.map((x, j) => (j === i ? item : x)));
  const move = (i: number, d: number) => {
    const next = [...value];
    const [it] = next.splice(i, 1);
    next.splice(i + d, 0, it);
    onChange(next);
    if (open === i) setOpen(i + d);
  };
  const duplicate = (i: number) => {
    const copy = JSON.parse(JSON.stringify(value[i])) as Obj;
    if (typeof copy.id === "string") copy.id = `${copy.id}-copy`;
    const next = [...value];
    next.splice(i + 1, 0, copy);
    onChange(next);
  };
  const remove = (i: number) => {
    const name = String(value[i][field.titleKey] ?? field.itemLabel);
    if (!window.confirm(`Delete “${name}”?`)) return;
    onChange(value.filter((_, j) => j !== i));
    setOpen(null);
  };
  const add = () => {
    onChange([...value, field.newItem()]);
    setOpen(value.length);
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-ink-200 px-4 py-6 text-center text-sm text-ink-500 dark:border-ink-800">
          No {field.itemLabel}s yet.
        </p>
      )}
      {value.map((item, i) => {
        const isOpen = open === i;
        const title = String(item[field.titleKey] || `Untitled ${field.itemLabel}`);
        const subtitle = field.subtitleKey ? String(item[field.subtitleKey] ?? "") : "";
        return (
          <div
            key={i}
            className={`overflow-hidden rounded-xl border transition-colors ${
              isOpen ? "border-pass-500/40 bg-white dark:bg-ink-900" : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/50 dark:hover:border-ink-700"
            }`}
          >
            <div className="flex items-center gap-2 px-3 py-2">
              <button type="button" onClick={() => setOpen(isOpen ? null : i)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left">
                <span className={`text-xs text-ink-400 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink-900 dark:text-ink-100">
                    {title}
                    {item.featured === true && <span className="ml-2 rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400">Featured</span>}
                    {item.visible === false && <span className="ml-2 rounded bg-ink-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-500">Hidden</span>}
                  </span>
                  {subtitle && <span className="block truncate text-xs text-ink-500">{subtitle}</span>}
                </span>
              </button>
              <div className="flex shrink-0 items-center">
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" title="Move up">↑</button>
                <button type="button" className={iconBtn} disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label="Move down" title="Move down">↓</button>
                <button type="button" className={iconBtn} onClick={() => duplicate(i)} aria-label="Duplicate" title="Duplicate">⧉</button>
                <button type="button" className={`${iconBtn} hover:!text-red-500`} onClick={() => remove(i)} aria-label="Delete" title="Delete">🗑</button>
              </div>
            </div>
            {isOpen && (
              <div className="border-t border-ink-100 p-4 dark:border-ink-800">
                <FieldGrid fields={field.fields} value={item} onChange={(v) => update(i, v)} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ink-300 py-3 text-sm font-medium text-ink-500 transition hover:border-pass-500 hover:bg-pass-500/5 hover:text-pass-600 dark:border-ink-700 dark:hover:text-pass-400"
      >
        + Add {field.itemLabel}
      </button>
    </div>
  );
}

/* ---------- single field ---------- */
export function FieldInput({ field, value, onChange, depth }: { field: Field; value: unknown; onChange: (v: unknown) => void; depth: number }) {
  const id = `f-${field.key}-${depth}`;
  switch (field.type) {
    case "text":
    case "url":
    case "email":
      return (
        <div>
          <Label field={field} htmlFor={id} />
          <input
            id={id}
            type={field.type === "text" ? "text" : field.type}
            value={String(value ?? "")}
            placeholder={field.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </div>
      );
    case "textarea":
      return (
        <div>
          <Label field={field} htmlFor={id} />
          <textarea id={id} rows={3} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={`${inputCls} resize-y leading-relaxed`} />
        </div>
      );
    case "number": {
      const n = Number(value ?? 0);
      const clamp = (x: number) => Math.max(field.min ?? -Infinity, Math.min(field.max ?? Infinity, x));
      const stepBtn =
        "grid h-[42px] w-11 shrink-0 place-items-center text-lg font-medium text-ink-600 transition hover:bg-pass-500/10 hover:text-pass-600 disabled:opacity-30 disabled:hover:bg-transparent dark:text-ink-300 dark:hover:text-pass-400";
      return (
        <div>
          <Label field={field} htmlFor={id} />
          <div className="flex w-full max-w-[220px] overflow-hidden rounded-lg border border-ink-200 bg-white focus-within:border-pass-500 focus-within:ring-4 focus-within:ring-pass-500/10 dark:border-ink-800 dark:bg-ink-950">
            <button type="button" aria-label={`Decrease ${field.label}`} className={stepBtn} disabled={field.min !== undefined && n <= field.min} onClick={() => onChange(clamp(n - 1))}>
              −
            </button>
            <input
              id={id}
              type="number"
              min={field.min}
              max={field.max}
              value={n}
              onChange={(e) => onChange(clamp(Number(e.target.value)))}
              className="w-full min-w-0 border-x border-ink-200 bg-transparent text-center font-mono text-sm text-ink-900 outline-none [appearance:textfield] dark:border-ink-800 dark:text-ink-100 [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button type="button" aria-label={`Increase ${field.label}`} className={stepBtn} disabled={field.max !== undefined && n >= field.max} onClick={() => onChange(clamp(n + 1))}>
              +
            </button>
          </div>
        </div>
      );
    }
    case "boolean":
      return <Toggle value={Boolean(value)} onChange={onChange} label={field.label} help={field.help} />;
    case "tags":
      return (
        <div>
          <Label field={field} />
          <TagInput value={(value as string[]) ?? []} onChange={onChange} />
        </div>
      );
    case "lines":
      return (
        <div>
          <Label field={field} />
          <LinesInput value={(value as string[]) ?? []} onChange={onChange} label={field.label} />
        </div>
      );
    case "group":
      return (
        <fieldset className={depth === 0 ? "" : "rounded-xl border border-ink-200 p-4 dark:border-ink-800"}>
          {depth > 0 && <legend className="px-1 text-[13px] font-medium text-ink-700 dark:text-ink-300">{field.label}</legend>}
          <FieldGrid fields={field.fields} value={(value as Obj) ?? {}} onChange={onChange} depth={depth + 1} />
        </fieldset>
      );
    case "list":
      return (
        <div>
          <Label field={field} />
          <ListEditor field={field} value={(value as Obj[]) ?? []} onChange={onChange} depth={depth} />
        </div>
      );
  }
}

export function FieldGrid({ fields, value, onChange, depth = 0 }: { fields: Field[]; value: Obj; onChange: (v: Obj) => void; depth?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={isWide(f) ? "sm:col-span-2" : ""}>
          <FieldInput field={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} depth={depth} />
        </div>
      ))}
    </div>
  );
}

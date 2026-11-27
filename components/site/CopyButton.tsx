"use client";

import { useState } from "react";
import { Check, Copy } from "./Icons";

export default function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="btn border border-white/15 font-mono text-xs text-ink-200 hover:border-white/30 hover:text-white focus-visible:ring-offset-ink-950"
    >
      {copied ? <Check className="h-4 w-4 text-pass-400" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copied" : value}
    </button>
  );
}

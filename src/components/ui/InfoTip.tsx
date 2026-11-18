"use client";
import { useId, useState } from "react";
import { Icon } from "./Icon";

/**
 * Accessible definition tooltip: a real button that shows its text on hover,
 * keyboard focus or click, and is announced via aria-describedby.
 */
export function InfoTip({ text, label = "Definition" }: { text: string; label?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`${label}: more information`}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-ink-muted hover:text-ink"
      >
        <Icon name="info" className="h-4 w-4" />
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-2xl bg-night p-3 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-night-text shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}

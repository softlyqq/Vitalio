"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Текстова мітка для скрінрідерів, якщо `label` — не рядок. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  className?: string;
}

/** Сегментований перемикач (radiogroup) із миттєвим відгуком. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-sunken p-1", className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-all duration-150",
              selected
                ? "bg-surface text-ink shadow-card ring-1 ring-line"
                : "text-muted hover:text-ink",
            )}
          >
            <span className="relative z-10 flex items-center gap-1.5">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

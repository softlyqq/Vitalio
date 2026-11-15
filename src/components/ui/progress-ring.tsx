"use client";

import type { ReactNode } from "react";

interface ProgressRingProps {
  /** Частка від 0 до 1. */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** CSS-колір доріжки заповнення (змінна токена). */
  color?: string;
  label: string;
  children?: ReactNode;
}

export function ProgressRing({
  progress,
  size = 220,
  strokeWidth = 18,
  color = "var(--brand)",
  label,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));
  const dashOffset = circumference * (1 - clamped);

  return (
    <div
      role="img"
      aria-label={label}
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-sunken)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{
            opacity: clamped > 0 ? 1 : 0,
            transition: "stroke-dashoffset 280ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms ease",
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

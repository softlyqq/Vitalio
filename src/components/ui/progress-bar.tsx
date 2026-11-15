"use client";

interface ProgressBarProps {
  progress: number;
  color: string;
  label: string;
  valueText: string;
  height?: number;
}

export function ProgressBar({ progress, color, label, valueText, height = 10 }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuetext={valueText}
      className="w-full overflow-hidden rounded-full bg-sunken"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-250 ease-out"
        style={{ background: color, width: `${clamped * 100}%` }}
      />
    </div>
  );
}

import { cn } from "@/lib/cn";

/** Знак Vitalio: кільце прогресу з «листком» — одночасно метафора калорійного кільця та балансу. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-9 shrink-0", className)}
      fill="none"
    >
      <rect width="40" height="40" rx="12" fill="var(--brand-strong)" />
      <circle cx="20" cy="20" r="10" stroke="var(--on-brand)" strokeOpacity="0.28" strokeWidth="3.5" />
      <path
        d="M20 10a10 10 0 0 1 8.66 5"
        stroke="var(--on-brand)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path d="M17 24.5c0-4.2 2.6-6.6 7-7 0 4.4-2.4 7-7 7Z" fill="var(--on-brand)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-lg font-bold tracking-tight text-ink">Vitalio</span>
    </span>
  );
}

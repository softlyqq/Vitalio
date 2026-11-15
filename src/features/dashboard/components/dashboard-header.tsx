"use client";

import { Sparkles, UserPlus } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useDateFormatters } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import type { ISODate } from "@/types/domain";

interface DashboardHeaderProps {
  name: string;
  date: ISODate;
}

function greetingKey(hour: number): "morning" | "day" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "day";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

export function DashboardHeader({ name, date }: DashboardHeaderProps) {
  const t = useT();
  const format = useDateFormatters();
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const openWelcomeModal = useUiStore((state) => state.openWelcomeModal);
  const authEmail = useUiStore((state) => state.authEmail);
  const greeting = t.greeting[greetingKey(new Date().getHours())];

  const isGuest = !authEmail && (!name || name === "Користувач" || name === "Дмитро");
  const headline = isGuest ? `${greeting}! Вітаємо у Vitalio` : `${greeting}, ${name}`;

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark className="md:hidden" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted">{format.full(date)}</p>
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {headline}
          </h1>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={openWelcomeModal}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
          title="Огляд можливостей Vitalio"
        >
          <Sparkles className="size-4 text-brand-strong" aria-hidden="true" />
          <span className="hidden sm:inline">Прев&apos;ю</span>
        </button>

        {!authEmail ? (
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-3.5 text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
          >
            <UserPlus className="size-4 text-brand-strong" aria-hidden="true" />
            <span className="hidden sm:inline">Реєстрація / Вхід</span>
            <span className="sm:hidden">Увійти</span>
          </button>
        ) : null}
        <ThemeToggle />
      </div>
    </header>
  );
}

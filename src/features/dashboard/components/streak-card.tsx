"use client";

import { Flame } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { useDateFormatters } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { addDays, dateRange } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { DaySummary, ISODate } from "@/types/domain";

interface StreakCardProps {
  streak: number;
  today: ISODate;
  summaries: readonly DaySummary[];
  className?: string;
}

export function StreakCard({ streak, today, summaries, className }: StreakCardProps) {
  const t = useT();
  const format = useDateFormatters();
  const logged = new Set(summaries.filter((s) => s.entriesCount > 0).map((s) => s.date));
  const week = dateRange(addDays(today, -6), today);

  return (
    <Card aria-labelledby="streak-title" className={className}>
      <CardHeader
        title={t.dashboard.streak.title}
        titleId="streak-title"
        icon={<Flame className="size-4 text-fat" aria-hidden="true" />}
      />
      <p className="flex items-baseline gap-1.5 leading-none">
        <span className="text-3xl font-bold tracking-tight">
          <AnimatedNumber value={streak} />
        </span>
        <span className="text-sm font-medium text-muted">{t.dashboard.streak.dayWord(streak)}</span>
      </p>
      <p className="mt-2 text-xs text-muted">
        {streak > 0 ? t.dashboard.streak.hintActive : t.dashboard.streak.hintEmpty}
      </p>

      <ul aria-label={t.dashboard.streak.weekLabel} className="mt-4 grid grid-cols-7 gap-1">
        {week.map((date) => {
          const hasEntries = logged.has(date);
          return (
            <li
              key={date}
              aria-label={`${format.weekdayShort(date)}: ${hasEntries ? t.dashboard.streak.logged : t.dashboard.streak.missed}`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-[1.375rem] place-items-center rounded-full",
                  hasEntries ? "bg-fat text-bg" : "bg-sunken",
                )}
              >
                {hasEntries ? <Flame className="size-3" strokeWidth={2.6} /> : null}
              </span>
              <span aria-hidden="true" className="text-[0.6875rem] font-medium text-muted">
                {format.weekdayNarrow(date)}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

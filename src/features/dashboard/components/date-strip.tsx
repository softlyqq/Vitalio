"use client";

import { useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useDateFormatters } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { addDays, dateRange } from "@/lib/date";
import { cn } from "@/lib/cn";
import type { DaySummary, ISODate } from "@/types/domain";

interface DateStripProps {
  today: ISODate;
  selected: ISODate;
  summaries: readonly DaySummary[];
  onSelect: (date: ISODate) => void;
}

const DAYS_BACK = 27;
const DAYS_AHEAD = 3;

/** Горизонтальний календар: свайп/скрол, snap до дня, крапка = є записи. */
export function DateStrip({ today, selected, summaries, onSelect }: DateStripProps) {
  const t = useT();
  const format = useDateFormatters();
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const didInitialCenter = useRef(false);

  const days = useMemo(() => dateRange(addDays(today, -DAYS_BACK), addDays(today, DAYS_AHEAD)), [today]);
  const logged = useMemo(
    () => new Set(summaries.filter((summary) => summary.entriesCount > 0).map((summary) => summary.date)),
    [summaries],
  );

  useEffect(() => {
    const list = listRef.current;
    const btn = selectedRef.current;
    if (!list || !btn) return;
    const targetLeft = btn.offsetLeft - list.clientWidth / 2 + btn.clientWidth / 2;
    if (!didInitialCenter.current) {
      didInitialCenter.current = true;
      list.scrollLeft = Math.max(0, targetLeft);
    }
  }, [selected]);

  return (
    <section aria-label={t.dashboard.calendar.label} className="-mx-4 md:mx-0">
      <div className="mb-2 flex items-center justify-between px-4 md:px-0">
        <p className="text-sm font-semibold text-muted">{format.monthYear(selected)}</p>
        <Button
          variant="soft"
          size="sm"
          onClick={() => onSelect(today)}
          className={cn("h-8", selected === today && "invisible")}
          aria-hidden={selected === today}
          tabIndex={selected === today ? -1 : 0}
        >
          {t.common.today}
        </Button>
      </div>

      <ul
        ref={listRef}
        className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 md:px-0"
      >
        {days.map((date) => {
          const isSelected = date === selected;
          const isToday = date === today;
          const hasEntries = logged.has(date);
          const label = `${t.dashboard.calendar.selectDay(format.full(date))}${hasEntries ? `, ${t.dashboard.calendar.hasEntries}` : ""}`;
          return (
            <li key={date} className="snap-center">
              <button
                ref={isSelected ? selectedRef : undefined}
                type="button"
                onClick={() => onSelect(date)}
                aria-label={label}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex h-[4.75rem] w-[3.25rem] flex-col items-center justify-center gap-1 rounded-[1.25rem] text-sm font-semibold transition-colors",
                  isSelected
                    ? "bg-brand-strong text-on-brand"
                    : cn("bg-surface text-ink ring-1 ring-line hover:bg-raised", isToday && "ring-2 ring-brand-strong"),
                )}
              >
                <span className={cn("text-xs font-medium", isSelected ? "opacity-85" : "text-muted")}>
                  {format.weekdayShort(date)}
                </span>
                <span className="text-lg leading-none tabular-nums">{format.dayNumber(date)}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    hasEntries ? (isSelected ? "bg-on-brand" : "bg-brand") : "bg-transparent",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

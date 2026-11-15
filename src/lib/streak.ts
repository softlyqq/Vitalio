import { addDays } from "@/lib/date";
import type { DaySummary, ISODate } from "@/types/domain";

/**
 * Серія — кількість днів поспіль із хоча б одним записом їжі.
 * Якщо сьогодні записів ще немає, серія не вважається перерваною (день не закінчився) —
 * рахуємо від учора.
 */
export function computeStreak(summaries: readonly DaySummary[], today: ISODate): number {
  const logged = new Set(summaries.filter((s) => s.entriesCount > 0).map((s) => s.date));
  let cursor = logged.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (logged.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

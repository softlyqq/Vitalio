import type { ISODate } from "@/types/domain";

const pad = (n: number): string => String(n).padStart(2, "0");

/** Локальна дата → `YYYY-MM-DD` (без зсувів через UTC). */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → Date о 12:00 локального часу (захист від переходу на літній час). */
export function fromISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

export function todayISO(): ISODate {
  return toISODate(new Date());
}

export function addDays(iso: ISODate, days: number): ISODate {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Послідовність дат від `from` до `to` включно. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const result: ISODate[] = [];
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    result.push(cursor);
  }
  return result;
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);
}

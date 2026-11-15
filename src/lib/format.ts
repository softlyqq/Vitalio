import type { ISODate } from "@/types/domain";
import { fromISODate } from "@/lib/date";

const capitalize = (value: string): string => value.charAt(0).toLocaleUpperCase() + value.slice(1);

/** Форматери дат для заданої локалі (BCP-47). */
export function createDateFormatters(intlTag: string) {
  const full = new Intl.DateTimeFormat(intlTag, { weekday: "long", day: "numeric", month: "long" });
  const weekdayShort = new Intl.DateTimeFormat(intlTag, { weekday: "short" });
  const weekdayNarrow = new Intl.DateTimeFormat(intlTag, { weekday: "narrow" });
  const monthYear = new Intl.DateTimeFormat(intlTag, { month: "long", year: "numeric" });
  const dayNumber = new Intl.DateTimeFormat(intlTag, { day: "numeric" });

  return {
    full: (iso: ISODate) => capitalize(full.format(fromISODate(iso))),
    weekdayShort: (iso: ISODate) => capitalize(weekdayShort.format(fromISODate(iso))),
    weekdayNarrow: (iso: ISODate) => capitalize(weekdayNarrow.format(fromISODate(iso))),
    monthYear: (iso: ISODate) => capitalize(monthYear.format(fromISODate(iso))),
    dayNumber: (iso: ISODate) => dayNumber.format(fromISODate(iso)),
  };
}

export type DateFormatters = ReturnType<typeof createDateFormatters>;

/** Форматування чисел із групуванням розрядів (1 240). */
export function createNumberFormatter(intlTag: string, fractionDigits = 0) {
  return new Intl.NumberFormat(intlTag, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

import { describe, expect, it } from "vitest";
import { computeStreak } from "@/lib/streak";
import { addDays } from "@/lib/date";
import type { DaySummary } from "@/types/domain";

const TODAY = "2026-11-14";

const day = (offset: number, entriesCount: number): DaySummary => ({
  date: addDays(TODAY, offset),
  kcal: entriesCount * 100,
  protein: entriesCount * 8,
  fat: entriesCount * 4,
  carbs: entriesCount * 10,
  entriesCount,
  waterMl: 0,
  burnedKcal: 0,
});

describe("computeStreak", () => {
  it("рахує дні поспіль разом із сьогодні", () => {
    expect(computeStreak([day(0, 2), day(-1, 3), day(-2, 1), day(-4, 5)], TODAY)).toBe(3);
  });

  it("не переривається, якщо сьогодні ще немає записів", () => {
    expect(computeStreak([day(0, 0), day(-1, 2), day(-2, 2)], TODAY)).toBe(2);
  });

  it("обривається на пропуску", () => {
    expect(computeStreak([day(-1, 0), day(-2, 4)], TODAY)).toBe(0);
  });

  it("порожній список — нуль", () => {
    expect(computeStreak([], TODAY)).toBe(0);
  });
});

describe("addDays", () => {
  it("коректно переходить через межу місяця та року", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

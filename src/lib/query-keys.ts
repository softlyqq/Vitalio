import type { ISODate } from "@/types/domain";

/** Єдине джерело ключів TanStack Query — інвалідація без рядкових «магічних» значень. */
export const queryKeys = {
  day: (date: ISODate) => ["diary", "day", date] as const,
  allDays: () => ["diary", "day"] as const,
  summaries: (from: ISODate, to: ISODate) => ["diary", "summaries", from, to] as const,
  allSummaries: () => ["diary", "summaries"] as const,
  profile: () => ["profile"] as const,
  planTier: () => ["profile", "plan"] as const,
  fasting: () => ["profile", "fasting"] as const,
  weights: (from: ISODate, to: ISODate) => ["profile", "weights", from, to] as const,
  allWeights: () => ["profile", "weights"] as const,
  foodSearch: (query: string) => ["foods", "search", query] as const,
  foodPopular: () => ["foods", "popular"] as const,
  foodCombos: () => ["foods", "combos"] as const,
  allFoods: () => ["foods"] as const,
};

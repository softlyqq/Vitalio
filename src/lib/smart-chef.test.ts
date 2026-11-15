import { describe, expect, it } from "vitest";
import {
  analyzeDayIntake,
  computeAdaptiveTdee,
  evaluateCaffeineStatus,
  recommendMealsForRemainingMacros,
  recommendSmartMeals,
  recommendTopUpFoods,
} from "@/lib/smart-chef";

describe("smart-chef domain logic", () => {
  it("recommends 3 scaled meals matching remaining macro budget", () => {
    const suggestions = recommendMealsForRemainingMacros({
      kcal: 450,
      protein: 40,
      fat: 15,
      carbs: 35,
    });
    expect(suggestions).toHaveLength(3);
    for (const suggestion of suggestions) {
      expect(suggestion.items.length).toBeGreaterThan(0);
      expect(suggestion.total.kcal).toBeGreaterThan(150);
      expect(suggestion.total.protein).toBeGreaterThan(10);
      expect(suggestion.matchScore).toBeGreaterThanOrEqual(75);
    }
  });

  it("diagnoses high-fat / low-protein imbalance from eaten entries", () => {
    const diagnosis = analyzeDayIntake(
      [
        {
          id: "e1",
          date: "2026-11-15",
          meal: "breakfast",
          foodId: "avocado",
          name: "Авокадо",
          grams: 140,
          nutrition: { kcal: 224, protein: 3, fat: 21, carbs: 12 },
          createdAt: "2026-11-15T08:00:00Z",
        },
      ],
      { kcal: 2100, protein: 150, fat: 65, carbs: 220, waterMl: 2500, bmr: 1750, tdee: 2400 },
      { kcal: 950, protein: 35, fat: 54, carbs: 80 },
      0,
    );

    expect(diagnosis.status).toBe("high-fat-need-protein");
    expect(diagnosis.eatenNames).toContain("Авокадо");
  });

  it("builds custom fridge recommendation when user specifies ingredients", () => {
    const suggestions = recommendSmartMeals({
      remaining: { kcal: 520, protein: 45, fat: 14, carbs: 55 },
      preference: "sweet",
      customPrompt: "гречка та курка",
    });

    expect(suggestions[0]?.id).toContain("custom-fridge");
    expect(suggestions[0]?.items.some((i) => i.foodId === "buckwheat-cooked")).toBe(true);
  });

  it("recommends 3 single-food macro top-ups avoiding already eaten foods and adapting to filter", () => {
    const remaining = { kcal: 600, protein: 45, fat: 18, carbs: 60 };
    const topUpsAuto = recommendTopUpFoods(remaining, new Set(["chicken-breast"]), "auto", 0);
    const topUpsSweet = recommendTopUpFoods(remaining, new Set(), "sweet", 0);

    expect(topUpsAuto).toHaveLength(3);
    expect(topUpsAuto[0]?.food.id).not.toBe("chicken-breast");
    expect(topUpsSweet[0]?.food.id).not.toBe(topUpsAuto[0]?.food.id);
  });

  it("returns completely distinct meal sets for each preference mode", () => {
    const remaining = { kcal: 800, protein: 60, fat: 25, carbs: 85 };
    const autoMeals = recommendSmartMeals({ remaining, preference: "auto" }).map((m) => m.id);
    const sweetMeals = recommendSmartMeals({ remaining, preference: "sweet" }).map((m) => m.id);
    const quickMeals = recommendSmartMeals({ remaining, preference: "quick" }).map((m) => m.id);
    const hotMeals = recommendSmartMeals({ remaining, preference: "hot" }).map((m) => m.id);

    expect(sweetMeals.some((id) => autoMeals.includes(id))).toBe(false);
    expect(quickMeals.some((id) => hotMeals.includes(id))).toBe(false);
  });

  it("uses raw/dry weight standards for meat and grains", () => {
    const meals = recommendSmartMeals({
      remaining: { kcal: 600, protein: 45, fat: 16, carbs: 60 },
      preference: "auto",
    });
    const chickenBuckwheat = meals.find((m) => m.id.startsWith("auto-chicken-buckwheat"));
    expect(chickenBuckwheat).toBeDefined();

    const buckwheatItem = chickenBuckwheat?.items.find((i) => i.foodId === "buckwheat-cooked");
    // Суха гречка в одній порції не перевищує 95 г
    expect(buckwheatItem?.grams).toBeLessThanOrEqual(95);
    expect(buckwheatItem?.name).toContain("суха");
  });

  it("computes adaptive TDEE from empirical weight and calorie logs", () => {
    const summaries = Array.from({ length: 14 }, (_, idx) => ({
      date: `2026-11-${String(idx + 1).padStart(2, "0")}`,
      kcal: 2100,
      protein: 140,
      fat: 70,
      carbs: 220,
      entriesCount: 4,
      waterMl: 2200,
      burnedKcal: 250,
    }));
    const weights = [
      { date: "2026-11-01", weightKg: 79.0 },
      { date: "2026-11-14", weightKg: 78.3 },
    ];

    const result = computeAdaptiveTdee(summaries, weights, 2400, 1950);
    expect(result.adaptiveTdee).toBeGreaterThan(2100);
    expect(result.recommendedGoalKcal).toBeGreaterThan(1500);
  });

  it("evaluates caffeine status and bedtime residual", () => {
    expect(evaluateCaffeineStatus(0).sleepSafety).toBe("optimal");
    expect(evaluateCaffeineStatus(140).sleepSafety).toBe("optimal");
    expect(evaluateCaffeineStatus(280).sleepSafety).toBe("moderate");
    expect(evaluateCaffeineStatus(420).sleepSafety).toBe("warning");
  });
});

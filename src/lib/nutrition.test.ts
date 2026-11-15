import { describe, expect, it } from "vitest";
import {
  calculateBmr,
  calculateTargets,
  nutritionForGrams,
  progressRatio,
  remainingKcal,
  sumNutrition,
} from "@/lib/nutrition";
import type { UserProfile } from "@/types/domain";

const male: UserProfile = {
  name: "Тест",
  sex: "male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: "moderate",
  goal: "maintain",
};

describe("calculateBmr (Mifflin–St Jeor)", () => {
  it("рахує BMR чоловіка", () => {
    expect(calculateBmr(male)).toBe(1780);
  });

  it("рахує BMR жінки", () => {
    expect(calculateBmr({ sex: "female", age: 28, heightCm: 168, weightKg: 65 })).toBe(1399);
  });
});

describe("calculateTargets", () => {
  it("підтримка: TDEE = BMR × коефіцієнт активності", () => {
    const targets = calculateTargets(male);
    expect(targets.tdee).toBe(Math.round(1780 * 1.55));
    expect(targets.kcal).toBe(targets.tdee);
  });

  it("схуднення: дефіцит 20% та більше білка", () => {
    const lose = calculateTargets({ ...male, goal: "lose" });
    const keep = calculateTargets(male);
    expect(lose.kcal).toBe(Math.round(1780 * 1.55 * 0.8));
    expect(lose.protein).toBeGreaterThan(keep.protein);
  });

  it("макроси сходяться з калоріями у межах округлення", () => {
    const t = calculateTargets(male);
    const fromMacros = t.protein * 4 + t.fat * 9 + t.carbs * 4;
    expect(Math.abs(fromMacros - t.kcal)).toBeLessThanOrEqual(8);
  });

  it("не опускається нижче безпечного мінімуму", () => {
    const tiny = calculateTargets({
      ...male,
      sex: "female",
      weightKg: 42,
      heightCm: 150,
      age: 60,
      activity: "sedentary",
      goal: "lose",
    });
    expect(tiny.kcal).toBe(1200);
  });

  it("норма води округлена до 50 мл", () => {
    expect(calculateTargets(male).waterMl).toBe(2650);
  });
});

describe("nutritionForGrams / sumNutrition", () => {
  const food = { per100g: { kcal: 155, protein: 12.6, fat: 10.6, carbs: 1.1 } };

  it("масштабує на вагу порції", () => {
    expect(nutritionForGrams(food, 100)).toEqual(food.per100g);
    expect(nutritionForGrams(food, 50)).toEqual({ kcal: 78, protein: 6.3, fat: 5.3, carbs: 0.6 });
  });

  it("не повертає від'ємних значень", () => {
    expect(nutritionForGrams(food, -20).kcal).toBe(0);
  });

  it("сумує порожній список як нуль", () => {
    expect(sumNutrition([])).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });
});

describe("remainingKcal / progressRatio", () => {
  it("враховує спалені калорії", () => {
    expect(remainingKcal(2000, 1500, 300)).toBe(800);
    expect(remainingKcal(2000, 2500, 0)).toBe(-500);
  });

  it("обмежує прогрес діапазоном 0..1", () => {
    expect(progressRatio(150, 100)).toBe(1);
    expect(progressRatio(-5, 100)).toBe(0);
    expect(progressRatio(10, 0)).toBe(0);
  });
});

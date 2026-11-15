import type {
  ActivityLevel,
  DailyTargets,
  Food,
  GoalType,
  Macros,
  Nutrition,
  Sex,
  UserProfile,
} from "@/types/domain";

/** Енергія макронутрієнтів, ккал/г (фактори Atwater). */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;

export const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  extreme: 1.9,
};

/** Корекція добової норми залежно від цілі (частка від TDEE). */
export const GOAL_ADJUSTMENT: Record<GoalType, number> = {
  lose: -0.2,
  maintain: 0,
  gain: 0.1,
};

/** Цільове споживання білка, г на кг маси тіла. */
const PROTEIN_PER_KG: Record<GoalType, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
};

const MIN_FAT_PER_KG = 0.8;
const MIN_FAT_SHARE = 0.27;
const WATER_ML_PER_KG = 33;

/** Мінімальна безпечна добова норма (ккал) для дорослих. */
const SAFE_MIN_KCAL: Record<Sex, number> = { male: 1500, female: 1200 };

/** Базальний метаболізм за формулою Міффліна — Сан Жеора, ккал/добу. */
export function calculateBmr(input: Pick<UserProfile, "sex" | "weightKg" | "heightCm" | "age">): number {
  const { sex, weightKg, heightCm, age } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Повна добова норма та розподіл БЖВ для профілю користувача. */
export function calculateTargets(profile: UserProfile): DailyTargets {
  const bmr = calculateBmr(profile);
  const tdee = bmr * ACTIVITY_FACTOR[profile.activity];
  const adjusted = tdee * (1 + GOAL_ADJUSTMENT[profile.goal]);
  const kcal = Math.round(Math.max(adjusted, SAFE_MIN_KCAL[profile.sex]));

  const protein = Math.round(profile.weightKg * PROTEIN_PER_KG[profile.goal]);
  const fat = Math.round(
    Math.max(profile.weightKg * MIN_FAT_PER_KG, (kcal * MIN_FAT_SHARE) / KCAL_PER_GRAM.fat),
  );
  const remainingKcal = kcal - protein * KCAL_PER_GRAM.protein - fat * KCAL_PER_GRAM.fat;
  const carbs = Math.max(0, Math.round(remainingKcal / KCAL_PER_GRAM.carbs));

  return {
    kcal,
    protein,
    fat,
    carbs,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    waterMl: Math.round((profile.weightKg * WATER_ML_PER_KG) / 50) * 50,
  };
}

export const EMPTY_NUTRITION: Nutrition = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

export const roundMacro = (value: number): number => Math.round(value * 10) / 10;
const round1 = roundMacro;

/** Нутрієнти для заданої ваги порції продукту. */
export function nutritionForGrams(food: Pick<Food, "per100g">, grams: number): Nutrition {
  const ratio = Math.max(0, grams) / 100;
  return {
    kcal: Math.round(food.per100g.kcal * ratio),
    protein: round1(food.per100g.protein * ratio),
    fat: round1(food.per100g.fat * ratio),
    carbs: round1(food.per100g.carbs * ratio),
  };
}

export function sumNutrition(items: readonly Nutrition[]): Nutrition {
  const total = items.reduce<Nutrition>(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs,
    }),
    EMPTY_NUTRITION,
  );
  return {
    kcal: Math.round(total.kcal),
    protein: round1(total.protein),
    fat: round1(total.fat),
    carbs: round1(total.carbs),
  };
}

/** Калорії, що залишилися: норма + спалене − спожите (може бути від'ємним). */
export function remainingKcal(target: number, eaten: number, burned: number): number {
  return Math.round(target + burned - eaten);
}

/** Частка виконання від 0 до 1 (безпечна для нульової цілі). */
export function progressRatio(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(1, Math.max(0, value / goal));
}

export const MACRO_KEYS: readonly (keyof Macros)[] = ["protein", "fat", "carbs"];

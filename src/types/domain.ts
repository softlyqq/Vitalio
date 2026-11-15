/**
 * Доменні типи Vitalio. Не залежать від UI чи сховища —
 * ті самі типи використовують і LocalStorage-репозиторії, і Supabase-реалізація.
 */

/** Календарна дата без часового поясу у форматі `YYYY-MM-DD`. */
export type ISODate = string;

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "high" | "extreme";
export type GoalType = "lose" | "maintain" | "gain";
export type PlanTier = "free" | "pro";

export interface Macros {
  /** Білки, г */
  protein: number;
  /** Жири, г */
  fat: number;
  /** Вуглеводи, г */
  carbs: number;
}

export interface Nutrition extends Macros {
  /** Енергія, ккал */
  kcal: number;
}

export interface Serving {
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  /** Поживна цінність на 100 г продукту. */
  per100g: Nutrition;
  servings: readonly Serving[];
  barcode?: string;
  isCustom?: boolean;
}

export type FoodCategory =
  | "grains"
  | "protein"
  | "dairy"
  | "fruit"
  | "vegetables"
  | "fats"
  | "sweets"
  | "dishes"
  | "drinks"
  | "nuts";

export interface FoodEntry {
  id: string;
  date: ISODate;
  meal: MealType;
  foodId: string;
  name: string;
  grams: number;
  /** Знімок нутрієнтів на момент додавання — історія не змінюється при редагуванні бази. */
  nutrition: Nutrition;
  createdAt: string;
}

export interface NewFoodEntry {
  date: ISODate;
  meal: MealType;
  food: Food;
  grams: number;
}

export interface DayLog {
  date: ISODate;
  entries: FoodEntry[];
  waterMl: number;
  burnedKcal: number;
  /** Спожитий кофеїн за день, мг. */
  caffeineMg?: number;
}

export const FASTING_PROTOCOLS = ["14:10", "16:8", "18:6", "20:4"] as const;
export type FastingProtocol = (typeof FASTING_PROTOCOLS)[number];

export interface FastingState {
  active: boolean;
  protocol: FastingProtocol;
  /** ISO-час початку голодування, якщо таймер активний. */
  startedAt: string | null;
  /** Історія завершених сесій голодування (кількість успішних циклів). */
  completedSessions: number;
}

export interface MealComboItem {
  foodId: string;
  name: string;
  grams: number;
  nutrition: Nutrition;
}

export interface MealCombo {
  id: string;
  title: string;
  subtitle: string;
  defaultMeal: MealType;
  items: readonly MealComboItem[];
  total: Nutrition;
  isCustom?: boolean;
}

export interface UserProfile {
  name: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activity: ActivityLevel;
  goal: GoalType;
}

export interface DailyTargets extends Nutrition {
  waterMl: number;
  bmr: number;
  tdee: number;
}

export interface DaySummary extends Nutrition {
  date: ISODate;
  entriesCount: number;
  waterMl: number;
  burnedKcal: number;
}

export interface WeightEntry {
  date: ISODate;
  weightKg: number;
  note?: string;
}

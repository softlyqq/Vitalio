import { z } from "zod";
import { FASTING_PROTOCOLS, MEAL_TYPES } from "@/types/domain";

const nutritionSchema = z.object({
  kcal: z.number(),
  protein: z.number(),
  fat: z.number(),
  carbs: z.number(),
});

export const foodEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  meal: z.enum(MEAL_TYPES),
  foodId: z.string(),
  name: z.string(),
  grams: z.number().positive(),
  nutrition: nutritionSchema,
  createdAt: z.string(),
});

export const dayLogSchema = z.object({
  date: z.string(),
  entries: z.array(foodEntrySchema),
  waterMl: z.number().min(0),
  burnedKcal: z.number().min(0),
  caffeineMg: z.number().min(0).optional(),
});

export const diaryStoreSchema = z.object({
  version: z.literal(1),
  days: z.record(z.string(), dayLogSchema),
});

export type DiaryStoreData = z.infer<typeof diaryStoreSchema>;

export const profileSchema = z.object({
  name: z.string(),
  sex: z.enum(["male", "female"]),
  age: z.number(),
  heightCm: z.number(),
  weightKg: z.number(),
  targetWeightKg: z.number().optional(),
  activity: z.enum(["sedentary", "light", "moderate", "high", "extreme"]),
  goal: z.enum(["lose", "maintain", "gain"]),
});

export const planTierSchema = z.enum(["free", "pro"]);

export const weightEntrySchema = z.object({
  date: z.string(),
  weightKg: z.number().min(20).max(400),
  note: z.string().optional(),
});

export const weightStoreSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), weightEntrySchema),
});

export type WeightStoreData = z.infer<typeof weightStoreSchema>;

const foodCategorySchema = z.enum([
  "grains",
  "protein",
  "dairy",
  "fruit",
  "vegetables",
  "fats",
  "sweets",
  "dishes",
  "drinks",
  "nuts",
]);

export const customFoodSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: foodCategorySchema,
  per100g: nutritionSchema,
  servings: z.array(z.object({ label: z.string(), grams: z.number().positive() })),
  barcode: z.string().optional(),
  isCustom: z.boolean().optional(),
});

export const customFoodsStoreSchema = z.array(customFoodSchema);

export const fastingStateSchema = z.object({
  active: z.boolean(),
  protocol: z.enum(FASTING_PROTOCOLS),
  startedAt: z.string().nullable(),
  completedSessions: z.number().min(0),
});

export const mealComboItemSchema = z.object({
  foodId: z.string(),
  name: z.string(),
  grams: z.number().positive(),
  nutrition: nutritionSchema,
});

export const mealComboSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  defaultMeal: z.enum(MEAL_TYPES),
  items: z.array(mealComboItemSchema),
  total: nutritionSchema,
  isCustom: z.boolean().optional(),
});

export const mealCombosStoreSchema = z.array(mealComboSchema);

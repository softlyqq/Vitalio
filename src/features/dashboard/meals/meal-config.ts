import { Apple, Coffee, Moon, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { MealType } from "@/types/domain";

export interface MealConfig {
  type: MealType;
  icon: LucideIcon;
  /** Рекомендована частка добової норми калорій. */
  share: number;
  /** Токен кольору плитки-іконки. */
  tint: string;
}

export const MEAL_CONFIG: readonly MealConfig[] = [
  { type: "breakfast", icon: Coffee, share: 0.25, tint: "bg-fat-soft text-fat" },
  { type: "lunch", icon: UtensilsCrossed, share: 0.35, tint: "bg-brand-soft text-brand-strong" },
  { type: "dinner", icon: Moon, share: 0.3, tint: "bg-protein-soft text-protein" },
  { type: "snack", icon: Apple, share: 0.1, tint: "bg-carbs-soft text-carbs" },
];

/** Прийом їжі за замовчуванням залежно від години доби. */
export function defaultMealForHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 21) return "dinner";
  return "snack";
}

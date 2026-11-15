"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { MEAL_CONFIG } from "@/features/dashboard/meals/meal-config";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { sumNutrition } from "@/lib/nutrition";
import { useUiStore } from "@/stores/ui-store";
import type { FoodEntry, MealType } from "@/types/domain";

interface MealsCardProps {
  entries: readonly FoodEntry[];
  dailyGoalKcal: number;
  onAdd: (meal: MealType) => void;
  onRemove?: (entry: FoodEntry) => void;
  className?: string;
}

/**
 * Компактний «Пульс прийомів їжі» для Головної вкладки (2×2 Bento-сітка):
 * показує прогрес калорій і БЖВ кожного прийому їжі без громіздких списків
 * та веде у «Щоденник» для детального редагування грамовок.
 */
export function MealsCard({ entries, dailyGoalKcal, onAdd, className }: MealsCardProps) {
  const t = useT();
  const openDiaryTab = useUiStore((state) => state.openDiaryTab);

  return (
    <Card aria-labelledby="meals-title" className={className}>
      <CardHeader
        title="Пульс прийомів їжі"
        titleId="meals-title"
        action={
          <button
            type="button"
            onClick={() => openDiaryTab("meals")}
            className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong transition-opacity hover:opacity-90"
          >
            <span>Грамовки у Щоденнику</span>
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MEAL_CONFIG.map((config) => {
          const Icon = config.icon;
          const mealName = t.meals[config.type];
          const mealEntries = entries.filter((entry) => entry.meal === config.type);
          const total = sumNutrition(mealEntries.map((entry) => entry.nutrition));
          const recommendedKcal = Math.max(100, Math.round((dailyGoalKcal * config.share) / 10) * 10);
          const fillPct = Math.min(100, Math.round((total.kcal / recommendedKcal) * 100));
          const previewText =
            mealEntries.length > 0
              ? mealEntries.map((entry) => entry.name.replace(/\s*\([^)]*\)/g, "")).join(" · ")
              : "Ще не заповнено";

          return (
            <div
              key={config.type}
              className="flex flex-col justify-between gap-3 rounded-2xl bg-sunken p-3.5 ring-1 ring-line transition-colors hover:bg-raised/60"
            >
              <div className="flex items-start justify-between gap-2.5">
                <button
                  type="button"
                  onClick={() => openDiaryTab("meals")}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", config.tint)}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-bold text-ink">{mealName}</p>
                      {total.protein >= 28 ? (
                        <span
                          title="Досягнуто лейциновий поріг синтезу білка (≥28 г білка за прийом)"
                          className="rounded-full bg-protein-soft px-1.5 py-0.5 text-[10px] font-bold text-protein"
                        >
                          💪 MPS 30г+
                        </span>
                      ) : mealEntries.length > 0 ? (
                        <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-bold text-muted">
                          {mealEntries.length} поз.
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">{previewText}</p>
                  </div>
                </button>

                <Button
                  variant="soft"
                  size="icon-sm"
                  onClick={() => onAdd(config.type)}
                  aria-label={t.dashboard.meals.addTo(mealName)}
                >
                  <Plus className="size-4" strokeWidth={2.6} aria-hidden="true" />
                </Button>
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-bold tabular-nums text-ink">
                    {total.kcal}{" "}
                    <span className="font-normal text-muted">/ {recommendedKcal} ккал</span>
                  </span>
                  <span className="text-[11px] font-medium tabular-nums text-muted">
                    <span className="text-protein">Б {total.protein}</span> ·{" "}
                    <span className="text-fat">Ж {total.fat}</span> ·{" "}
                    <span className="text-carbs">В {total.carbs}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div
                    style={{ width: `${fillPct}%` }}
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      total.kcal > recommendedKcal * 1.15 ? "bg-fat" : "bg-brand-strong",
                    )}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

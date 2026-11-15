"use client";

import { Plus } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { EntryRow } from "@/features/dashboard/meals/entry-row";
import type { MealConfig } from "@/features/dashboard/meals/meal-config";
import { useNumberFormatter } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { sumNutrition } from "@/lib/nutrition";
import type { FoodEntry } from "@/types/domain";

interface MealSectionProps {
  config: MealConfig;
  entries: readonly FoodEntry[];
  dailyGoalKcal: number;
  onAdd: () => void;
  onRemove: (entry: FoodEntry) => void;
}

export function MealSection({ config, entries, dailyGoalKcal, onAdd, onRemove }: MealSectionProps) {
  const t = useT();
  const formatNumber = useNumberFormatter();
  const Icon = config.icon;
  const mealName = t.meals[config.type];
  const total = sumNutrition(entries.map((entry) => entry.nutrition));
  const recommended = Math.round((dailyGoalKcal * config.share) / 10) * 10;
  const recommendedText = t.dashboard.meals.recommended(formatNumber.format(recommended));
  const headingId = `meal-${config.type}`;

  return (
    <section aria-labelledby={headingId} className="rounded-3xl bg-sunken p-3 sm:p-4">
      <header className="flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", config.tint)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="text-base font-bold">
            {mealName}
          </h3>
          <p className="text-xs text-muted">
            {entries.length > 0 ? (
              <>
                <span className="font-semibold text-ink">
                  <AnimatedNumber value={total.kcal} />
                </span>{" "}
                {t.common.kcal} · {recommendedText}
              </>
            ) : (
              recommendedText
            )}
          </p>
        </div>
        <Button
          variant="soft"
          size="icon"
          onClick={onAdd}
          aria-label={t.dashboard.meals.addTo(mealName)}
          className="bg-surface ring-1 ring-line"
        >
          <Plus className="size-5" strokeWidth={2.4} aria-hidden="true" />
        </Button>
      </header>

      {entries.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-2">
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onRemove={onRemove} />
          ))}
        </ul>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="mt-2 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-left text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t.dashboard.meals.addTo(mealName)}
        </button>
      )}
    </section>
  );
}

"use client";

import { Layers, ScanBarcode, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { defaultMealForHour } from "@/features/dashboard/meals/meal-config";
import { CombosPanel } from "@/features/food-log/combos-panel";
import { AiScannerPanel, BarcodePanel } from "@/features/food-log/locked-method-panels";
import { FoodDetailPanel } from "@/features/food-log/food-detail-panel";
import { FoodSearchPanel } from "@/features/food-log/food-search-panel";
import { useToday } from "@/hooks/use-app-data";
import {
  useAddComboEntries,
  useAddEntriesBatch,
  useAddEntry,
  useAddQuickCalories,
} from "@/hooks/use-diary";
import { useT } from "@/i18n";
import { todayISO } from "@/lib/date";
import { useUiStore, type AddFoodMethod } from "@/stores/ui-store";
import { MEAL_TYPES, type Food, type MealComboItem, type MealType } from "@/types/domain";

type Method = AddFoodMethod;

/** Глобальний Bottom Sheet додавання їжі: відкривається з центральної «+» або з конкретного прийому. */
export function AddFoodSheet() {
  const t = useT();
  const { open, meal, initialMethod } = useUiStore((state) => state.addFoodSheet);
  const close = useUiStore((state) => state.closeAddFood);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && close()}
      title={t.addFood.title}
      description={t.addFood.description}
    >
      <AddFoodContent initialMeal={meal} initialMethod={initialMethod ?? "search"} onDone={close} />
    </BottomSheet>
  );
}

function AddFoodContent({
  initialMeal,
  initialMethod,
  onDone,
}: {
  initialMeal: MealType | null;
  initialMethod: Method;
  onDone: () => void;
}) {
  const t = useT();
  const today = useToday();
  const selectedDate = useUiStore((state) => state.selectedDate);
  const pushToast = useUiStore((state) => state.pushToast);
  const addEntry = useAddEntry();
  const addBatch = useAddEntriesBatch();
  const addCombo = useAddComboEntries();
  const addQuick = useAddQuickCalories();

  const [meal, setMeal] = useState<MealType>(() => initialMeal ?? defaultMealForHour(new Date().getHours()));
  const [method, setMethod] = useState<Method>(initialMethod);
  const [food, setFood] = useState<Food | null>(null);

  const mealOptions: readonly SegmentOption<MealType>[] = MEAL_TYPES.map((type) => ({
    value: type,
    label: t.meals[type],
  }));

  const methodOptions: readonly SegmentOption<Method>[] = [
    {
      value: "search",
      label: (
        <>
          <Search className="size-4" aria-hidden="true" />
          {t.addFood.methods.search}
        </>
      ),
    },
    {
      value: "combos",
      label: (
        <>
          <Layers className="size-4" aria-hidden="true" />
          Сети
        </>
      ),
    },
    {
      value: "barcode",
      label: (
        <>
          <ScanBarcode className="size-4" aria-hidden="true" />
          {t.addFood.methods.barcode}
        </>
      ),
    },
    {
      value: "ai",
      label: (
        <>
          <Sparkles className="size-4" aria-hidden="true" />
          {t.addFood.methods.ai}
        </>
      ),
    },
  ];

  const targetDate = selectedDate ?? today ?? todayISO();

  const handleSubmit = (grams: number) => {
    if (!food) return;
    addEntry.mutate(
      { date: targetDate, meal, food, grams },
      {
        onSuccess: () => {
          pushToast(t.addFood.detail.added(food.name, t.meals[meal]));
          onDone();
        },
      },
    );
  };

  const handleBatchSubmit = (items: readonly { food: Food; grams: number }[]) => {
    if (items.length === 0) return;
    addBatch.mutate(
      { date: targetDate, meal, items },
      {
        onSuccess: () => {
          pushToast(`Додано ${items.length} поз. у «${t.meals[meal]}»`);
          onDone();
        },
      },
    );
  };

  const handleComboSubmit = (comboTitle: string, items: readonly MealComboItem[]) => {
    if (items.length === 0) return;
    addCombo.mutate(
      { date: targetDate, meal, items },
      {
        onSuccess: () => {
          pushToast(`Сет «${comboTitle}» додано у «${t.meals[meal]}»`);
          onDone();
        },
      },
    );
  };

  const handleQuickCaloriesSubmit = (title: string, kcal: number) => {
    addQuick.mutate(
      { date: targetDate, meal, title, kcal },
      {
        onSuccess: () => {
          pushToast(`«${title}» (+${kcal} ккал) додано у «${t.meals[meal]}»`);
          onDone();
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 pt-1">
      <div className="flex flex-col gap-2">
        <p className="px-1 text-sm font-semibold text-muted">{t.addFood.mealLabel}</p>
        <SegmentedControl value={meal} onChange={setMeal} options={mealOptions} label={t.addFood.mealLabel} />
      </div>

      {food ? (
        <FoodDetailPanel
          key={food.id}
          food={food}
          meal={meal}
          submitting={addEntry.isPending}
          onBack={() => setFood(null)}
          onSubmit={handleSubmit}
        />
      ) : (
        <>
          <SegmentedControl value={method} onChange={setMethod} options={methodOptions} label={t.addFood.title} />
          {method === "search" ? <FoodSearchPanel onSelect={setFood} /> : null}
          {method === "combos" ? (
            <CombosPanel
              meal={meal}
              submitting={addCombo.isPending || addQuick.isPending}
              onAddCombo={handleComboSubmit}
              onAddQuickCalories={handleQuickCaloriesSubmit}
            />
          ) : null}
          {method === "barcode" ? <BarcodePanel onSelectFood={setFood} /> : null}
          {method === "ai" ? (
            <AiScannerPanel meal={meal} submitting={addBatch.isPending} onAddBatch={handleBatchSubmit} />
          ) : null}
        </>
      )}
    </div>
  );
}

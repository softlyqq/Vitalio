"use client";

import { Layers, Plus, Trash2, Zap } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMealCombos, useRemoveMealCombo } from "@/hooks/use-app-data";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/ui-store";
import type { MealCombo, MealComboItem, MealType } from "@/types/domain";

interface CombosPanelProps {
  meal: MealType;
  submitting: boolean;
  onAddCombo: (comboTitle: string, items: readonly MealComboItem[]) => void;
  onAddQuickCalories: (title: string, kcal: number) => void;
}

const QUICK_CALORIE_PRESETS = [
  { title: "Кава з молоком / капучино", kcal: 110 },
  { title: "Швидкий перекус", kcal: 200 },
  { title: "Страва в кафе / ланч", kcal: 450 },
  { title: "Вечеря в ресторані", kcal: 650 },
] as const;

export function CombosPanel({
  meal,
  submitting,
  onAddCombo,
  onAddQuickCalories,
}: CombosPanelProps) {
  const t = useT();
  const pushToast = useUiStore((state) => state.pushToast);
  const { data: combos = [] } = useMealCombos();
  const removeCombo = useRemoveMealCombo();

  const [quickTitle, setQuickTitle] = useState("");
  const [quickKcal, setQuickKcal] = useState("300");

  const handleCustomQuickSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedKcal = Math.min(5000, Math.max(10, Number(quickKcal) || 0));
    if (!parsedKcal) return;
    onAddQuickCalories(quickTitle.trim() || "Експрес-запис калорій", parsedKcal);
  };

  const handleDeleteCombo = (combo: MealCombo) => {
    removeCombo.mutate(combo.id, {
      onSuccess: () => pushToast(`Сет «${combo.title}» видалено`),
    });
  };

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Секція 1: Експрес-калорії без пошуку продукту */}
      <div className="flex flex-col gap-3 rounded-3xl bg-sunken p-4 ring-1 ring-line">
        <div className="flex items-center gap-2">
          <Zap className="size-4 text-brand-strong" aria-hidden="true" />
          <h3 className="text-sm font-bold text-ink">
            Експрес-калорії (коли відомий лише калораж)
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {QUICK_CALORIE_PRESETS.map((preset) => (
            <button
              key={preset.title}
              type="button"
              disabled={submitting}
              onClick={() => onAddQuickCalories(preset.title, preset.kcal)}
              className="flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2.5 text-left text-xs ring-1 ring-line transition-colors hover:bg-raised"
            >
              <span className="truncate font-semibold text-ink">{preset.title}</span>
              <span className="shrink-0 font-bold text-brand-strong tabular-nums">
                +{preset.kcal}
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomQuickSubmit} className="flex flex-wrap gap-2 pt-1">
          <input
            type="text"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            placeholder="Назва (напр. Десерт у кав'ярні)"
            aria-label="Назва швидкого запису"
            className="h-10 min-w-[10rem] flex-1 rounded-xl bg-surface px-3 text-xs font-medium text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
          />
          <input
            type="number"
            min={10}
            max={5000}
            value={quickKcal}
            onChange={(event) => setQuickKcal(event.target.value)}
            placeholder="Ккал"
            aria-label="Кількість калорій"
            className="h-10 w-24 rounded-xl bg-surface px-3 text-xs font-bold text-ink tabular-nums outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
          />
          <Button type="submit" variant="soft" size="sm" className="h-10" disabled={submitting}>
            + Додати
          </Button>
        </form>
      </div>

      {/* Секція 2: Збережені комбо-сети (1-click meal logging) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-brand-strong" aria-hidden="true" />
            <h3 className="text-sm font-bold text-ink">Готові комбо та збережені сети</h3>
          </div>
          <span className="text-xs text-muted">{combos.length} наборів</span>
        </div>

        <ul className="flex flex-col gap-2.5">
          {combos.map((combo) => (
            <li
              key={combo.id}
              className="flex flex-col gap-2.5 rounded-3xl bg-sunken p-4 ring-1 ring-line"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate text-base font-bold text-ink">{combo.title}</h4>
                    {combo.isCustom ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand-strong">
                        Мій сет
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted">{combo.subtitle}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-ink tabular-nums ring-1 ring-line">
                    {combo.total.kcal} ккал
                  </span>
                  {combo.isCustom ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteCombo(combo)}
                      aria-label={`Видалити сет ${combo.title}`}
                      className="grid size-8 place-items-center rounded-full text-subtle hover:bg-surface hover:text-danger"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {combo.items.map((item, idx) => (
                  <span
                    key={`${item.foodId}-${idx}`}
                    className="rounded-xl bg-surface px-2.5 py-1 text-xs font-medium text-ink ring-1 ring-line"
                  >
                    {item.name} · <span className="text-muted">{item.grams}г</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-line pt-2.5">
                <p className="text-xs font-semibold">
                  <span className="text-protein">Б {combo.total.protein}г</span> ·{" "}
                  <span className="text-fat">Ж {combo.total.fat}г</span> ·{" "}
                  <span className="text-carbs">В {combo.total.carbs}г</span>
                </p>

                <Button
                  variant="soft"
                  size="sm"
                  disabled={submitting}
                  onClick={() => onAddCombo(combo.title, combo.items)}
                >
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  Додати в «{t.meals[meal]}»
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

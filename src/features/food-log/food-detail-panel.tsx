"use client";

import { ArrowLeft, Flame, Minus, Plus, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { nutritionForGrams } from "@/lib/nutrition";
import type { Food, MealType } from "@/types/domain";

interface FoodDetailPanelProps {
  food: Food;
  meal: MealType;
  submitting: boolean;
  onBack: () => void;
  onSubmit: (grams: number) => void;
}

const MIN_GRAMS = 1;
const MAX_GRAMS = 5000;
const SLIDER_MAX = 600;
const STEP = 10;
const QUICK_GRAMS = [50, 100, 150, 200] as const;

interface CookingConversionMeta {
  /** Скільки грамів готової страви виходить з 1 г сирої/сухої ваги (напр. 3.0 для гречки, 0.75 для м'яса). */
  cookedPerRawRatio: number;
  rawLabel: string;
  cookedLabel: string;
  hint: string;
}

function getCookingConversion(food: Food): CookingConversionMeta | null {
  const id = food.id;
  if (id === "tuna-canned" || id === "bread-rye" || id === "bread-whole" || id === "muesli") {
    return null;
  }
  if (id === "oatmeal-water") {
    return {
      cookedPerRawRatio: 3.2,
      rawLabel: "Сухі пластівці",
      cookedLabel: "Готова каша на тарілці",
      hint: "Суха вівсянка вбирає воду у ~3.2 раза (60 г сухих ≈ 190 г готової каші)",
    };
  }
  if (
    food.category === "grains" ||
    id === "lentils" ||
    id === "chickpeas" ||
    id === "pasta-cooked"
  ) {
    const ratio = id === "pasta-cooked" ? 2.4 : 2.9;
    return {
      cookedPerRawRatio: ratio,
      rawLabel: "Суха вага (крупа/паста)",
      cookedLabel: "Варена страва на тарілці",
      hint: `Під час варіння вага збільшується у ×${ratio} раза (70 г сухого ≈ ${Math.round(70 * ratio)} г готового)`,
    };
  }
  if (food.category === "protein" && id !== "egg-boiled" && id !== "egg-whites" && id !== "omelette") {
    return {
      cookedPerRawRatio: 0.75,
      rawLabel: "Сира вага (до плити)",
      cookedLabel: "Готове м'ясо / риба на тарілці",
      hint: "Під час запікання/смаження м'ясо та риба втрачають ~25% вологи (150 г готового = 200 г сирого)",
    };
  }
  if (id === "potato-boiled" || id === "sweet-potato-raw" || id === "broccoli-cooked") {
    return {
      cookedPerRawRatio: 0.85,
      rawLabel: "Сира вага",
      cookedLabel: "Запечене / варене",
      hint: "Після термічної обробки овочі/бульби важать ~85% від початкової сирої ваги",
    };
  }
  return null;
}

function parseGrams(text: string): number | null {
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value < MIN_GRAMS || value > MAX_GRAMS) return null;
  return Math.round(value * 10) / 10;
}

export function FoodDetailPanel({ food, meal, submitting, onBack, onSubmit }: FoodDetailPanelProps) {
  const t = useT();
  const conversion = useMemo(() => getCookingConversion(food), [food]);
  const [weighMode, setWeighMode] = useState<"raw" | "cooked">("raw");

  const initialGrams = food.servings[0]?.grams ?? 100;
  const [text, setText] = useState(String(initialGrams));
  const inputGrams = parseGrams(text);

  /** Фактична вага у сирому/сухому вигляді, яка піде в розрахунок КБЖУ та збережеться в щоденник. */
  const effectiveRawGrams = useMemo(() => {
    if (inputGrams === null) return null;
    if (weighMode === "cooked" && conversion) {
      return Math.max(5, Math.round(inputGrams / conversion.cookedPerRawRatio));
    }
    return Math.round(inputGrams);
  }, [inputGrams, weighMode, conversion]);

  const nutrition = useMemo(
    () => nutritionForGrams(food, effectiveRawGrams ?? 0),
    [food, effectiveRawGrams],
  );

  const setGrams = (value: number) =>
    setText(String(Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, Math.round(value)))));

  const handleSwitchMode = (nextMode: "raw" | "cooked") => {
    if (nextMode === weighMode || !conversion) return;
    if (inputGrams !== null) {
      const converted =
        nextMode === "cooked"
          ? Math.round(inputGrams * conversion.cookedPerRawRatio)
          : Math.round(inputGrams / conversion.cookedPerRawRatio);
      setText(String(Math.max(5, converted)));
    }
    setWeighMode(nextMode);
  };

  const quick = [
    ...food.servings.map((serving) => ({
      label: `${serving.label} · ${serving.grams} ${t.common.gram}`,
      grams: serving.grams,
    })),
    ...QUICK_GRAMS.filter((value) => !food.servings.some((s) => s.grams === value)).map((value) => ({
      label: `${value} ${t.common.gram}`,
      grams: value,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-3 mb-1">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t.addFood.detail.back}
        </Button>
        <h3 className="text-2xl font-bold tracking-tight">{food.name}</h3>
        <p className="text-sm text-muted">
          {t.foodCategories[food.category]} ·{" "}
          <span className="font-semibold text-brand-strong">
            КБЖУ на сиру / суху вагу до готування
          </span>
        </p>
      </div>

      {/* Перемикач Конвертера «Сира/суха вага ↔ Готова страва на тарілці» */}
      {conversion ? (
        <div className="rounded-2xl bg-sunken p-2.5 ring-1 ring-line">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleSwitchMode("raw")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                weighMode === "raw"
                  ? "bg-surface text-brand-strong shadow-xs ring-1 ring-line"
                  : "text-muted hover:text-ink",
              )}
            >
              <Scale className="size-3.5" aria-hidden="true" />
              <span>{conversion.rawLabel}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode("cooked")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                weighMode === "cooked"
                  ? "bg-brand-strong text-on-brand shadow-xs"
                  : "text-muted hover:text-ink",
              )}
            >
              <Flame className="size-3.5" aria-hidden="true" />
              <span>{conversion.cookedLabel}</span>
            </button>
          </div>

          {weighMode === "cooked" && inputGrams !== null && effectiveRawGrams !== null ? (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-brand-soft px-3 py-2 text-xs">
              <span className="font-medium text-ink">
                На тарілці готового: <strong>{inputGrams} г</strong>
              </span>
              <span className="font-bold text-brand-strong">
                = {effectiveRawGrams} г сирого/сухого у щоденник
              </span>
            </div>
          ) : (
            <p className="mt-1.5 px-1 text-[11px] text-muted">{conversion.hint}</p>
          )}
        </div>
      ) : null}

      <div className="rounded-3xl bg-sunken p-5" aria-live="polite">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-muted">{t.addFood.detail.total}</p>
          {effectiveRawGrams !== null ? (
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-brand-strong ring-1 ring-line">
              Розрахунок на {effectiveRawGrams} г сирої/сухої ваги
            </span>
          ) : null}
        </div>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-bold leading-none tracking-tight">
            <AnimatedNumber value={nutrition.kcal} />
          </span>
          <span className="text-base font-medium text-muted">{t.common.kcal}</span>
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {(
            [
              ["protein", "var(--protein)"],
              ["fat", "var(--fat)"],
              ["carbs", "var(--carbs)"],
            ] as const
          ).map(([key, color]) => (
            <div key={key} className="rounded-2xl bg-surface px-3 py-2.5 ring-1 ring-line">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
                {t.dashboard.macros[key]}
              </dt>
              <dd className="mt-0.5 text-lg font-bold tabular-nums">
                <AnimatedNumber value={nutrition[key]} fractionDigits={1} />
                <span className="ml-0.5 text-xs font-medium text-muted">{t.common.gram}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <label htmlFor="grams" className="text-sm font-semibold text-muted">
          {weighMode === "cooked" && conversion
            ? `Вага готової страви на тарілці (${t.common.gram})`
            : t.addFood.detail.amount}
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setGrams((inputGrams ?? 0) - STEP)}
            aria-label={`−${STEP} ${t.common.gram}`}
          >
            <Minus className="size-4" aria-hidden="true" />
          </Button>
          <div className="relative flex-1">
            <input
              id="grams"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={text}
              onChange={(event) => setText(event.target.value.replace(/[^\d.,]/g, ""))}
              aria-invalid={inputGrams === null}
              className={cn(
                "h-14 w-full rounded-2xl bg-sunken pr-16 text-center text-2xl font-bold tabular-nums outline-none ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-strong",
                inputGrams === null && "ring-2 ring-danger",
              )}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
              {t.common.gram}
            </span>
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setGrams((inputGrams ?? 0) + STEP)}
            aria-label={`+${STEP} ${t.common.gram}`}
          >
            <Plus className="size-4" aria-hidden="true" />
          </Button>
        </div>
        <input
          type="range"
          min={5}
          max={SLIDER_MAX}
          step={5}
          value={Math.min(SLIDER_MAX, Math.max(5, inputGrams ?? 5))}
          onChange={(event) => setGrams(Number(event.target.value))}
          aria-label={t.addFood.detail.amount}
          className="h-8 w-full cursor-pointer accent-[var(--brand-strong)]"
        />
        {weighMode === "raw" ? (
          <div
            role="group"
            aria-label={t.addFood.detail.servings}
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar sm:-mx-6 sm:px-6"
          >
            {quick.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => setGrams(option.grams)}
                aria-pressed={inputGrams === option.grams}
                className={cn(
                  "h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors",
                  inputGrams === option.grams
                    ? "bg-brand-strong text-on-brand"
                    : "bg-sunken text-ink hover:bg-raised",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <Button
        size="lg"
        className="w-full"
        disabled={effectiveRawGrams === null || submitting}
        onClick={() => effectiveRawGrams !== null && onSubmit(effectiveRawGrams)}
      >
        {t.addFood.detail.submit(t.meals[meal], nutrition.kcal)}
        {weighMode === "cooked" && effectiveRawGrams !== null
          ? ` (${effectiveRawGrams} г сирого)`
          : ""}
      </Button>
    </div>
  );
}

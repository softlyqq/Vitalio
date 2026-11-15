"use client";

import {
  ChefHat,
  KeyRound,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { defaultMealForHour } from "@/features/dashboard/meals/meal-config";
import { useAddComboEntries, useAddEntry } from "@/hooks/use-diary";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import {
  analyzeDayIntake,
  askGeminiNutritionist,
  recommendSmartMeals,
  recommendTopUpFoods,
  type ChefPreference,
  type MacroTopUpItem,
  type SmartRecipeSuggestion,
} from "@/lib/smart-chef";
import { useUiStore } from "@/stores/ui-store";
import type {
  DailyTargets,
  FoodEntry,
  GoalType,
  ISODate,
  MealType,
  Nutrition,
} from "@/types/domain";

const GEMINI_KEY_STORAGE = "vitalio:gemini-key:v1";

const PREFERENCE_TABS: readonly { value: ChefPreference; label: string }[] = [
  { value: "auto", label: "⚡ Авто-баланс" },
  { value: "quick", label: "⏱️ Без плити (2 хв)" },
  { value: "protein", label: "💪 Чистий білок" },
  { value: "sweet", label: "🍓 Хочу солодке" },
  { value: "hot", label: "🍲 Гаряча страва" },
];

interface SmartChefCardProps {
  date: ISODate;
  remaining: Nutrition;
  entries?: readonly FoodEntry[];
  targets?: DailyTargets;
  consumed?: Nutrition;
  burnedKcal?: number;
  goal?: GoalType;
  defaultMeal?: MealType;
  className?: string;
}

export function SmartChefCard({
  date,
  remaining,
  entries = [],
  targets,
  consumed,
  burnedKcal = 0,
  goal = "maintain",
  defaultMeal,
  className,
}: SmartChefCardProps) {
  const t = useT();
  const pushToast = useUiStore((state) => state.pushToast);
  const addCombo = useAddComboEntries();
  const addEntry = useAddEntry();

  const [preference, setPreference] = useState<ChefPreference>("auto");
  const [variantOffset, setVariantOffset] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return (
      window.localStorage.getItem(GEMINI_KEY_STORAGE) ??
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ??
      ""
    );
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<SmartRecipeSuggestion[] | null>(null);

  const effectiveTargets: DailyTargets = useMemo(
    () =>
      targets ?? {
        kcal: Math.max(1800, remaining.kcal),
        protein: Math.max(120, remaining.protein),
        fat: Math.max(65, remaining.fat),
        carbs: Math.max(200, remaining.carbs),
        waterMl: 2200,
        bmr: 1650,
        tdee: 2200,
      },
    [targets, remaining],
  );

  const effectiveConsumed: Nutrition = useMemo(
    () =>
      consumed ?? {
        kcal: Math.max(0, effectiveTargets.kcal - remaining.kcal),
        protein: Math.max(0, effectiveTargets.protein - remaining.protein),
        fat: Math.max(0, effectiveTargets.fat - remaining.fat),
        carbs: Math.max(0, effectiveTargets.carbs - remaining.carbs),
      },
    [consumed, effectiveTargets, remaining],
  );

  const diagnosis = useMemo(
    () => analyzeDayIntake(entries, effectiveTargets, effectiveConsumed, burnedKcal),
    [entries, effectiveTargets, effectiveConsumed, burnedKcal],
  );

  const eatenIds = useMemo(() => new Set(entries.map((e) => e.foodId)), [entries]);

  const topUps = useMemo(
    () => recommendTopUpFoods(remaining, eatenIds, preference, variantOffset),
    [remaining, eatenIds, preference, variantOffset],
  );

  const localSuggestions = useMemo(
    () =>
      recommendSmartMeals({
        remaining,
        entries,
        preference,
        variantOffset,
        customPrompt: submittedPrompt,
      }),
    [remaining, entries, preference, variantOffset, submittedPrompt],
  );

  const displayedSuggestions = aiSuggestions ?? localSuggestions;

  const targetMeal: MealType =
    defaultMeal ?? defaultMealForHour(new Date().getHours());

  const handleAddRecipe = (recipe: SmartRecipeSuggestion) => {
    addCombo.mutate(
      { date, meal: targetMeal, items: recipe.items },
      {
        onSuccess: () => {
          pushToast(
            `«${recipe.title}» (${recipe.total.kcal} ккал) додано у «${t.meals[targetMeal]}»`,
          );
        },
      },
    );
  };

  const handleAddTopUp = (item: MacroTopUpItem) => {
    addEntry.mutate(
      { date, meal: targetMeal, food: item.food, grams: item.grams },
      {
        onSuccess: () => {
          pushToast(
            `«${item.food.name}» (${item.grams}г · ${item.nutrition.kcal} ккал) додано у «${t.meals[targetMeal]}»`,
          );
        },
      },
    );
  };

  const handleSaveApiKey = (value: string) => {
    setApiKey(value);
    if (typeof window !== "undefined") {
      if (value.trim()) {
        window.localStorage.setItem(GEMINI_KEY_STORAGE, value.trim());
      } else {
        window.localStorage.removeItem(GEMINI_KEY_STORAGE);
      }
    }
  };

  const handleAskCoach = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = customPrompt.trim();
    setSubmittedPrompt(query);

    if (!apiKey.trim()) {
      setAiSuggestions(null);
      setAiAdvice(null);
      pushToast(
        query
          ? "Математичний AI-оптимізатор перерахував грамовки під ваші продукти!"
          : "Оновлено рекомендації під залишок КБЖУ",
      );
      return;
    }

    setAiLoading(true);
    try {
      const response = await askGeminiNutritionist({
        apiKey,
        entries,
        remaining,
        goal,
        userPrompt: query,
      });
      setAiAdvice(response.advice);
      setAiSuggestions(response.suggestions);
      pushToast("Gemini AI сформував персональний раціон!");
    } catch {
      setAiSuggestions(null);
      pushToast("Використано локальний КБЖУ-оптимізатор (перевірте ключ Gemini API)");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card className={cn("flex flex-col gap-4", className)} aria-labelledby="smart-chef-title">
      <CardHeader
        title="AI КБЖУ-Коуч: чим якісно добрати норму"
        titleId="smart-chef-title"
        icon={<ChefHat className="size-4 text-brand-strong" aria-hidden="true" />}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAiSuggestions(null);
                setVariantOffset((prev) => prev + 1);
              }}
              className="inline-flex items-center gap-1 rounded-full bg-sunken px-3 py-1 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-raised"
            >
              <RefreshCw className="size-3.5 text-brand-strong" aria-hidden="true" />
              Інші варіанти
            </button>
            <button
              type="button"
              onClick={() => setApiKeyOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 transition-colors",
                apiKey.trim()
                  ? "bg-brand-soft text-brand-strong ring-brand/30"
                  : "bg-sunken text-muted ring-line hover:text-ink",
              )}
            >
              <KeyRound className="size-3.5" aria-hidden="true" />
              {apiKey.trim() ? "Gemini AI активний" : "Підключити Gemini API"}
            </button>
          </div>
        }
      />

      {/* Налаштування API ключа Gemini (опціонально) */}
      {apiKeyOpen ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3.5 ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-ink">
              Ключ Google Gemini API (gemini-2.5-flash) — безкоштовно в Google AI Studio
            </p>
            <button
              type="button"
              onClick={() => setApiKeyOpen(false)}
              className="text-xs font-semibold text-brand-strong hover:underline"
            >
              Готово
            </button>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => handleSaveApiKey(event.target.value)}
            placeholder="AIzaSy... (необов'язково: без ключа працює вбудований математичний солвер)"
            className="h-10 rounded-xl bg-surface px-3 text-xs font-medium text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
          />
        </div>
      ) : null}

      {/* Діагностика раціону на основі того, що вже з'їдено */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl bg-brand-soft/75 p-4 ring-1 ring-brand/25 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-brand-strong" aria-hidden="true" />
            <p className="text-sm font-bold text-ink">{diagnosis.headline}</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {aiAdvice ?? diagnosis.detail}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-1.5 text-xs font-bold tabular-nums">
          <span className="rounded-xl bg-surface px-2.5 py-1.5 text-ink ring-1 ring-line">
            Ціль прийому: ~{diagnosis.mealBudget.kcal} ккал
          </span>
          <span className="rounded-xl bg-surface px-2.5 py-1.5 text-protein ring-1 ring-line">
            Б +{diagnosis.mealBudget.protein}г
          </span>
          <span className="rounded-xl bg-surface px-2.5 py-1.5 text-fat ring-1 ring-line">
            Ж +{diagnosis.mealBudget.fat}г
          </span>
          <span className="rounded-xl bg-surface px-2.5 py-1.5 text-carbs ring-1 ring-line">
            В +{diagnosis.mealBudget.carbs}г
          </span>
        </div>
      </div>

      {/* Поле запиту: що є в холодильнику або чого хочеться + фільтри */}
      <div className="flex flex-col gap-2.5">
        <form onSubmit={(e) => void handleAskCoach(e)} className="flex gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder="Напишіть, що є в холодильнику (напр.: яйця, сир, гречка, банан) або побажання…"
            aria-label="Побажання або продукти в наявності для AI-підбору"
            className="h-11 flex-1 rounded-2xl bg-sunken px-4 text-xs font-medium text-ink outline-none ring-1 ring-line placeholder:text-subtle focus:ring-2 focus:ring-brand-strong sm:text-sm"
          />
          <Button type="submit" variant="soft" size="md" disabled={aiLoading}>
            <Send className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">
              {aiLoading ? "Аналізую…" : "Підібрати КБЖУ"}
            </span>
          </Button>
        </form>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
          {PREFERENCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setAiSuggestions(null);
                setPreference(tab.value);
              }}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors",
                preference === tab.value
                  ? "bg-brand-strong text-on-brand"
                  : "bg-sunken text-muted ring-1 ring-line hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Блок 1: Точкові продукти-коректори (1 продукт для закриття дефіциту) */}
      <div className="flex flex-col gap-2">
        <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted">
          Швидка точкова корекція (1 продукт під дефіцит):
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {topUps.map((item) => (
            <div
              key={item.food.id}
              className="flex items-center justify-between gap-2 rounded-2xl bg-sunken px-3.5 py-2.5 ring-1 ring-line"
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-[0.6875rem] font-bold",
                    item.badgeColor === "protein"
                      ? "text-protein"
                      : item.badgeColor === "carbs"
                        ? "text-carbs"
                        : "text-fat",
                  )}
                >
                  {item.focusLabel}
                </p>
                <p className="truncate text-sm font-bold text-ink">{item.food.name}</p>
                <p className="text-xs text-muted tabular-nums">
                  {item.grams} г · {item.nutrition.kcal} ккал
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAddTopUp(item)}
                disabled={addEntry.isPending}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Додати
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Блок 2: Повноцінні збалансовані комбінації страв з математично підібраними грамами */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {displayedSuggestions.map((recipe) => {
          const afterProteinPct = Math.min(
            100,
            Math.round(
              ((effectiveConsumed.protein + recipe.total.protein) /
                Math.max(1, effectiveTargets.protein)) *
                100,
            ),
          );
          const afterFatPct = Math.min(
            100,
            Math.round(
              ((effectiveConsumed.fat + recipe.total.fat) /
                Math.max(1, effectiveTargets.fat)) *
                100,
            ),
          );
          const afterCarbsPct = Math.min(
            100,
            Math.round(
              ((effectiveConsumed.carbs + recipe.total.carbs) /
                Math.max(1, effectiveTargets.carbs)) *
                100,
            ),
          );

          return (
            <div
              key={recipe.id}
              className="flex flex-col justify-between gap-3 rounded-3xl bg-sunken p-4 ring-1 ring-line"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-surface px-2.5 py-0.5 text-[0.6875rem] font-bold text-brand-strong ring-1 ring-line">
                    {recipe.tag}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand-strong tabular-nums">
                    <Target className="size-3" aria-hidden="true" />
                    {recipe.matchScore}% влучання
                  </span>
                </div>

                <h3 className="mt-2 text-base font-bold leading-snug text-ink">
                  {recipe.title}
                </h3>
                <p className="mt-1 text-xs text-muted">{recipe.reason}</p>

                <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-2.5 text-xs">
                  {recipe.items.map((item) => (
                    <li
                      key={item.foodId}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate font-semibold text-ink">
                        {item.name}
                      </span>
                      <span className="shrink-0 rounded-lg bg-surface px-2 py-0.5 font-bold text-ink tabular-nums ring-1 ring-line">
                        {item.grams} г
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2.5 border-t border-line pt-2.5">
                <div className="flex items-center justify-between text-xs font-bold tabular-nums">
                  <span className="text-ink">{recipe.total.kcal} ккал</span>
                  <span className="text-protein">Б {recipe.total.protein}г</span>
                  <span className="text-fat">Ж {recipe.total.fat}г</span>
                  <span className="text-carbs">В {recipe.total.carbs}г</span>
                </div>

                {/* Прогноз закриття денної норми після цієї страви */}
                <div className="rounded-xl bg-surface px-2.5 py-1.5 text-[0.6875rem] text-muted ring-1 ring-line">
                  Після прийому: Білок{" "}
                  <strong className="text-protein">{afterProteinPct}%</strong> · Жири{" "}
                  <strong className="text-fat">{afterFatPct}%</strong> · Вугл.{" "}
                  <strong className="text-carbs">{afterCarbsPct}%</strong> норми
                </div>

                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => handleAddRecipe(recipe)}
                  disabled={addCombo.isPending}
                  className="w-full"
                >
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden="true" />
                  Додати в «{t.meals[targetMeal]}»
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

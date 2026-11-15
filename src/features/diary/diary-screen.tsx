"use client";

import {
  BookmarkPlus,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Flame,
  Layers,
  Minus,
  Plus,
  Scale,
  ScanBarcode,
  ShoppingBag,
  Sparkles,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FOODS } from "@/data/foods";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DateStrip } from "@/features/dashboard/components/date-strip";
import { SmartChefCard } from "@/features/dashboard/components/smart-chef-card";
import { MEAL_CONFIG } from "@/features/dashboard/meals/meal-config";
import { useCreateMealCombo, useTargets, useToday } from "@/hooks/use-app-data";
import {
  useAddComboEntries,
  useCopyMeal,
  useDayLog,
  useRemoveEntry,
  useSummaries,
  useUpdateEntryGrams,
} from "@/hooks/use-diary";
import { useDateFormatters } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/date";
import { KCAL_PER_GRAM, nutritionForGrams, remainingKcal, sumNutrition } from "@/lib/nutrition";
import { evaluateDietQuality } from "@/lib/smart-chef";
import { applyDayCycleToTargets, useUiStore, type DiarySubTab } from "@/stores/ui-store";
import type { FoodEntry, ISODate, MealType } from "@/types/domain";

type PrepDays = 1 | 3 | 5 | 7;

type GroceryDepartmentId = "meat_fish" | "grains_dry" | "dairy_eggs" | "produce" | "pantry";

interface GroceryDepartmentMeta {
  id: GroceryDepartmentId;
  title: string;
  badge: string;
}

const GROCERY_DEPARTMENTS: readonly GroceryDepartmentMeta[] = [
  { id: "meat_fish", title: "🥩 М'ясо, птиця та риба", badge: "Сира вага" },
  { id: "grains_dry", title: "🌾 Крупи, паста та бобові", badge: "Суха вага" },
  { id: "dairy_eggs", title: "🥛 Молочний відділ та яйця", badge: "Охолоджене" },
  { id: "produce", title: "🥦 Овочі, фрукти та зелень", badge: "Свіжі" },
  { id: "pantry", title: "🥑 Хліб, горіхи, олії та інше", badge: "Бакалія" },
];

interface PotPreset {
  id: string;
  title: string;
  cookedTotalGrams: number;
  defaultPortionGrams: number;
  items: readonly { foodId: string; rawGrams: number }[];
}

const POT_PRESETS: readonly PotPreset[] = [
  {
    id: "pot-pilaf",
    title: "Домашній плов з індичкою (казан на 4 порції)",
    cookedTotalGrams: 1350,
    defaultPortionGrams: 340,
    items: [
      { foodId: "turkey-fillet", rawGrams: 500 },
      { foodId: "rice-cooked", rawGrams: 300 },
      { foodId: "olive-oil", rawGrams: 20 },
    ],
  },
  {
    id: "pot-casserole",
    title: "Сирна запіканка у духовці (форма на 3 порції)",
    cookedTotalGrams: 720,
    defaultPortionGrams: 240,
    items: [
      { foodId: "cottage-5", rawGrams: 500 },
      { foodId: "egg-boiled", rawGrams: 110 },
      { foodId: "oatmeal-water", rawGrams: 60 },
      { foodId: "banana", rawGrams: 120 },
    ],
  },
  {
    id: "pot-cutlets",
    title: "Запечені курячі котлети з гречкою (на 3 прийоми)",
    cookedTotalGrams: 1050,
    defaultPortionGrams: 350,
    items: [
      { foodId: "chicken-breast", rawGrams: 600 },
      { foodId: "egg-boiled", rawGrams: 55 },
      { foodId: "buckwheat-cooked", rawGrams: 210 },
    ],
  },
];

function classifyGroceryDepartment(foodId: string, name: string): GroceryDepartmentId {
  const lower = `${foodId} ${name}`.toLocaleLowerCase("uk-UA");
  if (
    /chicken|turkey|beef|pork|salmon|tuna|fish|shrimp|філе|индич|індич|ялови|свинин|лосос|тунец|хек|тріск|кревет/.test(
      lower,
    )
  ) {
    return "meat_fish";
  }
  if (
    /buckwheat|rice|oat|pasta|bulgur|quinoa|couscous|lentil|chickpea|muesli|гречк|рис|вівсян|макарон|паста|булгур|кіноа|кускус|сочевиц|нут|мюсл/.test(
      lower,
    )
  ) {
    return "grains_dry";
  }
  if (/egg|cottage|yogurt|milk|kefir|cheese|syrnyky|яйц|сир|йогурт|молок|кефір|фета|моцарел/.test(lower)) {
    return "dairy_eggs";
  }
  if (
    /apple|banana|orange|berries|avocado|cucumber|tomato|broccoli|salad|potato|яблук|банан|апельсин|ягод|авокад|огір|помідор|брокол|салат|картопл|батат/.test(
      lower,
    )
  ) {
    return "produce";
  }
  return "pantry";
}

function formatWeightKgOrG(grams: number): string {
  if (grams >= 1000) {
    const kg = (grams / 1000).toFixed(2).replace(/\.?0+$/, "");
    return `${kg} кг (${grams} г)`;
  }
  return `${grams} г`;
}

export function DiaryScreen() {
  const today = useToday();
  const selectedDate = useUiStore((state) => state.selectedDate);
  if (!today) return <DashboardSkeleton />;
  return <DiaryContent today={today} date={selectedDate ?? today} />;
}

function DiaryContent({ today, date }: { today: ISODate; date: ISODate }) {
  const t = useT();
  const format = useDateFormatters();
  const selectDate = useUiStore((state) => state.selectDate);
  const openAddFood = useUiStore((state) => state.openAddFood);
  const diarySubTab = useUiStore((state) => state.diarySubTab);
  const setDiarySubTab = useUiStore((state) => state.setDiarySubTab);
  const dayCycleMode = useUiStore((state) => state.dayCycleMode);
  const pushToast = useUiStore((state) => state.pushToast);

  const { profile, targets: baseTargets } = useTargets();
  const day = useDayLog(date);
  const yesterday = addDays(date, -1);
  const yesterdayLog = useDayLog(yesterday);
  const summaries = useSummaries(addDays(today, -30), addDays(today, 3));

  const removeEntry = useRemoveEntry();
  const updateEntryGrams = useUpdateEntryGrams();
  const copyMeal = useCopyMeal();
  const createMealCombo = useCreateMealCombo();
  const addComboEntries = useAddComboEntries();

  // Стан для вкладки «Закупка»
  const [prepDays, setPrepDays] = useState<PrepDays>(3);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [copiedPrep, setCopiedPrep] = useState(false);

  // Стан для вкладки «Каструля (Уварка страви)»
  const [potTitle, setPotTitle] = useState(POT_PRESETS[0]!.title);
  const [potItems, setPotItems] = useState<Array<{ foodId: string; rawGrams: number }>>(() => [
    ...POT_PRESETS[0]!.items,
  ]);
  const [cookedPotGrams, setCookedPotGrams] = useState(String(POT_PRESETS[0]!.cookedTotalGrams));
  const [platePortionGrams, setPlatePortionGrams] = useState(String(POT_PRESETS[0]!.defaultPortionGrams));
  const [potTargetMeal, setPotTargetMeal] = useState<MealType>("lunch");
  const [selectedAddFoodId, setSelectedAddFoodId] = useState(FOODS[0]?.id ?? "chicken-breast");

  const entries = useMemo(() => day.data?.entries ?? [], [day.data?.entries]);
  const consumed = useMemo(() => sumNutrition(entries.map((entry) => entry.nutrition)), [entries]);
  const dietQuality = useMemo(() => evaluateDietQuality(entries), [entries]);

  const shoppingGroups = useMemo(() => {
    const aggregated = new Map<
      string,
      {
        key: string;
        foodId: string;
        name: string;
        category: string;
        department: GroceryDepartmentId;
        dailyGrams: number;
        dailyKcal: number;
        dailyProtein: number;
      }
    >();

    for (const entry of entries) {
      const catalogFood = FOODS.find((food) => food.id === entry.foodId);
      const key = entry.foodId.startsWith("quick-") ? entry.name : entry.foodId;
      const existing = aggregated.get(key);
      if (existing) {
        existing.dailyGrams += entry.grams;
        existing.dailyKcal += entry.nutrition.kcal;
        existing.dailyProtein = Math.round((existing.dailyProtein + entry.nutrition.protein) * 10) / 10;
      } else {
        aggregated.set(key, {
          key,
          foodId: entry.foodId,
          name: entry.name,
          category: catalogFood?.category ?? "Продукт",
          department: classifyGroceryDepartment(entry.foodId, entry.name),
          dailyGrams: entry.grams,
          dailyKcal: entry.nutrition.kcal,
          dailyProtein: entry.nutrition.protein,
        });
      }
    }

    return GROCERY_DEPARTMENTS.map((dept) => ({
      ...dept,
      items: Array.from(aggregated.values())
        .filter((item) => item.department === dept.id)
        .sort((a, b) => b.dailyGrams - a.dailyGrams),
    })).filter((group) => group.items.length > 0);
  }, [entries]);

  // Обчислення для вкладки «Каструля (Уварка страви)»
  const potCalculation = useMemo(() => {
    const resolved = potItems.flatMap((row) => {
      const food = FOODS.find((f) => f.id === row.foodId);
      if (!food) return [];
      const nutrition = nutritionForGrams(food, row.rawGrams);
      return [{ food, rawGrams: row.rawGrams, nutrition }];
    });
    const rawTotalGrams = resolved.reduce((acc, r) => acc + r.rawGrams, 0);
    const totalNutrition = sumNutrition(resolved.map((r) => r.nutrition));
    const cookedTotal = Math.max(50, Number(cookedPotGrams) || rawTotalGrams || 100);
    const portionCooked = Math.min(cookedTotal, Math.max(10, Number(platePortionGrams) || 200));
    const portionShare = cookedTotal > 0 ? portionCooked / cookedTotal : 0.25;

    const per100Cooked = {
      kcal: Math.round((totalNutrition.kcal / cookedTotal) * 100),
      protein: Math.round((totalNutrition.protein / cookedTotal) * 1000) / 10,
      fat: Math.round((totalNutrition.fat / cookedTotal) * 1000) / 10,
      carbs: Math.round((totalNutrition.carbs / cookedTotal) * 1000) / 10,
    };

    const portionItems = resolved.map((r) => {
      const rawGramsForPortion = Math.max(5, Math.round(r.rawGrams * portionShare));
      return {
        foodId: r.food.id,
        name: r.food.name,
        grams: rawGramsForPortion,
        nutrition: nutritionForGrams(r.food, rawGramsForPortion),
      };
    });
    const portionNutrition = sumNutrition(portionItems.map((i) => i.nutrition));

    return {
      resolved,
      rawTotalGrams,
      cookedTotal,
      portionCooked,
      portionSharePct: Math.round(portionShare * 100),
      totalNutrition,
      per100Cooked,
      portionItems,
      portionNutrition,
    };
  }, [potItems, cookedPotGrams, platePortionGrams]);

  if (!baseTargets || !day.data) return <DashboardSkeleton />;

  const targets = applyDayCycleToTargets(baseTargets, dayCycleMode);
  const leftKcal = remainingKcal(targets.kcal, consumed.kcal, day.data.burnedKcal);
  const proteinKcal = consumed.protein * KCAL_PER_GRAM.protein;
  const fatKcal = consumed.fat * KCAL_PER_GRAM.fat;
  const carbsKcal = consumed.carbs * KCAL_PER_GRAM.carbs;
  const macroTotalKcal = Math.max(1, proteinKcal + fatKcal + carbsKcal);

  const proteinPct = Math.round((proteinKcal / macroTotalKcal) * 100);
  const fatPct = Math.round((fatKcal / macroTotalKcal) * 100);
  const carbsPct = Math.max(0, 100 - proteinPct - fatPct);

  const handleCopyFromYesterday = (meal: MealType) => {
    copyMeal.mutate(
      { fromDate: yesterday, toDate: date, meal },
      {
        onSuccess: (copied) => {
          if (copied.length > 0) {
            pushToast(`Скопійовано ${copied.length} поз. у «${t.meals[meal]}» з учора`);
          } else {
            pushToast(`За вчора у «${t.meals[meal]}» записів не було`);
          }
        },
      },
    );
  };

  const handleSaveMealAsCombo = (meal: MealType, mealEntries: readonly FoodEntry[]) => {
    if (mealEntries.length === 0) return;
    const mealName = t.meals[meal];
    const items = mealEntries.map((entry) => ({
      foodId: entry.foodId,
      name: entry.name,
      grams: entry.grams,
      nutrition: entry.nutrition,
    }));
    const subtitle = mealEntries
      .slice(0, 3)
      .map((e) => e.name)
      .join(", ");
    createMealCombo.mutate(
      {
        title: `Мій ${mealName.toLocaleLowerCase("uk-UA")} (${format.dayNumber(date)})`,
        subtitle,
        defaultMeal: meal,
        items,
      },
      {
        onSuccess: (created) => {
          pushToast(`Збережено сет «${created.title}» у вкладці «Сети»!`);
        },
      },
    );
  };

  const handleAdjustGrams = (entry: FoodEntry, delta: number) => {
    const nextGrams = Math.max(5, Math.min(3000, entry.grams + delta));
    if (nextGrams === entry.grams) return;
    updateEntryGrams.mutate({ date: entry.date, entryId: entry.id, grams: nextGrams });
  };

  const handleCopyShoppingList = async () => {
    if (shoppingGroups.length === 0) return;
    const lines: string[] = [
      `🛒 Vitalio — Список закупівлі (сира/суха вага) на ${prepDays} дн.`,
      `Норма на день: ${consumed.kcal} ккал (Б ${consumed.protein}г · Ж ${consumed.fat}г · В ${consumed.carbs}г)`,
      "",
    ];
    for (const group of shoppingGroups) {
      lines.push(`${group.title}:`);
      for (const item of group.items) {
        const totalGrams = item.dailyGrams * prepDays;
        lines.push(`• ${item.name} — ${formatWeightKgOrG(totalGrams)}`);
      }
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setCopiedPrep(true);
      pushToast(`Список покупок на ${prepDays} дн. скопійовано у буфер обміну!`);
      setTimeout(() => setCopiedPrep(false), 2500);
    } catch {
      pushToast("Не вдалося скопіювати список");
    }
  };

  const SUB_TABS: readonly { id: DiarySubTab; label: string; badge?: string; icon: typeof Utensils }[] = [
    {
      id: "meals",
      label: "Раціон і грамовки",
      badge: `${entries.length} поз.`,
      icon: Scale,
    },
    {
      id: "coach",
      label: "AI КБЖУ-Коуч",
      badge: leftKcal > 80 ? `${leftKcal} ккал` : "Баланс",
      icon: Sparkles,
    },
    {
      id: "pot",
      label: "Каструля (Уварка)",
      badge: `${potCalculation.per100Cooked.kcal} ккал/100г`,
      icon: ChefHat,
    },
    {
      id: "prep",
      label: "Закупка",
      badge: `${prepDays} дн.`,
      icon: ShoppingBag,
    },
  ];

  const totalPrepGrams = entries.reduce((acc, item) => acc + item.grams * prepDays, 0);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      {/* Шапка Кулінарної студії Щоденника */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-strong">
              ⚖️ Стандарт: сира / суха вага
            </span>
            <p className="text-sm font-medium text-muted">{format.full(date)}</p>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
            Кулінарна студія та раціон
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={() => selectDate(addDays(date, -1))}
            aria-label="Попередній день"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => selectDate(today)}
            disabled={date === today}
          >
            Сьогодні
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={() => selectDate(addDays(date, 1))}
            aria-label="Наступний день"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <DateStrip
        today={today}
        selected={date}
        summaries={summaries.data ?? []}
        onSelect={selectDate}
      />

      {/* Головний перемикач 4 ізольованих інструментів Щоденника (нічого не навалено на купу) */}
      <div
        role="tablist"
        aria-label="Режими роботи зі щоденником"
        className="grid grid-cols-2 gap-1.5 rounded-2xl bg-sunken p-1.5 ring-1 ring-line lg:grid-cols-4"
      >
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = diarySubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDiarySubTab(tab.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all",
                active
                  ? "bg-surface text-ink shadow-card ring-1 ring-line"
                  : "text-muted hover:text-ink",
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Icon
                  className={cn("size-4 shrink-0", active ? "text-brand-strong" : "text-muted")}
                  aria-hidden="true"
                />
                <span className="truncate">{tab.label}</span>
              </span>
              {tab.badge ? (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                    active ? "bg-brand-soft text-brand-strong" : "bg-surface text-muted",
                  )}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Зведення дня: рівняння енергії + баланс БЖВ + мікронутрієнти в одній компактній панелі */}
      <Card aria-labelledby="diary-balance-title">
        <CardHeader
          title="Формула КБЖУ та якість раціону"
          titleId="diary-balance-title"
          icon={<Flame className="size-4 text-brand-strong" aria-hidden="true" />}
          action={
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-strong">
              Якість раціону: {dietQuality.qualityScore}/100
            </span>
          }
        />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div className="rounded-2xl bg-sunken p-3.5">
            <p className="text-xs font-medium text-muted">Ціль дня</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              <AnimatedNumber value={targets.kcal} />{" "}
              <span className="text-xs font-medium text-muted">ккал</span>
            </p>
          </div>
          <div className="rounded-2xl bg-sunken p-3.5">
            <p className="text-xs font-medium text-muted">+ Рух</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-carbs">
              +<AnimatedNumber value={day.data.burnedKcal} />{" "}
              <span className="text-xs font-medium text-muted">ккал</span>
            </p>
          </div>
          <div className="rounded-2xl bg-sunken p-3.5">
            <p className="text-xs font-medium text-muted">− Раціон</p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              <AnimatedNumber value={consumed.kcal} />{" "}
              <span className="text-xs font-medium text-muted">ккал</span>
            </p>
          </div>
          <div className="rounded-2xl bg-brand-soft p-3.5">
            <p className="text-xs font-semibold text-brand-strong">
              {leftKcal >= 0 ? "Залишилось добрати" : "Профіцит понад ціль"}
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-strong">
              <AnimatedNumber value={Math.abs(leftKcal)} />{" "}
              <span className="text-xs font-medium">ккал</span>
            </p>
          </div>
        </div>

        {/* Смуга розподілу калорійності Б/Ж/В + Мікронутрієнти в один рядок */}
        <div className="mt-4">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-sunken">
            <div
              style={{ width: `${entries.length ? proteinPct : 33}%`, background: "var(--protein)" }}
              className="transition-all duration-500"
            />
            <div
              style={{ width: `${entries.length ? fatPct : 33}%`, background: "var(--fat)" }}
              className="transition-all duration-500"
            />
            <div
              style={{ width: `${entries.length ? carbsPct : 34}%`, background: "var(--carbs)" }}
              className="transition-all duration-500"
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-protein" aria-hidden="true" />
                <strong>Білки:</strong> {consumed.protein}/{targets.protein}г
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-fat" aria-hidden="true" />
                <strong>Жири:</strong> {consumed.fat}/{targets.fat}г
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-carbs" aria-hidden="true" />
                <strong>Вугл.:</strong> {consumed.carbs}/{targets.carbs}г
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted">
              <span className="rounded-lg bg-sunken px-2 py-0.5">
                🌾 Клітковина: <strong className="text-ink">{dietQuality.fiberGrams}</strong>/28г
              </span>
              <span className="rounded-lg bg-sunken px-2 py-0.5">
                🥦 Овочі/Фрукти: <strong className="text-ink">{dietQuality.produceGrams}</strong>/400г
              </span>
              <span className="rounded-lg bg-sunken px-2 py-0.5">
                💪 Синтез білка (30г+): <strong className="text-ink">{dietQuality.anabolicMealsCount}</strong>/3 прийоми
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Вкладка 1: РАЦІОН І ГРАМОВКИ */}
      {diarySubTab === "meals" ? (
        <>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
            <button
              type="button"
              onClick={() => openAddFood(undefined, "search")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-strong px-3 py-3.5 text-sm font-bold text-on-brand shadow-card transition-transform active:scale-[0.98]"
            >
              <Plus className="size-4" strokeWidth={2.6} aria-hidden="true" />
              <span>Додати (сира/готова)</span>
            </button>
            <button
              type="button"
              onClick={() => openAddFood(undefined, "combos")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-surface px-3 py-3.5 text-sm font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
            >
              <Layers className="size-4 text-brand-strong" aria-hidden="true" />
              <span>Мої комбо-сети</span>
            </button>
            <button
              type="button"
              onClick={() => openAddFood(undefined, "barcode")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-surface px-3 py-3.5 text-sm font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
            >
              <ScanBarcode className="size-4 text-brand-strong" aria-hidden="true" />
              <span>Штрих-код</span>
            </button>
            <button
              type="button"
              onClick={() => openAddFood(undefined, "ai")}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-soft px-3 py-3.5 text-sm font-bold text-brand-strong ring-1 ring-line transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              <span>AI Фото / Текст</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {MEAL_CONFIG.map((config) => {
              const Icon = config.icon;
              const mealName = t.meals[config.type];
              const mealEntries = entries.filter((entry) => entry.meal === config.type);
              const mealYesterdayCount =
                yesterdayLog.data?.entries.filter((entry) => entry.meal === config.type).length ?? 0;
              const mealTotal = sumNutrition(mealEntries.map((entry) => entry.nutrition));
              const recommended = Math.round((targets.kcal * config.share) / 10) * 10;

              return (
                <Card key={config.type} aria-labelledby={`diary-meal-${config.type}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", config.tint)}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 id={`diary-meal-${config.type}`} className="text-lg font-bold">
                            {mealName}
                          </h2>
                          {mealTotal.protein >= 28 ? (
                            <span
                              title="Досягнуто анаболічний поріг лейцину (≥28 г білка за прийом)"
                              className="rounded-full bg-protein-soft px-2 py-0.5 text-[10px] font-bold text-protein"
                            >
                              💪 30г+ білка
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted">
                          <span className="font-semibold text-ink">{mealTotal.kcal}</span> / {recommended}{" "}
                          ккал · Б {mealTotal.protein}г · Ж {mealTotal.fat}г · В {mealTotal.carbs}г
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {mealEntries.length >= 2 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleSaveMealAsCombo(config.type, mealEntries)}
                          title="Зберегти поточний прийом їжі як власний комбо-сет"
                        >
                          <BookmarkPlus className="size-3.5 text-brand-strong" aria-hidden="true" />
                          <span className="hidden sm:inline">У сети</span>
                        </Button>
                      ) : null}
                      {mealYesterdayCount > 0 ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCopyFromYesterday(config.type)}
                          title="Скопіювати цей прийом їжі з учорашнього дня"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          <span className="hidden sm:inline">З учора</span>
                        </Button>
                      ) : null}
                      <Button
                        variant="soft"
                        size="icon-sm"
                        onClick={() => openAddFood(config.type)}
                        aria-label={t.dashboard.meals.addTo(mealName)}
                      >
                        <Plus className="size-4" strokeWidth={2.6} aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  {mealEntries.length > 0 ? (
                    <ul className="mt-3.5 flex flex-col gap-2.5">
                      {mealEntries.map((entry) => {
                        const sharePct =
                          mealTotal.kcal > 0
                            ? Math.round((entry.nutrition.kcal / mealTotal.kcal) * 100)
                            : 0;
                        return (
                          <li
                            key={entry.id}
                            className="flex flex-col gap-2.5 rounded-2xl bg-sunken p-3.5 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="truncate text-sm font-semibold text-ink">{entry.name}</p>
                                <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
                                  {sharePct}% прийому
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted">
                                <span className="font-semibold text-ink">{entry.nutrition.kcal} ккал</span> ·{" "}
                                <span className="text-protein">Б {entry.nutrition.protein}г</span> ·{" "}
                                <span className="text-fat">Ж {entry.nutrition.fat}г</span> ·{" "}
                                <span className="text-carbs">В {entry.nutrition.carbs}г</span>
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2 sm:justify-end">
                              <div className="inline-flex items-center rounded-xl bg-surface p-1 ring-1 ring-line">
                                <button
                                  type="button"
                                  onClick={() => handleAdjustGrams(entry, -10)}
                                  disabled={entry.grams <= 10}
                                  aria-label={`Зменшити вагу ${entry.name} на 10 г`}
                                  className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40"
                                >
                                  <Minus className="size-3.5" aria-hidden="true" />
                                </button>
                                <span
                                  className="min-w-[62px] px-2 text-center text-xs font-bold tabular-nums text-ink"
                                  title="Вага у сирому / сухому вигляді"
                                >
                                  {entry.grams} г
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleAdjustGrams(entry, 10)}
                                  aria-label={`Збільшити вагу ${entry.name} на 10 г`}
                                  className="grid size-7 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
                                >
                                  <Plus className="size-3.5" aria-hidden="true" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => removeEntry.mutate({ date: entry.date, entryId: entry.id })}
                                aria-label={t.dashboard.meals.deleteEntry(entry.name)}
                                className="grid size-8 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-surface hover:text-danger"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-4 flex items-center justify-between rounded-2xl bg-sunken px-4 py-3 text-xs text-muted">
                      <span>У «{mealName}» ще немає записів</span>
                      <button
                        type="button"
                        onClick={() => openAddFood(config.type)}
                        className="font-bold text-brand-strong hover:underline"
                      >
                        + Додати продукт
                      </button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      {/* Вкладка 2: AI КБЖУ-КОУЧ */}
      {diarySubTab === "coach" ? (
        <SmartChefCard
          date={date}
          remaining={{
            kcal: Math.max(0, leftKcal),
            protein: Math.max(0, targets.protein - consumed.protein),
            fat: Math.max(0, targets.fat - consumed.fat),
            carbs: Math.max(0, targets.carbs - consumed.carbs),
          }}
          entries={entries}
          targets={targets}
          consumed={consumed}
          burnedKcal={day.data.burnedKcal}
          goal={profile?.goal ?? "maintain"}
        />
      ) : null}

      {/* Вкладка 3: КАСТРУЛЯ (КАЛЬКУЛЯТОР УВАРКИ СКЛАДНОЇ ДОМАШНЬОЇ СТРАВИ) */}
      {diarySubTab === "pot" ? (
        <Card aria-labelledby="diary-pot-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-strong">
                <ChefHat className="size-3.5" aria-hidden="true" />
                Калькулятор уварки / запікання на кілька порцій
              </span>
              <h2 id="diary-pot-title" className="mt-2 text-xl font-bold">
                Складна домашня страва («З каструлі на тарілку»)
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Зважте сирі інгредієнти перед готуванням, вкажіть вагу готової каструлі та свою
                порцію на тарілці — калькулятор сам вирахує точну частку сирої ваги кожного продукту.
              </p>
            </div>
          </div>

          {/* Швидкі шаблони домашніх страв */}
          <div className="mt-4 flex flex-wrap gap-2">
            {POT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setPotTitle(preset.title);
                  setPotItems([...preset.items]);
                  setCookedPotGrams(String(preset.cookedTotalGrams));
                  setPlatePortionGrams(String(preset.defaultPortionGrams));
                }}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold ring-1 ring-line transition-colors",
                  potTitle === preset.title
                    ? "bg-brand-soft text-brand-strong"
                    : "bg-sunken text-ink hover:bg-raised",
                )}
              >
                🍲 {preset.title}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Ліва колонка: сирі інгредієнти у каструлі */}
            <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-4 ring-1 ring-line lg:col-span-7">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-ink">
                  1. Сирі / сухі інгредієнти в каструлі ({potCalculation.rawTotalGrams} г сирого)
                </h3>
                <span className="text-xs font-semibold text-muted">
                  Усього: {potCalculation.totalNutrition.kcal} ккал
                </span>
              </div>

              <ul className="flex flex-col gap-2">
                {potCalculation.resolved.map(({ food, rawGrams, nutrition }) => (
                  <li
                    key={food.id}
                    className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 ring-1 ring-line"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-ink">{food.name}</p>
                      <p className="text-[11px] text-muted">
                        {nutrition.kcal} ккал · Б {nutrition.protein}г · Ж {nutrition.fat}г · В{" "}
                        {nutrition.carbs}г
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPotItems((prev) =>
                            prev.map((p) =>
                              p.foodId === food.id
                                ? { ...p, rawGrams: Math.max(10, p.rawGrams - 25) }
                                : p,
                            ),
                          )
                        }
                        className="grid size-7 place-items-center rounded-lg bg-sunken text-muted hover:text-ink"
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="min-w-[56px] text-center text-xs font-bold tabular-nums">
                        {rawGrams} г
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setPotItems((prev) =>
                            prev.map((p) =>
                              p.foodId === food.id ? { ...p, rawGrams: p.rawGrams + 25 } : p,
                            ),
                          )
                        }
                        className="grid size-7 place-items-center rounded-lg bg-sunken text-muted hover:text-ink"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPotItems((prev) => prev.filter((p) => p.foodId !== food.id))
                        }
                        className="grid size-7 place-items-center rounded-lg text-subtle hover:text-danger"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Додати інгредієнт у каструлю */}
              <div className="mt-1 flex gap-2">
                <select
                  value={selectedAddFoodId}
                  onChange={(e) => setSelectedAddFoodId(e.target.value)}
                  aria-label="Оберіть сирий інгредієнт для каструлі"
                  className="h-10 flex-1 rounded-xl bg-surface px-3 text-xs font-semibold text-ink outline-none ring-1 ring-line"
                >
                  {FOODS.map((food) => (
                    <option key={food.id} value={food.id}>
                      {food.name} ({food.per100g.kcal} ккал/100г)
                    </option>
                  ))}
                </select>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPotItems((prev) => {
                      const existing = prev.find((p) => p.foodId === selectedAddFoodId);
                      if (existing) {
                        return prev.map((p) =>
                          p.foodId === selectedAddFoodId
                            ? { ...p, rawGrams: p.rawGrams + 100 }
                            : p,
                        );
                      }
                      return [...prev, { foodId: selectedAddFoodId, rawGrams: 150 }];
                    });
                  }}
                >
                  + Додати інгредієнт
                </Button>
              </div>
            </div>

            {/* Права колонка: вага готової страви та порція на тарілці */}
            <div className="flex flex-col justify-between gap-4 rounded-2xl bg-sunken p-4 ring-1 ring-line lg:col-span-5">
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold text-ink">
                  2. Вага після приготування та ваша порція
                </h3>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="cooked-pot-g" className="text-[11px] font-semibold text-muted">
                      Вага всієї готової страви (г)
                    </label>
                    <input
                      id="cooked-pot-g"
                      type="number"
                      min={50}
                      max={10000}
                      value={cookedPotGrams}
                      onChange={(e) => setCookedPotGrams(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl bg-surface px-3 text-sm font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                    />
                  </div>
                  <div>
                    <label htmlFor="plate-portion-g" className="text-[11px] font-semibold text-muted">
                      Ваша порція на тарілці (г)
                    </label>
                    <input
                      id="plate-portion-g"
                      type="number"
                      min={10}
                      max={5000}
                      value={platePortionGrams}
                      onChange={(e) => setPlatePortionGrams(e.target.value)}
                      className="mt-1 h-10 w-full rounded-xl bg-surface px-3 text-sm font-bold tabular-nums text-brand-strong outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-line">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted">
                      На 100 г готової страви:
                    </span>
                    <span className="font-bold text-ink">
                      {potCalculation.per100Cooked.kcal} ккал (Б {potCalculation.per100Cooked.protein} · Ж{" "}
                      {potCalculation.per100Cooked.fat} · В {potCalculation.per100Cooked.carbs})
                    </span>
                  </div>

                  <div className="mt-2.5 border-t border-line pt-2.5">
                    <p className="text-xs font-semibold text-brand-strong">
                      Ваша порція ({potCalculation.portionCooked} г готового ={" "}
                      {potCalculation.portionSharePct}% каструлі):
                    </p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
                      {potCalculation.portionNutrition.kcal} ккал{" "}
                      <span className="text-xs font-semibold text-muted">
                        · Б {potCalculation.portionNutrition.protein}г · Ж{" "}
                        {potCalculation.portionNutrition.fat}г · В{" "}
                        {potCalculation.portionNutrition.carbs}г
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <select
                    value={potTargetMeal}
                    onChange={(e) => setPotTargetMeal(e.target.value as MealType)}
                    aria-label="Прийом їжі для запису порції"
                    className="h-10 rounded-xl bg-surface px-3 text-xs font-bold text-ink outline-none ring-1 ring-line"
                  >
                    {MEAL_CONFIG.map((m) => (
                      <option key={m.type} value={m.type}>
                        У «{t.meals[m.type]}»
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="primary"
                    size="sm"
                    className="h-10 flex-1"
                    disabled={potCalculation.portionItems.length === 0}
                    onClick={() => {
                      addComboEntries.mutate(
                        {
                          date,
                          meal: potTargetMeal,
                          items: potCalculation.portionItems,
                        },
                        {
                          onSuccess: () => {
                            pushToast(
                              `Порцію (${potCalculation.portionCooked}г готового) записано у «${t.meals[potTargetMeal]}» в сирій вазі!`,
                            );
                            setDiarySubTab("meals");
                          },
                        },
                      );
                    }}
                  >
                    + Записати порцію у раціон
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={potCalculation.portionItems.length === 0}
                  onClick={() => {
                    createMealCombo.mutate(
                      {
                        title: `${potTitle} (порція ${potCalculation.portionCooked}г)`,
                        subtitle: `${potCalculation.portionNutrition.kcal} ккал · перераховано у сиру вагу`,
                        defaultMeal: potTargetMeal,
                        items: potCalculation.portionItems,
                      },
                      {
                        onSuccess: () =>
                          pushToast("Порцію домашньої страви збережено у ваші Комбо-сети!"),
                      },
                    );
                  }}
                >
                  <BookmarkPlus className="size-3.5 text-brand-strong" aria-hidden="true" />
                  <span>Зберегти порцію у «Мої сети»</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Вкладка 4: ЗАКУПКА & MEAL PREP У СИРІЙ / СУХІЙ ВАЗІ */}
      {diarySubTab === "prep" ? (
        <Card aria-labelledby="diary-prep-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-strong">
                  <ShoppingBag className="size-3.5" aria-hidden="true" />
                  Meal Prep & Список покупок
                </span>
                <span className="text-xs font-medium text-muted">
                  Вага для магазину (сира / суха)
                </span>
              </div>
              <h2 id="diary-prep-title" className="mt-2 text-xl font-bold">
                Розрахунок закупівлі продуктів на {prepDays}{" "}
                {prepDays === 1 ? "день" : "дні(в)"}
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Оскільки всі грамовки у щоденнику вказані у сирому/сухому вигляді, цей список
                відповідає точній вазі на полицях супермаркету без похибки на уварку.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-sunken p-1 ring-1 ring-line">
                {([1, 3, 5, 7] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setPrepDays(d)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      prepDays === d
                        ? "bg-brand-strong text-on-brand shadow-xs"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {d} дн.
                  </button>
                ))}
              </div>

              <Button
                variant="primary"
                size="sm"
                disabled={shoppingGroups.length === 0}
                onClick={() => void handleCopyShoppingList()}
              >
                {copiedPrep ? (
                  <ClipboardCheck className="size-4" aria-hidden="true" />
                ) : (
                  <Copy className="size-4" aria-hidden="true" />
                )}
                <span>{copiedPrep ? "Скопійовано!" : "Скопіювати список"}</span>
              </Button>
            </div>
          </div>

          {shoppingGroups.length > 0 ? (
            <>
              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs text-muted">Сумарна вага кошика ({prepDays} дн.)</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-ink">
                    {formatWeightKgOrG(totalPrepGrams)}
                  </p>
                </div>
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs text-muted">Запас білка у закупівлі</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-protein">
                    {Math.round(consumed.protein * prepDays)} г білка
                  </p>
                </div>
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs text-muted">Енергетична цінність кошика</p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-brand-strong">
                    {(consumed.kcal * prepDays).toLocaleString("uk-UA")} ккал
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {shoppingGroups.map((group) => (
                  <div
                    key={group.id}
                    className="rounded-2xl bg-sunken p-4 ring-1 ring-line"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-ink">{group.title}</h3>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-bold text-muted">
                        {group.badge}
                      </span>
                    </div>

                    <ul className="mt-3 flex flex-col gap-2">
                      {group.items.map((item) => {
                        const checked = Boolean(checkedItems[item.key]);
                        const totalGrams = item.dailyGrams * prepDays;
                        return (
                          <li key={item.key}>
                            <button
                              type="button"
                              onClick={() =>
                                setCheckedItems((prev) => ({
                                  ...prev,
                                  [item.key]: !prev[item.key],
                                }))
                              }
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-xl bg-surface px-3.5 py-2.5 text-left ring-1 ring-line transition-opacity",
                                checked && "opacity-55",
                              )}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className={cn(
                                    "grid size-5 shrink-0 place-items-center rounded-md ring-1 transition-colors",
                                    checked
                                      ? "bg-brand-strong text-on-brand ring-brand-strong"
                                      : "bg-sunken text-transparent ring-line",
                                  )}
                                >
                                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                  <p
                                    className={cn(
                                      "truncate text-sm font-semibold text-ink",
                                      checked && "line-through",
                                    )}
                                  >
                                    {item.name}
                                  </p>
                                  <p className="text-[11px] text-muted">
                                    На 1 день: {item.dailyGrams} г · Б{" "}
                                    {Math.round(item.dailyProtein * prepDays)}г за {prepDays} дн.
                                  </p>
                                </div>
                              </div>

                              <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold tabular-nums text-brand-strong">
                                {formatWeightKgOrG(totalGrams)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl bg-sunken p-8 text-center">
              <p className="text-sm font-semibold text-ink">
                За цей день ще немає доданих продуктів для розрахунку закупівлі
              </p>
              <p className="max-w-md text-xs text-muted">
                Додайте страви у вкладці «Раціон і грамовки» або згенеруйте меню через «AI КБЖУ-Коуч», і
                калькулятор автоматично збере список покупок у сирій та сухій вазі на тиждень.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setDiarySubTab("meals")}>
                  До раціону
                </Button>
                <Button variant="primary" size="sm" onClick={() => setDiarySubTab("coach")}>
                  Підібрати в AI-Коучі
                </Button>
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}

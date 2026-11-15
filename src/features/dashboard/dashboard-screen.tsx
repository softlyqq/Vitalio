"use client";

import {
  ArrowUpRight,
  ChefHat,
  Coffee,
  Dumbbell,
  Flame,
  Scale,
  ShoppingBag,
  Sparkles,
  Timer,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { CaloriesCard } from "@/features/dashboard/components/calories-card";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { DateStrip } from "@/features/dashboard/components/date-strip";
import { FastingCard } from "@/features/dashboard/components/fasting-card";
import { MacrosCard } from "@/features/dashboard/components/macros-card";
import { MealsCard } from "@/features/dashboard/components/meals-card";
import { StreakCard } from "@/features/dashboard/components/streak-card";
import { WaterCard } from "@/features/dashboard/components/water-card";
import { useTargets, useToday } from "@/hooks/use-app-data";
import {
  useAddCaffeine,
  useAddWater,
  useDayLog,
  useSetBurnedKcal,
  useSummaries,
} from "@/hooks/use-diary";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/date";
import { sumNutrition } from "@/lib/nutrition";
import { analyzeDayIntake, evaluateCaffeineStatus, evaluateDietQuality } from "@/lib/smart-chef";
import { computeStreak } from "@/lib/streak";
import { applyDayCycleToTargets, useUiStore, type DayCycleMode } from "@/stores/ui-store";
import type { ISODate } from "@/types/domain";

const SUMMARY_DAYS_BACK = 60;
const SUMMARY_DAYS_AHEAD = 3;

const WORKOUT_PRESETS = [
  { label: "Ходьба 30 хв", kcal: 160 },
  { label: "Силове 45 хв", kcal: 320 },
  { label: "Кардіо / Біг", kcal: 450 },
] as const;

const CAFFEINE_PRESETS = [
  { label: "Еспресо", mg: 65 },
  { label: "Американо", mg: 95 },
  { label: "Капучино", mg: 75 },
  { label: "Зелений чай", mg: 40 },
] as const;

const DAY_CYCLE_OPTIONS: readonly {
  mode: DayCycleMode;
  label: string;
  badge: string;
}[] = [
  { mode: "base", label: "⚖️ Базовий день", badge: "100%" },
  { mode: "training", label: "🏋️ Тренування", badge: "+10% ккал / +В" },
  { mode: "rest", label: "🛋️ Відпочинок", badge: "-8% ккал / +Ж" },
  { mode: "refeed", label: "🍕 Рефід / Вихідний", badge: "+15% ккал" },
];

type BioTab = "fasting" | "workout" | "caffeine";

export function DashboardScreen() {
  const today = useToday();
  const selectedDate = useUiStore((state) => state.selectedDate);
  if (!today) return <DashboardSkeleton />;
  return <Dashboard today={today} date={selectedDate ?? today} />;
}

function Dashboard({ today, date }: { today: ISODate; date: ISODate }) {
  const t = useT();
  const selectDate = useUiStore((state) => state.selectDate);
  const openAddFood = useUiStore((state) => state.openAddFood);
  const openDiaryTab = useUiStore((state) => state.openDiaryTab);
  const openWelcomeModal = useUiStore((state) => state.openWelcomeModal);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const dayCycleMode = useUiStore((state) => state.dayCycleMode);
  const setDayCycleMode = useUiStore((state) => state.setDayCycleMode);
  const pushToast = useUiStore((state) => state.pushToast);

  const [bioTab, setBioTab] = useState<BioTab>("fasting");

  const { profile, targets: baseTargets } = useTargets();
  const day = useDayLog(date);
  const summaries = useSummaries(addDays(today, -SUMMARY_DAYS_BACK), addDays(today, SUMMARY_DAYS_AHEAD));
  const addWater = useAddWater();
  const addCaffeine = useAddCaffeine();
  const setBurned = useSetBurnedKcal();

  const entries = day.data?.entries;
  const consumed = useMemo(() => sumNutrition((entries ?? []).map((entry) => entry.nutrition)), [entries]);
  const streak = useMemo(() => computeStreak(summaries.data ?? [], today), [summaries.data, today]);
  const dietQuality = useMemo(() => evaluateDietQuality(entries ?? []), [entries]);

  const handleWater = useCallback((deltaMl: number) => addWater.mutate({ date, deltaMl }), [addWater, date]);

  if (day.isError) {
    return (
      <div role="alert" className="mx-auto flex min-h-[50dvh] max-w-sm flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold">{t.dashboard.error.title}</p>
        <p className="text-muted">{t.dashboard.error.body}</p>
        <Button onClick={() => void day.refetch()}>{t.dashboard.error.retry}</Button>
      </div>
    );
  }

  if (!profile || !baseTargets || !day.data) return <DashboardSkeleton />;

  const targets = applyDayCycleToTargets(baseTargets, dayCycleMode);
  const summaryList = summaries.data ?? [];
  const insight = analyzeDayIntake(day.data.entries, targets, consumed, day.data.burnedKcal);
  const caffeineStatus = evaluateCaffeineStatus(day.data.caffeineMg ?? 0);

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <DashboardHeader name={profile.name} date={date} />
      <DateStrip today={today} selected={date} summaries={summaryList} onSelect={selectDate} />

      {/* Компактний перемикач Циклічного КБЖУ (Carb Cycling) та Якості раціону */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl bg-sunken p-2 ring-1 ring-line">
        <div className="flex flex-wrap items-center gap-1.5">
          {DAY_CYCLE_OPTIONS.map((item) => {
            const active = dayCycleMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  setDayCycleMode(item.mode);
                  pushToast(`Режим дня: ${item.label} (${targets.kcal} ккал)`);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                  active
                    ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                    : "text-muted hover:text-ink",
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-brand-soft text-brand-strong" : "bg-surface text-muted",
                  )}
                >
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Компактні пігулки Клітковини та Овочів без окремої картки */}
        <div className="flex flex-wrap items-center gap-2 px-1 text-xs">
          <span
            title="Добова норма клітковини — 28 г"
            className="rounded-full bg-surface px-2.5 py-1 font-semibold text-muted ring-1 ring-line"
          >
            🌾 Клітковина: <strong className="text-ink">{dietQuality.fiberGrams}</strong>/{dietQuality.fiberGoalGrams}г
          </span>
          <span
            title="Норма ВООЗ овочів та фруктів — 400 г/день"
            className="rounded-full bg-surface px-2.5 py-1 font-semibold text-muted ring-1 ring-line"
          >
            🥦 Овочі/Фрукти: <strong className="text-ink">{dietQuality.produceGrams}</strong>/{dietQuality.produceGoalGrams}г
          </span>
        </div>
      </div>

      {/* Підказка-вітання для нового користувача / дня з 0 ккал */}
      {!entries || entries.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl bg-surface p-4 ring-1 ring-line shadow-card sm:p-5">
          <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong ring-1 ring-brand-strong/20">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Чистий аркуш на сьогодні 🌿</h2>
                <p className="mt-0.5 text-xs text-muted sm:text-sm">
                  Спожито <strong className="text-ink">0 ккал</strong>. Додайте перший сніданок (+), випийте
                  склянку води або перегляньте огляд можливостей Vitalio.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={openWelcomeModal}>
                <Sparkles className="size-3.5 text-brand-strong" aria-hidden="true" />
                <span>Прев&apos;ю додатку</span>
              </Button>
              <Button variant="soft" size="sm" onClick={() => openAuthModal("register")}>
                <span>🎯 Розрахувати норму</span>
              </Button>
              <Button variant="primary" size="sm" onClick={() => openAddFood("breakfast")}>
                <span>+ Додати прийом</span>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-12 lg:gap-5">
        <CaloriesCard
          className="col-span-2 lg:col-span-7"
          goal={targets.kcal}
          eaten={consumed.kcal}
          burned={day.data.burnedKcal}
        />
        <MacrosCard className="col-span-2 lg:col-span-5" consumed={consumed} targets={targets} />
        <WaterCard
          className="col-span-1 p-4 sm:p-6 lg:col-span-5 lg:col-start-8 lg:row-start-2"
          waterMl={day.data.waterMl}
          goalMl={targets.waterMl}
          onChange={handleWater}
        />
        <StreakCard
          className="col-span-1 p-4 sm:p-6 lg:col-span-5 lg:col-start-8 lg:row-start-3"
          streak={streak}
          today={today}
          summaries={summaryList}
        />
        <MealsCard
          className="col-span-2 lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-2"
          entries={day.data.entries}
          dailyGoalKcal={targets.kcal}
          onAdd={openAddFood}
        />

        {/* Єдиний табований центр біоритмів (Голодування | Рух | Кофеїн) — нічого не навалено на купу */}
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sunken p-1.5 ring-1 ring-line">
            <span className="px-2.5 text-xs font-bold text-muted">Біоритми дня:</span>
            <div className="flex flex-1 flex-wrap gap-1.5 sm:flex-initial">
              <button
                type="button"
                onClick={() => setBioTab("fasting")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  bioTab === "fasting"
                    ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                    : "text-muted hover:text-ink",
                )}
              >
                <Timer className="size-3.5 text-brand-strong" aria-hidden="true" />
                <span>Інтервальне голодування</span>
              </button>
              <button
                type="button"
                onClick={() => setBioTab("workout")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  bioTab === "workout"
                    ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                    : "text-muted hover:text-ink",
                )}
              >
                <Dumbbell className="size-3.5 text-carbs" aria-hidden="true" />
                <span>Рух (+{day.data.burnedKcal} ккал)</span>
              </button>
              <button
                type="button"
                onClick={() => setBioTab("caffeine")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all sm:flex-initial",
                  bioTab === "caffeine"
                    ? "bg-surface text-ink shadow-xs ring-1 ring-line"
                    : "text-muted hover:text-ink",
                )}
              >
                <Coffee className="size-3.5 text-fat" aria-hidden="true" />
                <span>Кофеїн і сон ({caffeineStatus.caffeineMg} мг)</span>
              </button>
            </div>
          </div>

          {bioTab === "fasting" ? <FastingCard /> : null}

          {bioTab === "workout" ? (
            <Card aria-labelledby="home-workout-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="home-workout-title" className=" flex items-center gap-2 text-base font-bold">
                    <Flame className="size-4 text-carbs" aria-hidden="true" />
                    Тренування та активність за день
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Додані калорії руху автоматично збільшують ваш сьогоднішній бюджет КБЖУ.
                  </p>
                </div>
                <span className="rounded-full bg-carbs-soft px-3 py-1 text-xs font-bold text-carbs tabular-nums">
                  Спалено: +{day.data.burnedKcal} ккал
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {WORKOUT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const next = day.data.burnedKcal + preset.kcal;
                      setBurned.mutate(
                        { date, burnedKcal: next },
                        { onSuccess: () => pushToast(`+${preset.kcal} ккал (${preset.label})`) },
                      );
                    }}
                    className="rounded-xl bg-sunken px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                  >
                    + {preset.label} <span className="text-carbs">({preset.kcal} ккал)</span>
                  </button>
                ))}
                {day.data.burnedKcal > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setBurned.mutate(
                        { date, burnedKcal: 0 },
                        { onSuccess: () => pushToast("Активність скинуто") },
                      )
                    }
                  >
                    Скинути
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}

          {bioTab === "caffeine" ? (
            <Card aria-labelledby="home-caffeine-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 id="home-caffeine-title" className="flex items-center gap-2 text-base font-bold">
                    <Coffee className="size-4 text-fat" aria-hidden="true" />
                    Кофеїновий радар та гігієна сну
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Залишок до 23:00:{" "}
                    <strong className="text-ink">~{caffeineStatus.residualAtBedtimeMg} мг</strong> ·{" "}
                    {caffeineStatus.advice}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    caffeineStatus.sleepSafety === "optimal"
                      ? "bg-brand-soft text-brand-strong"
                      : caffeineStatus.sleepSafety === "moderate"
                        ? "bg-fat-soft text-fat"
                        : "bg-carbs-soft text-carbs",
                  )}
                >
                  {caffeineStatus.caffeineMg} / {caffeineStatus.safeLimitMg} мг
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {CAFFEINE_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      addCaffeine.mutate(
                        { date, deltaMg: preset.mg },
                        { onSuccess: () => pushToast(`+${preset.mg} мг кофеїну (${preset.label})`) },
                      )
                    }
                    className="rounded-xl bg-sunken px-3.5 py-2 text-xs font-semibold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                  >
                    + {preset.label} <span className="text-fat">({preset.mg} мг)</span>
                  </button>
                ))}
                {caffeineStatus.caffeineMg > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addCaffeine.mutate({ date, deltaMg: -65 })}
                  >
                    −65 мг
                  </Button>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>

        {/* Компактний шорткат у 4 інструменти Щоденника */}
        <Card
          aria-labelledby="home-studio-bridge-title"
          className="col-span-2 bg-gradient-to-br from-surface via-surface to-brand-soft/35 lg:col-span-12"
        >
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand-strong">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Кулінарна студія у вкладці «Щоденник»
              </span>
              <h2 id="home-studio-bridge-title" className="mt-1.5 text-base font-bold sm:text-lg">
                {insight.headline}
              </h2>
              <p className="mt-0.5 text-xs text-muted">{insight.detail}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openDiaryTab("meals")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
              >
                <Scale className="size-3.5 text-brand-strong" aria-hidden="true" />
                <span>Грамовки</span>
              </button>
              <button
                type="button"
                onClick={() => openDiaryTab("coach")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-brand-strong px-3.5 py-2 text-xs font-bold text-on-brand shadow-card transition-opacity hover:opacity-95"
              >
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>AI КБЖУ-Коуч</span>
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => openDiaryTab("pot")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
              >
                <ChefHat className="size-3.5 text-brand-strong" aria-hidden="true" />
                <span>Уварка каструлі</span>
              </button>
              <button
                type="button"
                onClick={() => openDiaryTab("prep")}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
              >
                <ShoppingBag className="size-3.5 text-brand-strong" aria-hidden="true" />
                <span>Закупка</span>
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

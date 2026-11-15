"use client";

import {
  Activity,
  Award,
  CalendarCheck2,
  Compass,
  Droplets,
  Flame,
  Scale,
  Share2,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { useLogWeight, useTargets, useToday, useWeights } from "@/hooks/use-app-data";
import { useSummaries } from "@/hooks/use-diary";
import { useDateFormatters } from "@/hooks/use-formatters";
import { cn } from "@/lib/cn";
import { addDays } from "@/lib/date";
import { computeAdaptiveTdee } from "@/lib/smart-chef";
import { computeStreak } from "@/lib/streak";
import { useUiStore } from "@/stores/ui-store";
import type { ISODate, WeightEntry } from "@/types/domain";

type Period = "7" | "14" | "30";
type ProgressSubTab = "charts" | "forecast" | "habits";

const PERIOD_OPTIONS: readonly SegmentOption<Period>[] = [
  { value: "7", label: "7 днів" },
  { value: "14", label: "14 днів" },
  { value: "30", label: "30 днів" },
];

function WeightChart({
  entries,
  targetWeightKg,
}: {
  entries: readonly WeightEntry[];
  targetWeightKg?: number;
}) {
  if (entries.length === 0) {
    return (
      <div className="grid h-44 place-items-center rounded-2xl bg-sunken text-sm text-muted">
        Додайте перший замір ваги нижче
      </div>
    );
  }

  const values = entries.map((e) => e.weightKg);
  if (targetWeightKg) values.push(targetWeightKg);
  const minW = Math.floor(Math.min(...values) - 1);
  const maxW = Math.ceil(Math.max(...values) + 1);
  const range = Math.max(1, maxW - minW);

  const width = 560;
  const height = 160;
  const padX = 24;
  const padY = 20;

  const points = entries.map((entry, idx) => {
    const x =
      entries.length === 1
        ? width / 2
        : padX + (idx / (entries.length - 1)) * (width - padX * 2);
    const y = height - padY - ((entry.weightKg - minW) / range) * (height - padY * 2);
    return { x, y, entry };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area =
    points.length > 1
      ? `M ${points[0]!.x},${height - padY} L ${points.map((p) => `${p.x},${p.y}`).join(" L ")} L ${points[points.length - 1]!.x},${height - padY} Z`
      : "";

  const targetY =
    targetWeightKg !== undefined
      ? height - padY - ((targetWeightKg - minW) / range) * (height - padY * 2)
      : null;

  return (
    <div className="overflow-hidden rounded-3xl bg-sunken p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full overflow-visible"
        role="img"
        aria-label="Графік зміни ваги"
      >
        {targetY !== null ? (
          <g>
            <line
              x1={padX}
              x2={width - padX}
              y1={targetY}
              y2={targetY}
              stroke="var(--brand-strong)"
              strokeDasharray="5 5"
              strokeWidth="1.5"
              opacity="0.65"
            />
            <text
              x={width - padX}
              y={targetY - 6}
              textAnchor="end"
              fill="var(--brand-strong)"
              fontSize="11"
              fontWeight="600"
            >
              Ціль {targetWeightKg} кг
            </text>
          </g>
        ) : null}

        {area ? <path d={area} fill="var(--brand)" opacity="0.14" /> : null}

        {points.length > 1 ? (
          <polyline
            fill="none"
            stroke="var(--brand-strong)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polyline}
          />
        ) : null}

        {points.map(({ x, y, entry }) => (
          <g key={entry.date}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill="var(--surface)"
              stroke="var(--brand-strong)"
              strokeWidth="3"
            />
            <text
              x={x}
              y={y - 10}
              textAnchor="middle"
              fill="var(--ink)"
              fontSize="11"
              fontWeight="700"
            >
              {entry.weightKg}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function ProgressScreen() {
  const today = useToday();
  if (!today) return <DashboardSkeleton />;
  return <ProgressContent today={today} />;
}

function ProgressContent({ today }: { today: ISODate }) {
  const format = useDateFormatters();
  const pushToast = useUiStore((state) => state.pushToast);
  const { profile, targets } = useTargets();

  const [subTab, setSubTab] = useState<ProgressSubTab>("charts");
  const [period, setPeriod] = useState<Period>("14");
  const daysCount = Number(period);

  const summariesQuery = useSummaries(addDays(today, -59), today);
  const weightsQuery = useWeights(addDays(today, -35), today);
  const logWeight = useLogWeight();

  const [weightInput, setWeightInput] = useState("");
  const [simDailyPaceKcal, setSimDailyPaceKcal] = useState(450);
  const [simWorkoutsPerWeek, setSimWorkoutsPerWeek] = useState(3);
  const [simGoalWeight, setSimGoalWeight] = useState<string>("");

  const allSummaries = useMemo(() => summariesQuery.data ?? [], [summariesQuery.data]);
  const periodSummaries = useMemo(
    () => allSummaries.slice(-daysCount),
    [allSummaries, daysCount],
  );
  const streak = useMemo(() => computeStreak(allSummaries, today), [allSummaries, today]);

  if (!profile || !targets) return <DashboardSkeleton />;

  const activeDays = periodSummaries.filter((d) => d.entriesCount > 0);
  const avgKcal =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.kcal, 0) / activeDays.length)
      : 0;
  const avgProtein =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.protein, 0) / activeDays.length)
      : 0;
  const avgWater =
    activeDays.length > 0
      ? Math.round(activeDays.reduce((acc, d) => acc + d.waterMl, 0) / activeDays.length)
      : 0;

  const weights = weightsQuery.data ?? [];
  const firstWeight = weights[0]?.weightKg ?? profile.weightKg;
  const latestWeight = weights[weights.length - 1]?.weightKg ?? profile.weightKg;
  const weightDelta = Math.round((latestWeight - firstWeight) * 10) / 10;

  const maxKcalInChart = Math.max(targets.kcal * 1.25, ...periodSummaries.map((d) => d.kcal), 1);

  const handleLogWeight = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = Number(weightInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 25 || parsed > 350) return;
    logWeight.mutate(
      { date: today, weightKg: parsed },
      {
        onSuccess: (entry) => {
          pushToast(`Вагу ${entry.weightKg} кг збережено`);
          setWeightInput("");
        },
      },
    );
  };

  const heatmapDays = allSummaries.slice(-28);
  const last7 = allSummaries.slice(-7);
  const proteinGoalDays = last7.filter((d) => d.protein >= targets.protein * 0.85).length;
  const waterGoalDays = last7.filter((d) => d.waterMl >= targets.waterMl * 0.85).length;
  const calorieGoalDays = last7.filter(
    (d) => d.entriesCount > 0 && Math.abs(d.kcal - targets.kcal) <= targets.kcal * 0.12,
  ).length;
  const weeklyBurnedTotal = last7.reduce((acc, d) => acc + d.burnedKcal, 0);
  const consistencyScore = Math.min(
    100,
    Math.round(((proteinGoalDays + waterGoalDays + calorieGoalDays) / 21) * 100),
  );

  const adaptive = computeAdaptiveTdee(allSummaries.slice(-28), weights, targets.tdee, targets.kcal);

  // Розрахунок Симулятора дати досягнення цілі («Машина часу»)
  const defaultGoalW =
    profile.targetWeightKg ??
    (profile.goal === "lose"
      ? Math.max(48, Math.round(latestWeight - 5))
      : profile.goal === "gain"
        ? Math.round(latestWeight + 4)
        : latestWeight);
  const desiredWeight = Math.min(200, Math.max(40, Number(simGoalWeight) || defaultGoalW));
  const kgDiff = Math.abs(latestWeight - desiredWeight);
  const workoutBonusPerDay = Math.round((simWorkoutsPerWeek * 320) / 7);
  const totalDailyBalanceKcal = Math.max(150, simDailyPaceKcal + workoutBonusPerDay);
  const weeklyRateKg = Math.round(((totalDailyBalanceKcal * 7) / 7700) * 100) / 100;
  const estimatedDays = kgDiff < 0.2 ? 0 : Math.min(365, Math.ceil((kgDiff * 7700) / totalDailyBalanceKcal));
  const targetDateISO = addDays(today, estimatedDays);

  const handleShareWeeklyDigest = async () => {
    const reportText = [
      `📊 Мій тижневий підсумок у Vitalio:`,
      `• Серія без пропусків: ${streak} дн. 🔥`,
      `• Середній калораж: ${avgKcal} ккал / день (норма ${targets.kcal})`,
      `• Середній білок: ${avgProtein} г · Вода: ${avgWater} мл`,
      `• Поточна вага: ${latestWeight} кг (${weightDelta <= 0 ? weightDelta : `+${weightDelta}`} кг)`,
      `• Адаптивний метаболізм (TDEE): ${adaptive.adaptiveTdee} ккал/день`,
      `• Індекс стабільності раціону: ${consistencyScore}%`,
    ].join("\n");

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
        pushToast("Тижневий звіт скопійовано у буфер обміну!");
        return;
      }
    } catch {
      // Фолбек, якщо доступ до буфера обмежено.
    }
    pushToast("Тижневий дайджест сформовано!");
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Аналітика, прогноз та динаміка звичок</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Ваш прогрес</h1>
        </div>
        {subTab === "charts" ? (
          <div className="w-full sm:w-64">
            <SegmentedControl
              value={period}
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
              label="Період аналітики"
            />
          </div>
        ) : null}
      </header>

      {/* Верхні KPI-картки */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Flame className="size-4 text-brand-strong" aria-hidden="true" />
            Середнє за день
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
            <AnimatedNumber value={avgKcal} />{" "}
            <span className="text-xs font-medium text-muted">ккал</span>
          </p>
          <p className="mt-1 text-xs text-muted">Ціль: {targets.kcal} ккал / добу</p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <CalendarCheck2 className="size-4 text-fat" aria-hidden="true" />
            Поточна серія
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
            <AnimatedNumber value={streak} />{" "}
            <span className="text-xs font-medium text-muted">днів</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Заповнено {activeDays.length} із {daysCount} дн.
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <TrendingDown className="size-4 text-protein" aria-hidden="true" />
            Динаміка ваги
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
            {latestWeight} <span className="text-xs font-medium text-muted">кг</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {weightDelta <= 0 ? `${weightDelta} кг` : `+${weightDelta} кг`} за місяць
          </p>
        </Card>

        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Droplets className="size-4 text-water" aria-hidden="true" />
            Білок / Вода (сер.)
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums sm:text-3xl">
            {avgProtein}г <span className="text-xs font-medium text-muted">· {avgWater} мл</span>
          </p>
          <p className="mt-1 text-xs text-muted">Норма білка: {targets.protein} г</p>
        </Card>
      </div>

      {/* Перемикач 3 розділів Прогресу, щоб нічого не навалювалось в одну стрічку */}
      <div
        role="tablist"
        aria-label="Розділи прогресу"
        className="grid grid-cols-1 gap-1.5 rounded-2xl bg-sunken p-1.5 ring-1 ring-line sm:grid-cols-3"
      >
        {(
          [
            { id: "charts", label: "📉 Графіки ваги та калорій", badge: `${daysCount} дн.` },
            { id: "forecast", label: "🔮 Прогноз цілі та TDEE", badge: format.dayNumber(targetDateISO) },
            { id: "habits", label: "🏆 Челенджі та Wrapped", badge: `${consistencyScore}%` },
          ] as const
        ).map((tab) => {
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all sm:justify-center",
                active
                  ? "bg-surface text-ink shadow-card ring-1 ring-line"
                  : "text-muted hover:text-ink",
              )}
            >
              <span>{tab.label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-brand-soft text-brand-strong" : "bg-surface text-muted",
                )}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Розділ 1: ГРАФІКИ КАЛОРІЙ ТА ВАГИ */}
      {subTab === "charts" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card aria-labelledby="calories-chart-title" className="lg:col-span-6">
            <CardHeader
              title={`Динаміка калорій за ${daysCount} днів`}
              titleId="calories-chart-title"
              action={
                <span className="text-xs font-medium text-muted">
                  Норма: <strong className="text-ink">{targets.kcal} ккал</strong>
                </span>
              }
            />

            <div className="relative mt-2 flex h-48 items-end gap-1.5 rounded-3xl bg-sunken px-3 pb-7 pt-6 sm:gap-2 sm:px-5">
              <div
                aria-hidden="true"
                style={{ bottom: `calc(1.75rem + ${(targets.kcal / maxKcalInChart) * 75}%)` }}
                className="pointer-events-none absolute inset-x-3 border-t-2 border-dashed border-brand-strong/50"
              />

              {periodSummaries.map((item) => {
                const pct = Math.min(100, Math.round((item.kcal / maxKcalInChart) * 100));
                const isOver = item.kcal > targets.kcal * 1.08;
                return (
                  <div
                    key={item.date}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div
                      title={`${format.full(item.date)}: ${item.kcal} ккал`}
                      style={{ height: `${Math.max(pct, item.kcal > 0 ? 8 : 3)}%` }}
                      className={cn(
                        "w-full max-w-8 rounded-t-xl transition-all duration-300",
                        item.kcal === 0
                          ? "bg-line-strong"
                          : isOver
                            ? "bg-carbs"
                            : "bg-brand-strong",
                      )}
                    />
                    <span className="absolute -bottom-5 text-[0.625rem] font-medium text-muted tabular-nums">
                      {format.dayNumber(item.date)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-brand-strong" /> У межах цільової норми
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-carbs" /> Вище норми (&gt;8%)
              </span>
            </div>
          </Card>

          <Card aria-labelledby="weight-chart-title" className="lg:col-span-6">
            <CardHeader
              title="Графік зміни ваги (кг)"
              titleId="weight-chart-title"
              icon={<Scale className="size-4 text-brand-strong" aria-hidden="true" />}
            />

            <WeightChart entries={weights} targetWeightKg={profile.targetWeightKg} />

            <form onSubmit={handleLogWeight} className="mt-4 flex flex-wrap gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(event) => setWeightInput(event.target.value.replace(/[^\d.,]/g, ""))}
                placeholder={`Поточна вага, кг (зараз ${latestWeight})`}
                aria-label="Новий замір ваги в кілограмах"
                className="h-11 flex-1 rounded-2xl bg-sunken px-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
              />
              <Button type="submit" size="md" disabled={!weightInput.trim()}>
                Записати вагу
              </Button>
            </form>
          </Card>
        </div>
      ) : null}

      {/* Розділ 2: СИМУЛЯТОР ДАТИ ЦІЛІ («МАШИНА ЧАСУ») ТА АДАПТИВНИЙ МЕТАБОЛІЗМ */}
      {subTab === "forecast" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card aria-labelledby="goal-simulator-title" className="lg:col-span-7">
            <CardHeader
              title="Симулятор дати досягнення цілі («Машина часу»)"
              titleId="goal-simulator-title"
              icon={<Compass className="size-4 text-brand-strong" aria-hidden="true" />}
              action={
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
                  Темп: {weeklyRateKg} кг / тиждень
                </span>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-sunken p-3.5">
                <label htmlFor="sim-goal-w" className="text-xs font-medium text-muted">
                  Бажана вага (кг)
                </label>
                <input
                  id="sim-goal-w"
                  type="number"
                  min={40}
                  max={200}
                  step={0.5}
                  value={simGoalWeight || String(defaultGoalW)}
                  onChange={(e) => setSimGoalWeight(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-xl bg-surface px-3 text-lg font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                />
              </div>

              <div className="rounded-2xl bg-sunken p-3.5">
                <p className="text-xs font-medium text-muted">Дистанція до цілі</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-ink">
                  {kgDiff.toFixed(1)} <span className="text-xs font-medium text-muted">кг</span>
                </p>
              </div>

              <div className="rounded-2xl bg-brand-soft p-3.5">
                <p className="text-xs font-semibold text-brand-strong">Очікувана дата фінішу</p>
                <p className="mt-1.5 text-lg font-bold text-brand-strong">
                  {estimatedDays === 0 ? "Ціль досягнуто!" : format.full(targetDateISO)}
                </p>
                <p className="text-[11px] font-medium text-muted">~{estimatedDays} дн. у обраному темпі</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-sunken p-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">
                    Харчовий дефіцит / профіцит раціону:
                  </span>
                  <span className="font-bold text-brand-strong tabular-nums">
                    {simDailyPaceKcal} ккал / добу
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={850}
                  step={50}
                  value={simDailyPaceKcal}
                  onChange={(e) => setSimDailyPaceKcal(Number(e.target.value))}
                  aria-label="Харчовий дефіцит або профіцит калорій"
                  className="mt-1.5 h-6 w-full cursor-pointer accent-[var(--brand-strong)]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink">Тренувань на тиждень (~320 ккал):</span>
                  <span className="font-bold text-carbs tabular-nums">
                    {simWorkoutsPerWeek} трен. / тиждень (+{workoutBonusPerDay} ккал/день)
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={6}
                  step={1}
                  value={simWorkoutsPerWeek}
                  onChange={(e) => setSimWorkoutsPerWeek(Number(e.target.value))}
                  aria-label="Кількість тренувань на тиждень"
                  className="mt-1.5 h-6 w-full cursor-pointer accent-[var(--brand-strong)]"
                />
              </div>

              <p className="text-xs text-muted">
                {weeklyRateKg <= 0.85
                  ? "✅ Фізіологічно безпечний темп: максимальне збереження сухої м'язової маси без гормонального стресу."
                  : "⚠️ Досить агресивний темп (>0.85 кг/тиждень) — тримайте білок не нижче 2.0 г/кг сирої ваги."}
              </p>
            </div>
          </Card>

          <Card aria-labelledby="adaptive-tdee-title" className="lg:col-span-5">
            <CardHeader
              title="Адаптивний метаболізм (Smart TDEE)"
              titleId="adaptive-tdee-title"
              icon={<Activity className="size-4 text-brand-strong" aria-hidden="true" />}
              action={
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
                  {adaptive.confidenceLabel}
                </span>
              }
            />

            <div className="grid grid-cols-2 gap-3 rounded-3xl bg-sunken p-4">
              <div>
                <p className="text-xs font-medium text-muted">Формула Міффліна</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-ink">
                  {targets.tdee} <span className="text-xs font-medium text-muted">ккал</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-brand-strong">Реальний TDEE (за вагою)</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-brand-strong">
                  {adaptive.adaptiveTdee}{" "}
                  <span className="text-xs font-medium">
                    ({adaptive.deltaFromFormula >= 0 ? `+${adaptive.deltaFromFormula}` : adaptive.deltaFromFormula})
                  </span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-muted">{adaptive.explanation}</p>

            <div className="mt-3 flex items-center justify-between rounded-2xl bg-sunken px-4 py-2.5 text-xs">
              <span className="font-medium text-muted">Рекомендована скоригована ціль:</span>
              <span className="font-bold text-ink tabular-nums">
                {adaptive.recommendedGoalKcal} ккал / добу
              </span>
            </div>

            <div className="mt-3 rounded-2xl bg-water-soft/60 p-3 text-xs text-muted">
              <strong className="text-ink">💧 Чому вага може стрибати зранку:</strong>{" "}
              {"1 г вуглеводів зв'язує у м'язах ~3–4 г води, а щоб набрати 1 кг справжнього жиру, потрібен профіцит у "}
              <strong>7 700 ккал</strong>. Оцінюйте тренд ваги за 7–14 днів!
            </div>
          </Card>
        </div>
      ) : null}

      {/* Розділ 3: ЧЕЛЕНДЖІ СТАБІЛЬНОСТІ ТА TИЖНЕВИЙ ДАЙДЖЕСТ WRAPPED */}
      {subTab === "habits" ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Card aria-labelledby="streak-heatmap-title" className="lg:col-span-6">
            <CardHeader
              title="Матриця стабільності (28 днів)"
              titleId="streak-heatmap-title"
              icon={<Award className="size-4 text-fat" aria-hidden="true" />}
            />

            <div className="grid grid-cols-7 gap-2">
              {heatmapDays.map((day) => {
                const hasLog = day.entriesCount > 0;
                return (
                  <div
                    key={day.date}
                    title={`${format.full(day.date)}: ${day.kcal} ккал`}
                    className={cn(
                      "flex h-10 flex-col items-center justify-center rounded-xl text-xs font-bold tabular-nums",
                      hasLog ? "bg-brand-soft text-brand-strong ring-1 ring-brand/30" : "bg-sunken text-subtle",
                    )}
                  >
                    {format.dayNumber(day.date)}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-2xl bg-sunken px-3.5 py-2.5 text-xs">
                <span className="font-semibold">🔥 Серія 7+ днів без пропусків</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 font-bold text-brand-strong tabular-nums">
                  {streak >= 7 ? "Виконано" : `${streak}/7 дн.`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-sunken px-3.5 py-2.5 text-xs">
                <span className="font-semibold">💪 Білковий тиждень (норма 5+ дн.)</span>
                <span className="rounded-full bg-protein-soft px-2.5 py-0.5 font-bold text-protein tabular-nums">
                  {proteinGoalDays}/7 дн.
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-sunken px-3.5 py-2.5 text-xs">
                <span className="font-semibold">💧 Водний баланс ({targets.waterMl} мл)</span>
                <span className="rounded-full bg-water-soft px-2.5 py-0.5 font-bold text-water tabular-nums">
                  {waterGoalDays}/7 дн.
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-sunken px-3.5 py-2.5 text-xs">
                <span className="font-semibold">🎯 Точність калорій (±12% від цілі)</span>
                <span className="rounded-full bg-fat-soft px-2.5 py-0.5 font-bold text-fat tabular-nums">
                  {calorieGoalDays}/7 дн.
                </span>
              </div>
            </div>
          </Card>

          <Card aria-labelledby="weekly-wrapped-title" className="lg:col-span-6">
            <CardHeader
              title="Тижневий підсумок (Vitalio Wrapped)"
              titleId="weekly-wrapped-title"
              icon={<Sparkles className="size-4 text-brand-strong" aria-hidden="true" />}
              action={
                <Button variant="soft" size="sm" onClick={() => void handleShareWeeklyDigest()}>
                  <Share2 className="size-3.5" aria-hidden="true" />
                  Поділитись
                </Button>
              }
            />

            <div className="flex flex-col justify-between gap-3 rounded-3xl bg-brand-soft p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-strong">
                    Індекс стабільності тижня
                  </p>
                  <p className="mt-1 text-4xl font-bold text-ink tabular-nums">
                    {consistencyScore}%
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-muted">Активність за 7 днів</p>
                  <p className="mt-1 text-xl font-bold text-ink tabular-nums">
                    +{weeklyBurnedTotal} ккал
                  </p>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted">
                Ви виконали норму білка <strong className="text-ink">{proteinGoalDays} дн.</strong>, водний
                баланс <strong className="text-ink">{waterGoalDays} дн.</strong> та тримаєте серію{" "}
                <strong className="text-ink">{streak} дн.</strong> поспіль. Скопіюйте звіт в 1 клік для
                тренера або соцмереж!
              </p>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

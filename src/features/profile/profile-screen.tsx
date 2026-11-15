"use client";

import {
  Activity,
  Calculator,
  Check,
  Crown,
  Download,
  HeartPulse,
  LogIn,
  LogOut,
  RotateCcw,
  Ruler,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { readStoredAccounts } from "@/features/auth/auth-sheet";
import { DashboardSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { usePlanTier, useProfile, useUpdateProfile } from "@/hooks/use-app-data";
import { useClearAllDiary, useResetDemo } from "@/hooks/use-diary";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { ACTIVITY_FACTOR, calculateTargets } from "@/lib/nutrition";
import { useUiStore } from "@/stores/ui-store";
import type { ActivityLevel, DailyTargets, GoalType, Sex, UserProfile } from "@/types/domain";

type ProfileSubTab = "body" | "measurements" | "account";
type MacroSplitPreset = "standard" | "high_protein" | "low_carb" | "endurance";

interface BodyMeasurementsRecord {
  updatedAt: string;
  waistCm: number;
  neckCm: number;
  hipsCm: number;
  chestCm: number;
  bicepCm: number;
}

const BODY_METRICS_KEY = "vitalio:body-metrics:v1";
const DIET_PREFS_KEY = "vitalio:diet-prefs:v1";

const DIETARY_TAGS: readonly { id: string; label: string; desc: string }[] = [
  { id: "lactose_free", label: "🥛 Без лактози", desc: "Виключати звичайне молоко та вершки" },
  { id: "gluten_free", label: "🌾 Без глютену", desc: "Крупи без пшениці (гречка, рис, кіноа)" },
  { id: "pescatarian", label: "🐟 Пескетаріанець", desc: "Риба, морепродукти, яйця та молочне" },
  { id: "no_pork", label: "🥩 Без свинини", desc: "Тільки птиця, яловичина та риба" },
  { id: "nut_free", label: "🥜 Без горіхів", desc: "Алергія на арахіс та деревні горіхи" },
  { id: "sugar_free", label: "🍬 Без доданого цукру", desc: "Тільки цільні джерела вуглеводів" },
];

const MACRO_PRESETS: readonly {
  id: MacroSplitPreset;
  label: string;
  desc: string;
}[] = [
  {
    id: "standard",
    label: "⚖️ Класичний баланс",
    desc: "Науковий стандарт Міффліна — Сан Жеора",
  },
  {
    id: "high_protein",
    label: "💪 Високий білок (Атлет / Сушка)",
    desc: "2.3 г білка на кг маси для максимального рельєфу",
  },
  {
    id: "low_carb",
    label: "🥑 Низьковуглеводний (Low-Carb)",
    desc: "Більше корисних жирів і білка, мінімум вуглеводів",
  },
  {
    id: "endurance",
    label: "🏃 Високі вуглеводи (Спорт)",
    desc: "Максимум глікогену для силових і кардіо",
  },
];

function applyMacroPreset(
  base: DailyTargets,
  weightKg: number,
  preset: MacroSplitPreset,
): DailyTargets {
  if (preset === "high_protein") {
    const protein = Math.round(weightKg * 2.3);
    const fat = Math.max(40, Math.round(weightKg * 0.85));
    const carbs = Math.max(30, Math.round((base.kcal - protein * 4 - fat * 9) / 4));
    return { ...base, protein, fat, carbs };
  }
  if (preset === "low_carb") {
    const protein = Math.round(weightKg * 2.0);
    const carbs = Math.min(90, Math.max(40, Math.round((base.kcal * 0.18) / 4)));
    const fat = Math.max(45, Math.round((base.kcal - protein * 4 - carbs * 4) / 9));
    return { ...base, protein, fat, carbs };
  }
  if (preset === "endurance") {
    const protein = Math.round(weightKg * 1.6);
    const fat = Math.max(40, Math.round((base.kcal * 0.22) / 9));
    const carbs = Math.max(80, Math.round((base.kcal - protein * 4 - fat * 9) / 4));
    return { ...base, protein, fat, carbs };
  }
  return base;
}

function readSavedBodyMetrics(): BodyMeasurementsRecord {
  if (typeof window === "undefined") {
    return { updatedAt: "", waistCm: 80, neckCm: 38, hipsCm: 96, chestCm: 100, bicepCm: 35 };
  }
  try {
    const raw = window.localStorage.getItem(BODY_METRICS_KEY);
    if (!raw) {
      return { updatedAt: "", waistCm: 80, neckCm: 38, hipsCm: 96, chestCm: 100, bicepCm: 35 };
    }
    return JSON.parse(raw) as BodyMeasurementsRecord;
  } catch {
    return { updatedAt: "", waistCm: 80, neckCm: 38, hipsCm: 96, chestCm: 100, bicepCm: 35 };
  }
}

function readSavedDietPrefs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DIET_PREFS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Розрахунок % жиру в тілі за формулою ВМС США (US Navy Method) та сухої м'язової маси (LBM). */
function computeBodyComposition(params: {
  sex: Sex;
  heightCm: number;
  weightKg: number;
  waistCm: number;
  neckCm: number;
  hipsCm: number;
}) {
  const { sex, heightCm, weightKg, waistCm, neckCm, hipsCm } = params;
  const h = Math.max(120, heightCm);
  const w = Math.max(45, waistCm);
  const n = Math.max(25, Math.min(w - 5, neckCm));
  const hip = Math.max(55, hipsCm);

  let rawBf = 18;
  if (sex === "male") {
    const diff = Math.max(10, w - n);
    rawBf = 495 / (1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(h)) - 450;
  } else {
    const sum = Math.max(20, w + hip - n);
    rawBf = 495 / (1.29579 - 0.35004 * Math.log10(sum) + 0.221 * Math.log10(h)) - 450;
  }

  const bodyFatPct = Math.min(48, Math.max(5, Math.round(rawBf * 10) / 10));
  const fatMassKg = Math.round(((weightKg * bodyFatPct) / 100) * 10) / 10;
  const leanMassKg = Math.round((weightKg - fatMassKg) * 10) / 10;
  const waistToHeight = Math.round((w / h) * 100) / 100;

  let category = "Здорова норма";
  if (sex === "male") {
    if (bodyFatPct < 13) category = "Атлетичний рельєф";
    else if (bodyFatPct < 18) category = "Спортивна фітнес-форма";
    else if (bodyFatPct < 24) category = "Здорова норма";
    else category = "Надлишок жирової тканини";
  } else {
    if (bodyFatPct < 20) category = "Атлетичний рельєф";
    else if (bodyFatPct < 25) category = "Спортивна фітнес-форма";
    else if (bodyFatPct < 31) category = "Здорова норма";
    else category = "Надлишок жирової тканини";
  }

  return {
    bodyFatPct,
    fatMassKg,
    leanMassKg,
    waistToHeight,
    category,
  };
}

const ACTIVITY_LEVELS: readonly ActivityLevel[] = [
  "sedentary",
  "light",
  "moderate",
  "high",
  "extreme",
];

const ACTIVITY_HINTS: Record<ActivityLevel, string> = {
  sedentary: "Офісна робота, мінімум руху",
  light: "1–2 легкі тренування або 6–8 тис. кроків",
  moderate: "3–4 тренування на тиждень",
  high: "5–6 інтенсивних тренувань на тиждень",
  extreme: "Щоденний спорт або фізична праця",
};

export function ProfileScreen() {
  const { data: profile, isLoading } = useProfile();
  if (isLoading || !profile) return <DashboardSkeleton />;
  return (
    <ProfileForm
      key={`${profile.name}-${profile.weightKg}-${profile.goal}-${profile.activity}`}
      initial={profile}
    />
  );
}

function ProfileForm({ initial }: { initial: UserProfile }) {
  const t = useT();
  const updateProfile = useUpdateProfile();
  const resetDemo = useResetDemo();
  const clearAll = useClearAllDiary();
  const { data: planTier = "free" } = usePlanTier();
  const openPaywall = useUiStore((state) => state.openPaywall);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const openWelcomeModal = useUiStore((state) => state.openWelcomeModal);
  const authEmail = useUiStore((state) => state.authEmail);
  const setAuthEmail = useUiStore((state) => state.setAuthEmail);
  const pushToast = useUiStore((state) => state.pushToast);

  const [subTab, setSubTab] = useState<ProfileSubTab>("body");
  const [macroPreset, setMacroPreset] = useState<MacroSplitPreset>("standard");

  // Параметри тіла (Вкладка 1)
  const [name, setName] = useState(initial.name);
  const [sex, setSex] = useState<Sex>(initial.sex);
  const [age, setAge] = useState(String(initial.age));
  const [heightCm, setHeightCm] = useState(String(initial.heightCm));
  const [weightKg, setWeightKg] = useState(String(initial.weightKg));
  const [targetWeightKg, setTargetWeightKg] = useState(
    String(initial.targetWeightKg ?? initial.weightKg),
  );
  const [activity, setActivity] = useState<ActivityLevel>(initial.activity);
  const [goal, setGoal] = useState<GoalType>(initial.goal);

  // Антропометричні заміри стрічкою (Вкладка 2)
  const savedMetrics = useMemo(() => readSavedBodyMetrics(), []);
  const [waistCm, setWaistCm] = useState(String(savedMetrics.waistCm));
  const [neckCm, setNeckCm] = useState(String(savedMetrics.neckCm));
  const [hipsCm, setHipsCm] = useState(String(savedMetrics.hipsCm));
  const [chestCm, setChestCm] = useState(String(savedMetrics.chestCm));
  const [bicepCm, setBicepCm] = useState(String(savedMetrics.bicepCm));

  // Харчові фільтри (Вкладка 3)
  const [dietPrefs, setDietPrefs] = useState<string[]>(() => readSavedDietPrefs());

  const draftProfile: UserProfile = useMemo(
    () => ({
      name: name.trim() || "Користувач",
      sex,
      age: Math.min(100, Math.max(14, Number(age) || initial.age)),
      heightCm: Math.min(240, Math.max(120, Number(heightCm) || initial.heightCm)),
      weightKg: Math.min(300, Math.max(30, Number(weightKg) || initial.weightKg)),
      targetWeightKg: Math.min(
        300,
        Math.max(30, Number(targetWeightKg) || initial.weightKg),
      ),
      activity,
      goal,
    }),
    [name, sex, age, heightCm, weightKg, targetWeightKg, activity, goal, initial],
  );

  const baseTargets = useMemo(() => calculateTargets(draftProfile), [draftProfile]);
  const previewTargets = useMemo(
    () => applyMacroPreset(baseTargets, draftProfile.weightKg, macroPreset),
    [baseTargets, draftProfile.weightKg, macroPreset],
  );

  const bodyComp = useMemo(
    () =>
      computeBodyComposition({
        sex: draftProfile.sex,
        heightCm: draftProfile.heightCm,
        weightKg: draftProfile.weightKg,
        waistCm: Number(waistCm) || 80,
        neckCm: Number(neckCm) || 38,
        hipsCm: Number(hipsCm) || 96,
      }),
    [draftProfile.sex, draftProfile.heightCm, draftProfile.weightKg, waistCm, neckCm, hipsCm],
  );

  const storedAccounts = useMemo(() => readStoredAccounts(), []);

  const sexOptions: readonly SegmentOption<Sex>[] = [
    { value: "male", label: "Чоловіча" },
    { value: "female", label: "Жіноча" },
  ];

  const goalOptions: readonly SegmentOption<GoalType>[] = [
    { value: "lose", label: "Схуднення (−20%)" },
    { value: "maintain", label: "Підтримка" },
    { value: "gain", label: "Набір (+10%)" },
  ];

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    updateProfile.mutate(draftProfile, {
      onSuccess: () => {
        pushToast(
          `Профіль оновлено! Нова норма: ${previewTargets.kcal} ккал/день`,
        );
      },
    });
  };

  const handleSaveMeasurements = (event: React.FormEvent) => {
    event.preventDefault();
    const record: BodyMeasurementsRecord = {
      updatedAt: new Date().toISOString().slice(0, 10),
      waistCm: Math.max(45, Number(waistCm) || 80),
      neckCm: Math.max(25, Number(neckCm) || 38),
      hipsCm: Math.max(55, Number(hipsCm) || 96),
      chestCm: Math.max(60, Number(chestCm) || 100),
      bicepCm: Math.max(20, Number(bicepCm) || 35),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(BODY_METRICS_KEY, JSON.stringify(record));
    }
    pushToast(
      `Заміри збережено! Ваш % жиру: ${bodyComp.bodyFatPct}% (суха маса ${bodyComp.leanMassKg} кг)`,
    );
  };

  const toggleDietPref = (id: string) => {
    setDietPrefs((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DIET_PREFS_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: draftProfile,
      targets: previewTargets,
      bodyComposition: bodyComp,
      dietaryPreferences: dietPrefs,
      diary:
        typeof window !== "undefined"
          ? JSON.parse(window.localStorage.getItem("vitalio:diary:v2") ?? "{}")
          : {},
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vitalio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    pushToast("Експортовано резервну копію JSON");
  };

  const handleLogout = () => {
    setAuthEmail(null);
    pushToast("Ви вийшли з облікового запису");
  };

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">
            Параметри тіла, склад організму (% жиру) та налаштування
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Профіль: {draftProfile.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Кнопки Реєстрація / Вхід показуються ТІЛЬКИ якщо користувач ще НЕ увійшов */}
          {!authEmail ? (
            <>
              <Button variant="primary" size="sm" onClick={() => openAuthModal("register")}>
                <UserPlus className="size-4" aria-hidden="true" />
                Реєстрація (3 кроки)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openAuthModal("login")}>
                <LogIn className="size-4 text-brand-strong" aria-hidden="true" />
                Увійти
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3.5 py-1.5 text-xs font-bold text-brand-strong">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <span>{authEmail}</span>
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={openPaywall}>
            <Crown className="size-4 text-brand-strong" aria-hidden="true" />
            {planTier === "pro" ? "Vitalio Pro" : "Тариф Free"}
          </Button>
        </div>
      </header>

      {/* Перемикач 3 вкладок Профілю — щоб нічого не звалювалось на купу */}
      <div
        role="tablist"
        aria-label="Розділи профілю"
        className="grid grid-cols-1 gap-1.5 rounded-2xl bg-sunken p-1.5 ring-1 ring-line sm:grid-cols-3"
      >
        {(
          [
            {
              id: "body",
              label: "Тіло та Формула КБЖУ",
              badge: `${previewTargets.kcal} ккал`,
              icon: UserRound,
            },
            {
              id: "measurements",
              label: "Заміри та Склад тіла (% жиру)",
              badge: `${bodyComp.bodyFatPct}% жиру`,
              icon: Ruler,
            },
            {
              id: "account",
              label: "Акаунт, Фільтри їжі та Дані",
              badge: authEmail ? "Активний" : "Гість",
              icon: Settings,
            },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSubTab(tab.id)}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-xs font-bold transition-all",
                active
                  ? "bg-surface text-ink shadow-card ring-1 ring-line"
                  : "text-muted hover:text-ink",
              )}
            >
              <span className="flex items-center gap-2">
                <Icon
                  className={cn("size-4 shrink-0", active ? "text-brand-strong" : "text-muted")}
                  aria-hidden="true"
                />
                <span>{tab.label}</span>
              </span>
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

      {/* ВКЛАДКА 1: ТІЛО ТА ФОРМУЛА КБЖУ */}
      {subTab === "body" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card aria-labelledby="calculator-title" className="lg:col-span-7">
            <CardHeader
              title="Особисті параметри та ціль"
              titleId="calculator-title"
              icon={<UserRound className="size-4 text-brand-strong" aria-hidden="true" />}
            />

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Ваше ім&apos;я
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-muted">Стать</span>
                  <SegmentedControl
                    value={sex}
                    onChange={setSex}
                    options={sexOptions}
                    label="Стать"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Вік (років)
                  <input
                    type="number"
                    min={14}
                    max={100}
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold text-ink tabular-nums outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Зріст (см)
                  <input
                    type="number"
                    min={120}
                    max={240}
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold text-ink tabular-nums outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Вага (кг)
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold text-ink tabular-nums outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Цільова вага (кг)
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={targetWeightKg}
                    onChange={(event) => setTargetWeightKg(event.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold text-ink tabular-nums outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Ваша головна ціль</span>
                <SegmentedControl
                  value={goal}
                  onChange={setGoal}
                  options={goalOptions}
                  label="Головна ціль"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted">Рівень щоденної активності</span>
                <div className="grid grid-cols-1 gap-2">
                  {ACTIVITY_LEVELS.map((level) => {
                    const selected = level === activity;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setActivity(level)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors",
                          selected
                            ? "bg-brand-soft text-ink ring-2 ring-brand-strong"
                            : "bg-sunken text-ink hover:bg-raised",
                        )}
                      >
                        <div>
                          <p className="text-sm font-bold">{t.activity[level]}</p>
                          <p className="text-xs text-muted">{ACTIVITY_HINTS[level]}</p>
                        </div>
                        <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold tabular-nums text-brand-strong ring-1 ring-line">
                          ×{ACTIVITY_FACTOR[level]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-2 w-full" disabled={updateProfile.isPending}>
                <Check className="size-5" aria-hidden="true" />
                Зберегти параметри та оновити норму
              </Button>
            </form>
          </Card>

          <div className="flex flex-col gap-5 lg:col-span-5">
            <Card aria-labelledby="tdee-result-title">
              <CardHeader
                title="Розрахунок Міффліна — Сан Жеора"
                titleId="tdee-result-title"
                icon={<Calculator className="size-4 text-brand-strong" aria-hidden="true" />}
              />

              <div className="rounded-3xl bg-brand-soft p-5">
                <p className="text-xs font-bold text-brand-strong">РЕКОМЕНДОВАНА ДОБОВА НОРМА</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-ink tabular-nums">
                    <AnimatedNumber value={previewTargets.kcal} />
                  </span>
                  <span className="text-sm font-semibold text-muted">ккал / день</span>
                </p>
                <p className="mt-2 text-xs text-muted">
                  Базальний обмін (BMR): <strong className="text-ink">{previewTargets.bmr} ккал</strong> ·
                  Витрати (TDEE): <strong className="text-ink">{previewTargets.tdee} ккал</strong>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs font-semibold text-protein">Білки</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{previewTargets.protein} г</p>
                  <p className="text-[0.6875rem] text-muted">{previewTargets.protein * 4} ккал</p>
                </div>
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs font-semibold text-fat">Жири</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{previewTargets.fat} г</p>
                  <p className="text-[0.6875rem] text-muted">{previewTargets.fat * 9} ккал</p>
                </div>
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs font-semibold text-carbs">Вуглеводи</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{previewTargets.carbs} г</p>
                  <p className="text-[0.6875rem] text-muted">{previewTargets.carbs * 4} ккал</p>
                </div>
                <div className="rounded-2xl bg-sunken p-3.5">
                  <p className="text-xs font-semibold text-water">Водна норма</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">{previewTargets.waterMl} мл</p>
                  <p className="text-[0.6875rem] text-muted">33 мл × кг маси</p>
                </div>
              </div>

              {/* Пресети розподілу БЖВ */}
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs font-bold text-muted">Схема розподілу БЖВ:</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {MACRO_PRESETS.map((preset) => {
                    const active = macroPreset === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setMacroPreset(preset.id)}
                        className={cn(
                          "flex flex-col rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                          active
                            ? "bg-brand-soft text-ink ring-1 ring-brand-strong"
                            : "bg-sunken text-ink hover:bg-raised",
                        )}
                      >
                        <span className="text-xs font-bold">{preset.label}</span>
                        <span className="text-[11px] text-muted">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ВКЛАДКА 2: АНТРОПОМЕТРІЯ ТА СКЛАД ТІЛА (% ЖИРУ NAVY & СУХА М'ЯЗОВА МАСА) */}
      {subTab === "measurements" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card aria-labelledby="body-measurements-title" className="lg:col-span-6">
            <CardHeader
              title="Антропометричні заміри стрічкою (см)"
              titleId="body-measurements-title"
              icon={<Ruler className="size-4 text-brand-strong" aria-hidden="true" />}
            />

            <form onSubmit={handleSaveMeasurements} className="flex flex-col gap-4">
              <p className="text-xs text-muted">
                Введіть заміри тіла сантиметровою стрічкою натщесерце. За ними автоматично
                розраховується відсоток підшкірного жиру за військовим стандартом US Navy та ваша
                суха м&apos;язова маса.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Талія (на рівні пупка, см)
                  <input
                    type="number"
                    min={45}
                    max={180}
                    step="0.5"
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Шия (під гортанню, см)
                  <input
                    type="number"
                    min={25}
                    max={70}
                    step="0.5"
                    value={neckCm}
                    onChange={(e) => setNeckCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Стегна / Таз (см)
                  <input
                    type="number"
                    min={55}
                    max={180}
                    step="0.5"
                    value={hipsCm}
                    onChange={(e) => setHipsCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Грудна клітка (см)
                  <input
                    type="number"
                    min={60}
                    max={180}
                    step="0.5"
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Біцепс (у напрузі, см)
                  <input
                    type="number"
                    min={20}
                    max={65}
                    step="0.5"
                    value={bicepCm}
                    onChange={(e) => setBicepCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>
              </div>

              <Button type="submit" size="lg" className="w-full">
                <Check className="size-5" aria-hidden="true" />
                Зберегти заміри тіла
              </Button>
            </form>
          </Card>

          <Card aria-labelledby="body-comp-title" className="lg:col-span-6">
            <CardHeader
              title="Біомеханічний склад тіла (Body Composition)"
              titleId="body-comp-title"
              icon={<HeartPulse className="size-4 text-brand-strong" aria-hidden="true" />}
              action={
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
                  {bodyComp.category}
                </span>
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-brand-soft p-4">
                <p className="text-xs font-bold text-brand-strong">Підшкірний жир</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
                  {bodyComp.bodyFatPct}%
                </p>
                <p className="mt-0.5 text-xs text-muted">{bodyComp.fatMassKg} кг жирової тканини</p>
              </div>

              <div className="rounded-2xl bg-sunken p-4">
                <p className="text-xs font-bold text-protein">Суха маса (LBM)</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
                  {bodyComp.leanMassKg} <span className="text-sm font-medium text-muted">кг</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">М&apos;язи, кістки та вода</p>
              </div>

              <div className="rounded-2xl bg-sunken p-4">
                <p className="text-xs font-bold text-ink">Індекс Талія / Зріст</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
                  {bodyComp.waistToHeight}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {bodyComp.waistToHeight < 0.5 ? "Оптимум здоров'я (<0.50)" : "Бажано <0.50"}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-sunken p-4 text-xs leading-relaxed text-muted">
              <p className="font-bold text-ink">
                <Activity className="mr-1 inline size-3.5 text-brand-strong" aria-hidden="true" />
                Порада спортивного фізіолога:
              </p>
              <p className="mt-1">
                Для збереження та росту вашої сухої маси тіла (<strong>{bodyComp.leanMassKg} кг</strong>)
                оптимальна норма білка становить{" "}
                <strong>{Math.round(bodyComp.leanMassKg * 2.2)} г білка на добу</strong> у перерахунку на
                сиру вагу м&apos;яса, риби та молочних продуктів.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ВКЛАДКА 3: АКАУНТ, ХАРЧОВІ ВПОДОБАННЯ ТА БЕКАП */}
      {subTab === "account" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Card aria-labelledby="diet-prefs-title" className="lg:col-span-6">
            <CardHeader
              title="Харчові фільтри та обмеження раціону"
              titleId="diet-prefs-title"
              icon={<Sparkles className="size-4 text-brand-strong" aria-hidden="true" />}
              action={
                <span className="text-xs font-semibold text-muted">
                  Обрано: {dietPrefs.length}
                </span>
              }
            />

            <p className="text-xs text-muted">
              Відмітьте особливості вашого раціону — вони зберігаються у вашому профілі та
              враховуються при плануванні меню:
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {DIETARY_TAGS.map((tag) => {
                const active = dietPrefs.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleDietPref(tag.id)}
                    className={cn(
                      "flex flex-col justify-between gap-1 rounded-2xl p-3 text-left ring-1 transition-all",
                      active
                        ? "bg-brand-soft text-ink ring-brand-strong"
                        : "bg-sunken text-ink ring-line hover:bg-raised",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{tag.label}</span>
                      {active ? (
                        <Check className="size-3.5 text-brand-strong" aria-hidden="true" />
                      ) : null}
                    </div>
                    <span className="text-[11px] text-muted">{tag.desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card aria-labelledby="account-data-title" className="lg:col-span-6">
            <CardHeader
              title="Керування акаунтом, підпискою та бекапом"
              titleId="account-data-title"
              icon={<Settings className="size-4 text-brand-strong" aria-hidden="true" />}
            />

            <div className="flex flex-col gap-3">
              {/* Статус авторизації */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken p-4 ring-1 ring-line">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-base font-bold text-brand-strong">
                    {draftProfile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-ink">{draftProfile.name}</p>
                    <p className="text-xs text-muted">
                      {authEmail
                        ? `Авторизовано: ${authEmail}`
                        : `Локальний профіль (збережено акаунтів: ${storedAccounts.length})`}
                    </p>
                  </div>
                </div>

                {authEmail ? (
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    <LogOut className="size-4 text-danger" aria-hidden="true" />
                    <span>Вийти</span>
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={() => openAuthModal("login")}>
                    <LogIn className="size-4" aria-hidden="true" />
                    <span>Увійти</span>
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-sunken p-3.5">
                <div>
                  <p className="text-sm font-bold">
                    {planTier === "pro" ? "Vitalio Pro (Активний)" : "Безкоштовний план (Free)"}
                  </p>
                  <p className="text-xs text-muted">
                    {planTier === "pro"
                      ? "Безлімітний AI-сканер та розширена аналітика"
                      : "Доступний 7-денний безкоштовний тріал Pro"}
                  </p>
                </div>
                <Button variant="soft" size="sm" onClick={openPaywall}>
                  {planTier === "pro" ? "Тариф" : "Pro →"}
                </Button>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={openWelcomeModal}
                  className="w-full justify-center"
                >
                  <Sparkles className="size-4 text-brand-strong" aria-hidden="true" />
                  <span>🎯 Пройти опитування цілей заново</span>
                </Button>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      clearAll.mutate(undefined, {
                        onSuccess: () => pushToast("Всі дані очищено до 0 (чистий старт)"),
                      })
                    }
                    className="justify-center text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    <span>Скинути все до 0</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      resetDemo.mutate(undefined, {
                        onSuccess: () => pushToast("Тестові демо-дані успішно завантажено"),
                      })
                    }
                    className="justify-center"
                  >
                    <RotateCcw className="size-4" aria-hidden="true" />
                    <span>Завантажити демо-дані</span>
                  </Button>
                </div>

                <Button variant="secondary" size="sm" onClick={handleExport} className="w-full justify-center">
                  <Download className="size-4" aria-hidden="true" />
                  <span>Експорт щоденника (JSON)</span>
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

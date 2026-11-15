"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  LogIn,
  Mail,
  Scale,
  Sparkles,
  Target,
  User,
  UserPlus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Wordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { readActiveEmail, readStoredAccounts } from "@/features/auth/auth-sheet";
import { useLogWeight, useProfile, useToday, useUpdateProfile } from "@/hooks/use-app-data";
import { cn } from "@/lib/cn";
import { calculateTargets } from "@/lib/nutrition";
import { useUiStore } from "@/stores/ui-store";
import type { ActivityLevel, GoalType, Sex, UserProfile } from "@/types/domain";

export const WELCOME_STORAGE_KEY = "vitalio:has-seen-preview:v2";
const ACCOUNTS_STORAGE_KEY = "vitalio:accounts:v1";
const ACTIVE_EMAIL_KEY = "vitalio:active-email:v1";

type ScreenMode = "quiz" | "login";
type QuizStep = 1 | 2 | 3 | 4 | 5 | 6;

interface GoalOption {
  id: GoalType;
  label: string;
  badge: string;
  desc: string;
  icon: typeof Target;
  accent: string;
  badgeBg: string;
}

const GOAL_OPTIONS: readonly GoalOption[] = [
  {
    id: "lose",
    label: "Схуднення & Спалювання жиру",
    badge: "Дефіцит −20%",
    desc: "Зменшити відсоток підшкірного жиру без втрати м'язової маси та уповільнення метаболізму.",
    icon: Flame,
    accent: "text-rose-500",
    badgeBg: "bg-rose-500/10 text-rose-500",
  },
  {
    id: "maintain",
    label: "Підтримка форми & Баланс",
    badge: "Баланс 100%",
    desc: "Зберегти поточну вагу, покращити якість тіла, тонус, здоров'я та мати високий рівень енергії.",
    icon: Scale,
    accent: "text-emerald-500",
    badgeBg: "bg-emerald-500/10 text-emerald-500",
  },
  {
    id: "gain",
    label: "Набір м'язової маси",
    badge: "Профіцит +10%",
    desc: "Збільшити м'язи, силу та витривалість завдяки контрольованому профіциту та високому білку.",
    icon: Dumbbell,
    accent: "text-violet-500",
    badgeBg: "bg-violet-500/10 text-violet-500",
  },
];

interface ActivityOption {
  id: ActivityLevel;
  label: string;
  factorText: string;
  desc: string;
  iconText: string;
}

const ACTIVITY_OPTIONS: readonly ActivityOption[] = [
  {
    id: "sedentary",
    label: "Сидячий спосіб життя",
    factorText: "×1.2",
    desc: "Офісна чи дистанційна робота, пересування авто, менше 5 000 кроків на день.",
    iconText: "🛋️",
  },
  {
    id: "light",
    label: "Легка активність",
    factorText: "×1.375",
    desc: "1–2 легкі тренування на тиждень або 6 000–8 000 кроків щодня.",
    iconText: "🚶",
  },
  {
    id: "moderate",
    label: "Помірна активність",
    factorText: "×1.55",
    desc: "3–4 тренування на тиждень (зал, біг, фітнес) або активна робота на ногах.",
    iconText: "🏃",
  },
  {
    id: "high",
    label: "Висока активність",
    factorText: "×1.725",
    desc: "5–6 інтенсивних силових або кардіо-тренувань на тиждень, фізична праця.",
    iconText: "🏋️",
  },
  {
    id: "extreme",
    label: "Професійний спорт",
    factorText: "×1.9",
    desc: "Щоденні дворазові важкі навантаження або надважка фізична робота.",
    iconText: "⚡",
  },
];

function evaluateBmi(weightKg: number, heightCm: number): {
  bmi: number;
  label: string;
  color: string;
} {
  const heightM = Math.max(1.2, heightCm / 100);
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  if (bmi < 18.5) return { bmi, label: "Дефіцит маси", color: "text-amber-500" };
  if (bmi < 25) return { bmi, label: "Нормальна маса", color: "text-emerald-500" };
  if (bmi < 30) return { bmi, label: "Помірний надлишок", color: "text-amber-500" };
  return { bmi, label: "Високий ІМТ", color: "text-rose-500" };
}

function saveAccount(email: string, password: string, profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const accounts = raw ? (JSON.parse(raw) as Array<{ email: string }>) : [];
    const filtered = Array.isArray(accounts)
      ? accounts.filter((a) => a.email.toLowerCase() !== email.toLowerCase())
      : [];
    window.localStorage.setItem(
      ACCOUNTS_STORAGE_KEY,
      JSON.stringify([
        {
          email,
          passwordHash: btoa(encodeURIComponent(password || "vitalio")),
          createdAt: new Date().toISOString(),
          profile,
        },
        ...filtered,
      ]),
    );
    window.localStorage.setItem(ACTIVE_EMAIL_KEY, email);
  } catch {
    // Ігноруємо обмеження
  }
}

export function OnboardingGateScreen({ onComplete }: { onComplete: () => void }) {
  const today = useToday();
  const { data: currentProfile } = useProfile();
  const updateProfile = useUpdateProfile();
  const logWeight = useLogWeight();
  const setAuthEmail = useUiStore((state) => state.setAuthEmail);
  const pushToast = useUiStore((state) => state.pushToast);

  const [mode, setMode] = useState<ScreenMode>("quiz");
  const [step, setStep] = useState<QuizStep>(1);

  // Поля анкети
  const [goal, setGoal] = useState<GoalType>(currentProfile?.goal ?? "lose");
  const [sex, setSex] = useState<Sex>(currentProfile?.sex ?? "male");
  const [age, setAge] = useState<string>(String(currentProfile?.age ?? 26));
  const [heightCm, setHeightCm] = useState<string>(String(currentProfile?.heightCm ?? 178));
  const [weightKg, setWeightKg] = useState<string>(String(currentProfile?.weightKg ?? 78));
  const [targetWeightKg, setTargetWeightKg] = useState<string>(
    String(currentProfile?.targetWeightKg ?? 72),
  );
  const [activity, setActivity] = useState<ActivityLevel>(
    currentProfile?.activity ?? "moderate",
  );
  const [name, setName] = useState<string>(
    currentProfile?.name && currentProfile.name !== "Користувач" && currentProfile.name !== "Дмитро"
      ? currentProfile.name
      : "",
  );
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  // Поля входу
  const [loginEmail, setLoginEmail] = useState<string>(() => readActiveEmail() ?? "");
  const [loginPassword, setLoginPassword] = useState<string>("");
  const [errorText, setErrorText] = useState<string | null>(null);

  const parsedWeight = Math.min(250, Math.max(35, Number(weightKg) || 75));
  const parsedTargetWeight = Math.min(250, Math.max(35, Number(targetWeightKg) || 70));
  const parsedHeight = Math.min(230, Math.max(120, Number(heightCm) || 175));
  const parsedAge = Math.min(100, Math.max(14, Number(age) || 26));

  const draftProfile: UserProfile = useMemo(
    () => ({
      name: name.trim() || "Користувач",
      sex,
      age: parsedAge,
      heightCm: parsedHeight,
      weightKg: parsedWeight,
      targetWeightKg: parsedTargetWeight,
      activity,
      goal,
    }),
    [name, sex, parsedAge, parsedHeight, parsedWeight, parsedTargetWeight, activity, goal],
  );

  const targets = useMemo(() => calculateTargets(draftProfile), [draftProfile]);
  const bmi = useMemo(
    () => evaluateBmi(parsedWeight, parsedHeight),
    [parsedWeight, parsedHeight],
  );

  const weightDelta = Math.round((parsedTargetWeight - parsedWeight) * 10) / 10;

  const sexOptions: readonly SegmentOption<Sex>[] = [
    { value: "male", label: "👨 Чоловіча" },
    { value: "female", label: "👩 Жіноча" },
  ];

  const handleNextFromStep2 = () => {
    setErrorText(null);
    if (parsedAge < 14 || parsedAge > 100) {
      setErrorText("Вкажіть реальний вік від 14 до 100 років.");
      return;
    }
    if (parsedHeight < 120 || parsedHeight > 230) {
      setErrorText("Вкажіть зріст від 120 до 230 см.");
      return;
    }
    setStep(3);
  };

  const handleNextFromStep3 = () => {
    setErrorText(null);
    if (parsedWeight < 35 || parsedWeight > 250) {
      setErrorText("Вкажіть вагу від 35 до 250 кг.");
      return;
    }
    setStep(4);
  };

  const handleNextFromStep5 = () => {
    setErrorText(null);
    if (!name.trim()) {
      setErrorText("Будь ласка, напишіть, як до вас звертатися.");
      return;
    }
    setStep(6);
  };

  const finishAndEnterApp = (profileToSave: UserProfile) => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WELCOME_STORAGE_KEY, "true");
      } catch {
        // Ігноруємо помилки
      }
    }
    updateProfile.mutate(profileToSave, {
      onSuccess: () => {
        if (today) {
          logWeight.mutate({ date: today, weightKg: profileToSave.weightKg });
        }
        pushToast(`Вітаємо, ${profileToSave.name}! Ваш щоденник активовано`);
        onComplete();
      },
    });
  };

  const handleFinishQuiz = () => {
    const finalName = name.trim() || "Друже";
    const finalProfile: UserProfile = { ...draftProfile, name: finalName };

    if (email.trim() && email.includes("@")) {
      saveAccount(email.trim(), password || "vitalio", finalProfile);
      setAuthEmail(email.trim());
    }

    finishAndEnterApp(finalProfile);
  };

  const handleSkipToApp = () => {
    const fallbackProfile: UserProfile = {
      name: "Користувач",
      sex: "female",
      age: 26,
      heightCm: 168,
      weightKg: 62,
      targetWeightKg: 60,
      activity: "light",
      goal: "maintain",
    };
    finishAndEnterApp(fallbackProfile);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);
    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      setErrorText("Введіть коректну адресу електронної пошти.");
      return;
    }

    const accounts = readStoredAccounts();
    const found = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (found) {
      setAuthEmail(found.email);
      finishAndEnterApp(found.profile);
      return;
    }

    // Якщо новий акаунт при вході
    const fallbackName = cleanEmail.split("@")[0] ?? "Користувач";
    const nextProfile: UserProfile = {
      ...draftProfile,
      name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
    };
    saveAccount(cleanEmail, loginPassword || "vitalio", nextProfile);
    setAuthEmail(cleanEmail);
    finishAndEnterApp(nextProfile);
  };

  const handleOAuthQuick = (provider: "Google" | "Apple") => {
    const demoEmail = provider === "Google" ? "user.vitalio@gmail.com" : "user@icloud.com";
    const nextProfile: UserProfile = {
      ...draftProfile,
      name: provider === "Google" ? "Олександр" : "Анна",
    };
    saveAccount(demoEmail, "vitalio2026", nextProfile);
    setAuthEmail(demoEmail);
    finishAndEnterApp(nextProfile);
  };

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas text-ink">
      {/* Верхня панель (Бренд + Перемикач входу/квізу + Тема) */}
      <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-8">
        <Wordmark />

        <div className="flex items-center gap-2.5">
          {mode === "quiz" ? (
            <button
              type="button"
              onClick={() => {
                setErrorText(null);
                setMode("login");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-muted ring-1 ring-line transition-colors hover:bg-raised hover:text-ink"
            >
              <LogIn className="size-3.5 text-brand-strong" aria-hidden="true" />
              <span>Вже є акаунт? Увійти</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorText(null);
                setMode("quiz");
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3 text-xs font-bold text-muted ring-1 ring-line transition-colors hover:bg-raised hover:text-ink"
            >
              <UserPlus className="size-3.5 text-brand-strong" aria-hidden="true" />
              <span>Почати розрахунок норми</span>
            </button>
          )}

          <ThemeToggle />
        </div>
      </header>

      {/* Головний контейнер по центру екрана */}
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
        {mode === "quiz" ? (
          <div className="flex flex-col gap-5">
            {/* Прогрес опитування (1..6) */}
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-4 py-2.5 text-xs font-semibold text-muted ring-1 ring-line">
              <span className="font-bold text-ink">Крок {step} з 6</span>
              <div className="flex h-1.5 flex-1 max-w-48 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full bg-brand-strong transition-all duration-300"
                  style={{ width: `${(step / 6) * 100}%` }}
                />
              </div>
              <span className="tabular-nums font-bold text-ink">
                {Math.round((step / 6) * 100)}%
              </span>
            </div>

            {errorText ? (
              <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500 ring-1 ring-rose-500/20">
                {errorText}
              </div>
            ) : null}

            {/* КРОК 1: ГОЛОВНА МЕТА */}
            {step === 1 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                    <Sparkles className="size-3" />
                    Крок 1 · Ваша мета
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Яка ваша головна ціль?
                  </h1>
                  <p className="mt-1.5 text-xs text-muted sm:text-sm">
                    Ми розрахуємо баланс калорій, білків, жирів і вуглеводів під ваше індивідуальне
                    завдання.
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-1">
                  {GOAL_OPTIONS.map((item) => {
                    const active = goal === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setGoal(item.id);
                          setStep(2);
                        }}
                        className={cn(
                          "flex items-start gap-4 rounded-3xl p-4.5 text-left transition-all",
                          active
                            ? "bg-surface shadow-card ring-2 ring-brand-strong"
                            : "bg-sunken hover:bg-raised ring-1 ring-line",
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-12 shrink-0 place-items-center rounded-2xl bg-surface ring-1 ring-line",
                            item.accent,
                          )}
                        >
                          <Icon className="size-6" aria-hidden="true" />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold text-ink">{item.label}</span>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                                item.badgeBg,
                              )}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted leading-relaxed sm:text-sm">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* КРОК 2: СТАТЬ ТА ВІК */}
            {step === 2 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                    Крок 2 · Базовий метаболізм
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Розкажіть трохи про себе
                  </h1>
                  <p className="mt-1.5 text-xs text-muted sm:text-sm">
                    Стать, вік та зріст визначають швидкість метаболізму внутрішніх органів у стані
                    спокою (BMR).
                  </p>
                </div>

                <div className="flex flex-col gap-4 rounded-3xl bg-sunken p-5 ring-1 ring-line">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-muted">Біологічна стать:</span>
                    <SegmentedControl
                      label="Біологічна стать"
                      value={sex}
                      onChange={(val) => setSex(val)}
                      options={sexOptions}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                      Вік (років):
                      <input
                        type="number"
                        min={14}
                        max={100}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="h-12 rounded-2xl bg-surface px-4 text-base font-bold tabular-nums text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                      Зріст (см):
                      <input
                        type="number"
                        min={120}
                        max={230}
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="h-12 rounded-2xl bg-surface px-4 text-base font-bold tabular-nums text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl bg-surface p-3.5 text-xs text-muted ring-1 ring-line">
                    💡 Розрахунок виконується за доказовим золотим стандартом дієтології Mifflin — St
                    Jeor.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    <span>Назад</span>
                  </Button>
                  <Button variant="primary" size="md" onClick={handleNextFromStep2}>
                    <span>Продовжити</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}

            {/* КРОК 3: ПОТОЧНА ТА БАЖАНА ВАГА */}
            {step === 3 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                    Крок 3 · Антропометрія
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Ваша вага та орієнтир
                  </h1>
                  <p className="mt-1.5 text-xs text-muted sm:text-sm">
                    Вкажіть вашу поточну вагу та вагу, до якої ви прагнете прийти.
                  </p>
                </div>

                <div className="flex flex-col gap-4 rounded-3xl bg-sunken p-5 ring-1 ring-line">
                  <div className="grid grid-cols-2 gap-3.5">
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                      Поточна вага (кг):
                      <input
                        type="number"
                        step="0.5"
                        min={35}
                        max={250}
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="h-12 rounded-2xl bg-surface px-4 text-base font-bold tabular-nums text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </label>

                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                      Цільова вага (кг):
                      <input
                        type="number"
                        step="0.5"
                        min={35}
                        max={250}
                        value={targetWeightKg}
                        onChange={(e) => setTargetWeightKg(e.target.value)}
                        className="h-12 rounded-2xl bg-surface px-4 text-base font-bold tabular-nums text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </label>
                  </div>

                  {/* Живий інсайт різниці ваги та ІМТ */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-line">
                      <span className="text-[10px] font-bold text-muted uppercase">Різниця</span>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">
                        {weightDelta > 0 ? `+${weightDelta} кг` : `${weightDelta} кг`}
                      </p>
                      <p className="text-[11px] text-muted">
                        {weightDelta < 0
                          ? `~${Math.abs(Math.round(weightDelta / 0.7))} тижнів темпу`
                          : weightDelta > 0
                            ? "Набір маси"
                            : "Підтримка форми"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-surface p-3.5 ring-1 ring-line">
                      <span className="text-[10px] font-bold text-muted uppercase">Індекс ІМТ</span>
                      <p className={cn("mt-0.5 text-lg font-bold tabular-nums", bmi.color)}>
                        {bmi.bmi}
                      </p>
                      <p className="text-[11px] text-muted">{bmi.label}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    <span>Назад</span>
                  </Button>
                  <Button variant="primary" size="md" onClick={handleNextFromStep3}>
                    <span>Продовжити</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}

            {/* КРОК 4: РІВЕНЬ АКТИВНОСТІ */}
            {step === 4 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                    Крок 4 · Спосіб життя
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Рівень щоденної активності
                  </h1>
                  <p className="mt-1.5 text-xs text-muted sm:text-sm">
                    Фізична активність визначає повні добові витрати енергії (TDEE).
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  {ACTIVITY_OPTIONS.map((item) => {
                    const active = activity === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActivity(item.id);
                          setStep(5);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3.5 rounded-2xl p-4 text-left transition-all",
                          active
                            ? "bg-surface ring-2 ring-brand-strong shadow-card"
                            : "bg-sunken hover:bg-raised ring-1 ring-line",
                        )}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-2xl">{item.iconText}</span>
                          <div>
                            <p className="text-sm font-bold text-ink">{item.label}</p>
                            <p className="text-xs text-muted">{item.desc}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">
                          {item.factorText}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    <span>Назад</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {/* КРОК 5: ПЕРСОНАЛІЗАЦІЯ (ІМ'Я ТА EMAIL) */}
            {step === 5 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                    Крок 5 · Персоналізація
                  </span>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Як до вас звертатися?
                  </h1>
                  <p className="mt-1.5 text-xs text-muted sm:text-sm">
                    Щоб налаштувати персональні привітання, зберегти акаунт та зафіксувати результат.
                  </p>
                </div>

                <div className="flex flex-col gap-4 rounded-3xl bg-sunken p-5 ring-1 ring-line">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                    Ваше ім&apos;я:
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        type="text"
                        required
                        placeholder="Наприклад: Олексій або Марина"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 w-full rounded-2xl bg-surface pl-10 pr-4 text-base font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </div>
                  </label>

                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                    Електронна пошта (необов&apos;язково):
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                      <input
                        type="email"
                        placeholder="ваша_пошта@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 w-full rounded-2xl bg-surface pl-10 pr-4 text-sm font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                      />
                    </div>
                  </label>

                  {email.trim() ? (
                    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                      Пароль для захисту акаунта:
                      <div className="relative">
                        <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Мінімум 6 символів"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-12 w-full rounded-2xl bg-surface pl-10 pr-12 text-sm font-semibold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </label>
                  ) : null}

                  <p className="text-[11px] text-muted">
                    Усі дані зберігаються локально у вашому браузері — 100% конфіденційно.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep(4)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    <span>Назад</span>
                  </Button>
                  <Button variant="primary" size="md" onClick={handleNextFromStep5}>
                    <span>Розрахувати план</span>
                    <Sparkles className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}

            {/* КРОК 6: ПЕРСОНАЛЬНИЙ ПЛАН ГОТОВИЙ */}
            {step === 6 ? (
              <div className="flex flex-col gap-5">
                <div className="rounded-3xl bg-brand-soft/80 p-6 ring-1 ring-brand-strong/20">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-strong px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      <CheckCircle2 className="size-3" aria-hidden="true" />
                      План сформовано
                    </span>
                  </div>
                  <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Вітаємо, {name.trim() || "Друже"}! 🎉
                  </h1>
                  <p className="mt-1 text-xs text-muted sm:text-sm">
                    Ваша персональна норма за формулою Міффліна — Сан Жеора:
                  </p>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight text-ink tabular-nums sm:text-5xl">
                      <AnimatedNumber value={targets.kcal} />
                    </span>
                    <span className="text-sm font-bold text-muted">ккал / день</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    Базальний обмін (BMR): <strong className="text-ink">{targets.bmr} ккал</strong> ·
                    Витрати (TDEE): <strong className="text-ink">{targets.tdee} ккал</strong>
                  </p>
                </div>

                {/* Макронутрієнти */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl bg-sunken p-3.5">
                    <span className="text-xs font-bold text-protein">Білки</span>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-ink">
                      {targets.protein} г
                    </p>
                    <p className="text-[11px] text-muted">{targets.protein * 4} ккал</p>
                  </div>

                  <div className="rounded-2xl bg-sunken p-3.5">
                    <span className="text-xs font-bold text-fat">Жири</span>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-ink">{targets.fat} г</p>
                    <p className="text-[11px] text-muted">{targets.fat * 9} ккал</p>
                  </div>

                  <div className="rounded-2xl bg-sunken p-3.5">
                    <span className="text-xs font-bold text-carbs">Вуглеводи</span>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-ink">
                      {targets.carbs} г
                    </p>
                    <p className="text-[11px] text-muted">{targets.carbs * 4} ккал</p>
                  </div>

                  <div className="rounded-2xl bg-sunken p-3.5">
                    <span className="text-xs font-bold text-water">Вода</span>
                    <p className="mt-0.5 text-xl font-bold tabular-nums text-ink">
                      {targets.waterMl} мл
                    </p>
                    <p className="text-[11px] text-muted">33 мл × кг</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface p-4 text-xs text-muted ring-1 ring-line">
                  🌿 <strong className="text-ink">Чистий старт з 0:</strong> на сьогодні у вашому
                  щоденнику зафіксовано <strong className="text-ink">0 спожитих калорій</strong>.
                  Усі продукти рахуються на суху та сиру вагу для 100% наукової точності.
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleFinishQuiz}
                    className="w-full justify-center shadow-lg"
                  >
                    <span>🚀 Відкрити мій щоденник Vitalio</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>

                  <Button variant="ghost" size="sm" onClick={() => setStep(5)} className="justify-center">
                    <span>← Змінити параметри</span>
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Пропустити опитування */}
            {step < 6 ? (
              <div className="flex justify-center pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleSkipToApp}
                  className="text-xs font-semibold text-muted hover:text-ink transition-colors"
                >
                  Оглянути додаток без опитування (Чистий старт з 0)
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          /* РЕЖИМ ВХОДУ (LOGIN) */
          <div className="flex flex-col gap-5">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-strong">
                Акаунт Vitalio
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Вхід у збережений профіль
              </h1>
              <p className="mt-1.5 text-xs text-muted sm:text-sm">
                Увійдіть, щоб відновити ваші персональні норми, історію ваги та налаштування.
              </p>
            </div>

            {errorText ? (
              <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs font-bold text-rose-500 ring-1 ring-rose-500/20">
                {errorText}
              </div>
            ) : null}

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4 rounded-3xl bg-sunken p-5 ring-1 ring-line">
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                Email:
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12 w-full rounded-2xl bg-surface pl-10 pr-4 text-base font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                Пароль:
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Введіть ваш пароль"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12 w-full rounded-2xl bg-surface pl-10 pr-12 text-base font-bold text-ink ring-1 ring-line outline-none focus:ring-2 focus:ring-brand-strong"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <Button type="submit" variant="primary" size="lg" className="mt-2 w-full justify-center">
                <LogIn className="size-4" aria-hidden="true" />
                <span>Увійти в акаунт</span>
              </Button>
            </form>

            <div className="flex flex-col gap-2.5">
              <div className="relative my-2 text-center text-xs text-muted">
                <span className="relative z-10 bg-canvas px-3 font-semibold">або швидкий тестовий вхід</span>
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-line" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="secondary" size="md" onClick={() => handleOAuthQuick("Google")} className="justify-center">
                  <span>Google</span>
                </Button>
                <Button variant="secondary" size="md" onClick={() => handleOAuthQuick("Apple")} className="justify-center">
                  <span>Apple ID</span>
                </Button>
              </div>

              <div className="flex justify-center pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    setErrorText(null);
                    setMode("quiz");
                  }}
                  className="text-xs font-bold text-brand-strong hover:underline"
                >
                  ← Немає акаунта? Пройти розрахунок норми
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Flame,
  KeyRound,
  LogIn,
  Mail,
  Scale,
  ShieldCheck,
  Sparkles,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { useLogWeight, useProfile, useToday, useUpdateProfile } from "@/hooks/use-app-data";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { ACTIVITY_FACTOR, calculateTargets } from "@/lib/nutrition";
import { useUiStore, type AuthModalMode } from "@/stores/ui-store";
import type { ActivityLevel, GoalType, Sex, UserProfile } from "@/types/domain";

const ACCOUNTS_STORAGE_KEY = "vitalio:accounts:v1";
const ACTIVE_EMAIL_KEY = "vitalio:active-email:v1";

export interface StoredAccount {
  email: string;
  passwordHash: string;
  createdAt: string;
  profile: UserProfile;
}

export function readStoredAccounts(): StoredAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredAccount[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readActiveEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_EMAIL_KEY);
  } catch {
    return null;
  }
}

function saveAccountToStorage(account: StoredAccount): void {
  if (typeof window === "undefined") return;
  try {
    const existing = readStoredAccounts().filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase(),
    );
    window.localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([account, ...existing]));
    window.localStorage.setItem(ACTIVE_EMAIL_KEY, account.email);
  } catch {
    // Ігноруємо помилки переповнення сховища.
  }
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

type RegisterStep = 1 | 2 | 3;

function evaluatePasswordStrength(password: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
  color: string;
} {
  if (password.length === 0) return { score: 0, label: "Введіть пароль (мін. 6 символів)", color: "bg-line" };
  if (password.length < 6) return { score: 1, label: "Занадто короткий пароль", color: "bg-carbs" };
  const hasDigits = /\d/.test(password);
  const hasUpperOrSpecial = /[A-ZА-ЯІЇЄҐ!@#$%^&*]/.test(password);
  if (password.length >= 8 && hasDigits && hasUpperOrSpecial) {
    return { score: 3, label: "Надійний пароль", color: "bg-brand-strong" };
  }
  return { score: 2, label: "Середня надійність", color: "bg-fat" };
}

function evaluateBmi(weightKg: number, heightCm: number): { bmi: number; label: string } {
  const heightM = Math.max(1.2, heightCm / 100);
  const bmi = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  if (bmi < 18.5) return { bmi, label: "Дефіцит маси" };
  if (bmi < 25) return { bmi, label: "Нормальна маса тіла" };
  if (bmi < 30) return { bmi, label: "Надлишкова маса" };
  return { bmi, label: "Високий ІМТ" };
}

export function AuthSheet() {
  const open = useUiStore((state) => state.authModalOpen);
  const initialMode = useUiStore((state) => state.authModalMode);
  const closeAuthModal = useUiStore((state) => state.closeAuthModal);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && closeAuthModal()}
      title="Акаунт та персональний онбординг Vitalio"
      description="Створення акаунта, розрахунок індивідуальної норми КБЖУ за 3 кроки або вхід у збережений профіль."
    >
      {open ? <AuthSheetBody initialMode={initialMode} onDone={closeAuthModal} /> : null}
    </BottomSheet>
  );
}

function AuthSheetBody({
  initialMode,
  onDone,
}: {
  initialMode: AuthModalMode;
  onDone: () => void;
}) {
  const t = useT();
  const today = useToday();
  const { data: currentProfile } = useProfile();
  const updateProfile = useUpdateProfile();
  const logWeight = useLogWeight();
  const pushToast = useUiStore((state) => state.pushToast);
  const setAuthEmail = useUiStore((state) => state.setAuthEmail);

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [step, setStep] = useState<RegisterStep>(1);

  // Поля реєстрації (Крок 1: Акаунт)
  const [name, setName] = useState(currentProfile?.name ?? "");
  const [email, setEmail] = useState(() => readActiveEmail() ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Поля антропометрії (Крок 2: Тіло)
  const [sex, setSex] = useState<Sex>(currentProfile?.sex ?? "male");
  const [age, setAge] = useState(String(currentProfile?.age ?? 26));
  const [heightCm, setHeightCm] = useState(String(currentProfile?.heightCm ?? 178));
  const [weightKg, setWeightKg] = useState(String(currentProfile?.weightKg ?? 76));
  const [targetWeightKg, setTargetWeightKg] = useState(
    String(currentProfile?.targetWeightKg ?? 70),
  );

  // Поля цілі та активності (Крок 3: План)
  const [goal, setGoal] = useState<GoalType>(currentProfile?.goal ?? "lose");
  const [activity, setActivity] = useState<ActivityLevel>(
    currentProfile?.activity ?? "moderate",
  );

  // Поля входу
  const [loginEmail, setLoginEmail] = useState(() => readActiveEmail() ?? "");
  const [loginPassword, setLoginPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const storedAccounts = useMemo(() => readStoredAccounts(), []);

  const draftProfile: UserProfile = useMemo(
    () => ({
      name: name.trim() || "Олексій",
      sex,
      age: Math.min(100, Math.max(14, Number(age) || 26)),
      heightCm: Math.min(240, Math.max(120, Number(heightCm) || 178)),
      weightKg: Math.min(300, Math.max(30, Number(weightKg) || 76)),
      targetWeightKg: Math.min(300, Math.max(30, Number(targetWeightKg) || 70)),
      activity,
      goal,
    }),
    [name, sex, age, heightCm, weightKg, targetWeightKg, activity, goal],
  );

  const previewTargets = useMemo(() => calculateTargets(draftProfile), [draftProfile]);
  const bmiInfo = useMemo(
    () => evaluateBmi(draftProfile.weightKg, draftProfile.heightCm),
    [draftProfile.weightKg, draftProfile.heightCm],
  );
  const pwdStrength = useMemo(() => evaluatePasswordStrength(password), [password]);

  const sexOptions: readonly SegmentOption<Sex>[] = [
    { value: "male", label: "Чоловіча" },
    { value: "female", label: "Жіноча" },
  ];

  const goalOptions: readonly SegmentOption<GoalType>[] = [
    { value: "lose", label: "🔥 Схуднення (−20%)" },
    { value: "maintain", label: "⚖️ Підтримка" },
    { value: "gain", label: "💪 Набір (+10%)" },
  ];

  const handleOAuthQuickFill = (provider: "Google" | "Apple") => {
    setAuthError(null);
    if (!name.trim()) setName("Дмитро");
    if (!email.trim()) {
      setEmail(provider === "Google" ? "dmytro.vitalio@gmail.com" : "dmytro@icloud.com");
    }
    setPassword("Vitalio2026!");
    setStep(2);
    pushToast(`Підключено профіль ${provider} — вкажіть параметри тіла`);
  };

  const handleStep1Next = (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    if (!name.trim()) {
      setAuthError("Будь ласка, введіть ваше ім'я.");
      return;
    }
    if (!email.includes("@") || email.trim().length < 5) {
      setAuthError("Введіть коректну адресу електронної пошти.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Пароль має містити щонайменше 6 символів.");
      return;
    }
    setStep(2);
  };

  const handleCompleteRegistration = () => {
    const cleanEmail = email.trim() || "user@vitalio.app";
    saveAccountToStorage({
      email: cleanEmail,
      passwordHash: btoa(encodeURIComponent(password || "vitalio")),
      createdAt: new Date().toISOString(),
      profile: draftProfile,
    });
    setAuthEmail(cleanEmail);

    updateProfile.mutate(draftProfile, {
      onSuccess: () => {
        if (today) {
          logWeight.mutate({ date: today, weightKg: draftProfile.weightKg });
        }
        pushToast(
          `Вітаємо, ${draftProfile.name}! Ваша норма: ${previewTargets.kcal} ккал/день`,
        );
        onDone();
      },
    });
  };

  const handleLoginSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    const clean = loginEmail.trim().toLowerCase();
    if (!clean.includes("@")) {
      setAuthError("Введіть коректний Email для входу.");
      return;
    }

    const found = readStoredAccounts().find((a) => a.email.toLowerCase() === clean);
    if (found) {
      setAuthEmail(found.email);
      updateProfile.mutate(found.profile, {
        onSuccess: () => {
          pushToast(`З поверненням, ${found.profile.name}!`);
          onDone();
        },
      });
      return;
    }

    // Якщо акаунта ще немає в списку — створюємо сесію з поточним профілем
    const fallbackName = clean.split("@")[0] ?? "Користувач";
    const nextProfile: UserProfile = {
      ...draftProfile,
      name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
    };
    saveAccountToStorage({
      email: loginEmail.trim(),
      passwordHash: btoa(encodeURIComponent(loginPassword || "vitalio")),
      createdAt: new Date().toISOString(),
      profile: nextProfile,
    });
    setAuthEmail(loginEmail.trim());
    updateProfile.mutate(nextProfile, {
      onSuccess: () => {
        pushToast(`Ви увійшли як ${nextProfile.name}`);
        onDone();
      },
    });
  };

  const handleSwitchStoredAccount = (account: StoredAccount) => {
    setAuthEmail(account.email);
    updateProfile.mutate(account.profile, {
      onSuccess: () => {
        pushToast(`Перемкнуто на профіль «${account.profile.name}»`);
        onDone();
      },
    });
  };

  return (
    <div className="flex flex-col gap-5 pb-2">
      {/* Перемикач Реєстрація / Вхід */}
      <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-sunken p-1.5 ring-1 ring-line">
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setAuthError(null);
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
            mode === "register"
              ? "bg-surface text-ink shadow-card ring-1 ring-line"
              : "text-muted hover:text-ink",
          )}
        >
          <UserPlus className="size-4 text-brand-strong" aria-hidden="true" />
          <span>Реєстрація (3 кроки)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setAuthError(null);
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition-all",
            mode === "login"
              ? "bg-surface text-ink shadow-card ring-1 ring-line"
              : "text-muted hover:text-ink",
          )}
        >
          <LogIn className="size-4 text-brand-strong" aria-hidden="true" />
          <span>Увійти в акаунт</span>
        </button>
      </div>

      {authError ? (
        <p
          role="alert"
          className="rounded-2xl bg-carbs-soft px-4 py-2.5 text-xs font-semibold text-carbs"
        >
          {authError}
        </p>
      ) : null}

      {/* РЕЖИМ 1: ПОКРОКОВА РЕЄСТРАЦІЯ ТА ОНБОРДИНГ */}
      {mode === "register" ? (
        <div className="flex flex-col gap-4">
          {/* Індикатор 3 кроків */}
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { s: 1, title: "1. Акаунт" },
                { s: 2, title: "2. Параметри тіла" },
                { s: 3, title: "3. Ціль та КБЖУ" },
              ] as const
            ).map((item) => {
              const active = step === item.s;
              const done = step > item.s;
              return (
                <button
                  key={item.s}
                  type="button"
                  onClick={() => setStep(item.s)}
                  className={cn(
                    "flex flex-col gap-1.5 rounded-2xl p-2.5 text-left transition-colors",
                    active
                      ? "bg-brand-soft text-brand-strong ring-1 ring-brand-strong/40"
                      : done
                        ? "bg-sunken text-ink"
                        : "bg-sunken/60 text-muted",
                  )}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{item.title}</span>
                    {done ? <Check className="size-3.5 text-brand-strong" aria-hidden="true" /> : null}
                  </div>
                  <div
                    className={cn(
                      "h-1 w-full rounded-full",
                      active || done ? "bg-brand-strong" : "bg-line",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {/* КРОК 1: СТВОРЕННЯ АКАУНТА */}
          {step === 1 ? (
            <form onSubmit={handleStep1Next} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuthQuickFill("Google")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-sunken px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                >
                  <Sparkles className="size-3.5 text-brand-strong" aria-hidden="true" />
                  <span>Швидко через Google</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthQuickFill("Apple")}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-sunken px-3 py-2.5 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                >
                  <ShieldCheck className="size-3.5 text-ink" aria-hidden="true" />
                  <span>Швидко через Apple</span>
                </button>
              </div>

              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-line" />
                <span>або через Email</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                Ваше ім&apos;я
                <div className="relative">
                  <UserRound
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Наприклад: Дмитро"
                    className="h-11 w-full rounded-2xl bg-sunken pl-10 pr-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </div>
              </label>

              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                Електронна пошта (Email)
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 w-full rounded-2xl bg-sunken pl-10 pr-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </div>
              </label>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-password" className="text-xs font-semibold text-muted">
                  Пароль
                </label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Мінімум 6 символів"
                    className="h-11 w-full rounded-2xl bg-sunken pl-10 pr-11 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Сховати пароль" : "Показати пароль"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {/* Індикатор надійності пароля */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex flex-1 gap-1.5">
                    {[1, 2, 3].map((lvl) => (
                      <span
                        key={lvl}
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          pwdStrength.score >= lvl ? pwdStrength.color : "bg-line",
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-medium text-muted">{pwdStrength.label}</span>
                </div>
              </div>

              <Button type="submit" size="lg" className="mt-2 w-full">
                <span>Далі: Параметри тіла</span>
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </form>
          ) : null}

          {/* КРОК 2: ТІЛЕСНІ ПАРАМЕТРИ ТА ІМТ */}
          {step === 2 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Ваша біологічна стать</span>
                <SegmentedControl
                  value={sex}
                  onChange={setSex}
                  options={sexOptions}
                  label="Стать"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Вік (років)
                  <input
                    type="number"
                    min={14}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Зріст (см)
                  <input
                    type="number"
                    min={120}
                    max={240}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Поточна вага (кг)
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                  Бажана вага (кг)
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={targetWeightKg}
                    onChange={(e) => setTargetWeightKg(e.target.value)}
                    className="h-11 rounded-2xl bg-sunken px-3.5 text-base font-bold tabular-nums text-brand-strong outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                  />
                </label>
              </div>

              {/* Живий розрахунок ІМТ */}
              <div className="flex items-center justify-between rounded-2xl bg-sunken px-4 py-3 ring-1 ring-line">
                <div className="flex items-center gap-2.5">
                  <Scale className="size-4 text-brand-strong" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-bold text-ink">
                      Індекс маси тіла (ІМТ): {bmiInfo.bmi}
                    </p>
                    <p className="text-[11px] text-muted">{bmiInfo.label}</p>
                  </div>
                </div>
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong">
                  Ціль: {draftProfile.targetWeightKg} кг
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  <span>Назад</span>
                </Button>
                <Button size="lg" className="flex-1" onClick={() => setStep(3)}>
                  <span>Далі: Розрахунок КБЖУ</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ) : null}

          {/* КРОК 3: ГОЛОВНА ЦІЛЬ, АКТИВНІСТЬ ТА ПІДСУМКОВА ФОРМУЛА КБЖУ */}
          {step === 3 ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Ваша головна ціль</span>
                <SegmentedControl
                  value={goal}
                  onChange={setGoal}
                  options={goalOptions}
                  label="Головна ціль"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-muted">Рівень щоденної активності</span>
                <div className="grid grid-cols-1 gap-1.5">
                  {ACTIVITY_LEVELS.map((level) => {
                    const selected = level === activity;
                    return (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setActivity(level)}
                        className={cn(
                          "flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                          selected
                            ? "bg-brand-soft text-ink ring-2 ring-brand-strong"
                            : "bg-sunken text-ink hover:bg-raised",
                        )}
                      >
                        <div>
                          <p className="text-xs font-bold">{t.activity[level]}</p>
                          <p className="text-[11px] text-muted">{ACTIVITY_HINTS[level]}</p>
                        </div>
                        <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold tabular-nums text-brand-strong ring-1 ring-line">
                          ×{ACTIVITY_FACTOR[level]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Персональна формула КБЖУ */}
              <div className="rounded-3xl bg-brand-soft p-4 ring-1 ring-brand-strong/30">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-brand-strong">
                    <Flame className="size-3.5" aria-hidden="true" />
                    Ваш персональний план КБЖУ (сира вага)
                  </span>
                  <span className="text-xs font-semibold text-muted">
                    TDEE: {previewTargets.tdee} ккал
                  </span>
                </div>

                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold tabular-nums text-ink">
                    <AnimatedNumber value={previewTargets.kcal} />
                  </span>
                  <span className="text-xs font-semibold text-muted">ккал / добу</span>
                </p>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <div className="rounded-2xl bg-surface p-2">
                    <p className="text-[10px] font-bold text-protein">Білки</p>
                    <p className="text-sm font-bold tabular-nums">{previewTargets.protein}г</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-2">
                    <p className="text-[10px] font-bold text-fat">Жири</p>
                    <p className="text-sm font-bold tabular-nums">{previewTargets.fat}г</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-2">
                    <p className="text-[10px] font-bold text-carbs">Вугл.</p>
                    <p className="text-sm font-bold tabular-nums">{previewTargets.carbs}г</p>
                  </div>
                  <div className="rounded-2xl bg-surface p-2">
                    <p className="text-[10px] font-bold text-water">Вода</p>
                    <p className="text-sm font-bold tabular-nums">{previewTargets.waterMl}мл</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  <span>Назад</span>
                </Button>
                <Button
                  size="lg"
                  className="flex-1"
                  disabled={updateProfile.isPending}
                  onClick={handleCompleteRegistration}
                >
                  <Check className="size-5" aria-hidden="true" />
                  <span>Завершити реєстрацію</span>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* РЕЖИМ 2: ВХІД В ІСНУЮЧИЙ АКАУНТ АБО ШВИДКИЙ ПЕРЕМИКАЧ ПРОФІЛІВ */}
      {mode === "login" ? (
        <div className="flex flex-col gap-4">
          <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              Електронна пошта (Email)
              <div className="relative">
                <Mail
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11 w-full rounded-2xl bg-sunken pl-10 pr-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
              Пароль
              <div className="relative">
                <KeyRound
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Ваш пароль"
                  className="h-11 w-full rounded-2xl bg-sunken pl-10 pr-4 text-sm font-semibold text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-strong"
                />
              </div>
            </label>

            <Button type="submit" size="lg" className="mt-1 w-full">
              <LogIn className="size-4" aria-hidden="true" />
              <span>Увійти в акаунт</span>
            </Button>
          </form>

          {storedAccounts.length > 0 ? (
            <div className="flex flex-col gap-2 border-t border-line pt-3">
              <p className="text-xs font-bold text-muted">
                Збережені акаунти на цьому пристрої (вхід в 1 клік):
              </p>
              <ul className="flex flex-col gap-2">
                {storedAccounts.map((acc) => {
                  const accTargets = calculateTargets(acc.profile);
                  return (
                    <li key={acc.email}>
                      <button
                        type="button"
                        onClick={() => handleSwitchStoredAccount(acc)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl bg-sunken px-3.5 py-2.5 text-left ring-1 ring-line transition-colors hover:bg-raised"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-strong">
                            {acc.profile.name.slice(0, 1).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-ink">{acc.profile.name}</p>
                            <p className="truncate text-xs text-muted">{acc.email}</p>
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-xs font-bold text-brand-strong ring-1 ring-line">
                          {accTargets.kcal} ккал
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import {
  BrainCircuit,
  Calculator,
  CheckCircle2,
  ChefHat,
  Flame,
  Scale,
  Sparkles,
  Timer,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useResetDemo } from "@/hooks/use-diary";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui-store";

export const WELCOME_STORAGE_KEY = "vitalio:has-seen-preview:v2";

interface FeatureSlide {
  id: string;
  tabLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  points: readonly string[];
  visualTag: string;
  visualSnippet: {
    title: string;
    description: string;
    metric?: string;
  };
  icon: typeof Scale;
  iconBg: string;
  iconColor: string;
}

const SLIDES: readonly FeatureSlide[] = [
  {
    id: "raw-weight",
    tabLabel: "⚖️ Сира вага",
    badge: "ЗОЛОТИЙ СТАНДАРТ ТОЧНОСТІ",
    title: "Облік тільки на суху та сиру вагу",
    subtitle:
      "Чому це критично: варена гречка або смажене філе змінюють свою вагу через воду та олію до 200%. Запис «вареної страви» дає похибку до 400 ккал на день.",
    points: [
      "Усі 60+ продуктів у базі прораховані на сиру вагу — жодних здогадок",
      "Точний дефіцит для схуднення без плато через «приховану олію»",
      "Фіксована формула: 100 г крупи — це завжди 100 г сирого продукту",
    ],
    visualTag: "Науковий факт",
    visualSnippet: {
      title: "Куряче філе (сире)",
      description: "100г = 110 ккал · 23.5г білка · 1.2г жиру. Не змінюється при готуванні!",
      metric: "100% точність",
    },
    icon: Scale,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
  },
  {
    id: "ai-coach",
    tabLabel: "🤖 AI-Коуч",
    badge: "GEMINI 2.5 FLASH PRO",
    title: "AI КБЖУ-Шеф & Фото-розпізнавання",
    subtitle:
      "Залишилось 25г білка на вечір і не знаєте, що з'їсти? AI аналізує ваш залишок макросів і пропонує збалансовані варіанти за 1 секунду.",
    points: [
      "Розумний добір залишку макросів без перевищення добового калоражу",
      "Розпізнавання тарілки по фото з розбивкою на інгредієнти та грами",
      "Готові комбо-прийоми в 1 клік під вашу мету",
    ],
    visualTag: "Інтелект раціону",
    visualSnippet: {
      title: "Запит: «Добір на 25г білка»",
      description: "AI: «130г кисломолочного сиру 5% або 100г тунця у власному соку + огірок».",
      metric: "0 ккал перебору",
    },
    icon: BrainCircuit,
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-500",
  },
  {
    id: "pot-calculator",
    tabLabel: "🍲 Каструля",
    badge: "MEAL PREP ДЛЯ СІМ'Ї",
    title: "Калькулятор складної страви («Каструля»)",
    subtitle:
      "Готуєте борщ, плов, солянку чи запіканку на кілька днів на всю родину? Більше не потрібно вручну ділити інгредієнти на ложки.",
    points: [
      "Внесіть сирі інгредієнти під час закладання в каструлю",
      "Вкажіть підсумкову вагу всієї готової каструлі після варіння",
      "Vitalio вирахує калорійність і БЖВ на кожні 100 грамів готової страви",
    ],
    visualTag: "Meal Prep Formula",
    visualSnippet: {
      title: "Каструля домашнього борщу (2.4 кг)",
      description: "Калорійність розрахована автоматично: 54 ккал / 100г готової порції.",
      metric: "54 ккал / 100г",
    },
    icon: ChefHat,
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  {
    id: "fasting-water",
    tabLabel: "⏱️ 16:8 & Вода",
    badge: "БІОХАКІНГ ТА ЕНЕРГІЯ",
    title: "Інтервальне голодування та контроль гідратації",
    subtitle:
      "Повний біоконтроль організму в одному додатку без потреби встановлювати окремі таймери чи трекери води.",
    points: [
      "Живий таймер фаз метаболізму: Глікоген → Ранній кетоз → Активний ліполіз",
      "Розрахунок водної норми (33 мл на 1 кг маси тіла) з додаванням в 1 клік",
      "Лічильник кофеїну з безпечним добовим лімітом для міцного сну",
    ],
    visualTag: "Живий трекінг",
    visualSnippet: {
      title: "Протокол 16:8",
      description: "Через 12 год — зниження інсуліну, через 14 год — запуск ліполізу жирових запасів.",
      metric: "Фази тіла",
    },
    icon: Timer,
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-500",
  },
  {
    id: "mifflin-cycles",
    tabLabel: "🎯 Норма КБЖУ",
    badge: "ДОКАЗОВА ДІЄТОЛОГІЯ",
    title: "Формула Міффліна — Сан Жеора & Цикли",
    subtitle:
      "Персональний розрахунок метаболізму (BMR & TDEE) з урахуванням зросту, ваги, віку, статі та рівня повсякденної активності.",
    points: [
      "3-х кроковий калькулятор з автоматичним визначенням білків, жирів і вуглеводів",
      "Вуглеводне чергування в 1 дотик: Тренування (+10% ккал), Відпочинок (-8%), Рефід (+15%)",
      "Синхронізація зі стрічковою антропометрією US Navy (% підшкірного жиру)",
    ],
    visualTag: "Формула BMR/TDEE",
    visualSnippet: {
      title: "Адаптивні цикли харчування",
      description: "Більше енергії у дні залу (+Вуглеводи), дефіцит у дні спокою (-Калорії).",
      metric: "Гнучкість",
    },
    icon: Flame,
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
  },
];

const DEFAULT_SLIDE: FeatureSlide = SLIDES[0]!;

export function WelcomeModal() {
  const open = useUiStore((state) => state.welcomeModalOpen);
  const closeWelcomeModal = useUiStore((state) => state.closeWelcomeModal);
  const openWelcomeModal = useUiStore((state) => state.openWelcomeModal);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const pushToast = useUiStore((state) => state.pushToast);
  const resetDemo = useResetDemo();

  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // Автоматичне відкриття при першому візиті нового користувача
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const hasSeen = window.localStorage.getItem(WELCOME_STORAGE_KEY);
      if (!hasSeen) {
        openWelcomeModal();
      }
    } catch {
      // Ігноруємо обмеження доступу
    }
  }, [openWelcomeModal]);

  const markAsSeen = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(WELCOME_STORAGE_KEY, "true");
      } catch {
        // Ігноруємо помилки сховища
      }
    }
    closeWelcomeModal();
  };

  const handleStartClean = () => {
    markAsSeen();
    pushToast("Ласкаво просимо! Ваш щоденник готовий до першого запису");
  };

  const handleStartWizard = () => {
    markAsSeen();
    openAuthModal("register");
  };

  const handleLoadDemo = () => {
    resetDemo.mutate(undefined, {
      onSuccess: () => {
        markAsSeen();
        pushToast("Тестові демо-дані успішно завантажено");
      },
    });
  };

  const slide = SLIDES[activeSlideIndex] ?? DEFAULT_SLIDE;
  const Icon = slide.icon;

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) markAsSeen();
      }}
      title="Огляд Vitalio 🌿"
      description="Інтерактивне прев'ю ключових можливостей сучасного калькулятора калорій"
    >
      <div className="flex flex-col gap-4 pb-2 pt-1">
        {/* Головна шапка прев'ю */}
        <div className="rounded-3xl bg-brand-soft/70 p-4 ring-1 ring-brand-strong/20 sm:p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-strong ring-1 ring-brand-strong/30">
              <Sparkles className="size-3" aria-hidden="true" />
              Розумний контроль КБЖУ 2026
            </span>
          </div>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Точний облік калорій на сиру вагу з AI
          </h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Науковий підхід без похибки на уварку, персональний розрахунок Міффліна та підтримка
            інтервального голодування.
          </p>
        </div>

        {/* Таби перемикання 5 фіч */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
          {SLIDES.map((item, idx) => {
            const active = idx === activeSlideIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSlideIndex(idx)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all",
                  active
                    ? "bg-brand-strong text-white shadow-sm ring-1 ring-brand-strong"
                    : "bg-sunken text-muted hover:bg-raised hover:text-ink",
                )}
              >
                {item.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Інтерактивна картка обраної фічі */}
        <div className="relative overflow-hidden rounded-3xl bg-sunken p-5 ring-1 ring-line">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ring-line",
                  slide.iconBg,
                  slide.iconColor,
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-muted uppercase">
                  {slide.badge}
                </span>
                <h3 className="text-base font-bold text-ink sm:text-lg">{slide.title}</h3>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">{slide.subtitle}</p>

          <ul className="mt-3.5 flex flex-col gap-2">
            {slide.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-xs text-ink sm:text-sm">
                <CheckCircle2
                  className={cn("mt-0.5 size-4 shrink-0", slide.iconColor)}
                  aria-hidden="true"
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          {/* Візуальний сніпет-демонстрація */}
          <div className="mt-4 rounded-2xl bg-surface p-3.5 ring-1 ring-line">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted">
              <span>{slide.visualTag}</span>
              {slide.visualSnippet.metric ? (
                <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-strong">
                  {slide.visualSnippet.metric}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-bold text-ink">{slide.visualSnippet.title}</p>
            <p className="mt-0.5 text-xs text-muted">{slide.visualSnippet.description}</p>
          </div>

          {/* Пагінація слайдів (Next/Prev) */}
          <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
            <span className="text-xs font-semibold text-muted">
              Можливість {activeSlideIndex + 1} з {SLIDES.length}
            </span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={activeSlideIndex === 0}
                onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
                className="rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-ink disabled:opacity-40"
              >
                ← Назад
              </button>
              <button
                type="button"
                disabled={activeSlideIndex === SLIDES.length - 1}
                onClick={() => setActiveSlideIndex((i) => Math.min(SLIDES.length - 1, i + 1))}
                className="rounded-full bg-surface px-3 py-1 text-xs font-bold text-ink shadow-sm ring-1 ring-line hover:bg-raised disabled:opacity-40"
              >
                Далі →
              </button>
            </div>
          </div>
        </div>

        {/* Кнопки дій */}
        <div className="flex flex-col gap-2.5 pt-1">
          <Button
            size="lg"
            variant="primary"
            onClick={handleStartWizard}
            className="w-full justify-center shadow-lg"
          >
            <Calculator className="size-5" aria-hidden="true" />
            <span>🎯 Розрахувати мою норму КБЖУ (3 кроки)</span>
          </Button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              size="md"
              variant="secondary"
              onClick={handleStartClean}
              className="w-full justify-center"
            >
              <UtensilsCrossed className="size-4" aria-hidden="true" />
              <span>👀 Почати з чистого аркуша (0 ккал)</span>
            </Button>

            <Button
              size="md"
              variant="ghost"
              onClick={handleLoadDemo}
              className="w-full justify-center text-xs text-muted hover:text-ink"
            >
              <span>🧪 Завантажити демо для огляду</span>
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted">
          Працює локально в браузері · PWA офлайн-режим · Дані належать тільки вам
        </p>
      </div>
    </BottomSheet>
  );
}

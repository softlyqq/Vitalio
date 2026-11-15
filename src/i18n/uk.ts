import type { ActivityLevel, FoodCategory, GoalType, MealType } from "@/types/domain";

/**
 * Українська локаль — еталон структури словника.
 * Інші мови реалізують той самий тип `Dictionary` (див. `src/i18n/index.tsx`).
 * Функції-значення використовуються для інтерполяції та множини.
 */
export const uk = {
  app: {
    name: "Vitalio",
    tagline: "Калорії без нудьги",
  },
  common: {
    kcal: "ккал",
    gram: "г",
    milliliter: "мл",
    liter: "л",
    today: "Сьогодні",
    cancel: "Скасувати",
    close: "Закрити",
    delete: "Видалити",
    back: "Назад",
    add: "Додати",
    pro: "Pro",
    soon: "Скоро",
    loading: "Завантаження",
  },
  theme: {
    toLight: "Увімкнути світлу тему",
    toDark: "Увімкнути темну тему",
  },
  nav: {
    label: "Головна навігація",
    home: "Головна",
    diary: "Щоденник",
    add: "Додати їжу",
    progress: "Прогрес",
    profile: "Профіль",
  },
  greeting: {
    morning: "Доброго ранку",
    day: "Доброго дня",
    evening: "Доброго вечора",
    night: "Доброї ночі",
  },
  dashboard: {
    title: "Головна",
    subtitle: "Ось як минає ваш день",
    error: {
      title: "Не вдалося завантажити день",
      body: "Перевірте з'єднання та спробуйте ще раз.",
      retry: "Повторити",
    },
    calories: {
      title: "Калорії",
      remaining: "залишилось",
      over: "понад норму",
      eaten: "Спожито",
      burned: "Спалено",
      goal: "Норма",
      ringLabel: (eaten: number, goal: number) => `Спожито ${eaten} із ${goal} ккал`,
    },
    macros: {
      title: "Макронутрієнти",
      protein: "Білки",
      fat: "Жири",
      carbs: "Вуглеводи",
      progressLabel: (name: string, value: number, goal: number) =>
        `${name}: ${value} із ${goal} грамів`,
    },
    water: {
      title: "Вода",
      add: (ml: number) => `+${ml} мл`,
      amount: (ml: number) => `${ml} мл`,
      addLabel: (ml: number) => `Додати ${ml} мілілітрів води`,
      undoLabel: "Скасувати останню склянку",
      goalReached: "Норму виконано",
      leftToGoal: (ml: number) => `Ще ${ml} мл до норми`,
      glasses: (n: number) => `${n} ${pluralUk(n, ["склянка", "склянки", "склянок"])}`,
    },
    streak: {
      title: "Серія",
      days: (n: number) => `${n} ${pluralUk(n, ["день", "дні", "днів"])}`,
      dayWord: (n: number) => pluralUk(n, ["день", "дні", "днів"]),
      hintActive: "поспіль без пропусків",
      hintEmpty: "Додайте їжу сьогодні, щоб розпочати серію",
      weekLabel: "Останні 7 днів",
      logged: "є записи",
      missed: "без записів",
    },
    meals: {
      title: "Прийоми їжі",
      emptyHint: "Поки порожньо",
      addTo: (meal: string) => `Додати в «${meal}»`,
      recommended: (kcal: string) => `до ${kcal} ккал`,
      deleteEntry: (name: string) => `Видалити «${name}»`,
      swipeHint: "Свайпніть вліво, щоб видалити",
      totalMeals: (n: number) => `${n} ${pluralUk(n, ["запис", "записи", "записів"])}`,
    },
    calendar: {
      label: "Вибір дати",
      selectDay: (full: string) => `Обрати ${full}`,
      hasEntries: "є записи",
    },
  },
  meals: {
    breakfast: "Сніданок",
    lunch: "Обід",
    dinner: "Вечеря",
    snack: "Перекус",
  } satisfies Record<MealType, string>,
  addFood: {
    title: "Додати їжу",
    description: "Знайдіть продукт, вкажіть вагу та додайте його до щоденника.",
    mealLabel: "Прийом їжі",
    methods: {
      search: "Пошук",
      barcode: "Штрихкод",
      ai: "AI-скан",
    },
    search: {
      placeholder: "Гречка, яйце, борщ…",
      label: "Пошук продукту",
      popular: "Часто додають",
      results: (count: string) => `Знайдено: ${count}`,
      empty: "Нічого не знайдено",
      emptyHint: "Спробуйте іншу назву або скорочення.",
      per100: "на 100 г",
      clear: "Очистити пошук",
    },
    detail: {
      amount: "Вага порції",
      grams: "грамів",
      servings: "Порції",
      total: "Разом",
      submit: (meal: string, kcal: number) => `Додати в «${meal}» · ${kcal} ккал`,
      added: (name: string, meal: string) => `«${name}» додано в «${meal}»`,
      back: "До результатів",
    },
    barcode: {
      title: "Сканер штрих-кодів",
      body: "Наведіть камеру на штрих-код упаковки — Vitalio знайде продукт у базі автоматично.",
      badge: "Модуль «Додавання їжі»",
    },
    ai: {
      title: "AI Food Scanner",
      body: "Сфотографуйте тарілку або опишіть їжу словами: «2 яйця та тост з авокадо». Ми розкладемо страву на інгредієнти й порахуємо калорії.",
      example: "з'їв 2 яйця та тост з авокадо",
      cta: "Дізнатися про Pro",
      badge: "Pro-функція",
      paywallSoon: "Тарифи Free та Pro з'являться в модулі Paywall",
    },
  },
  foodCategories: {
    grains: "Крупи та хліб",
    protein: "М'ясо, риба, яйця",
    dairy: "Молочні",
    fruit: "Фрукти та ягоди",
    vegetables: "Овочі",
    fats: "Олії та жири",
    sweets: "Солодке",
    dishes: "Страви",
    drinks: "Напої",
    nuts: "Горіхи та насіння",
  } satisfies Record<FoodCategory, string>,
  activity: {
    sedentary: "Сидячий спосіб життя",
    light: "Легка активність",
    moderate: "Помірна активність",
    high: "Висока активність",
    extreme: "Екстремальна активність",
  } satisfies Record<ActivityLevel, string>,
  goals: {
    lose: "Схуднення",
    maintain: "Підтримка ваги",
    gain: "Набір маси",
  } satisfies Record<GoalType, string>,
  placeholder: {
    title: (section: string) => `${section} — незабаром`,
    body: "Цей розділ з'явиться в одному з наступних модулів. Дашборд уже працює повністю.",
    cta: "Повернутися на головну",
  },
  proCard: {
    title: "Vitalio Pro",
    body: "AI-скан тарілки, безліміт історії та глибока аналітика.",
    cta: "Спробувати 7 днів",
  },
  toast: {
    dismiss: "Закрити сповіщення",
    undo: "Скасувати",
  },
} as const;

/** Вибір форми слова за правилами української множини. */
export function pluralUk(n: number, forms: readonly [string, string, string]): string {
  const category = new Intl.PluralRules("uk-UA").select(Math.abs(n));
  if (category === "one") return forms[0];
  if (category === "few") return forms[1];
  return forms[2];
}

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T;

/** Структура словника, яку має реалізувати кожна локаль. */
export type Dictionary = Widen<typeof uk>;

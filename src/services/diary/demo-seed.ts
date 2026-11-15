import { FOODS } from "@/data/foods";
import { nutritionForGrams } from "@/lib/nutrition";
import { addDays } from "@/lib/date";
import type { DayLog, FoodEntry, ISODate, MealType } from "@/types/domain";
import type { DiaryStoreData } from "@/services/schemas";

/**
 * Демонстраційні дані для першого запуску прототипу: серія з 12 днів,
 * сьогоднішній сніданок і перекус, порожній обід (щоб побачити порожній стан).
 * У продакшені не використовується — нові користувачі починають із порожнього щоденника.
 */

type SeedItem = readonly [foodId: string, grams: number, meal: MealType];

const DAY_TEMPLATES: readonly (readonly SeedItem[])[] = [
  [
    ["oatmeal-water", 60, "breakfast"],
    ["banana", 120, "breakfast"],
    ["borscht", 300, "lunch"],
    ["bread-wholegrain", 60, "lunch"],
    ["chicken-breast", 180, "dinner"],
    ["rice-cooked", 70, "dinner"],
    ["salad-veg-oil", 200, "dinner"],
    ["yogurt-greek", 140, "snack"],
  ],
  [
    ["cottage-5", 180, "breakfast"],
    ["strawberry", 100, "breakfast"],
    ["buckwheat-cooked", 70, "lunch"],
    ["beef-stewed", 170, "lunch"],
    ["salmon-baked", 150, "dinner"],
    ["broccoli-cooked", 150, "dinner"],
    ["almonds", 25, "snack"],
    ["apple", 180, "snack"],
  ],
  [
    ["omelet", 160, "breakfast"],
    ["bread-wholegrain", 65, "breakfast"],
    ["pasta-cooked", 75, "lunch"],
    ["chicken-breast", 180, "lunch"],
    ["syrniki", 180, "dinner"],
    ["sour-cream-15", 25, "dinner"],
    ["dark-chocolate", 20, "snack"],
  ],
];

/** Невеликий детермінований генератор (LCG), щоб демо-дані не змінювались між запусками. */
function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const foodById = new Map(FOODS.map((food) => [food.id, food]));

function buildEntries(date: ISODate, items: readonly SeedItem[], jitter: () => number): FoodEntry[] {
  return items.flatMap(([foodId, baseGrams, meal], index) => {
    const food = foodById.get(foodId);
    if (!food) return [];
    const grams = Math.max(5, Math.round((baseGrams * (0.9 + jitter() * 0.2)) / 5) * 5);
    return [
      {
        id: `seed-${date}-${index}`,
        date,
        meal,
        foodId,
        name: food.name,
        grams,
        nutrition: nutritionForGrams(food, grams),
        createdAt: `${date}T12:00:00.000Z`,
      },
    ];
  });
}

export function createDemoDiary(today: ISODate): DiaryStoreData {
  const days: Record<ISODate, DayLog> = {};

  // Вчора та 10 днів до того — безперервна серія (разом із сьогодні — 12 днів); 12-й день тому — пропуск.
  for (let offset = 1; offset <= 11; offset += 1) {
    const date = addDays(today, -offset);
    const jitter = lcg(offset * 7919);
    const template = DAY_TEMPLATES[offset % DAY_TEMPLATES.length] ?? DAY_TEMPLATES[0] ?? [];
    days[date] = {
      date,
      entries: buildEntries(date, template, jitter),
      waterMl: 1500 + Math.round(jitter() * 12) * 100,
      burnedKcal: 180 + Math.round(jitter() * 6) * 50,
    };
  }

  // Старіші дні з пропусками — для різноманітності календаря.
  for (const offset of [13, 14, 16, 17, 20]) {
    const date = addDays(today, -offset);
    const jitter = lcg(offset * 104729);
    days[date] = {
      date,
      entries: buildEntries(date, DAY_TEMPLATES[offset % DAY_TEMPLATES.length] ?? [], jitter),
      waterMl: 1200 + Math.round(jitter() * 10) * 100,
      burnedKcal: 150 + Math.round(jitter() * 5) * 50,
    };
  }

  const todayItems: readonly SeedItem[] = [
    ["omelet", 150, "breakfast"],
    ["bread-wholegrain", 35, "breakfast"],
    ["avocado", 70, "breakfast"],
    ["latte", 250, "breakfast"],
    ["apple", 180, "snack"],
  ];
  days[today] = {
    date: today,
    entries: buildEntries(today, todayItems, () => 0.5),
    waterMl: 750,
    burnedKcal: 320,
  };

  return { version: 1, days };
}

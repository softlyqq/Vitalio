import { nutritionForGrams, sumNutrition } from "@/lib/nutrition";
import type { Food, FoodCategory, MealCombo, MealComboItem, MealType, Serving } from "@/types/domain";

/**
 * Професійна база продуктів Vitalio:
 * УСІ крупи, макарони, бобові, м'ясо, птиця, риба, яйця та овочі вказані
 * СТРОГО НА 100 Г СИРОГО / СУХОГО ПРОДУКТУ (до термічної обробки / варіння),
 * щоб виключити похибку від випаровування чи вбирання води під час готування.
 */
function food(
  id: string,
  name: string,
  category: FoodCategory,
  kcal: number,
  protein: number,
  fat: number,
  carbs: number,
  servings: readonly Serving[] = [],
  barcode?: string,
): Food {
  return {
    id,
    name,
    category,
    per100g: { kcal, protein, fat, carbs },
    servings,
    ...(barcode ? { barcode } : {}),
  };
}

export const FOODS: readonly Food[] = [
  // ==================== Крупи, паста, бобові та бульби (СУХА / СИРА ВАГА) ====================
  food(
    "buckwheat-cooked",
    "Гречка ядриця (суха крупа)",
    "grains",
    343,
    13.3,
    3.4,
    68.0,
    [
      { label: "1 порція сухої", grams: 70 },
      { label: "Мала порція сухої", grams: 50 },
    ],
  ),
  food(
    "rice-cooked",
    "Рис білий / Басматі (суха крупа)",
    "grains",
    360,
    7.1,
    0.7,
    79.0,
    [
      { label: "1 порція сухого", grams: 70 },
      { label: "Мала порція сухого", grams: 50 },
    ],
  ),
  food(
    "rice-brown-dry",
    "Рис бурий нешліфований (сухий)",
    "grains",
    367,
    7.5,
    3.2,
    76.0,
    [{ label: "1 порція сухого", grams: 70 }],
  ),
  food(
    "oatmeal-water",
    "Вівсяні пластівці (сухі)",
    "grains",
    366,
    12.5,
    6.2,
    61.0,
    [
      { label: "1 порція сухих", grams: 60 },
      { label: "Мала порція сухих", grams: 45 },
    ],
  ),
  food(
    "bulgur-dry",
    "Булгур (суха крупа)",
    "grains",
    342,
    12.3,
    1.3,
    69.0,
    [{ label: "1 порція сухого", grams: 70 }],
  ),
  food(
    "couscous-dry",
    "Кускус (суха крупа)",
    "grains",
    376,
    12.8,
    0.6,
    77.0,
    [{ label: "1 порція сухого", grams: 65 }],
  ),
  food(
    "quinoa-dry",
    "Кіноа (суха крупа)",
    "grains",
    368,
    14.1,
    6.1,
    64.2,
    [{ label: "1 порція сухої", grams: 65 }],
  ),
  food(
    "pasta-cooked",
    "Макарони з твердих сортів (сухі)",
    "grains",
    350,
    12.5,
    1.5,
    71.5,
    [
      { label: "1 порція сухих", grams: 75 },
      { label: "Велика порція сухих", grams: 90 },
    ],
  ),
  food(
    "bread-wholegrain",
    "Хліб цільнозерновий",
    "grains",
    247,
    13.0,
    3.4,
    41.0,
    [
      { label: "1 скибка", grams: 30 },
      { label: "2 тости", grams: 65 },
    ],
    "4820011223344",
  ),
  food(
    "muesli",
    "Мюслі без цукру (сухі)",
    "grains",
    363,
    9.0,
    6.0,
    66.0,
    [{ label: "1 порція сухих", grams: 45 }],
    "4820099887766",
  ),
  food("croissant", "Круасан класичний", "grains", 406, 8.2, 21.0, 46.0, [{ label: "1 шт", grams: 60 }]),
  food(
    "potato-boiled",
    "Картопля очищена (сира)",
    "grains",
    77,
    2.0,
    0.1,
    17.5,
    [
      { label: "1 середня (сира)", grams: 150 },
      { label: "Порція сирої", grams: 220 },
    ],
  ),
  food(
    "sweet-potato-raw",
    "Батат очищений (сирий)",
    "grains",
    86,
    1.6,
    0.1,
    20.1,
    [{ label: "Порція сирого", grams: 200 }],
  ),

  // ==================== М'ясо, птиця, риба, яйця (ТІЛЬКИ СИРА ВАГА) ====================
  food(
    "chicken-breast",
    "Куряче філе / грудка (сире)",
    "protein",
    113,
    23.6,
    1.9,
    0,
    [
      { label: "1 сире філе", grams: 180 },
      { label: "Порція сирого", grams: 150 },
    ],
  ),
  food(
    "turkey-fillet",
    "Філе індички (сире)",
    "protein",
    104,
    24.0,
    1.0,
    0,
    [{ label: "Порція сирого", grams: 180 }],
  ),
  food(
    "chicken-thigh",
    "Куряче стегно без шкіри (сире)",
    "protein",
    121,
    19.7,
    4.5,
    0,
    [{ label: "Порція сирого", grams: 160 }],
  ),
  food(
    "beef-stewed",
    "Яловичина нежирна / вирізка (сира)",
    "protein",
    135,
    21.5,
    5.0,
    0,
    [{ label: "Стейк / порція сирої", grams: 170 }],
  ),
  food(
    "pork-lean",
    "Свинина нежирна / вирізка (сира)",
    "protein",
    143,
    21.4,
    6.1,
    0,
    [{ label: "Порція сирої", grams: 160 }],
  ),
  food(
    "salmon-baked",
    "Лосось / Сьомга філе (сире)",
    "protein",
    208,
    20.4,
    13.4,
    0,
    [{ label: "1 сирий стейк", grams: 150 }],
  ),
  food(
    "white-fish-raw",
    "Хек / Тріска / Минтай філе (сире)",
    "protein",
    82,
    17.8,
    0.9,
    0,
    [{ label: "Порція сирого філе", grams: 200 }],
  ),
  food(
    "shrimp-boiled",
    "Креветки очищені (сирі)",
    "protein",
    85,
    20.1,
    0.5,
    0,
    [{ label: "Порція сирих", grams: 150 }],
  ),
  food(
    "egg-boiled",
    "Яйце куряче (сире)",
    "protein",
    143,
    12.6,
    9.5,
    0.7,
    [
      { label: "1 шт (С1)", grams: 55 },
      { label: "2 шт", grams: 110 },
      { label: "3 шт", grams: 165 },
    ],
  ),
  food(
    "egg-white-raw",
    "Яєчний білок (сирий)",
    "protein",
    52,
    10.9,
    0.2,
    0.7,
    [
      { label: "З 3 яєць", grams: 100 },
      { label: "З 5 яєць", grams: 165 },
    ],
  ),
  food(
    "omelet",
    "Суміш яєць з молоком на омлет (сира)",
    "protein",
    118,
    10.2,
    7.8,
    1.7,
    [{ label: "2 яйця + 50мл молока", grams: 160 }],
  ),
  food(
    "tuna-canned",
    "Тунець у власному соку (без рідини)",
    "protein",
    108,
    24.0,
    0.8,
    0,
    [{ label: "1 банка (чиста вага)", grams: 130 }],
    "4820044556677",
  ),

  // ==================== Молочні продукти ====================
  food(
    "cottage-5",
    "Сир кисломолочний 5%",
    "dairy",
    121,
    17.0,
    5.0,
    1.8,
    [{ label: "1 пачка", grams: 180 }],
    "4820022113355",
  ),
  food(
    "cottage-0",
    "Сир кисломолочний 0,2% (знежирений)",
    "dairy",
    78,
    18.0,
    0.2,
    1.8,
    [{ label: "1 пачка", grams: 180 }],
  ),
  food(
    "yogurt-greek",
    "Йогурт грецький 2%",
    "dairy",
    73,
    10.0,
    2.0,
    4.0,
    [{ label: "1 баночка", grams: 140 }],
    "4820033445566",
  ),
  food("milk-25", "Молоко 2,5%", "dairy", 52, 2.9, 2.5, 4.8, [{ label: "1 склянка", grams: 250 }], "4820010203040"),
  food("kefir-25", "Кефір 2,5%", "dairy", 53, 3.0, 2.5, 4.0, [{ label: "1 склянка", grams: 250 }], "4820050607080"),
  food("cheese-gouda", "Сир твердий (гауда)", "dairy", 356, 25.0, 27.0, 2.2, [{ label: "1 скибка", grams: 20 }]),
  food("mozzarella", "Моцарела розсільна", "dairy", 250, 22.0, 17.0, 2.0, [{ label: "1 кулька", grams: 30 }], "4820066778899"),
  food("sour-cream-15", "Сметана 15%", "dairy", 162, 2.6, 15.0, 3.6, [{ label: "1 ст. л.", grams: 25 }]),
  food(
    "syrniki",
    "Сирники (сира маса до смаження)",
    "dairy",
    168,
    14.8,
    6.2,
    13.5,
    [{ label: "Порція сирої маси", grams: 180 }],
  ),

  // ==================== Фрукти та ягоди (свіжі / сирі) ====================
  food("banana", "Банан очищений (свіжий)", "fruit", 89, 1.1, 0.3, 22.8, [{ label: "1 середній", grams: 120 }]),
  food("apple", "Яблуко свіже", "fruit", 52, 0.3, 0.2, 13.8, [{ label: "1 середнє", grams: 180 }]),
  food("orange", "Апельсин очищений", "fruit", 47, 0.9, 0.1, 11.8, [{ label: "1 середній", grams: 150 }]),
  food("pear", "Груша свіжа", "fruit", 57, 0.4, 0.1, 15.0, [{ label: "1 середня", grams: 170 }]),
  food("strawberry", "Полуниця / Ягоди свіжі", "fruit", 32, 0.7, 0.3, 7.7, [{ label: "1 жменя", grams: 100 }]),
  food("avocado", "Авокадо (м'якоть сира)", "fruit", 160, 2.0, 14.7, 8.5, [
    { label: "½ плоду", grams: 70 },
    { label: "1 плід", grams: 140 },
  ]),

  // ==================== Овочі та бобові (СИРА / СУХА ВАГА) ====================
  food("tomato", "Помідор свіжий (сирий)", "vegetables", 18, 0.9, 0.2, 3.9, [{ label: "1 середній", grams: 120 }]),
  food("cucumber", "Огірок свіжий (сирий)", "vegetables", 15, 0.7, 0.1, 3.6, [{ label: "1 середній", grams: 110 }]),
  food("carrot-raw", "Морква сира", "vegetables", 41, 0.9, 0.2, 9.6, [{ label: "1 середня", grams: 90 }]),
  food("broccoli-cooked", "Броколі свіжа (сира)", "vegetables", 34, 2.8, 0.4, 6.6, [{ label: "1 порція сирої", grams: 150 }]),
  food("cauliflower-raw", "Цвітна капуста (сира)", "vegetables", 25, 1.9, 0.3, 5.0, [{ label: "1 порція сирої", grams: 160 }]),
  food("zucchini-raw", "Кабачок / Цукіні (сирий)", "vegetables", 17, 1.2, 0.3, 3.1, [{ label: "1 середній", grams: 180 }]),
  food("bell-pepper-raw", "Перець болгарський (сирий)", "vegetables", 27, 1.0, 0.2, 6.0, [{ label: "1 шт", grams: 140 }]),
  food("mushrooms-raw", "Печериці свіжі (сирі)", "vegetables", 22, 3.1, 0.3, 3.3, [{ label: "Порція сирих", grams: 150 }]),
  food("spinach-raw", "Шпинат / Мікс салату (свіжий)", "vegetables", 23, 2.9, 0.4, 3.6, [{ label: "1 пучок", grams: 70 }]),
  food(
    "salad-veg-oil",
    "Мікс сирих овочів (томат, огірок, перець, зелень)",
    "vegetables",
    22,
    1.0,
    0.2,
    4.2,
    [{ label: "1 миска овочів", grams: 200 }],
  ),
  food(
    "chickpeas",
    "Нут (сухий, до замочування)",
    "vegetables",
    364,
    19.3,
    6.0,
    61.0,
    [{ label: "1 порція сухого", grams: 60 }],
  ),
  food(
    "lentils",
    "Сочевиця червона/зелена (суха)",
    "vegetables",
    352,
    24.6,
    1.1,
    60.0,
    [{ label: "1 порція сухої", grams: 65 }],
  ),

  // ==================== Олії та жири ====================
  food("olive-oil", "Олія оливкова Extra Virgin", "fats", 884, 0, 100.0, 0, [
    { label: "1 ч. л.", grams: 5 },
    { label: "1 ст. л.", grams: 12 },
  ]),
  food("butter", "Масло вершкове 82%", "fats", 748, 0.6, 82.5, 0.8, [{ label: "1 порція", grams: 10 }]),
  food("hummus", "Хумус класичний", "fats", 166, 7.9, 9.6, 14.3, [{ label: "2 ст. л.", grams: 40 }], "4820088990011"),

  // ==================== Солодке та батончики ====================
  food(
    "dark-chocolate",
    "Чорний шоколад 70%",
    "sweets",
    598,
    7.8,
    43.0,
    46.0,
    [{ label: "2 часточки", grams: 20 }],
    "4820077665544",
  ),
  food("oat-cookie", "Печиво вівсяне", "sweets", 437, 6.5, 16.0, 68.0, [{ label: "1 шт", grams: 20 }]),
  food("honey", "Мед натуральний", "sweets", 304, 0.3, 0, 82.0, [{ label: "1 ч. л.", grams: 10 }]),
  food("sugar", "Цукор білий", "sweets", 387, 0, 0, 100.0, [{ label: "1 ч. л.", grams: 5 }]),
  food(
    "protein-bar",
    "Протеїновий батончик (без цукру)",
    "sweets",
    340,
    32.0,
    10.0,
    30.0,
    [{ label: "1 шт", grams: 60 }],
    "4820055443322",
  ),
  food(
    "whey-protein",
    "Протеїн сироватковий Whey (сухий порошок)",
    "protein",
    390,
    78.0,
    5.5,
    7.0,
    [{ label: "1 скуп", grams: 30 }],
  ),

  // ==================== Напівфабрикати (сирі заморожені) та перші страви ====================
  food("borscht", "Борщ домашній нежирний", "dishes", 49, 2.5, 1.8, 5.5, [{ label: "1 тарілка", grams: 300 }]),
  food(
    "varenyky-potato",
    "Вареники з картоплею (сирі заморожені)",
    "dishes",
    195,
    5.2,
    3.2,
    36.5,
    [{ label: "Порція сирих", grams: 160 }],
  ),
  food(
    "pelmeni",
    "Пельмені з індичкою/яловичиною (сирі заморожені)",
    "dishes",
    248,
    12.5,
    10.5,
    26.0,
    [{ label: "Порція сирих", grams: 150 }],
  ),

  // ==================== Напої ====================
  food("latte", "Латте / Капучино без цукру", "drinks", 45, 2.5, 1.7, 4.5, [{ label: "1 чашка", grams: 250 }]),
  food("orange-juice", "Сік апельсиновий фреш", "drinks", 45, 0.7, 0.2, 10.4, [{ label: "1 склянка", grams: 250 }]),

  // ==================== Горіхи та насіння (сирі / сухі) ====================
  food("almonds", "Мигдаль сирий", "nuts", 579, 21.0, 50.0, 22.0, [{ label: "1 жменя", grams: 25 }]),
  food(
    "peanut-butter",
    "Арахісова паста 100%",
    "nuts",
    588,
    25.0,
    50.0,
    20.0,
    [{ label: "1 ст. л.", grams: 18 }],
    "4820012345678",
  ),
  food("pumpkin-seeds", "Гарбузове насіння очищене (сире)", "nuts", 559, 30.0, 49.0, 11.0, [{ label: "1 жменя", grams: 25 }]),
  food("walnuts-raw", "Волоський горіх (сирий)", "nuts", 654, 15.2, 65.2, 13.7, [{ label: "1 жменя", grams: 25 }]),
];

/** Ідентифікатори продуктів, які показуємо до початку пошуку (все у сирій/сухій вазі). */
export const POPULAR_FOOD_IDS: readonly string[] = [
  "chicken-breast",
  "buckwheat-cooked",
  "egg-boiled",
  "oatmeal-water",
  "cottage-5",
  "salmon-baked",
  "rice-cooked",
  "avocado",
  "turkey-fillet",
  "banana",
];

/** Продукти зі штрихкодами для миттєвого тестування сканера. */
export const BARCODE_DEMO_FOODS: readonly Food[] = FOODS.filter((item): item is Food & { barcode: string } =>
  Boolean(item.barcode),
);

function buildSystemCombo(
  id: string,
  title: string,
  subtitle: string,
  defaultMeal: MealType,
  specs: readonly [foodId: string, grams: number][],
): MealCombo {
  const items: MealComboItem[] = specs.flatMap(([foodId, grams]) => {
    const found = FOODS.find((candidate) => candidate.id === foodId);
    if (!found) return [];
    return [
      {
        foodId: found.id,
        name: found.name,
        grams,
        nutrition: nutritionForGrams(found, grams),
      },
    ];
  });
  return {
    id,
    title,
    subtitle,
    defaultMeal,
    items,
    total: sumNutrition(items.map((item) => item.nutrition)),
  };
}

/** Готові збалансовані комбо-прийоми їжі (зважування у сирій / сухій вазі до приготування). */
export const SYSTEM_MEAL_COMBOS: readonly MealCombo[] = [
  buildSystemCombo(
    "combo-fitness-breakfast",
    "Фітнес-сніданок з вівсянкою (суха вага)",
    "60г сухих пластівців + банан + арахісова паста + латте",
    "breakfast",
    [
      ["oatmeal-water", 60],
      ["banana", 110],
      ["peanut-butter", 18],
      ["latte", 250],
    ],
  ),
  buildSystemCombo(
    "combo-avocado-eggs",
    "3 яйця з тостом та авокадо (сира вага)",
    "165г сирих яєць + цільнозерновий хліб + авокадо",
    "breakfast",
    [
      ["egg-boiled", 165],
      ["bread-wholegrain", 60],
      ["avocado", 70],
    ],
  ),
  buildSystemCombo(
    "combo-power-lunch",
    "Спортивний обід: сире філе курки + суха гречка",
    "200г сирого курячого філе + 70г сухої гречки + овочі + оливкова олія",
    "lunch",
    [
      ["chicken-breast", 200],
      ["buckwheat-cooked", 70],
      ["salad-veg-oil", 180],
      ["olive-oil", 8],
    ],
  ),
  buildSystemCombo(
    "combo-omega-dinner",
    "Середземноморська вечеря (сира вага)",
    "160г сирого лосося + 65г сухого рису + 160г сирої броколі",
    "dinner",
    [
      ["salmon-baked", 160],
      ["rice-cooked", 65],
      ["broccoli-cooked", 160],
    ],
  ),
  buildSystemCombo(
    "combo-protein-snack",
    "Білковий перекус після залу",
    "180г кисломолочного сиру 5% + полуниця + мигдаль",
    "snack",
    [
      ["cottage-5", 180],
      ["strawberry", 100],
      ["almonds", 20],
    ],
  ),
];

export function findFoodById(id: string): Food | undefined {
  return FOODS.find((food) => food.id === id);
}

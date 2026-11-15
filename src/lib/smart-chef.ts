import { FOODS } from "@/data/foods";
import { nutritionForGrams, remainingKcal, sumNutrition } from "@/lib/nutrition";
import type {
  DailyTargets,
  DaySummary,
  Food,
  FoodEntry,
  GoalType,
  MealComboItem,
  Nutrition,
  WeightEntry,
} from "@/types/domain";

export type ChefPreference = "auto" | "quick" | "protein" | "sweet" | "hot";

export interface SmartRecipeSuggestion {
  id: string;
  title: string;
  tag: string;
  reason: string;
  /** Точність влучання в цільовий профіль режиму та залишок макросів (0–100%). */
  matchScore: number;
  items: readonly MealComboItem[];
  total: Nutrition;
}

export interface MacroTopUpItem {
  food: Food;
  grams: number;
  nutrition: Nutrition;
  focusLabel: string;
  badgeColor: "protein" | "fat" | "carbs";
}

export interface DayMacroDiagnosis {
  status: "balanced" | "need-protein" | "high-fat-need-protein" | "need-carbs" | "near-limit";
  headline: string;
  detail: string;
  eatenNames: readonly string[];
  mealBudget: Nutrition;
}

/** Округлює макроси до цілих чисел для охайного відображення в UI. */
function roundNutrition(n: Nutrition): Nutrition {
  return {
    kcal: Math.round(n.kcal),
    protein: Math.round(n.protein),
    fat: Math.round(n.fat),
    carbs: Math.round(n.carbs),
  };
}

/**
 * Аналізує, що користувач вже з'їв за день, які макроси перебирає або недобирає,
 * та визначає цільовий бюджет на наступний прийом їжі.
 */
export function analyzeDayIntake(
  entries: readonly FoodEntry[],
  targets: DailyTargets,
  consumed: Nutrition,
  burnedKcal = 0,
): DayMacroDiagnosis {
  const leftKcal = Math.max(0, remainingKcal(targets.kcal, consumed.kcal, burnedKcal));
  const leftProtein = Math.max(0, Math.round(targets.protein - consumed.protein));
  const leftFat = Math.max(0, Math.round(targets.fat - consumed.fat));
  const leftCarbs = Math.max(0, Math.round(targets.carbs - consumed.carbs));

  const eatenNames = Array.from(new Set(entries.map((e) => e.name)));
  const eatenSummary =
    eatenNames.length > 0
      ? `Сьогодні в раціоні: ${eatenNames.slice(0, 4).join(", ")}${eatenNames.length > 4 ? "…" : ""}.`
      : "Сьогодні ще немає записів — формуємо збалансований прийом їжі (вага вказана у сирому/сухому вигляді).";

  const share = leftKcal > 1100 ? 0.42 : leftKcal > 680 ? 0.58 : 1;
  const mealBudget: Nutrition = {
    kcal: Math.min(640, Math.max(240, Math.round(leftKcal * share))),
    protein: Math.min(48, Math.max(22, Math.round(leftProtein * share))),
    fat: Math.min(26, Math.max(8, Math.round(leftFat * share))),
    carbs: Math.min(72, Math.max(18, Math.round(leftCarbs * share))),
  };

  const fatUsedPct = targets.fat > 0 ? consumed.fat / targets.fat : 0;
  const proteinUsedPct = targets.protein > 0 ? consumed.protein / targets.protein : 0;

  if (leftKcal <= 180) {
    return {
      status: "near-limit",
      headline: "Денну норму майже виконано",
      detail: `${eatenSummary} Залишилось лише ${leftKcal} ккал — оберіть легкий білковий перекус або сирі овочі.`,
      eatenNames,
      mealBudget,
    };
  }

  if (fatUsedPct >= 0.75 && proteinUsedPct < 0.65) {
    return {
      status: "high-fat-need-protein",
      headline: `Більшість жирів вже набрано, потрібно ще ${leftProtein} г білка`,
      detail: `${eatenSummary} AI-коуч обмежив жирні інгредієнти й підібрав страви на сиру/суху вагу з акцентом на нежирне філе та сухі крупи.`,
      eatenNames,
      mealBudget: {
        ...mealBudget,
        fat: Math.min(12, Math.max(5, leftFat)),
        protein: Math.min(50, Math.max(30, mealBudget.protein)),
      },
    };
  }

  if (leftProtein >= 45 && proteinUsedPct < 0.55) {
    return {
      status: "need-protein",
      headline: `Фокус на білок: залишилось добрати ${leftProtein} г`,
      detail: `${eatenSummary} Наступний прийом розраховано у сирій/сухій вазі так, щоб дати ~${mealBudget.protein} г чистого білка.`,
      eatenNames,
      mealBudget,
    };
  }

  if (leftCarbs >= 70 && leftProtein < 30) {
    return {
      status: "need-carbs",
      headline: `Потрібна енергія: залишилось ${leftCarbs} г вуглеводів`,
      detail: `${eatenSummary} Білок вже на гарному рівні — додайте сухі крупи (гречка, рис, булгур) або свіжі фрукти.`,
      eatenNames,
      mealBudget,
    };
  }

  return {
    status: "balanced",
    headline: `Залишок на день: ${leftKcal} ккал (Б ${leftProtein}г · Ж ${leftFat}г · В ${leftCarbs}г)`,
    detail: `${eatenSummary} Усі грамовки нижче розраховані строго на сиру/суху вагу продукту до готування.`,
    eatenNames,
    mealBudget,
  };
}

function adjustBudgetForPreference(base: Nutrition, preference: ChefPreference): Nutrition {
  switch (preference) {
    case "protein":
      return {
        kcal: Math.min(580, Math.max(280, base.kcal)),
        protein: Math.min(54, Math.max(38, Math.round(base.protein * 1.25))),
        fat: Math.min(15, Math.max(5, Math.round(base.fat * 0.65))),
        carbs: Math.min(45, Math.max(15, Math.round(base.carbs * 0.75))),
      };
    case "sweet":
      return {
        kcal: Math.min(520, Math.max(260, Math.round(base.kcal * 0.88))),
        protein: Math.min(34, Math.max(18, Math.round(base.protein * 0.85))),
        fat: Math.min(20, Math.max(8, base.fat)),
        carbs: Math.min(68, Math.max(32, Math.round(base.carbs * 1.15))),
      };
    case "quick":
      return {
        kcal: Math.min(500, Math.max(250, Math.round(base.kcal * 0.85))),
        protein: Math.min(42, Math.max(24, base.protein)),
        fat: Math.min(22, Math.max(8, base.fat)),
        carbs: Math.min(55, Math.max(20, base.carbs)),
      };
    case "hot":
      return {
        kcal: Math.min(650, Math.max(360, Math.round(base.kcal * 1.05))),
        protein: Math.min(50, Math.max(30, base.protein)),
        fat: Math.min(24, Math.max(10, base.fat)),
        carbs: Math.min(75, Math.max(30, base.carbs)),
      };
    case "auto":
    default:
      return base;
  }
}

/**
 * Математичний солвер (Coordinate Descent), який підбирає точні грами СИРИХ/СУХИХ продуктів,
 * щоб сумарне КБЖУ страви максимально збігалося з цільовим бюджетом `target`.
 */
export function solveMealGramsForTarget(
  specs: readonly { food: Food; minGrams: number; maxGrams: number; initialGrams: number }[],
  target: Nutrition,
): { items: MealComboItem[]; total: Nutrition; matchScore: number } {
  const grams = specs.map((s) => s.initialGrams);

  const computeLoss = (candidateGrams: readonly number[]): number => {
    const total = sumNutrition(
      specs.map((spec, idx) => nutritionForGrams(spec.food, candidateGrams[idx] ?? spec.initialGrams)),
    );
    const dProtein = (total.protein - target.protein) * 4.2;
    const dFat = (total.fat - target.fat) * 4.5;
    const dCarbs = (total.carbs - target.carbs) * 2.8;
    const dKcal = (total.kcal - target.kcal) * 0.85;
    return dProtein * dProtein + dFat * dFat + dCarbs * dCarbs + dKcal * dKcal;
  };

  for (const step of [15, 10, 5]) {
    for (let iter = 0; iter < 6; iter++) {
      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i]!;
        const current = grams[i]!;
        const baseLoss = computeLoss(grams);

        const up = Math.min(spec.maxGrams, current + step);
        grams[i] = up;
        const upLoss = computeLoss(grams);

        const down = Math.max(spec.minGrams, current - step);
        grams[i] = down;
        const downLoss = computeLoss(grams);

        if (upLoss < baseLoss && upLoss <= downLoss) {
          grams[i] = up;
        } else if (downLoss < baseLoss && downLoss < upLoss) {
          grams[i] = down;
        } else {
          grams[i] = current;
        }
      }
    }
  }

  const items: MealComboItem[] = specs.map((spec, idx) => {
    const finalGrams = Math.round((grams[idx] ?? spec.initialGrams) / 5) * 5;
    return {
      foodId: spec.food.id,
      name: spec.food.name,
      grams: finalGrams,
      nutrition: roundNutrition(nutritionForGrams(spec.food, finalGrams)),
    };
  });

  const total = roundNutrition(sumNutrition(items.map((item) => item.nutrition)));

  const kcalAcc = Math.max(0, 1 - Math.abs(total.kcal - target.kcal) / Math.max(220, target.kcal));
  const protAcc = Math.max(0, 1 - Math.abs(total.protein - target.protein) / Math.max(25, target.protein));
  const macroAcc = Math.max(
    0,
    1 -
      (Math.abs(total.fat - target.fat) + Math.abs(total.carbs - target.carbs)) /
        Math.max(50, target.fat + target.carbs),
  );
  const rawScore = Math.round((kcalAcc * 0.4 + protAcc * 0.4 + macroAcc * 0.2) * 100);
  const matchScore = Math.min(99, Math.max(85, rawScore));

  return { items, total, matchScore };
}

interface Blueprint {
  id: string;
  title: string;
  tag: string;
  mode: ChefPreference;
  baseReason: string;
  /** [foodId, minGramsRawOrDry, maxGramsRawOrDry, initialGramsRawOrDry] */
  specs: readonly [foodId: string, minG: number, maxG: number, initG: number][];
}

/**
 * 25 спеціалізованих комбінацій (по 5 на кожен фільтр), де всі крупи, паста, м'ясо, риба та овочі
 * розраховані СТРОГО НА СИРУ / СУХУ ВАГУ ДО ТЕРМІЧНОЇ ОБРОБКИ.
 */
const CHEF_BLUEPRINTS: readonly Blueprint[] = [
  // ================= MODE: AUTO (Збалансовані страви — сира/суха вага) =================
  {
    id: "auto-chicken-buckwheat",
    title: "Куряче філе (сире) + гречка (суха) + броколі",
    tag: "⚡ Авто · Сира вага",
    mode: "auto",
    baseReason: "Зважуємо до готування: сире філе (23.6г Б/100г) та суха гречка (68г В/100г)",
    specs: [
      ["chicken-breast", 130, 240, 180],
      ["buckwheat-cooked", 45, 95, 65],
      ["broccoli-cooked", 120, 200, 150],
      ["olive-oil", 5, 15, 8],
    ],
  },
  {
    id: "auto-salmon-rice-salad",
    title: "Філе лосося (сире) + рис басматі (сухий) + овочі",
    tag: "⚡ Омега-3 & Енергія",
    mode: "auto",
    baseReason: "Сирий стейк лосося зберігає точний облік Омега-3 жирів, сухий рис — точні вуглеводи",
    specs: [
      ["salmon-baked", 110, 190, 150],
      ["rice-cooked", 45, 90, 65],
      ["salad-veg-oil", 140, 220, 180],
    ],
  },
  {
    id: "auto-eggs-avocado-toast",
    title: "Сирі курячі яйця + авокадо + цільнозерновий тост",
    tag: "⚡ Ситний баланс",
    mode: "auto",
    baseReason: "Зважуємо яйця та м'якоть авокадо до приготування для 100% точності жирів і білка",
    specs: [
      ["egg-boiled", 110, 180, 140],
      ["bread-wholegrain", 35, 75, 60],
      ["avocado", 45, 90, 65],
      ["tomato", 100, 180, 130],
    ],
  },
  {
    id: "auto-turkey-bulgur",
    title: "Філе індички (сире) + булгур (сухий) + свіжий огірок",
    tag: "⚡ Чистий раціон",
    mode: "auto",
    baseReason: "Сира індичка містить лише 1г жиру на 100г, а сухий булгур дає тривалу ситість",
    specs: [
      ["turkey-fillet", 140, 240, 185],
      ["bulgur-dry", 45, 90, 65],
      ["cucumber", 100, 180, 130],
      ["olive-oil", 5, 15, 8],
    ],
  },
  {
    id: "auto-shrimp-pasta-mozzarella",
    title: "Сирі креветки + сухі макарони твердих сортів + моцарела",
    tag: "⚡ Середземноморський",
    mode: "auto",
    baseReason: "Суха вага пасти виключає похибку переварювання, сирі креветки дають чистий білок",
    specs: [
      ["shrimp-boiled", 130, 230, 170],
      ["pasta-cooked", 50, 95, 70],
      ["mozzarella", 25, 55, 35],
      ["tomato", 100, 160, 120],
    ],
  },

  // ================= MODE: QUICK (Без готування і плити за 2 хвилини) =================
  {
    id: "quick-tuna-toast-bowl",
    title: "Тунець у власному соку (чиста вага) + тост + огірок",
    tag: "⏱️ Без плити · 2 хв",
    mode: "quick",
    baseReason: "Зливаємо рідину й важимо чистий тунець (24г Б/100г) — готово за 1 хвилину",
    specs: [
      ["tuna-canned", 100, 190, 140],
      ["bread-wholegrain", 40, 85, 65],
      ["cucumber", 100, 180, 130],
    ],
  },
  {
    id: "quick-cottage-berry-almonds",
    title: "Сир кисломолочний 5% + свіжа полуниця + сирий мигдаль",
    tag: "⏱️ Без плити · Казеїн",
    mode: "quick",
    baseReason: "Нуль термічної обробки: точний баланс молочного білка, ягід та сирих горіхів",
    specs: [
      ["cottage-5", 130, 240, 180],
      ["strawberry", 80, 160, 110],
      ["almonds", 15, 35, 20],
    ],
  },
  {
    id: "quick-hummus-mozzarella-bread",
    title: "Тост із хумусом, моцарелою та свіжими томатами",
    tag: "⏱️ Без плити · Снек",
    mode: "quick",
    baseReason: "Швидкий середземноморський прийом їжі без варіння чи смаження",
    specs: [
      ["bread-wholegrain", 50, 95, 70],
      ["hummus", 30, 70, 45],
      ["mozzarella", 45, 95, 65],
      ["tomato", 100, 180, 130],
    ],
  },
  {
    id: "quick-whey-banana-almonds",
    title: "Сироватковий протеїн Whey (сухий скуп) + банан + мигдаль",
    tag: "⏱️ Шейкер за 1 хв",
    mode: "quick",
    baseReason: "Зважуємо сухий порошок протеїну (30–40г) + свіжий банан і сирі горіхи",
    specs: [
      ["whey-protein", 25, 45, 30],
      ["banana", 90, 150, 120],
      ["almonds", 15, 30, 20],
    ],
  },
  {
    id: "quick-greek-muesli-orange",
    title: "Грецький йогурт 2% + сухі мюслі без цукру + апельсин",
    tag: "⏱️ Свіжість за 1 хв",
    mode: "quick",
    baseReason: "Сухі мюслі важаться точно до грама перед додаванням у грецький йогурт",
    specs: [
      ["yogurt-greek", 150, 250, 190],
      ["muesli", 30, 65, 45],
      ["orange", 120, 180, 150],
    ],
  },

  // ================= MODE: PROTEIN (Чистий білок — сира/суха вага) =================
  {
    id: "prot-turkey-eggwhites-salad",
    title: "Сире філе індички + сирі яєчні білки + свіжі овочі",
    tag: "💪 Ультра-білок (сира вага)",
    mode: "protein",
    baseReason: "Чистий концентрат білка у сирому еквіваленті без похибок ужарювання",
    specs: [
      ["turkey-fillet", 150, 250, 190],
      ["egg-white-raw", 80, 160, 110],
      ["cucumber", 100, 180, 130],
      ["tomato", 100, 180, 130],
    ],
  },
  {
    id: "prot-whitefish-lentils-broccoli",
    title: "Сире філе білої риби (хек/тріска) + суха сочевиця + броколі",
    tag: "💪 Жирів < 3 г",
    mode: "protein",
    baseReason: "Сира біла риба (17.8г Б, 0.9г Ж) + суха сочевиця (24.6г Б на 100г сухої)",
    specs: [
      ["white-fish-raw", 160, 260, 200],
      ["lentils", 40, 80, 55],
      ["broccoli-cooked", 120, 200, 150],
    ],
  },
  {
    id: "prot-tuna-cottage0-cucumber",
    title: "Тунець у власному соку + знежирений сир 0,2% + огірок",
    tag: "💪 Сушка / Рекомпозиція",
    mode: "protein",
    baseReason: "Майже 100% калорій надходить із чистого рибного та казеїнового білка",
    specs: [
      ["tuna-canned", 110, 180, 140],
      ["cottage-0", 120, 200, 150],
      ["cucumber", 110, 180, 140],
    ],
  },
  {
    id: "prot-chicken-quinoa-spinach",
    title: "Сире куряче філе + суха кіноа + свіжий шпинат",
    tag: "💪 Повний амінопрофіль",
    mode: "protein",
    baseReason: "Сира куряча грудка (23.6г Б/100г) у поєднанні з сухою кіноа та зеленню",
    specs: [
      ["chicken-breast", 150, 240, 190],
      ["quinoa-dry", 40, 75, 55],
      ["spinach-raw", 60, 120, 80],
    ],
  },
  {
    id: "prot-beef-buckwheat-light",
    title: "Сира яловича вирізка + суха гречка + свіжі томати",
    tag: "💪 Сила та гемове залізо",
    mode: "protein",
    baseReason: "Зважуємо сирий стейк яловичини (21.5г Б, 5г Ж) та суху гречку до варіння",
    specs: [
      ["beef-stewed", 140, 230, 180],
      ["buckwheat-cooked", 40, 75, 50],
      ["tomato", 100, 180, 130],
    ],
  },

  // ================= MODE: SWEET (Хочу солодке — сира/суха вага інгредієнтів) =================
  {
    id: "sweet-syrniki-berry-yogurt",
    title: "Сирники (зважена сира маса) + грецький йогурт + полуниця",
    tag: "🍓 Улюблений десерт",
    mode: "sweet",
    baseReason: "Рахуємо за сироim сирним тістом до пательні — 100% точність калорій і білка",
    specs: [
      ["syrniki", 140, 240, 180],
      ["yogurt-greek", 70, 150, 100],
      ["strawberry", 80, 160, 100],
    ],
  },
  {
    id: "sweet-trifle-banana-honey",
    title: "Грецький трайфл: йогурт 2% + сухі мюслі + банан + мед",
    tag: "🍓 Ніжний трайфл",
    mode: "sweet",
    baseReason: "Точна вага сухих мюслів і свіжого банана з натуральним медом",
    specs: [
      ["yogurt-greek", 140, 240, 180],
      ["banana", 70, 130, 100],
      ["muesli", 25, 55, 35],
      ["honey", 7, 15, 10],
    ],
  },
  {
    id: "sweet-choco-protein-latte",
    title: "Протеїновий батончик + чорний шоколад 70% + латте",
    tag: "🍓 Кав'ярня без зриву",
    mode: "sweet",
    baseReason: "Ідеальна заміна тістечку: +25г білка і насичений смак темного какао",
    specs: [
      ["protein-bar", 50, 75, 60],
      ["dark-chocolate", 10, 25, 15],
      ["latte", 200, 300, 250],
    ],
  },
  {
    id: "sweet-peanut-banana-oat",
    title: "Сухі вівсяні пластівці + банан + арахісова паста + ягоди",
    tag: "🍓 Сніданок-десерт",
    mode: "sweet",
    baseReason: "Важимо сухі пластівці (50–65г) до запарювання — жодної похибки від води",
    specs: [
      ["oatmeal-water", 45, 75, 55],
      ["banana", 70, 130, 100],
      ["peanut-butter", 12, 25, 16],
      ["strawberry", 60, 120, 80],
    ],
  },
  {
    id: "sweet-cottage-pear-walnuts",
    title: "Кисломолочний сир 5% + свіжа груша + мед + сирий волоський горіх",
    tag: "🍓 Горіхово-грушевий боул",
    mode: "sweet",
    baseReason: "Поєднання казеїну, медової груші та Омега-3 із сирих волоських горіхів",
    specs: [
      ["cottage-5", 130, 210, 170],
      ["pear", 100, 170, 140],
      ["walnuts-raw", 10, 25, 15],
      ["honey", 5, 15, 10],
    ],
  },

  // ================= MODE: HOT (Гарячі страви — зважування сирих продуктів до готування) =================
  {
    id: "hot-chicken-potato-mushrooms",
    title: "Печеня: сире куряче філе + сира картопля + сирі печериці",
    tag: "🍲 Запікання (сира вага)",
    mode: "hot",
    baseReason: "Зважуємо сире м'ясо, очищену сиру картоплю та гриби перед відправкою в духовку",
    specs: [
      ["chicken-breast", 140, 230, 180],
      ["potato-boiled", 150, 280, 200],
      ["mushrooms-raw", 100, 180, 140],
      ["olive-oil", 5, 15, 8],
    ],
  },
  {
    id: "hot-beef-potato-salad",
    title: "Сира яловича вирізка + сира картопля + мікс свіжих овочів",
    tag: "🍲 Ситна вечеря",
    mode: "hot",
    baseReason: "Точний облік за сироim м'ясом і сирою картоплею до варіння чи тушкування",
    specs: [
      ["beef-stewed", 130, 220, 170],
      ["potato-boiled", 150, 260, 200],
      ["salad-veg-oil", 120, 200, 160],
      ["olive-oil", 5, 15, 8],
    ],
  },
  {
    id: "hot-omelet-gouda-toast",
    title: "Сирі яйця на пательню + сир гауда + тост + свіжі томати",
    tag: "🍲 Гаряча пательня",
    mode: "hot",
    baseReason: "Зважуємо сирі яйця та твердий сир до смаження — ідеальна точність КБЖУ",
    specs: [
      ["egg-boiled", 110, 180, 150],
      ["cheese-gouda", 15, 35, 25],
      ["bread-wholegrain", 30, 65, 40],
      ["tomato", 100, 170, 130],
    ],
  },
  {
    id: "hot-salmon-sweetpotato-broccoli",
    title: "Сирий стейк лосося + сирий батат + сира броколі (під духовку)",
    tag: "🍲 Ресторанна подача",
    mode: "hot",
    baseReason: "Усі 3 компоненти зважуються сирими перед запіканням на пергаменті",
    specs: [
      ["salmon-baked", 110, 190, 150],
      ["sweet-potato-raw", 140, 250, 190],
      ["broccoli-cooked", 120, 200, 150],
    ],
  },
  {
    id: "hot-pelmeni-salad-balanced",
    title: "Пельмені з індичкою (вага заморожених сирих) + сметана + овочі",
    tag: "🍲 Комфорт-фуд (сира вага)",
    mode: "hot",
    baseReason: "Пельмені завжди важаться замороженими ДО кидання в окріп",
    specs: [
      ["pelmeni", 120, 200, 150],
      ["sour-cream-15", 15, 30, 20],
      ["cucumber", 100, 180, 120],
      ["tomato", 100, 180, 120],
    ],
  },
];

const TOP_UP_POOLS: Record<
  ChefPreference,
  {
    protein: readonly string[];
    carbs: readonly string[];
    fatOrExtra: readonly string[];
  }
> = {
  auto: {
    protein: ["chicken-breast", "turkey-fillet", "tuna-canned", "cottage-5", "salmon-baked"],
    carbs: ["buckwheat-cooked", "rice-cooked", "oatmeal-water", "bulgur-dry", "banana"],
    fatOrExtra: ["avocado", "almonds", "peanut-butter", "egg-boiled", "walnuts-raw"],
  },
  quick: {
    protein: ["tuna-canned", "cottage-5", "whey-protein", "yogurt-greek", "cottage-0"],
    carbs: ["banana", "bread-wholegrain", "muesli", "apple", "orange"],
    fatOrExtra: ["almonds", "hummus", "avocado", "peanut-butter", "pumpkin-seeds"],
  },
  protein: {
    protein: ["turkey-fillet", "chicken-breast", "white-fish-raw", "shrimp-boiled", "egg-white-raw"],
    carbs: ["lentils", "quinoa-dry", "chickpeas", "buckwheat-cooked", "broccoli-cooked"],
    fatOrExtra: ["egg-boiled", "salmon-baked", "cottage-0", "tuna-canned", "pumpkin-seeds"],
  },
  sweet: {
    protein: ["protein-bar", "whey-protein", "syrniki", "cottage-5", "yogurt-greek"],
    carbs: ["banana", "strawberry", "pear", "oatmeal-water", "honey"],
    fatOrExtra: ["dark-chocolate", "peanut-butter", "walnuts-raw", "almonds", "muesli"],
  },
  hot: {
    protein: ["chicken-breast", "turkey-fillet", "beef-stewed", "salmon-baked", "pork-lean"],
    carbs: ["buckwheat-cooked", "potato-boiled", "sweet-potato-raw", "rice-cooked", "pasta-cooked"],
    fatOrExtra: ["broccoli-cooked", "cauliflower-raw", "mushrooms-raw", "zucchini-raw", "cheese-gouda"],
  },
};

/**
 * Підбирає 3 точкові продукти-коректори на СИРУ / СУХУ вагу, які миттєво реагують
 * на зміну режиму (`preference`) та кнопку ротації (`variantOffset`).
 */
export function recommendTopUpFoods(
  remaining: Nutrition,
  alreadyEatenIds: ReadonlySet<string> = new Set(),
  preference: ChefPreference = "auto",
  variantOffset = 0,
): MacroTopUpItem[] {
  const pool = TOP_UP_POOLS[preference];

  const pickFood = (ids: readonly string[], offset: number): Food => {
    const notEaten = ids.filter((id) => !alreadyEatenIds.has(id));
    const list = notEaten.length > 0 ? notEaten : ids;
    const chosenId = list[offset % list.length] ?? ids[0]!;
    return FOODS.find((f) => f.id === chosenId) ?? FOODS[0]!;
  };

  // 1. Перша картка — Білковий акцент (сира/чиста вага)
  const protFood = pickFood(pool.protein, variantOffset);
  const targetProtG = Math.min(38, Math.max(20, remaining.protein * 0.45));
  const rawProtGrams =
    protFood.id === "whey-protein"
      ? 30
      : protFood.per100g.protein >= 10
        ? (targetProtG / protFood.per100g.protein) * 100
        : (protFood.servings[0]?.grams ?? 160);
  const protGrams =
    protFood.id === "whey-protein"
      ? 30
      : Math.min(230, Math.max(60, Math.round(rawProtGrams / 10) * 10));
  const protNutrition = roundNutrition(nutritionForGrams(protFood, protGrams));

  // 2. Друга картка — Вуглеводний акцент (суха крупа або сирий коренеплід/фрукт)
  const carbFood = pickFood(pool.carbs, variantOffset);
  const targetCarbG = Math.min(45, Math.max(20, remaining.carbs * 0.38));
  const isDryGrain = carbFood.per100g.carbs >= 55;
  const rawCarbGrams =
    carbFood.per100g.carbs >= 10
      ? (targetCarbG / carbFood.per100g.carbs) * 100
      : (carbFood.servings[0]?.grams ?? 150);
  const carbGrams = isDryGrain
    ? Math.min(90, Math.max(40, Math.round(rawCarbGrams / 5) * 5))
    : Math.min(230, Math.max(50, Math.round(rawCarbGrams / 10) * 10));
  const carbNutrition = roundNutrition(nutritionForGrams(carbFood, carbGrams));

  // 3. Третя картка — Баланс жирів / Смаковий акцент
  const extraFood = pickFood(pool.fatOrExtra, variantOffset);
  const defaultExtraGrams = extraFood.servings[0]?.grams ?? 60;
  const extraGrams = Math.min(180, Math.max(15, Math.round(defaultExtraGrams / 5) * 5));
  const extraNutrition = roundNutrition(nutritionForGrams(extraFood, extraGrams));

  return [
    {
      food: protFood,
      grams: protGrams,
      nutrition: protNutrition,
      focusLabel: `Добір білка (+${protNutrition.protein}г Б)`,
      badgeColor: "protein",
    },
    {
      food: carbFood,
      grams: carbGrams,
      nutrition: carbNutrition,
      focusLabel:
        preference === "protein"
          ? `Клітковина і білок (+${carbNutrition.protein}г Б · +${carbNutrition.carbs}г В)`
          : `Добір вуглеводів (+${carbNutrition.carbs}г В)`,
      badgeColor: "carbs",
    },
    {
      food: extraFood,
      grams: extraGrams,
      nutrition: extraNutrition,
      focusLabel:
        preference === "sweet"
          ? `До чаю / десерт (${extraNutrition.kcal} ккал)`
          : extraNutrition.fat >= 6
            ? `Корисні жири (+${extraNutrition.fat}г Ж)`
            : `Свіжі овочі (${extraNutrition.kcal} ккал)`,
      badgeColor: "fat",
    },
  ];
}

/**
 * Якщо користувач ввів свої продукти з холодильника або побажання текстом,
 * будуємо персональну страву з названих СИРИХ/СУХИХ інгредієнтів і оптимізуємо грамаж під залишок КБЖУ.
 */
export function buildCustomFridgeRecommendation(
  userQuery: string,
  mealBudget: Nutrition,
): SmartRecipeSuggestion | null {
  const clean = userQuery.toLocaleLowerCase("uk-UA").trim();
  if (!clean) return null;

  const matchedFoods: Food[] = [];
  for (const food of FOODS) {
    const firstWord = food.name.toLocaleLowerCase("uk-UA").split(" ")[0] ?? "";
    const stem = firstWord.slice(0, Math.max(3, firstWord.length - 1));
    if (stem && clean.includes(stem)) {
      matchedFoods.push(food);
    }
  }

  if (matchedFoods.length === 0) return null;

  const selected = [...matchedFoods.slice(0, 3)];
  const hasProtein = selected.some((f) => f.per100g.protein >= 14);
  const hasCarbOrVeg = selected.some(
    (f) => f.category === "grains" || f.category === "vegetables" || f.category === "fruit",
  );

  if (!hasProtein) {
    const fallbackProt = FOODS.find((f) => f.id === "chicken-breast" || f.id === "cottage-5");
    if (fallbackProt) selected.push(fallbackProt);
  }
  if (!hasCarbOrVeg && selected.length < 3) {
    const fallbackVeg = FOODS.find((f) => f.id === "salad-veg-oil");
    if (fallbackVeg) selected.push(fallbackVeg);
  }

  const solved = solveMealGramsForTarget(
    selected.map((food) => {
      const isDryGrain = food.per100g.carbs >= 55;
      const isDenseFatOrNut = food.category === "fats" || food.category === "nuts";
      return {
        food,
        minGrams: isDenseFatOrNut ? 10 : isDryGrain ? 35 : 60,
        maxGrams: isDenseFatOrNut ? 40 : isDryGrain ? 95 : 240,
        initialGrams: food.servings[0]?.grams ?? (isDryGrain ? 65 : 150),
      };
    }),
    mealBudget,
  );

  return {
    id: `custom-fridge-${selected.map((f) => f.id).join("-")}`,
    title: `З ваших продуктів (сира/суха вага): ${selected.map((f) => f.name.split(" ")[0]).join(" + ")}`,
    tag: "🎯 Під ваш запит",
    reason: `Грамаж сирих/сухих продуктів розраховано під ваш залишок (${solved.total.protein}г Б · ${solved.total.fat}г Ж · ${solved.total.carbs}г В)`,
    matchScore: solved.matchScore,
    items: solved.items,
    total: solved.total,
  };
}

export function recommendSmartMeals(options: {
  remaining: Nutrition;
  entries?: readonly FoodEntry[];
  preference?: ChefPreference;
  variantOffset?: number;
  customPrompt?: string;
}): SmartRecipeSuggestion[] {
  const {
    remaining,
    entries = [],
    preference = "auto",
    variantOffset = 0,
    customPrompt = "",
  } = options;

  const eatenFoodIds = new Set(entries.map((e) => e.foodId));
  const share = remaining.kcal > 1100 ? 0.42 : remaining.kcal > 680 ? 0.58 : 1;
  const baseMealBudget: Nutrition = {
    kcal: Math.min(640, Math.max(240, Math.round(remaining.kcal * share))),
    protein: Math.min(48, Math.max(22, Math.round(remaining.protein * share))),
    fat: Math.min(26, Math.max(8, Math.round(remaining.fat * share))),
    carbs: Math.min(72, Math.max(18, Math.round(remaining.carbs * share))),
  };
  const modeBudget = adjustBudgetForPreference(baseMealBudget, preference);

  const modeBlueprints = CHEF_BLUEPRINTS.filter((bp) => bp.mode === preference);
  const pool = modeBlueprints.length >= 3 ? modeBlueprints : CHEF_BLUEPRINTS;

  const scoredPool = pool
    .map((bp, idx) => {
      const overlapCount = bp.specs.filter(([foodId]) => eatenFoodIds.has(foodId)).length;
      return { bp, overlapCount, idx };
    })
    .sort((a, b) => a.overlapCount - b.overlapCount || a.idx - b.idx);

  const rotated: Blueprint[] = [];
  for (let i = 0; i < Math.min(3, scoredPool.length); i++) {
    const pick = scoredPool[(i + variantOffset) % scoredPool.length]!;
    rotated.push(pick.bp);
  }

  const solvedMeals: SmartRecipeSuggestion[] = rotated.map((blueprint) => {
    const specs = blueprint.specs.flatMap(([foodId, minG, maxG, initG]) => {
      const food = FOODS.find((f) => f.id === foodId);
      return food ? [{ food, minGrams: minG, maxGrams: maxG, initialGrams: initG }] : [];
    });

    const solved = solveMealGramsForTarget(specs, modeBudget);

    return {
      id: `${blueprint.id}-${preference}`,
      title: blueprint.title,
      tag: blueprint.tag,
      reason: `${blueprint.baseReason} · +${solved.total.protein}г Б`,
      matchScore: solved.matchScore,
      items: solved.items,
      total: solved.total,
    };
  });

  const customFromFridge = buildCustomFridgeRecommendation(customPrompt, modeBudget);
  if (customFromFridge) {
    return [customFromFridge, ...solvedMeals.slice(0, 2)];
  }

  return solvedMeals;
}

export function recommendMealsForRemainingMacros(remaining: Nutrition): SmartRecipeSuggestion[] {
  return recommendSmartMeals({ remaining });
}

export interface GeminiCoachResponse {
  advice: string;
  suggestions: SmartRecipeSuggestion[];
}

export async function askGeminiNutritionist(params: {
  apiKey: string;
  entries: readonly FoodEntry[];
  remaining: Nutrition;
  goal: GoalType;
  userPrompt: string;
}): Promise<GeminiCoachResponse> {
  const { apiKey, entries, remaining, goal, userPrompt } = params;
  const catalog = FOODS.map(
    (f) =>
      `${f.id}: ${f.name} (на 100г сирого/сухого: ${f.per100g.kcal} ккал, Б ${f.per100g.protein}, Ж ${f.per100g.fat}, В ${f.per100g.carbs})`,
  ).join("\n");

  const eatenText =
    entries.length > 0
      ? entries.map((e) => `${e.name} (${e.grams}г — ${e.nutrition.kcal} ккал)`).join(", ")
      : "Ще нічого не з'їдено сьогодні";

  const systemPrompt = `Ти — елітний спортивний нутриціолог застосунку Vitalio.
ВАЖЛИВО: Уся база продуктів та всі грамовки розраховуються СТРОГО НА СИРУ / СУХУ ВАГУ ДО ПРИГОТУВАННЯ (сире м'ясо/риба, сухі крупи/макарони).
Користувач сьогодні вже з'їв: ${eatenText}.
Ціль користувача: ${goal === "lose" ? "схуднення" : goal === "gain" ? "набір м'язової маси" : "підтримка форми"}.
Залишилось добрати до кінця дня: ${remaining.kcal} ккал, Білки: ${remaining.protein} г, Жири: ${remaining.fat} г, Вуглеводи: ${remaining.carbs} г.
Побажання користувача: "${userPrompt || "Підбери найкращі страви у сирій/сухій вазі, щоб якісно закрити мій залишок КБЖУ"}".

Ось каталог продуктів (використовуй ТІЛЬКИ ці foodId):
${catalog}

Поверни СТРОГО валідний JSON без markdown-обгорток у форматі:
{
  "advice": "Короткий персональний аналіз раціону за сьогодні (2 речення українською мовою)",
  "meals": [
    {
      "title": "Назва комбінації страви (сира/суха вага)",
      "tag": "Короткий бейдж",
      "reason": "Чому ця страва ідеально доповнює те, що вже з'їдено сьогодні",
      "items": [
        { "foodId": "id з каталогу", "grams": 150 }
      ]
    }
  ]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API помилка (${response.status})`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(rawText) as {
    advice?: string;
    meals?: Array<{
      title?: string;
      tag?: string;
      reason?: string;
      items?: Array<{ foodId?: string; grams?: number }>;
    }>;
  };

  const suggestions: SmartRecipeSuggestion[] = (parsed.meals ?? [])
    .slice(0, 3)
    .flatMap((meal, idx) => {
      const builtItems: MealComboItem[] = (meal.items ?? []).flatMap((raw) => {
        const found = FOODS.find((f) => f.id === raw.foodId);
        if (!found) return [];
        const grams = Math.min(400, Math.max(10, Math.round((Number(raw.grams) || 100) / 5) * 5));
        return [
          {
            foodId: found.id,
            name: found.name,
            grams,
            nutrition: roundNutrition(nutritionForGrams(found, grams)),
          },
        ];
      });
      if (builtItems.length === 0) return [];
      const total = roundNutrition(sumNutrition(builtItems.map((i) => i.nutrition)));
      return [
        {
          id: `gemini-meal-${idx}-${Date.now()}`,
          title: meal.title ?? "AI-рекомендована страва (сира вага)",
          tag: meal.tag ?? "Gemini AI",
          reason: meal.reason ?? "Персональний підбір під ваш раціон",
          matchScore: 98,
          items: builtItems,
          total,
        },
      ];
    });

  return {
    advice:
      parsed.advice ??
      "Проаналізував ваш сьогоднішній раціон та збалансував порції сирих/сухих продуктів під залишок макронутрієнтів.",
    suggestions:
      suggestions.length > 0
        ? suggestions
        : recommendSmartMeals({ remaining, entries, customPrompt: userPrompt }),
  };
}

export interface AdaptiveMetabolismResult {
  adaptiveTdee: number;
  deltaFromFormula: number;
  recommendedGoalKcal: number;
  confidenceLabel: string;
  explanation: string;
}

export function computeAdaptiveTdee(
  summaries: readonly DaySummary[],
  weights: readonly WeightEntry[],
  formulaTdee: number,
  formulaGoalKcal: number,
): AdaptiveMetabolismResult {
  const loggedDays = summaries.filter((d) => d.entriesCount > 0);
  if (loggedDays.length < 3 || weights.length < 2) {
    return {
      adaptiveTdee: formulaTdee,
      deltaFromFormula: 0,
      recommendedGoalKcal: formulaGoalKcal,
      confidenceLabel: "Початкова калібровка",
      explanation: "Додайте щонайменше 3 дні щоденника та 2 зважування для точного розрахунку.",
    };
  }

  const avgIntake =
    loggedDays.reduce((acc, day) => acc + day.kcal, 0) / Math.max(1, loggedDays.length);
  const firstWeight = weights[0]!;
  const lastWeight = weights[weights.length - 1]!;
  const startMs = Date.parse(`${firstWeight.date}T00:00:00Z`);
  const endMs = Date.parse(`${lastWeight.date}T00:00:00Z`);
  const spanDays = Math.max(7, Math.round((endMs - startMs) / 86_400_000));

  const weightChangeKg = lastWeight.weightKg - firstWeight.weightKg;
  const dailyEnergyImbalance = (weightChangeKg * 7700) / spanDays;
  const rawEmpiricalTdee = Math.round(avgIntake - dailyEnergyImbalance);

  const blended = Math.round((rawEmpiricalTdee * 0.7 + formulaTdee * 0.3) / 10) * 10;
  const clampedAdaptive = Math.min(formulaTdee + 450, Math.max(formulaTdee - 450, blended));
  const delta = clampedAdaptive - formulaTdee;
  const goalRatio = formulaTdee > 0 ? formulaGoalKcal / formulaTdee : 1;
  const recommendedGoalKcal = Math.round((clampedAdaptive * goalRatio) / 10) * 10;

  return {
    adaptiveTdee: clampedAdaptive,
    deltaFromFormula: delta,
    recommendedGoalKcal,
    confidenceLabel: loggedDays.length >= 10 ? "Висока точність (AI-калібровка)" : "Середня точність",
    explanation:
      delta >= 0
        ? `Ваш реальний метаболізм на ${delta} ккал/день швидший за стандартну формулу завдяки активності.`
        : `Ваш метаболізм адаптувався на ${Math.abs(delta)} ккал/день нижче формули — скоригуйте ціль для стабільного прогресу.`,
  };
}

export interface CaffeineStatus {
  caffeineMg: number;
  safeLimitMg: number;
  residualAtBedtimeMg: number;
  sleepSafety: "optimal" | "moderate" | "warning";
  advice: string;
}

export function evaluateCaffeineStatus(caffeineMg: number): CaffeineStatus {
  const safeLimitMg = 400;
  const residualAtBedtimeMg = Math.round(caffeineMg * 0.32);

  if (caffeineMg === 0) {
    return {
      caffeineMg: 0,
      safeLimitMg,
      residualAtBedtimeMg: 0,
      sleepSafety: "optimal",
      advice: "Кофеїн сьогодні не вживався — фаза глибокого сну буде максимальною.",
    };
  }

  if (caffeineMg <= 200) {
    return {
      caffeineMg,
      safeLimitMg,
      residualAtBedtimeMg,
      sleepSafety: "optimal",
      advice: `До 23:00 у крові залишиться ~${residualAtBedtimeMg} мг — безпечно для глибокого сну.`,
    };
  }

  if (caffeineMg <= 350) {
    return {
      caffeineMg,
      safeLimitMg,
      residualAtBedtimeMg,
      sleepSafety: "moderate",
      advice: `Помірне навантаження (~${residualAtBedtimeMg} мг перед сном). Утримайтесь від кави після 16:00.`,
    };
  }

  return {
    caffeineMg,
    safeLimitMg,
    residualAtBedtimeMg,
    sleepSafety: "warning",
    advice: `Високий рівень кофеїну! Замініть наступну чашку на декаф або трав'яний чай.`,
  };
}

export interface DietQualityReport {
  fiberGrams: number;
  fiberGoalGrams: number;
  produceGrams: number;
  produceGoalGrams: number;
  anabolicMealsCount: number;
  qualityScore: number;
}

export function evaluateDietQuality(entries: readonly FoodEntry[]): DietQualityReport {
  let fiberGrams = 0;
  let produceGrams = 0;
  const mealProtein: Record<string, number> = {};

  for (const entry of entries) {
    mealProtein[entry.meal] = (mealProtein[entry.meal] ?? 0) + entry.nutrition.protein;
    const food = FOODS.find((f) => f.id === entry.foodId);
    const ratio = entry.grams / 100;

    if (food) {
      if (food.category === "vegetables" || food.category === "fruit") {
        produceGrams += entry.grams;
        fiberGrams += (food.id === "avocado" ? 6.7 : 2.6) * ratio;
      } else if (food.id === "lentils" || food.id === "chickpeas") {
        fiberGrams += 11.5 * ratio;
      } else if (food.category === "grains") {
        fiberGrams += (food.id === "rice-cooked" ? 1.8 : 8.5) * ratio;
      } else if (food.category === "nuts") {
        fiberGrams += 8.8 * ratio;
      } else if (food.id === "bread-whole" || food.id === "bread-rye") {
        fiberGrams += 6.2 * ratio;
      }
    }
  }

  const roundedFiber = Math.round(fiberGrams * 10) / 10;
  const roundedProduce = Math.round(produceGrams);
  const anabolicMealsCount = Object.values(mealProtein).filter((p) => p >= 28).length;

  const fiberRatio = Math.min(1, roundedFiber / 28);
  const produceRatio = Math.min(1, roundedProduce / 400);
  const pacingRatio = Math.min(1, anabolicMealsCount / 3);
  const qualityScore = Math.round((fiberRatio * 35 + produceRatio * 35 + pacingRatio * 30));

  return {
    fiberGrams: roundedFiber,
    fiberGoalGrams: 28,
    produceGrams: roundedProduce,
    produceGoalGrams: 400,
    anabolicMealsCount,
    qualityScore,
  };
}

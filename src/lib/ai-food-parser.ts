import { FOODS } from "@/data/foods";
import { nutritionForGrams } from "@/lib/nutrition";
import type { Food, Nutrition } from "@/types/domain";

export interface ParsedMealItem {
  food: Food;
  grams: number;
  label: string;
  nutrition: Nutrition;
}

interface KeywordRule {
  keywords: readonly string[];
  foodId: string;
  defaultGrams: number;
  unitGrams?: number;
}

/**
 * Усі правила розпізнавання налаштовані на стандарт СИРОЇ / СУХОЇ ваги до термічної обробки.
 */
const KEYWORD_RULES: readonly KeywordRule[] = [
  { keywords: ["яйц", "яєчн"], foodId: "egg-boiled", defaultGrams: 100, unitGrams: 50 },
  { keywords: ["яєчн білок", "білки яєц"], foodId: "egg-white-raw", defaultGrams: 100, unitGrams: 33 },
  { keywords: ["омлет"], foodId: "omelet", defaultGrams: 160, unitGrams: 160 },
  { keywords: ["тост", "хліб", "скибк"], foodId: "bread-wholegrain", defaultGrams: 35, unitGrams: 35 },
  { keywords: ["авокадо"], foodId: "avocado", defaultGrams: 70, unitGrams: 70 },
  { keywords: ["вівсян", "каша вівс", "пластівц"], foodId: "oatmeal-water", defaultGrams: 60, unitGrams: 60 },
  { keywords: ["гречк", "гречан"], foodId: "buckwheat-cooked", defaultGrams: 65, unitGrams: 65 },
  { keywords: ["рис"], foodId: "rice-cooked", defaultGrams: 65, unitGrams: 65 },
  { keywords: ["булгур"], foodId: "bulgur-dry", defaultGrams: 65, unitGrams: 65 },
  { keywords: ["кіноа"], foodId: "quinoa-dry", defaultGrams: 65, unitGrams: 65 },
  { keywords: ["кускус"], foodId: "couscous-dry", defaultGrams: 65, unitGrams: 65 },
  { keywords: ["макарон", "паст", "спагет"], foodId: "pasta-cooked", defaultGrams: 75, unitGrams: 75 },
  { keywords: ["курк", "куряч", "філе", "грудк"], foodId: "chicken-breast", defaultGrams: 180, unitGrams: 180 },
  { keywords: ["індич", "індик"], foodId: "turkey-fillet", defaultGrams: 180, unitGrams: 180 },
  { keywords: ["лосос", "сьомг", "червона риб"], foodId: "salmon-baked", defaultGrams: 150, unitGrams: 150 },
  { keywords: ["хек", "тріск", "минтай", "біла риб"], foodId: "white-fish-raw", defaultGrams: 200, unitGrams: 200 },
  { keywords: ["тунец", "тунц"], foodId: "tuna-canned", defaultGrams: 130, unitGrams: 130 },
  { keywords: ["ялович", "стейк", "телятин"], foodId: "beef-stewed", defaultGrams: 170, unitGrams: 170 },
  { keywords: ["свинин"], foodId: "pork-lean", defaultGrams: 160, unitGrams: 160 },
  { keywords: ["креветк"], foodId: "shrimp-boiled", defaultGrams: 150, unitGrams: 150 },
  { keywords: ["сирник"], foodId: "syrniki", defaultGrams: 180, unitGrams: 60 },
  { keywords: ["кисломолоч", "творог"], foodId: "cottage-5", defaultGrams: 180, unitGrams: 180 },
  { keywords: ["йогурт"], foodId: "yogurt-greek", defaultGrams: 140, unitGrams: 140 },
  { keywords: ["сметан"], foodId: "sour-cream-15", defaultGrams: 25, unitGrams: 25 },
  { keywords: ["моцарел"], foodId: "mozzarella", defaultGrams: 60, unitGrams: 30 },
  { keywords: ["гауд", "твердий сир"], foodId: "cheese-gouda", defaultGrams: 40, unitGrams: 20 },
  { keywords: ["борщ"], foodId: "borscht", defaultGrams: 300, unitGrams: 300 },
  { keywords: ["вареник"], foodId: "varenyky-potato", defaultGrams: 160, unitGrams: 35 },
  { keywords: ["пельмен"], foodId: "pelmeni", defaultGrams: 150, unitGrams: 15 },
  { keywords: ["салат"], foodId: "salad-veg-oil", defaultGrams: 200, unitGrams: 200 },
  { keywords: ["брокол"], foodId: "broccoli-cooked", defaultGrams: 150, unitGrams: 150 },
  { keywords: ["печериц", "гриб"], foodId: "mushrooms-raw", defaultGrams: 150, unitGrams: 150 },
  { keywords: ["огір"], foodId: "cucumber", defaultGrams: 110, unitGrams: 110 },
  { keywords: ["помідор", "томат"], foodId: "tomato", defaultGrams: 120, unitGrams: 120 },
  { keywords: ["банан"], foodId: "banana", defaultGrams: 120, unitGrams: 120 },
  { keywords: ["яблук"], foodId: "apple", defaultGrams: 180, unitGrams: 180 },
  { keywords: ["полуниц", "ягод"], foodId: "strawberry", defaultGrams: 100, unitGrams: 100 },
  { keywords: ["апельсин"], foodId: "orange", defaultGrams: 150, unitGrams: 150 },
  { keywords: ["латте", "кав", "капучин"], foodId: "latte", defaultGrams: 250, unitGrams: 250 },
  { keywords: ["мигдал", "горіх"], foodId: "almonds", defaultGrams: 25, unitGrams: 25 },
  { keywords: ["арахіс"], foodId: "peanut-butter", defaultGrams: 18, unitGrams: 18 },
  { keywords: ["шоколад"], foodId: "dark-chocolate", defaultGrams: 20, unitGrams: 10 },
  { keywords: ["батончик"], foodId: "protein-bar", defaultGrams: 60, unitGrams: 60 },
  { keywords: ["скуп", "протеїн"], foodId: "whey-protein", defaultGrams: 30, unitGrams: 30 },
  { keywords: ["круасан"], foodId: "croissant", defaultGrams: 60, unitGrams: 60 },
  { keywords: ["картопл"], foodId: "potato-boiled", defaultGrams: 200, unitGrams: 150 },
  { keywords: ["батат"], foodId: "sweet-potato-raw", defaultGrams: 200, unitGrams: 200 },
];

const foodById = new Map(FOODS.map((food) => [food.id, food]));

function buildItem(foodId: string, grams: number, label?: string): ParsedMealItem | null {
  const food = foodById.get(foodId);
  if (!food) return null;
  const safeGrams = Math.max(5, Math.min(2000, Math.round(grams)));
  return {
    food,
    grams: safeGrams,
    label: label ?? `${safeGrams} г`,
    nutrition: nutritionForGrams(food, safeGrams),
  };
}

/**
 * Розбирає вільний український опис прийому їжі (текст або транскрипт голосу)
 * на список сирих/сухих інгредієнтів із грамажем і БЖВ.
 */
export function parseMealDescription(description: string): ParsedMealItem[] {
  const normalized = description
    .toLocaleLowerCase("uk-UA")
    .replace(/[’'ʼ`]/g, "")
    .trim();

  if (!normalized) return [];

  const clauses = normalized
    .split(/(?:,|;|\+|\bта\b|\bі\b|\bй\b|\bплюс\b|\bразом з\b)/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const found = new Map<string, ParsedMealItem>();

  for (const clause of clauses) {
    for (const rule of KEYWORD_RULES) {
      if (!rule.keywords.some((kw) => clause.includes(kw))) continue;

      let grams = rule.defaultGrams;
      const gramsMatch = clause.match(/(\d+(?:[.,]\d+)?)\s*(?:г|гр|грам|мл)\b/);
      const countMatch = clause.match(/(\d+(?:[.,]\d+)?)\s*(?:шт|штук|порц|таріл|склян|чаш|скиб|кус|шмат|скуп)?/);

      if (gramsMatch?.[1]) {
        grams = Number(gramsMatch[1].replace(",", "."));
      } else if (countMatch?.[1] && rule.unitGrams) {
        const count = Number(countMatch[1].replace(",", "."));
        if (count > 0 && count <= 15) {
          grams = count * rule.unitGrams;
        }
      }

      const item = buildItem(rule.foodId, grams);
      if (item && !found.has(rule.foodId)) {
        found.set(rule.foodId, item);
      }
    }
  }

  if (found.size === 0) {
    for (const food of FOODS) {
      const firstWord = food.name.toLocaleLowerCase("uk-UA").split(" ")[0] ?? "";
      if (firstWord.length >= 4 && normalized.includes(firstWord.slice(0, 4))) {
        const defaultServing = food.servings[0]?.grams ?? 100;
        const item = buildItem(food.id, defaultServing);
        if (item) found.set(food.id, item);
      }
    }
  }

  return Array.from(found.values());
}

export interface PhotoMealPreset {
  id: string;
  title: string;
  subtitle: string;
  prompt: string;
}

export const AI_PHOTO_PRESETS: readonly PhotoMealPreset[] = [
  {
    id: "avocado-eggs",
    title: "Тост з авокадо та 2 сирі яйця",
    subtitle: "Сніданок (сира вага) · ~455 ккал",
    prompt: "2 яйця, 1 тост цільнозернового хліба, 70 г авокадо та латте",
  },
  {
    id: "chicken-buckwheat",
    title: "Сире філе курки (180г) + суха гречка (65г)",
    subtitle: "Обід (сира/суха вага) · ~470 ккал",
    prompt: "180 г курячої грудки, 65 г гречки та 200 г овочевого салату",
  },
  {
    id: "salmon-bowl",
    title: "Сирий лосось (150г) + сухий рис (65г) + броколі",
    subtitle: "Вечеря (сира/суха вага) · ~595 ккал",
    prompt: "150 г лосося, 65 г рису та 150 г броколі",
  },
  {
    id: "syrniki-berry",
    title: "Сирники (сира маса 180г) зі сметаною та полуницею",
    subtitle: "Сніданок (сира вага) · ~375 ккал",
    prompt: "180 г сирників, 25 г сметани та 100 г полуниці",
  },
];

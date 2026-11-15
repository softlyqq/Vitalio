import { FOODS, POPULAR_FOOD_IDS, SYSTEM_MEAL_COMBOS } from "@/data/foods";
import { sumNutrition } from "@/lib/nutrition";
import type { FoodRepository } from "@/services/ports";
import { customFoodsStoreSchema, mealCombosStoreSchema } from "@/services/schemas";
import { createId, readStorage, writeStorage } from "@/services/storage";
import type { Food, MealCombo, MealComboItem, MealType } from "@/types/domain";

const CUSTOM_FOODS_KEY = "vitalio:custom-foods:v1";
const CUSTOM_COMBOS_KEY = "vitalio:custom-combos:v1";

/** Нормалізація для пошуку: регістр, апострофи, пробіли. */
const normalize = (value: string): string =>
  value.toLocaleLowerCase("uk-UA").replace(/[’'ʼ`]/g, "").replace(/\s+/g, " ").trim();

interface IndexedFood {
  food: Food;
  haystack: string;
}

/** Рангування: початок назви > початок слова > входження. Слова запиту мають збігтися всі. */
function score(item: IndexedFood, tokens: readonly string[]): number {
  let total = 0;
  for (const token of tokens) {
    const index = item.haystack.indexOf(token);
    if (index === -1) return -1;
    if (index === 0) total += 3;
    else if (item.haystack[index - 1] === " ") total += 2;
    else total += 1;
  }
  return total;
}

export class LocalFoodRepository implements FoodRepository {
  private customCache: Food[] | null = null;
  private indexedCache: IndexedFood[] | null = null;
  private customCombosCache: MealCombo[] | null = null;

  private loadCustom(): Food[] {
    if (this.customCache) return this.customCache;
    if (typeof window === "undefined") return [];
    const loaded = readStorage(CUSTOM_FOODS_KEY, customFoodsStoreSchema) ?? [];
    this.customCache = loaded;
    return loaded;
  }

  private loadCustomCombos(): MealCombo[] {
    if (this.customCombosCache) return this.customCombosCache;
    if (typeof window === "undefined") return [];
    const loaded = readStorage(CUSTOM_COMBOS_KEY, mealCombosStoreSchema) ?? [];
    this.customCombosCache = loaded;
    return loaded;
  }

  private getAllFoods(): Food[] {
    return [...this.loadCustom(), ...FOODS];
  }

  private getIndex(): IndexedFood[] {
    if (this.indexedCache) return this.indexedCache;
    this.indexedCache = this.getAllFoods().map((food) => ({
      food,
      haystack: `${normalize(food.name)} ${food.barcode ?? ""}`,
    }));
    return this.indexedCache;
  }

  searchSync(query: string, limit = 25): Food[] {
    const tokens = normalize(query).split(" ").filter(Boolean);
    if (tokens.length === 0) return [];
    return this.getIndex()
      .map((item) => ({ item, rank: score(item, tokens) }))
      .filter(({ rank }) => rank >= 0)
      .sort((a, b) => b.rank - a.rank || a.item.food.name.localeCompare(b.item.food.name, "uk"))
      .slice(0, limit)
      .map(({ item }) => item.food);
  }

  async search(query: string, limit = 25): Promise<Food[]> {
    return this.searchSync(query, limit);
  }

  getPopularSync(): Food[] {
    const custom = this.loadCustom();
    const popularSystem = POPULAR_FOOD_IDS.flatMap((id) => {
      const food = FOODS.find((candidate) => candidate.id === id);
      return food ? [food] : [];
    });
    return [...custom.slice(0, 4), ...popularSystem];
  }

  async getPopular(): Promise<Food[]> {
    return this.getPopularSync();
  }

  async getById(id: string): Promise<Food | null> {
    return this.getAllFoods().find((food) => food.id === id) ?? null;
  }

  async findByBarcode(barcode: string): Promise<Food | null> {
    const cleaned = barcode.replace(/\D/g, "");
    if (!cleaned) return null;
    return this.getAllFoods().find((food) => food.barcode === cleaned) ?? null;
  }

  async createCustomFood(input: Omit<Food, "id">): Promise<Food> {
    const custom = this.loadCustom();
    const created: Food = {
      ...input,
      id: `custom-${createId()}`,
      isCustom: true,
    };
    const next = [created, ...custom];
    this.customCache = next;
    this.indexedCache = null;
    writeStorage(CUSTOM_FOODS_KEY, next);
    return created;
  }

  getCombosSync(): MealCombo[] {
    return [...this.loadCustomCombos(), ...SYSTEM_MEAL_COMBOS];
  }

  async getCombos(): Promise<MealCombo[]> {
    return this.getCombosSync();
  }

  async createCombo(input: {
    title: string;
    subtitle: string;
    defaultMeal: MealType;
    items: readonly MealComboItem[];
  }): Promise<MealCombo> {
    const custom = this.loadCustomCombos();
    const created: MealCombo = {
      id: `combo-custom-${createId()}`,
      title: input.title.trim() || "Мій сет",
      subtitle: input.subtitle.trim() || `${input.items.length} поз.`,
      defaultMeal: input.defaultMeal,
      items: [...input.items],
      total: sumNutrition(input.items.map((item) => item.nutrition)),
      isCustom: true,
    };
    const next = [created, ...custom];
    this.customCombosCache = next;
    writeStorage(CUSTOM_COMBOS_KEY, next);
    return created;
  }

  async removeCombo(comboId: string): Promise<void> {
    const custom = this.loadCustomCombos();
    const next = custom.filter((combo) => combo.id !== comboId);
    this.customCombosCache = next;
    writeStorage(CUSTOM_COMBOS_KEY, next);
  }
}

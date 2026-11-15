import { FOODS } from "@/data/foods";
import { EMPTY_NUTRITION, nutritionForGrams, sumNutrition } from "@/lib/nutrition";
import { dateRange, todayISO } from "@/lib/date";
import { createDemoDiary } from "@/services/diary/demo-seed";
import type { DiaryRepository } from "@/services/ports";
import { diaryStoreSchema, type DiaryStoreData } from "@/services/schemas";
import { createId, readStorage, writeStorage } from "@/services/storage";
import type {
  DayLog,
  DaySummary,
  FoodEntry,
  ISODate,
  Macros,
  MealComboItem,
  MealType,
  NewFoodEntry,
} from "@/types/domain";

const STORAGE_KEY = "vitalio:diary:v2";
const MAX_WATER_ML = 10_000;
const MAX_BURNED_KCAL = 10_000;
const MAX_CAFFEINE_MG = 1_500;

const emptyDay = (date: ISODate): DayLog => ({
  date,
  entries: [],
  waterMl: 0,
  burnedKcal: 0,
  caffeineMg: 0,
});

/**
 * Реалізація `DiaryRepository` поверх localStorage з миттєвим in-memory кешем:
 * парсинг і Zod-валідація виконуються лише один раз за сесію, тому кожен клік
 * відпрацьовує за < 0.1 мс без блокування головного потоку.
 *
 * Для нових користувачів щоденник за замовчуванням порожній (0 ккал, 0 води, 0 спалено).
 * Демо-дані можна завантажити опціонально через `resetDemo()`.
 */
export class LocalDiaryRepository implements DiaryRepository {
  private cache: DiaryStoreData | null = null;

  private load(): DiaryStoreData {
    if (this.cache) return this.cache;
    if (typeof window === "undefined") {
      return { version: 1, days: {} };
    }
    const stored = readStorage(STORAGE_KEY, diaryStoreSchema);
    if (stored) {
      this.cache = stored;
      return stored;
    }
    const clean: DiaryStoreData = { version: 1, days: {} };
    this.cache = clean;
    writeStorage(STORAGE_KEY, clean);
    return clean;
  }

  private save(data: DiaryStoreData): void {
    this.cache = data;
    writeStorage(STORAGE_KEY, data);
  }

  getDaySync(date: ISODate): DayLog {
    return this.load().days[date] ?? emptyDay(date);
  }

  async getDay(date: ISODate): Promise<DayLog> {
    return this.getDaySync(date);
  }

  async addEntry(input: NewFoodEntry): Promise<FoodEntry> {
    const data = this.load();
    const day = data.days[input.date] ?? emptyDay(input.date);
    const entry: FoodEntry = {
      id: createId(),
      date: input.date,
      meal: input.meal,
      foodId: input.food.id,
      name: input.food.name,
      grams: input.grams,
      nutrition: nutritionForGrams(input.food, input.grams),
      createdAt: new Date().toISOString(),
    };
    data.days[input.date] = { ...day, entries: [...day.entries, entry] };
    this.save(data);
    return entry;
  }

  async addComboEntries(
    date: ISODate,
    meal: MealType,
    items: readonly MealComboItem[],
  ): Promise<FoodEntry[]> {
    const data = this.load();
    const day = data.days[date] ?? emptyDay(date);
    const now = new Date().toISOString();
    const added: FoodEntry[] = items.map((item) => ({
      id: createId(),
      date,
      meal,
      foodId: item.foodId,
      name: item.name,
      grams: item.grams,
      nutrition: item.nutrition,
      createdAt: now,
    }));
    data.days[date] = { ...day, entries: [...day.entries, ...added] };
    this.save(data);
    return added;
  }

  async addQuickCalories(
    date: ISODate,
    meal: MealType,
    title: string,
    kcal: number,
    macros?: Partial<Macros>,
  ): Promise<FoodEntry> {
    const data = this.load();
    const day = data.days[date] ?? emptyDay(date);
    const cleanKcal = Math.max(10, Math.round(kcal));
    const protein = macros?.protein ?? Math.round((cleanKcal * 0.25) / 4);
    const fat = macros?.fat ?? Math.round((cleanKcal * 0.3) / 9);
    const carbs = macros?.carbs ?? Math.round((cleanKcal * 0.45) / 4);
    const entry: FoodEntry = {
      id: createId(),
      date,
      meal,
      foodId: `quick-${createId()}`,
      name: title.trim() || "Швидкий запис",
      grams: 100,
      nutrition: { kcal: cleanKcal, protein, fat, carbs },
      createdAt: new Date().toISOString(),
    };
    data.days[date] = { ...day, entries: [...day.entries, entry] };
    this.save(data);
    return entry;
  }

  async updateEntryGrams(date: ISODate, entryId: string, grams: number): Promise<FoodEntry | null> {
    const data = this.load();
    const day = data.days[date];
    if (!day) return null;

    const clampedGrams = Math.min(3000, Math.max(5, Math.round(grams)));
    let updatedEntry: FoodEntry | null = null;

    const nextEntries = day.entries.map((entry) => {
      if (entry.id !== entryId) return entry;
      const catalogFood = FOODS.find((food) => food.id === entry.foodId);
      const nextNutrition = catalogFood
        ? nutritionForGrams(catalogFood, clampedGrams)
        : {
            kcal: Math.round((entry.nutrition.kcal * clampedGrams) / Math.max(1, entry.grams)),
            protein: Math.round(((entry.nutrition.protein * clampedGrams) / Math.max(1, entry.grams)) * 10) / 10,
            fat: Math.round(((entry.nutrition.fat * clampedGrams) / Math.max(1, entry.grams)) * 10) / 10,
            carbs: Math.round(((entry.nutrition.carbs * clampedGrams) / Math.max(1, entry.grams)) * 10) / 10,
          };
      updatedEntry = {
        ...entry,
        grams: clampedGrams,
        nutrition: nextNutrition,
      };
      return updatedEntry;
    });

    if (!updatedEntry) return null;
    data.days[date] = { ...day, entries: nextEntries };
    this.save(data);
    return updatedEntry;
  }

  async removeEntry(date: ISODate, entryId: string): Promise<void> {
    const data = this.load();
    const day = data.days[date];
    if (!day) return;
    data.days[date] = { ...day, entries: day.entries.filter((entry) => entry.id !== entryId) };
    this.save(data);
  }

  async addWater(date: ISODate, deltaMl: number): Promise<number> {
    const data = this.load();
    const day = data.days[date] ?? emptyDay(date);
    const waterMl = Math.min(MAX_WATER_ML, Math.max(0, day.waterMl + deltaMl));
    data.days[date] = { ...day, waterMl };
    this.save(data);
    return waterMl;
  }

  async addCaffeine(date: ISODate, deltaMg: number): Promise<number> {
    const data = this.load();
    const day = data.days[date] ?? emptyDay(date);
    const current = day.caffeineMg ?? 0;
    const caffeineMg = Math.min(MAX_CAFFEINE_MG, Math.max(0, current + deltaMg));
    data.days[date] = { ...day, caffeineMg };
    this.save(data);
    return caffeineMg;
  }

  async setBurnedKcal(date: ISODate, burnedKcal: number): Promise<number> {
    const data = this.load();
    const day = data.days[date] ?? emptyDay(date);
    const next = Math.min(MAX_BURNED_KCAL, Math.max(0, Math.round(burnedKcal)));
    data.days[date] = { ...day, burnedKcal: next };
    this.save(data);
    return next;
  }

  async copyMeal(fromDate: ISODate, toDate: ISODate, meal: MealType): Promise<FoodEntry[]> {
    const data = this.load();
    const sourceDay = data.days[fromDate];
    if (!sourceDay) return [];
    const sourceEntries = sourceDay.entries.filter((entry) => entry.meal === meal);
    if (sourceEntries.length === 0) return [];

    const targetDay = data.days[toDate] ?? emptyDay(toDate);
    const now = new Date().toISOString();
    const copied: FoodEntry[] = sourceEntries.map((entry) => ({
      ...entry,
      id: createId(),
      date: toDate,
      createdAt: now,
    }));
    data.days[toDate] = { ...targetDay, entries: [...targetDay.entries, ...copied] };
    this.save(data);
    return copied;
  }

  getSummariesSync(from: ISODate, to: ISODate): DaySummary[] {
    const { days } = this.load();
    return dateRange(from, to).map((date) => {
      const day = days[date];
      const totals = day ? sumNutrition(day.entries.map((entry) => entry.nutrition)) : EMPTY_NUTRITION;
      return {
        date,
        kcal: totals.kcal,
        protein: totals.protein,
        fat: totals.fat,
        carbs: totals.carbs,
        entriesCount: day?.entries.length ?? 0,
        waterMl: day?.waterMl ?? 0,
        burnedKcal: day?.burnedKcal ?? 0,
      };
    });
  }

  async getSummaries(from: ISODate, to: ISODate): Promise<DaySummary[]> {
    return this.getSummariesSync(from, to);
  }

  async clearAll(): Promise<void> {
    const clean: DiaryStoreData = { version: 1, days: {} };
    this.save(clean);
  }

  async resetDemo(): Promise<void> {
    const seeded = createDemoDiary(todayISO());
    this.save(seeded);
  }
}

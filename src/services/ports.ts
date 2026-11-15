import type {
  DayLog,
  DaySummary,
  FastingState,
  Food,
  FoodEntry,
  ISODate,
  Macros,
  MealCombo,
  MealComboItem,
  MealType,
  NewFoodEntry,
  PlanTier,
  UserProfile,
  WeightEntry,
} from "@/types/domain";

/**
 * Порти (інтерфейси) доступу до даних.
 * UI залежить лише від них; реалізація підміняється в `src/services/index.ts`
 * (LocalStorage для прототипу → Supabase для продакшену) без змін у компонентах.
 */
export interface DiaryRepository {
  getDaySync(date: ISODate): DayLog;
  getDay(date: ISODate): Promise<DayLog>;
  addEntry(input: NewFoodEntry): Promise<FoodEntry>;
  addComboEntries(date: ISODate, meal: MealType, items: readonly MealComboItem[]): Promise<FoodEntry[]>;
  addQuickCalories(
    date: ISODate,
    meal: MealType,
    title: string,
    kcal: number,
    macros?: Partial<Macros>,
  ): Promise<FoodEntry>;
  updateEntryGrams(date: ISODate, entryId: string, grams: number): Promise<FoodEntry | null>;
  removeEntry(date: ISODate, entryId: string): Promise<void>;
  /** Змінює кількість випитої води на `deltaMl` (не нижче 0) і повертає нове значення. */
  addWater(date: ISODate, deltaMl: number): Promise<number>;
  /** Змінює кількість кофеїну за день на `deltaMg` (не нижче 0) і повертає нове значення. */
  addCaffeine(date: ISODate, deltaMg: number): Promise<number>;
  /** Оновлює спалені калорії за день і повертає нове значення. */
  setBurnedKcal(date: ISODate, burnedKcal: number): Promise<number>;
  /** Копіює всі записи певного прийому їжі з `fromDate` у `toDate`. */
  copyMeal(fromDate: ISODate, toDate: ISODate, meal: MealType): Promise<FoodEntry[]>;
  getSummariesSync(from: ISODate, to: ISODate): DaySummary[];
  getSummaries(from: ISODate, to: ISODate): Promise<DaySummary[]>;
  clearAll(): Promise<void>;
  resetDemo(): Promise<void>;
}

export interface FoodRepository {
  searchSync(query: string, limit?: number): Food[];
  search(query: string, limit?: number): Promise<Food[]>;
  getPopularSync(): Food[];
  getPopular(): Promise<Food[]>;
  getById(id: string): Promise<Food | null>;
  findByBarcode(barcode: string): Promise<Food | null>;
  createCustomFood(food: Omit<Food, "id">): Promise<Food>;
  getCombosSync(): MealCombo[];
  getCombos(): Promise<MealCombo[]>;
  createCombo(input: {
    title: string;
    subtitle: string;
    defaultMeal: MealType;
    items: readonly MealComboItem[];
  }): Promise<MealCombo>;
  removeCombo(comboId: string): Promise<void>;
}

export interface ProfileRepository {
  getProfileSync(): UserProfile;
  getProfile(): Promise<UserProfile>;
  updateProfile(profile: UserProfile): Promise<UserProfile>;
  getPlanTierSync(): PlanTier;
  getPlanTier(): Promise<PlanTier>;
  setPlanTier(tier: PlanTier): Promise<PlanTier>;
  getWeightsSync(from: ISODate, to: ISODate): WeightEntry[];
  getWeights(from: ISODate, to: ISODate): Promise<WeightEntry[]>;
  logWeight(date: ISODate, weightKg: number, note?: string): Promise<WeightEntry>;
  clearWeights(): Promise<void>;
  resetDemoWeights(currentWeight: number): Promise<void>;
  getFastingSync(): FastingState;
  getFasting(): Promise<FastingState>;
  updateFasting(state: FastingState): Promise<FastingState>;
}

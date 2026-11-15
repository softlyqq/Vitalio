import { addDays, dateRange, todayISO } from "@/lib/date";
import type { ProfileRepository } from "@/services/ports";
import {
  fastingStateSchema,
  planTierSchema,
  profileSchema,
  weightStoreSchema,
  type WeightStoreData,
} from "@/services/schemas";
import { readStorage, writeStorage } from "@/services/storage";
import type { FastingState, ISODate, PlanTier, UserProfile, WeightEntry } from "@/types/domain";

const PROFILE_KEY = "vitalio:profile:v1";
const PLAN_KEY = "vitalio:plan:v1";
const WEIGHTS_KEY = "vitalio:weights:v1";
const FASTING_KEY = "vitalio:fasting:v1";

export const DEFAULT_FASTING: FastingState = {
  active: true,
  protocol: "16:8",
  // Демо: таймер запущено ~11.5 годин тому, щоб одразу показати живий прогрес фази кетозу/ліполізу
  startedAt: new Date(Date.now() - 11.5 * 3600 * 1000).toISOString(),
  completedSessions: 12,
};

/** Профіль за замовчуванням для демо-режиму. */
export const DEFAULT_PROFILE: UserProfile = {
  name: "Дмитро",
  sex: "male",
  age: 29,
  heightCm: 182,
  weightKg: 78,
  targetWeightKg: 75,
  activity: "moderate",
  goal: "maintain",
};

function createDemoWeights(today: ISODate, currentWeight: number): WeightStoreData {
  const entries: Record<ISODate, WeightEntry> = {};
  const offsets: readonly [number, number][] = [
    [28, 1.8],
    [24, 1.5],
    [21, 1.3],
    [17, 1.1],
    [14, 0.8],
    [10, 0.6],
    [7, 0.4],
    [4, 0.2],
    [2, 0.1],
    [0, 0],
  ];
  for (const [daysAgo, delta] of offsets) {
    const date = addDays(today, -daysAgo);
    entries[date] = {
      date,
      weightKg: Math.round((currentWeight + delta) * 10) / 10,
    };
  }
  return { version: 1, entries };
}

export class LocalProfileRepository implements ProfileRepository {
  private profileCache: UserProfile | null = null;
  private planCache: PlanTier | null = null;
  private weightsCache: WeightStoreData | null = null;
  private fastingCache: FastingState | null = null;

  private loadWeights(currentWeight: number): WeightStoreData {
    if (this.weightsCache) return this.weightsCache;
    if (typeof window === "undefined") return { version: 1, entries: {} };
    const stored = readStorage(WEIGHTS_KEY, weightStoreSchema);
    if (stored) {
      this.weightsCache = stored;
      return stored;
    }
    const seeded = createDemoWeights(todayISO(), currentWeight);
    this.weightsCache = seeded;
    writeStorage(WEIGHTS_KEY, seeded);
    return seeded;
  }

  getProfileSync(): UserProfile {
    if (this.profileCache) return this.profileCache;
    if (typeof window === "undefined") return DEFAULT_PROFILE;
    const loaded = readStorage(PROFILE_KEY, profileSchema) ?? DEFAULT_PROFILE;
    this.profileCache = loaded;
    return loaded;
  }

  async getProfile(): Promise<UserProfile> {
    return this.getProfileSync();
  }

  async updateProfile(profile: UserProfile): Promise<UserProfile> {
    this.profileCache = profile;
    writeStorage(PROFILE_KEY, profile);
    const today = todayISO();
    const weights = this.loadWeights(profile.weightKg);
    weights.entries[today] = { date: today, weightKg: profile.weightKg };
    this.weightsCache = weights;
    writeStorage(WEIGHTS_KEY, weights);
    return profile;
  }

  getPlanTierSync(): PlanTier {
    if (this.planCache) return this.planCache;
    if (typeof window === "undefined") return "free";
    const loaded = readStorage(PLAN_KEY, planTierSchema) ?? "free";
    this.planCache = loaded;
    return loaded;
  }

  async getPlanTier(): Promise<PlanTier> {
    return this.getPlanTierSync();
  }

  async setPlanTier(tier: PlanTier): Promise<PlanTier> {
    this.planCache = tier;
    writeStorage(PLAN_KEY, tier);
    return tier;
  }

  getWeightsSync(from: ISODate, to: ISODate): WeightEntry[] {
    const profile = this.getProfileSync();
    const { entries } = this.loadWeights(profile.weightKg);
    return dateRange(from, to).flatMap((date) => {
      const entry = entries[date];
      return entry ? [entry] : [];
    });
  }

  async getWeights(from: ISODate, to: ISODate): Promise<WeightEntry[]> {
    return this.getWeightsSync(from, to);
  }

  async logWeight(date: ISODate, weightKg: number, note?: string): Promise<WeightEntry> {
    const profile = this.getProfileSync();
    const rounded = Math.round(weightKg * 10) / 10;
    const store = this.loadWeights(rounded);
    const entry: WeightEntry = { date, weightKg: rounded, ...(note ? { note } : {}) };
    store.entries[date] = entry;
    this.weightsCache = store;
    writeStorage(WEIGHTS_KEY, store);

    if (date === todayISO()) {
      const nextProfile = { ...profile, weightKg: rounded };
      this.profileCache = nextProfile;
      writeStorage(PROFILE_KEY, nextProfile);
    }
    return entry;
  }

  getFastingSync(): FastingState {
    if (this.fastingCache) return this.fastingCache;
    if (typeof window === "undefined") return DEFAULT_FASTING;
    const loaded = readStorage(FASTING_KEY, fastingStateSchema) ?? DEFAULT_FASTING;
    this.fastingCache = loaded;
    return loaded;
  }

  async getFasting(): Promise<FastingState> {
    return this.getFastingSync();
  }

  async updateFasting(state: FastingState): Promise<FastingState> {
    this.fastingCache = state;
    writeStorage(FASTING_KEY, state);
    return state;
  }
}

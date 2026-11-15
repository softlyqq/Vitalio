"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { calculateTargets } from "@/lib/nutrition";
import { queryKeys } from "@/lib/query-keys";
import { services } from "@/services";
import { todayISO } from "@/lib/date";
import type {
  FastingState,
  Food,
  ISODate,
  MealComboItem,
  MealType,
  PlanTier,
  UserProfile,
} from "@/types/domain";

/**
 * Під час SSR та першого проходу клієнтської гідратації повертає `false` (щоб серверний і клієнтський HTML
 * збігалися на 100%), а одразу після монтування стає `true` — тож усі подальші перемикання вкладок і дат
 * отримують дані з пам'яті синхронно за 0 мс.
 */
let clientHydrated = false;

export function isClientHydrated(): boolean {
  return clientHydrated && typeof window !== "undefined";
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile(),
    queryFn: () => services.profile.getProfile(),
    initialData: () => (isClientHydrated() ? services.profile.getProfileSync() : undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: UserProfile) => services.profile.updateProfile(profile),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.profile(), updated);
      void queryClient.invalidateQueries({ queryKey: queryKeys.allWeights() });
    },
  });
}

export function usePlanTier() {
  return useQuery({
    queryKey: queryKeys.planTier(),
    queryFn: () => services.profile.getPlanTier(),
    initialData: () => (isClientHydrated() ? services.profile.getPlanTierSync() : undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSetPlanTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tier: PlanTier) => services.profile.setPlanTier(tier),
    onSuccess: (tier) => {
      queryClient.setQueryData(queryKeys.planTier(), tier);
    },
  });
}

export function useWeights(from: ISODate, to: ISODate) {
  return useQuery({
    queryKey: queryKeys.weights(from, to),
    queryFn: () => services.profile.getWeights(from, to),
    initialData: () => (isClientHydrated() ? services.profile.getWeightsSync(from, to) : undefined),
    placeholderData: keepPreviousData,
  });
}

interface LogWeightVariables {
  date: ISODate;
  weightKg: number;
  note?: string;
}

export function useLogWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, weightKg, note }: LogWeightVariables) =>
      services.profile.logWeight(date, weightKg, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allWeights() });
      queryClient.setQueryData(queryKeys.profile(), services.profile.getProfileSync());
    },
  });
}

/** Профіль + розраховані добові цілі (Міффлін — Сан Жеор). */
export function useTargets() {
  const profile = useProfile();
  return {
    isLoading: profile.isLoading,
    profile: profile.data,
    targets: profile.data ? calculateTargets(profile.data) : undefined,
  };
}

/** Значення за `delay` мс після останньої зміни. */
export function useDebouncedValue<T>(value: T, delay = 60): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function useFoodSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.foodSearch(trimmed),
    queryFn: () => services.foods.search(trimmed),
    initialData: () =>
      isClientHydrated() && trimmed.length > 0 ? services.foods.searchSync(trimmed) : undefined,
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}

export function usePopularFoods() {
  return useQuery({
    queryKey: queryKeys.foodPopular(),
    queryFn: () => services.foods.getPopular(),
    initialData: () => (isClientHydrated() ? services.foods.getPopularSync() : undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreateCustomFood() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (food: Omit<Food, "id">) => services.foods.createCustomFood(food),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allFoods() });
    },
  });
}

export function useMealCombos() {
  return useQuery({
    queryKey: queryKeys.foodCombos(),
    queryFn: () => services.foods.getCombos(),
    initialData: () => (isClientHydrated() ? services.foods.getCombosSync() : undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useCreateMealCombo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      title: string;
      subtitle: string;
      defaultMeal: MealType;
      items: readonly MealComboItem[];
    }) => services.foods.createCombo(input),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.foodCombos(), services.foods.getCombosSync());
    },
  });
}

export function useRemoveMealCombo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (comboId: string) => services.foods.removeCombo(comboId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.foodCombos(), services.foods.getCombosSync());
    },
  });
}

export function useFasting() {
  return useQuery({
    queryKey: queryKeys.fasting(),
    queryFn: () => services.profile.getFasting(),
    initialData: () => (isClientHydrated() ? services.profile.getFastingSync() : undefined),
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useUpdateFasting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (state: FastingState) => services.profile.updateFasting(state),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.fasting(), updated);
    },
  });
}

/**
 * Поточна дата користувача. Під час першої гідратації повертає `null` (відповідність SSR),
 * а після гідратації ініціалізується синхронно на всіх вкладках.
 */
export function useToday(): ISODate | null {
  const [today, setToday] = useState<ISODate | null>(() =>
    clientHydrated && typeof window !== "undefined" ? todayISO() : null,
  );
  useEffect(() => {
    clientHydrated = true;
    const sync = () => setToday(todayISO());
    sync();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);
  return today;
}

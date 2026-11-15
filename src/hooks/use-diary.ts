"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isClientHydrated } from "@/hooks/use-app-data";
import { queryKeys } from "@/lib/query-keys";
import { services } from "@/services";
import type { DayLog, Food, ISODate, Macros, MealComboItem, MealType, NewFoodEntry } from "@/types/domain";

export function useDayLog(date: ISODate) {
  return useQuery({
    queryKey: queryKeys.day(date),
    queryFn: () => services.diary.getDay(date),
    initialData: () => (isClientHydrated() ? services.diary.getDaySync(date) : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useSummaries(from: ISODate, to: ISODate) {
  return useQuery({
    queryKey: queryKeys.summaries(from, to),
    queryFn: () => services.diary.getSummaries(from, to),
    initialData: () => (isClientHydrated() ? services.diary.getSummariesSync(from, to) : undefined),
    placeholderData: keepPreviousData,
  });
}

export function useAddEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewFoodEntry) => services.diary.addEntry(input),
    onSuccess: (_data, input) => {
      queryClient.setQueryData(queryKeys.day(input.date), services.diary.getDaySync(input.date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface BatchAddVariables {
  date: ISODate;
  meal: MealType;
  items: readonly { food: Food; grams: number }[];
}

export function useAddEntriesBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, meal, items }: BatchAddVariables) => {
      for (const item of items) {
        await services.diary.addEntry({ date, meal, food: item.food, grams: item.grams });
      }
    },
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface ComboAddVariables {
  date: ISODate;
  meal: MealType;
  items: readonly MealComboItem[];
}

export function useAddComboEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, meal, items }: ComboAddVariables) =>
      services.diary.addComboEntries(date, meal, items),
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface QuickCaloriesVariables {
  date: ISODate;
  meal: MealType;
  title: string;
  kcal: number;
  macros?: Partial<Macros>;
}

export function useAddQuickCalories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, meal, title, kcal, macros }: QuickCaloriesVariables) =>
      services.diary.addQuickCalories(date, meal, title, kcal, macros),
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface UpdateEntryGramsVariables {
  date: ISODate;
  entryId: string;
  grams: number;
}

export function useUpdateEntryGrams() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, entryId, grams }: UpdateEntryGramsVariables) =>
      services.diary.updateEntryGrams(date, entryId, grams),
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface RemoveEntryVariables {
  date: ISODate;
  entryId: string;
}

export function useRemoveEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, entryId }: RemoveEntryVariables) => services.diary.removeEntry(date, entryId),
    onMutate: async ({ date, entryId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.day(date) });
      const previous = queryClient.getQueryData<DayLog>(queryKeys.day(date));
      if (previous) {
        queryClient.setQueryData<DayLog>(queryKeys.day(date), {
          ...previous,
          entries: previous.entries.filter((entry) => entry.id !== entryId),
        });
      }
      return { previous };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.day(date), context.previous);
    },
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface WaterVariables {
  date: ISODate;
  deltaMl: number;
}

/** Оптимістичне оновлення води: лічильник реагує миттєво, навіть коли бекенд — мережевий. */
export function useAddWater() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, deltaMl }: WaterVariables) => services.diary.addWater(date, deltaMl),
    onMutate: async ({ date, deltaMl }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.day(date) });
      const previous = queryClient.getQueryData<DayLog>(queryKeys.day(date));
      if (previous) {
        queryClient.setQueryData<DayLog>(queryKeys.day(date), {
          ...previous,
          waterMl: Math.max(0, previous.waterMl + deltaMl),
        });
      }
      return { previous };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.day(date), context.previous);
    },
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface CaffeineVariables {
  date: ISODate;
  deltaMg: number;
}

export function useAddCaffeine() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, deltaMg }: CaffeineVariables) => services.diary.addCaffeine(date, deltaMg),
    onMutate: async ({ date, deltaMg }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.day(date) });
      const previous = queryClient.getQueryData<DayLog>(queryKeys.day(date));
      if (previous) {
        queryClient.setQueryData<DayLog>(queryKeys.day(date), {
          ...previous,
          caffeineMg: Math.max(0, (previous.caffeineMg ?? 0) + deltaMg),
        });
      }
      return { previous };
    },
    onError: (_error, { date }, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.day(date), context.previous);
    },
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
    },
  });
}

interface BurnedVariables {
  date: ISODate;
  burnedKcal: number;
}

export function useSetBurnedKcal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ date, burnedKcal }: BurnedVariables) => services.diary.setBurnedKcal(date, burnedKcal),
    onSuccess: (_data, { date }) => {
      queryClient.setQueryData(queryKeys.day(date), services.diary.getDaySync(date));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

interface CopyMealVariables {
  fromDate: ISODate;
  toDate: ISODate;
  meal: MealType;
}

export function useCopyMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fromDate, toDate, meal }: CopyMealVariables) =>
      services.diary.copyMeal(fromDate, toDate, meal),
    onSuccess: (_data, { toDate }) => {
      queryClient.setQueryData(queryKeys.day(toDate), services.diary.getDaySync(toDate));
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
    },
  });
}

export function useClearAllDiary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await services.diary.clearAll();
      await services.profile.clearWeights();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allDays() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allWeights() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.fasting() });
    },
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await services.diary.resetDemo();
      const profile = services.profile.getProfileSync();
      await services.profile.resetDemoWeights(profile.weightKg);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.allDays() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allSummaries() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allWeights() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.fasting() });
    },
  });
}

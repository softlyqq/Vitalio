"use client";

import { create } from "zustand";
import type { DailyTargets, ISODate, MealType } from "@/types/domain";

export type AppTab = "home" | "diary" | "progress" | "profile";

export type DiarySubTab = "meals" | "coach" | "pot" | "prep";

export type DayCycleMode = "base" | "training" | "rest" | "refeed";

export function applyDayCycleToTargets(base: DailyTargets, mode: DayCycleMode): DailyTargets {
  if (mode === "training") {
    const kcal = Math.round(base.kcal * 1.1);
    const protein = base.protein;
    const fat = Math.max(40, Math.round(base.fat * 0.92));
    const carbs = Math.max(50, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { ...base, kcal, protein, fat, carbs, waterMl: base.waterMl + 350 };
  }
  if (mode === "rest") {
    const kcal = Math.round(base.kcal * 0.92);
    const protein = Math.round(base.protein * 1.03);
    const fat = Math.round(base.fat * 1.08);
    const carbs = Math.max(40, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { ...base, kcal, protein, fat, carbs };
  }
  if (mode === "refeed") {
    const kcal = Math.round(base.kcal * 1.15);
    const protein = Math.round(base.protein * 0.95);
    const fat = Math.max(40, Math.round(base.fat * 0.85));
    const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
    return { ...base, kcal, protein, fat, carbs, waterMl: base.waterMl + 250 };
  }
  return base;
}

export type AddFoodMethod = "search" | "combos" | "barcode" | "ai";

export type AuthModalMode = "register" | "login";

interface AddFoodSheetState {
  open: boolean;
  /** Прийом їжі, обраний при відкритті (кнопка «+» біля конкретного прийому). */
  meal: MealType | null;
  /** Початковий метод додавання. */
  initialMethod?: AddFoodMethod;
}

export interface Toast {
  id: number;
  message: string;
}

interface UiState {
  activeTab: AppTab;
  diarySubTab: DiarySubTab;
  dayCycleMode: DayCycleMode;
  /** Обрана дата; `null` = сьогодні (поки не відома клієнтська дата). */
  selectedDate: ISODate | null;
  addFoodSheet: AddFoodSheetState;
  paywallOpen: boolean;
  welcomeModalOpen: boolean;
  onboardingGateOpen: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  authEmail: string | null;
  toasts: Toast[];
  setActiveTab: (tab: AppTab, syncUrl?: boolean) => void;
  setDiarySubTab: (subTab: DiarySubTab) => void;
  openDiaryTab: (subTab: DiarySubTab) => void;
  setDayCycleMode: (mode: DayCycleMode) => void;
  selectDate: (date: ISODate) => void;
  openAddFood: (meal?: MealType, method?: AddFoodMethod) => void;
  closeAddFood: () => void;
  openPaywall: () => void;
  closePaywall: () => void;
  openWelcomeModal: () => void;
  closeWelcomeModal: () => void;
  openOnboardingGate: () => void;
  closeOnboardingGate: () => void;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  setAuthEmail: (email: string | null) => void;
  pushToast: (message: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const TAB_TO_PATH: Record<AppTab, string> = {
  home: "/",
  diary: "/diary",
  progress: "/progress",
  profile: "/profile",
};

export function pathToTab(pathname: string): AppTab {
  if (pathname.startsWith("/diary")) return "diary";
  if (pathname.startsWith("/progress")) return "progress";
  if (pathname.startsWith("/profile")) return "profile";
  return "home";
}

/** Клієнтський (UI) стейт. Серверні дані живуть у TanStack Query, не тут. */
export const useUiStore = create<UiState>((set) => ({
  activeTab: "home",
  diarySubTab: "meals",
  dayCycleMode: "base",
  selectedDate: null,
  addFoodSheet: { open: false, meal: null },
  paywallOpen: false,
  welcomeModalOpen: false,
  onboardingGateOpen: false,
  authModalOpen: false,
  authModalMode: "register",
  authEmail: null,
  toasts: [],
  setActiveTab: (tab, syncUrl = true) => {
    set({ activeTab: tab });
    if (syncUrl && typeof window !== "undefined") {
      const targetPath = TAB_TO_PATH[tab];
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  },
  setDiarySubTab: (diarySubTab) => set({ diarySubTab }),
  openDiaryTab: (diarySubTab) => {
    set({ activeTab: "diary", diarySubTab });
    if (typeof window !== "undefined" && window.location.pathname !== "/diary") {
      window.history.pushState(null, "", "/diary");
    }
  },
  setDayCycleMode: (dayCycleMode) => set({ dayCycleMode }),
  selectDate: (date) => set({ selectedDate: date }),
  openAddFood: (meal, method) =>
    set({ addFoodSheet: { open: true, meal: meal ?? null, ...(method ? { initialMethod: method } : {}) } }),
  closeAddFood: () => set((state) => ({ addFoodSheet: { ...state.addFoodSheet, open: false } })),
  openPaywall: () => set({ paywallOpen: true }),
  closePaywall: () => set({ paywallOpen: false }),
  openWelcomeModal: () => set({ welcomeModalOpen: true, onboardingGateOpen: true }),
  closeWelcomeModal: () => set({ welcomeModalOpen: false, onboardingGateOpen: false }),
  openOnboardingGate: () => set({ onboardingGateOpen: true }),
  closeOnboardingGate: () => set({ onboardingGateOpen: false }),
  openAuthModal: (mode = "register") => set({ authModalOpen: true, authModalMode: mode }),
  closeAuthModal: () => set({ authModalOpen: false }),
  setAuthEmail: (authEmail) => {
    set({ authEmail });
    if (typeof window !== "undefined") {
      try {
        if (authEmail) {
          window.localStorage.setItem("vitalio:active-email:v1", authEmail);
        } else {
          window.localStorage.removeItem("vitalio:active-email:v1");
        }
      } catch {
        // Ігноруємо помилки доступу до localStorage.
      }
    }
  },
  pushToast: (message) =>
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id: ++toastId, message }] })),
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

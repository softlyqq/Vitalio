"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";
import { DiaryScreen } from "@/features/diary/diary-screen";
import { AddFoodSheet } from "@/features/food-log/add-food-sheet";
import { AuthSheet, readActiveEmail } from "@/features/auth/auth-sheet";
import { PaywallSheet } from "@/features/paywall/paywall-sheet";
import { ProfileScreen } from "@/features/profile/profile-screen";
import { ProgressScreen } from "@/features/progress/progress-screen";
import {
  OnboardingGateScreen,
  WELCOME_STORAGE_KEY,
} from "@/features/onboarding/onboarding-gate-screen";
import { pathToTab, useUiStore } from "@/stores/ui-store";

const emptySubscribe = () => () => {};
function useIsHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Оболонка застосунку:
 * 1. Якщо користувач новий — показує повноцінне вікно онбордингу/входу (не модальне, перед відкриттям додатку).
 * 2. Після проходження — відкриває робочий простір із миттєвим перемиканням вкладок (0 мс).
 */
export function AppShell({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();

  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const setAuthEmail = useUiStore((state) => state.setAuthEmail);
  const onboardingGateOpen = useUiStore((state) => state.onboardingGateOpen);
  const openOnboardingGate = useUiStore((state) => state.openOnboardingGate);
  const closeOnboardingGate = useUiStore((state) => state.closeOnboardingGate);

  useEffect(() => {
    const savedEmail = readActiveEmail();
    if (savedEmail) {
      setAuthEmail(savedEmail);
    }
    const hasSeen = window.localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasSeen && !savedEmail) {
      openOnboardingGate();
    }
  }, [setAuthEmail, openOnboardingGate]);

  useEffect(() => {
    setActiveTab(pathToTab(pathname), false);
  }, [pathname, setActiveTab]);

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(pathToTab(window.location.pathname), false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setActiveTab]);

  // Повноцінне перед-екранне вікно онбордингу/реєстрації для нових користувачів
  if (isHydrated && onboardingGateOpen) {
    return (
      <div className="min-h-dvh">
        <OnboardingGateScreen onComplete={closeOnboardingGate} />
        <Toaster />
      </div>
    );
  }

  return (
    <div className="min-h-dvh md:pl-64">
      <Sidebar />
      <main className="mx-auto w-full max-w-6xl px-4 pb-[calc(8.5rem+var(--safe-bottom))] pt-[calc(1rem+var(--safe-top))] md:px-8 md:pb-16 md:pt-8">
        {activeTab === "home" ? <DashboardScreen /> : null}
        {activeTab === "diary" ? <DiaryScreen /> : null}
        {activeTab === "progress" ? <ProgressScreen /> : null}
        {activeTab === "profile" ? <ProfileScreen /> : null}
        <div className="hidden">{children}</div>
      </main>
      <BottomNav />
      <AddFoodSheet />
      <AuthSheet />
      <PaywallSheet />
      <Toaster />
    </div>
  );
}


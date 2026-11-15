"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
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
import { WelcomeModal } from "@/features/onboarding/welcome-modal";
import { pathToTab, useUiStore } from "@/stores/ui-store";

/**
 * Оболонка застосунку: миттєве клієнтське перемикання між 4 головними екранами (0 мс, без запитів до dev-сервера),
 * синхронізоване з URL браузера (`/` · `/diary` · `/progress` · `/profile`).
 */
export function AppShell({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const setAuthEmail = useUiStore((state) => state.setAuthEmail);

  useEffect(() => {
    const savedEmail = readActiveEmail();
    if (savedEmail) {
      setAuthEmail(savedEmail);
    }
  }, [setAuthEmail]);

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
      <WelcomeModal />
      <Toaster />
    </div>
  );
}

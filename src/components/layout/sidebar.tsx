"use client";

import { CheckCircle2, Plus, Sparkles, UserPlus } from "lucide-react";
import { Wordmark } from "@/components/brand/logo";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { usePlanTier } from "@/hooks/use-app-data";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui-store";

/** Бокова навігація для ≥ md (планшет/десктоп). Миттєве перемикання вкладок (0 мс, без запиту до сервера). */
export function Sidebar() {
  const t = useT();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const openAddFood = useUiStore((state) => state.openAddFood);
  const openPaywall = useUiStore((state) => state.openPaywall);
  const openWelcomeModal = useUiStore((state) => state.openWelcomeModal);
  const openAuthModal = useUiStore((state) => state.openAuthModal);
  const authEmail = useUiStore((state) => state.authEmail);
  const { data: planTier = "free" } = usePlanTier();

  return (
    <aside
      suppressHydrationWarning
      className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 p-6 md:flex"
    >
      <button
        type="button"
        onClick={() => setActiveTab("home")}
        aria-label={t.app.name}
        className="rounded-xl text-left"
      >
        <Wordmark />
      </button>

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={() => openAddFood()} className="w-full justify-start">
          <Plus className="size-5" strokeWidth={2.6} aria-hidden="true" />
          {t.nav.add}
        </Button>

        {!authEmail ? (
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="flex h-11 w-full items-center justify-between gap-2 rounded-2xl bg-surface px-4 text-left text-xs font-bold text-ink shadow-card ring-1 ring-line transition-colors hover:bg-raised"
          >
            <span className="flex items-center gap-2">
              <UserPlus className="size-4 text-brand-strong" aria-hidden="true" />
              <span>Реєстрація / Вхід</span>
            </span>
            <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-strong">
              3 кроки
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={openWelcomeModal}
          className="flex h-9 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-semibold text-muted transition-colors hover:bg-surface/80 hover:text-ink"
        >
          <Sparkles className="size-3.5 text-brand-strong" aria-hidden="true" />
          <span>Прев&apos;ю додатку</span>
        </button>
      </div>

      <nav aria-label={t.nav.label}>
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.tab;
            const Icon = item.icon;
            return (
              <li key={item.tab}>
                <button
                  type="button"
                  onClick={() => setActiveTab(item.tab)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[0.9375rem] font-semibold transition-colors",
                    active
                      ? "bg-surface text-ink shadow-card ring-1 ring-line"
                      : "text-muted hover:bg-surface/60 hover:text-ink",
                  )}
                >
                  <Icon className={cn("size-5", active && "text-brand-strong")} aria-hidden="true" />
                  {item.label(t)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto rounded-card bg-brand-soft p-5">
        {planTier === "pro" ? (
          <>
            <CheckCircle2 className="mb-3 size-6 text-brand-strong" aria-hidden="true" />
            <p className="text-base font-bold text-ink">Vitalio Pro активний</p>
            <p className="mt-1 text-sm text-muted">Безлімітний AI-сканер та повна аналітика відкриті.</p>
            <Button variant="secondary" size="sm" onClick={openPaywall} className="mt-4 w-full">
              Керувати тарифом
            </Button>
          </>
        ) : (
          <>
            <Sparkles className="mb-3 size-6 text-brand-strong" aria-hidden="true" />
            <p className="text-base font-bold text-ink">{t.proCard.title}</p>
            <p className="mt-1 text-sm text-muted">{t.proCard.body}</p>
            <Button variant="primary" size="sm" onClick={openPaywall} className="mt-4 w-full">
              {t.proCard.cta}
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}

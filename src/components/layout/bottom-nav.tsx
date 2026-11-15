"use client";

import { Plus } from "lucide-react";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui-store";

/**
 * Нижня панель вкладок (Thumb-Zone): 4 розділи + центральна кнопка швидкого додавання.
 * Миттєве перемикання вкладок без мережевих затримок.
 */
export function BottomNav() {
  const t = useT();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const openAddFood = useUiStore((state) => state.openAddFood);

  const [home, diary, progress, profile] = NAV_ITEMS;
  const left = [home, diary];
  const right = [progress, profile];

  const renderItem = (item: (typeof NAV_ITEMS)[number] | undefined) => {
    if (!item) return null;
    const active = activeTab === item.tab;
    const Icon = item.icon;
    return (
      <li key={item.tab} className="flex">
        <button
          type="button"
          onClick={() => setActiveTab(item.tab)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[0.6875rem] font-semibold transition-colors",
            active ? "bg-brand-soft text-brand-strong" : "text-muted hover:text-ink",
          )}
        >
          <Icon className="relative size-[1.375rem]" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
          <span className="relative">{item.label(t)}</span>
        </button>
      </li>
    );
  };

  return (
    <nav
      aria-label={t.nav.label}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,var(--safe-bottom))] md:hidden"
    >
      <ul className="glass mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[1.75rem] p-1.5 shadow-float ring-1 ring-line">
        {left.map(renderItem)}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={() => openAddFood()}
            aria-label={t.nav.add}
            className="grid size-14 -translate-y-3 place-items-center rounded-full bg-brand-strong text-on-brand shadow-float ring-4 ring-bg transition-transform active:scale-90"
          >
            <Plus className="size-7" strokeWidth={2.6} aria-hidden="true" />
          </button>
        </li>
        {right.map(renderItem)}
      </ul>
    </nav>
  );
}

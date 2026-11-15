"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useT } from "@/i18n";
import type { FoodEntry } from "@/types/domain";

interface EntryRowProps {
  entry: FoodEntry;
  onRemove: (entry: FoodEntry) => void;
}

const REVEAL_WIDTH = 88;
const SNAP_THRESHOLD = 44;
const SNAP_VELOCITY = 400;

/**
 * Запис їжі. Мобільні: свайп вліво відкриває «Видалити» (нативний жест);
 * десктоп: кнопка-смітник. Обидва шляхи — це справжні <button>, доступні з клавіатури та скрінрідера.
 */
export function EntryRow({ entry, onRemove }: EntryRowProps) {
  const t = useT();
  const isDesktop = useIsDesktop();
  const x = useMotionValue(0);
  const label = t.dashboard.meals.deleteEntry(entry.name);

  const snapTo = (target: number) => animate(x, target, { type: "spring", stiffness: 520, damping: 42 });

  return (
    <li className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex items-stretch md:hidden" style={{ width: REVEAL_WIDTH }}>
        <button
          type="button"
          onClick={() => onRemove(entry)}
          aria-label={label}
          className="flex flex-1 items-center justify-center bg-danger text-white dark:text-bg"
        >
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>

      <motion.div
        style={{ x }}
        drag={isDesktop ? false : "x"}
        dragDirectionLock
        dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_event, info) => {
          const shouldOpen = x.get() < -SNAP_THRESHOLD || info.velocity.x < -SNAP_VELOCITY;
          snapTo(shouldOpen ? -REVEAL_WIDTH : 0);
        }}
        className="relative flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-line"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold">{entry.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {entry.grams} {t.common.gram}
            <span aria-hidden="true"> · </span>
            <span className="text-protein">{t.dashboard.macros.protein[0]} {Math.round(entry.nutrition.protein)}</span>
            <span aria-hidden="true"> · </span>
            <span className="text-fat">{t.dashboard.macros.fat[0]} {Math.round(entry.nutrition.fat)}</span>
            <span aria-hidden="true"> · </span>
            <span className="text-carbs">{t.dashboard.macros.carbs[0]} {Math.round(entry.nutrition.carbs)}</span>
          </p>
        </div>
        <p className="shrink-0 text-right text-[0.9375rem] font-bold tabular-nums">
          {entry.nutrition.kcal}
          <span className="ml-1 text-xs font-medium text-muted">{t.common.kcal}</span>
        </p>
        <button
          type="button"
          onClick={() => onRemove(entry)}
          aria-label={label}
          className="grid size-8 shrink-0 place-items-center rounded-full text-subtle transition-colors hover:bg-sunken hover:text-danger max-md:hidden"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      </motion.div>
    </li>
  );
}

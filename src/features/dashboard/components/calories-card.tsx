"use client";

import { Flame, Target, Utensils } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { useT } from "@/i18n";
import { progressRatio } from "@/lib/nutrition";

interface CaloriesCardProps {
  goal: number;
  eaten: number;
  burned: number;
  className?: string;
}

function Stat({ icon, label, value, unit }: { icon: ReactNode; label: string; value: number; unit: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-sunken px-3.5 py-3 sm:min-w-44">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface text-ink ring-1 ring-line">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="text-base font-bold leading-tight">
          <AnimatedNumber value={value} />
          <span className="ml-1 text-xs font-medium text-muted">{unit}</span>
        </p>
      </div>
    </div>
  );
}

export function CaloriesCard({ goal, eaten, burned, className }: CaloriesCardProps) {
  const t = useT();
  const budget = goal + burned;
  const remaining = Math.round(budget - eaten);
  const isOver = remaining < 0;

  return (
    <Card aria-labelledby="calories-title" className={className}>
      <CardHeader title={t.dashboard.calories.title} titleId="calories-title" />
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
        <ProgressRing
          progress={progressRatio(eaten, budget)}
          color={isOver ? "var(--carbs)" : "var(--brand)"}
          label={t.dashboard.calories.ringLabel(Math.round(eaten), Math.round(budget))}
        >
          <div className="flex flex-col items-center">
            <span className="text-[3.25rem] font-bold leading-none tracking-tight">
              <AnimatedNumber value={Math.abs(remaining)} />
            </span>
            <span className="mt-1.5 text-sm font-medium text-muted">
              {t.common.kcal} {isOver ? t.dashboard.calories.over : t.dashboard.calories.remaining}
            </span>
          </div>
        </ProgressRing>

        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:grid-cols-1 sm:gap-3">
          <Stat icon={<Utensils className="size-[1.125rem]" aria-hidden="true" />} label={t.dashboard.calories.eaten} value={eaten} unit={t.common.kcal} />
          <Stat icon={<Flame className="size-[1.125rem] text-carbs" aria-hidden="true" />} label={t.dashboard.calories.burned} value={burned} unit={t.common.kcal} />
          <Stat icon={<Target className="size-[1.125rem] text-brand-strong" aria-hidden="true" />} label={t.dashboard.calories.goal} value={goal} unit={t.common.kcal} />
        </div>
      </div>
    </Card>
  );
}

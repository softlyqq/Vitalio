"use client";

import { Check, Droplets, Minus, Plus } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useNumberFormatter } from "@/hooks/use-formatters";
import { useT } from "@/i18n";
import { cn } from "@/lib/cn";
import { progressRatio } from "@/lib/nutrition";

export const WATER_STEP_ML = 250;

interface WaterCardProps {
  waterMl: number;
  goalMl: number;
  onChange: (deltaMl: number) => void;
  className?: string;
}

/** Хвиля: періодичний шлях шириною 2 періоди; контейнер зсувається на 50% — безшовний цикл. */
function Wave() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 12"
      preserveAspectRatio="none"
      className="absolute -top-2.5 left-0 h-3 w-[200%] animate-[wave-drift_3.2s_linear_infinite] text-water"
    >
      <path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 V12 H0 Z" fill="currentColor" />
    </svg>
  );
}

export function WaterCard({ waterMl, goalMl, onChange, className }: WaterCardProps) {
  const t = useT();
  const formatNumber = useNumberFormatter();

  const progress = progressRatio(waterMl, goalMl);
  const reached = waterMl >= goalMl;
  const glasses = Math.round(waterMl / WATER_STEP_ML);

  return (
    <Card aria-labelledby="water-title" className={cn("flex flex-col", className)}>
      <CardHeader
        title={t.dashboard.water.title}
        titleId="water-title"
        icon={<Droplets className="size-4 text-water" aria-hidden="true" />}
      />

      <p className="flex flex-wrap items-baseline gap-x-1.5 leading-none">
        <span className="text-3xl font-bold tracking-tight">
          <AnimatedNumber value={waterMl} />
        </span>
        <span className="text-sm font-medium text-muted">
          / {formatNumber.format(goalMl)} {t.common.milliliter}
        </span>
      </p>

      <div
        role="progressbar"
        aria-label={t.dashboard.water.title}
        aria-valuemin={0}
        aria-valuemax={goalMl}
        aria-valuenow={Math.min(waterMl, goalMl)}
        aria-valuetext={`${waterMl} ${t.common.milliliter}`}
        className="relative mt-4 h-24 flex-1 overflow-hidden rounded-2xl bg-water-soft"
      >
        <div
          className="absolute inset-x-0 bottom-0 bg-water transition-[height] duration-250 ease-out"
          style={{ height: `${progress * 100}%` }}
        >
          {progress > 0 && progress < 1 ? <Wave /> : null}
        </div>
        <p className="absolute inset-0 grid place-items-center px-2 text-center text-xs font-semibold text-ink">
          <span className="rounded-full bg-surface/85 px-2.5 py-1">{t.dashboard.water.glasses(glasses)}</span>
        </p>
      </div>

      <div className="relative mt-4 flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => onChange(-WATER_STEP_ML)}
          disabled={waterMl <= 0}
          aria-label={t.dashboard.water.undoLabel}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <Button
          onClick={() => onChange(WATER_STEP_ML)}
          aria-label={t.dashboard.water.addLabel(WATER_STEP_ML)}
          className="flex-1"
        >
          <Plus className="size-4" strokeWidth={2.6} aria-hidden="true" />
          {t.dashboard.water.amount(WATER_STEP_ML)}
        </Button>
      </div>

      <p className="mt-3 flex items-center gap-1 text-xs font-medium text-muted">
        {reached ? <Check className="size-3.5 text-brand-strong" aria-hidden="true" /> : null}
        {reached ? t.dashboard.water.goalReached : t.dashboard.water.leftToGoal(goalMl - waterMl)}
      </p>
    </Card>
  );
}

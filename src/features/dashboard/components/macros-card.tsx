"use client";

import { AnimatedNumber } from "@/components/ui/animated-number";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useT } from "@/i18n";
import { progressRatio } from "@/lib/nutrition";
import type { Macros } from "@/types/domain";

interface MacrosCardProps {
  consumed: Macros;
  targets: Macros;
  className?: string;
}

const MACRO_ROWS = [
  { key: "protein", color: "var(--protein)" },
  { key: "fat", color: "var(--fat)" },
  { key: "carbs", color: "var(--carbs)" },
] as const;

export function MacrosCard({ consumed, targets, className }: MacrosCardProps) {
  const t = useT();

  return (
    <Card aria-labelledby="macros-title" className={className}>
      <CardHeader title={t.dashboard.macros.title} titleId="macros-title" />
      <ul className="flex flex-col gap-5">
        {MACRO_ROWS.map(({ key, color }) => {
          const value = Math.round(consumed[key]);
          const goal = Math.round(targets[key]);
          const name = t.dashboard.macros[key];
          return (
            <li key={key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                  <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: color }} />
                  {name}
                </span>
                <span className="text-sm text-muted">
                  <span className="text-lg font-bold text-ink">
                    <AnimatedNumber value={value} />
                  </span>
                  {` / ${goal} ${t.common.gram}`}
                </span>
              </div>
              <ProgressBar
                progress={progressRatio(value, goal)}
                color={color}
                label={name}
                valueText={t.dashboard.macros.progressLabel(name, value, goal)}
              />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

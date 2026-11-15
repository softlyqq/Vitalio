"use client";

import { CheckCircle2, Clock, Flame, Play, Square, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useFasting, useUpdateFasting } from "@/hooks/use-app-data";
import { cn } from "@/lib/cn";
import {
  FASTING_PHASES,
  computeFastingProgress,
  formatDurationHms,
} from "@/lib/fasting";
import { useUiStore } from "@/stores/ui-store";
import { FASTING_PROTOCOLS, type FastingProtocol } from "@/types/domain";

interface FastingCardProps {
  className?: string;
}

export function FastingCard({ className }: FastingCardProps) {
  const { data: fasting } = useFasting();
  const updateFasting = useUpdateFasting();
  const pushToast = useUiStore((state) => state.pushToast);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!fasting?.active) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fasting?.active]);

  if (!fasting) return null;

  const progress = computeFastingProgress(fasting, nowMs);

  const handleProtocolChange = (protocol: FastingProtocol) => {
    updateFasting.mutate(
      { ...fasting, protocol },
      {
        onSuccess: () => pushToast(`Обрано протокол голодування ${protocol}`),
      },
    );
  };

  const handleToggleFasting = () => {
    if (fasting.active) {
      const completed = fasting.completedSessions + (progress.elapsedHours >= 12 ? 1 : 0);
      updateFasting.mutate(
        {
          ...fasting,
          active: false,
          startedAt: null,
          completedSessions: completed,
        },
        {
          onSuccess: () =>
            pushToast(
              `Голодування завершено (${progress.elapsedHours} год). Час для збалансованого прийому їжі!`,
            ),
        },
      );
    } else {
      const nowIso = new Date().toISOString();
      setNowMs(Date.now());
      updateFasting.mutate(
        {
          ...fasting,
          active: true,
          startedAt: nowIso,
        },
        {
          onSuccess: () => pushToast(`Таймер ${fasting.protocol} запущено`),
        },
      );
    }
  };

  const handleShiftStart = (deltaHours: number) => {
    if (!fasting.startedAt) return;
    const currentStart = Date.parse(fasting.startedAt);
    if (!Number.isFinite(currentStart)) return;
    const shifted = Math.min(Date.now(), currentStart + deltaHours * 3600 * 1000);
    setNowMs(Date.now());
    updateFasting.mutate({
      ...fasting,
      startedAt: new Date(shifted).toISOString(),
    });
  };

  return (
    <Card className={cn("flex flex-col justify-between gap-4", className)} aria-labelledby="fasting-card-title">
      <CardHeader
        title="Інтервальне голодування"
        titleId="fasting-card-title"
        icon={<Timer className="size-4 text-brand-strong" aria-hidden="true" />}
        action={
          <div className="flex items-center gap-1 rounded-full bg-sunken p-1 ring-1 ring-line">
            {FASTING_PROTOCOLS.map((protocol) => (
              <button
                key={protocol}
                type="button"
                onClick={() => handleProtocolChange(protocol)}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums transition-colors",
                  fasting.protocol === protocol
                    ? "bg-brand-strong text-on-brand"
                    : "text-muted hover:text-ink",
                )}
              >
                {protocol}
              </button>
            ))}
          </div>
        }
      />

      {/* Головне табло таймера та фази */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
        <div className="flex flex-col justify-between rounded-3xl bg-sunken p-4 sm:col-span-7">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-strong">
              <Flame className="size-3.5" aria-hidden="true" />
              {fasting.active ? progress.phase.title : "Вікно харчування відкрите"}
            </span>
            <span className="text-xs font-semibold text-muted tabular-nums">
              Циклів: {fasting.completedSessions}
            </span>
          </div>

          <div className="my-3 flex items-baseline justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted">
                {fasting.active
                  ? progress.isGoalReached
                    ? "Ціль досягнуто! Загальний час:"
                    : `Залишилось до ${progress.fastHours} год:`
                  : `Цільове вікно посту (${fasting.protocol}):`}
              </p>
              <p className="mt-0.5 text-3xl font-bold tracking-tight text-ink tabular-nums sm:text-4xl">
                {fasting.active
                  ? formatDurationHms(
                      progress.isGoalReached ? progress.elapsedSeconds : progress.remainingSeconds,
                    )
                  : `${progress.fastHours}:00:00`}
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-brand-strong tabular-nums">
                {progress.progressPct}%
              </span>
              <p className="text-xs text-muted tabular-nums">
                Минуло {progress.elapsedHours} / {progress.fastHours} год
              </p>
            </div>
          </div>

          {/* Смуга прогресу з фазами */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-surface ring-1 ring-line">
            <div
              style={{ width: `${progress.progressPct}%` }}
              className="h-full rounded-full bg-brand-strong transition-all duration-500"
            />
          </div>

          <p className="mt-2.5 text-xs text-muted">
            {fasting.active
              ? progress.phase.subtitle
              : `Протокол ${fasting.protocol}: ${progress.fastHours} год відновлення та ліполізу · ${progress.feedHours} год харчове вікно.`}
          </p>
        </div>

        {/* Права частина: фізіологічні етапи та керування */}
        <div className="flex flex-col justify-between gap-2.5 sm:col-span-5">
          <div className="grid grid-cols-2 gap-1.5">
            {FASTING_PHASES.map((phase) => {
              const reached = fasting.active && progress.elapsedHours >= phase.minHour;
              return (
                <div
                  key={phase.id}
                  className={cn(
                    "rounded-2xl px-3 py-2 text-xs ring-1 transition-colors",
                    reached
                      ? "bg-brand-soft/70 text-ink ring-brand/40"
                      : "bg-sunken text-muted ring-line",
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{phase.minHour}+ год</span>
                    {reached ? (
                      <CheckCircle2 className="size-3.5 text-brand-strong" aria-hidden="true" />
                    ) : (
                      <Clock className="size-3.5 text-subtle" aria-hidden="true" />
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[0.6875rem] font-medium">{phase.title}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {fasting.active ? (
              <>
                <button
                  type="button"
                  onClick={() => handleShiftStart(-1)}
                  title="Почав на 1 годину раніше"
                  className="h-10 rounded-xl bg-sunken px-3 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                >
                  +1 год стажу
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftStart(1)}
                  title="Почав на 1 годину пізніше"
                  className="h-10 rounded-xl bg-sunken px-3 text-xs font-bold text-ink ring-1 ring-line transition-colors hover:bg-raised"
                >
                  −1 год
                </button>
              </>
            ) : null}

            <Button
              variant={fasting.active ? "secondary" : "primary"}
              size="md"
              onClick={handleToggleFasting}
              className="flex-1"
            >
              {fasting.active ? (
                <>
                  <Square className="size-4" aria-hidden="true" />
                  Завершити піст
                </>
              ) : (
                <>
                  <Play className="size-4" aria-hidden="true" />
                  Почати {fasting.protocol}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

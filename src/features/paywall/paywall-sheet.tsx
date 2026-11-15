"use client";

import { Check, Crown, ShieldCheck, Sparkles, X as XIcon } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { SegmentedControl, type SegmentOption } from "@/components/ui/segmented-control";
import { usePlanTier, useSetPlanTier } from "@/hooks/use-app-data";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/stores/ui-store";

type BillingCycle = "yearly" | "monthly";

const COMPARISON_ROWS: readonly { feature: string; free: boolean | string; pro: boolean | string }[] = [
  { feature: "База продуктів та щоденник БЖВ", free: true, pro: true },
  { feature: "Трекер води та система серій (Streak)", free: true, pro: true },
  { feature: "Сканер штрих-кодів EAN-13", free: true, pro: true },
  { feature: "AI Food Scanner (фото / голос / текст)", free: "3 / день", pro: "Безліміт" },
  { feature: "Глибока аналітика БЖВ та прогноз ваги", free: false, pro: true },
  { feature: "Експорт історії та хмарний бекап", free: false, pro: true },
];

export function PaywallSheet() {
  const open = useUiStore((state) => state.paywallOpen);
  const close = useUiStore((state) => state.closePaywall);
  const pushToast = useUiStore((state) => state.pushToast);
  const { data: tier = "free" } = usePlanTier();
  const setPlanTier = useSetPlanTier();

  const [cycle, setCycle] = useState<BillingCycle>("yearly");

  const cycleOptions: readonly SegmentOption<BillingCycle>[] = [
    { value: "yearly", label: "Річний · −42%" },
    { value: "monthly", label: "Щомісячний" },
  ];

  const handleActivate = () => {
    const nextTier = tier === "pro" ? "free" : "pro";
    setPlanTier.mutate(nextTier, {
      onSuccess: (updated) => {
        pushToast(
          updated === "pro"
            ? "Vitalio Pro активовано (7 днів безкоштовно)!"
            : "Підписку переведено на тариф Free",
        );
        close();
      },
    });
  };

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => !next && close()}
      title="Vitalio Pro"
      description="Порівняння тарифів Free та Vitalio Pro і активація пробного періоду."
    >
      <div className="flex flex-col gap-5 pt-1">
        <div className="rounded-3xl bg-brand-soft p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-strong text-on-brand">
              <Crown className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-bold text-brand-strong">7 ДНІВ БЕЗКОШТОВНО</p>
              <h3 className="text-xl font-bold tracking-tight text-ink">
                Логуйте їжу за 3 секунди з AI
              </h3>
            </div>
          </div>
          <p className="mt-2.5 text-sm text-muted">
            Фотографуйте тарілку або диктуйте голосом — Vitalio сам розкладе страву на інгредієнти, грами та БЖВ.
          </p>
        </div>

        <SegmentedControl
          value={cycle}
          onChange={setCycle}
          options={cycleOptions}
          label="Період оплати"
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={cn(
              "flex flex-col justify-between rounded-3xl p-4 text-left transition-colors",
              cycle === "yearly"
                ? "bg-surface ring-2 ring-brand-strong shadow-card"
                : "bg-sunken ring-1 ring-line",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-strong">РІЧНИЙ</span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand-strong">
                Вигідно
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">
              149 ₴<span className="text-xs font-medium text-muted"> / міс</span>
            </p>
            <p className="mt-1 text-xs text-muted">1 788 ₴ раз на рік після тріалу</p>
          </button>

          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "flex flex-col justify-between rounded-3xl p-4 text-left transition-colors",
              cycle === "monthly"
                ? "bg-surface ring-2 ring-brand-strong shadow-card"
                : "bg-sunken ring-1 ring-line",
            )}
          >
            <span className="text-xs font-bold text-muted">ЩОМІСЯЧНИЙ</span>
            <p className="mt-3 text-2xl font-bold tabular-nums">
              259 ₴<span className="text-xs font-medium text-muted"> / міс</span>
            </p>
            <p className="mt-1 text-xs text-muted">Скасування у будь-який момент</p>
          </button>
        </div>

        {/* Таблиця порівняння Free vs Pro */}
        <div className="overflow-hidden rounded-3xl bg-sunken p-4">
          <div className="mb-2 grid grid-cols-[1fr_4.5rem_5rem] items-center gap-2 text-xs font-bold text-muted">
            <span>Можливості</span>
            <span className="text-center">Free</span>
            <span className="text-center text-brand-strong">Pro</span>
          </div>
          <ul className="divide-y divide-line">
            {COMPARISON_ROWS.map((row) => (
              <li
                key={row.feature}
                className="grid grid-cols-[1fr_4.5rem_5rem] items-center gap-2 py-2.5 text-xs"
              >
                <span className="font-medium text-ink">{row.feature}</span>
                <span className="flex justify-center text-muted">
                  {typeof row.free === "string" ? (
                    <span className="font-semibold">{row.free}</span>
                  ) : row.free ? (
                    <Check className="size-4 text-ink" aria-hidden="true" />
                  ) : (
                    <XIcon className="size-4 text-subtle" aria-hidden="true" />
                  )}
                </span>
                <span className="flex justify-center text-brand-strong">
                  {typeof row.pro === "string" ? (
                    <span className="font-bold">{row.pro}</span>
                  ) : row.pro ? (
                    <Check className="size-4" strokeWidth={2.6} aria-hidden="true" />
                  ) : (
                    <XIcon className="size-4 text-subtle" aria-hidden="true" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button size="lg" className="w-full" onClick={handleActivate}>
            <Sparkles className="size-5" aria-hidden="true" />
            {tier === "pro"
              ? "Керувати підпискою (перейти на Free)"
              : "Спробувати 7 днів безкоштовно"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <ShieldCheck className="size-4 text-brand-strong" aria-hidden="true" />
            Apple Pay · Google Pay · Stripe · Скасування в 1 клік
          </p>
        </div>
      </div>
    </BottomSheet>
  );
}

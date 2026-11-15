"use client";

import { useMemo } from "react";
import { useIntlTag } from "@/i18n";

interface AnimatedNumberProps {
  value: number;
  fractionDigits?: number;
  className?: string;
}

/** Миттєве форматування числа з моноширинними цифрами (`tabular-nums`) без навантаження на головний потік. */
export function AnimatedNumber({ value, fractionDigits = 0, className }: AnimatedNumberProps) {
  const intlTag = useIntlTag();
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(intlTag, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }),
    [intlTag, fractionDigits],
  );

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {formatter.format(value)}
    </span>
  );
}

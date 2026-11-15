"use client";

import { useMemo } from "react";
import { useIntlTag } from "@/i18n";
import { createDateFormatters, createNumberFormatter } from "@/lib/format";

export function useDateFormatters() {
  const intlTag = useIntlTag();
  return useMemo(() => createDateFormatters(intlTag), [intlTag]);
}

export function useNumberFormatter(fractionDigits = 0) {
  const intlTag = useIntlTag();
  return useMemo(() => createNumberFormatter(intlTag, fractionDigits), [intlTag, fractionDigits]);
}

"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { uk, type Dictionary } from "@/i18n/uk";

/**
 * Додавання нової мови:
 *  1. створіть `src/i18n/<code>.ts`, що експортує об'єкт типу `Dictionary`;
 *  2. додайте його у `dictionaries` та код у `Locale`;
 *  3. передайте `locale` у `<I18nProvider>` (з профілю користувача або `navigator.language`).
 */
export type Locale = "uk";

const dictionaries: Record<Locale, Dictionary> = { uk };

export const DEFAULT_LOCALE: Locale = "uk";

const INTL_TAG: Record<Locale, string> = { uk: "uk-UA" };

interface I18nContextValue {
  locale: Locale;
  intlTag: string;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale = DEFAULT_LOCALE,
  children,
}: {
  locale?: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, intlTag: INTL_TAG[locale], t: dictionaries[locale] }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n має використовуватись усередині <I18nProvider>");
  return ctx;
}

/** Типізований словник поточної локалі: `t.dashboard.calories.title`. */
export function useT(): Dictionary {
  return useI18n().t;
}

/** BCP-47 тег для `Intl.*` (форматування чисел і дат). */
export function useIntlTag(): string {
  return useI18n().intlTag;
}

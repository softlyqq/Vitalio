"use client";

import { useSyncExternalStore } from "react";

/** SSR-безпечний `matchMedia`: на сервері повертає `serverFallback`. */
export function useMediaQuery(query: string, serverFallback = false): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => serverFallback,
  );
}

export const useIsDesktop = (): boolean => useMediaQuery("(min-width: 768px)");

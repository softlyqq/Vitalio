"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/i18n";

/** Скелетон повторює геометрію Bento-сітки, щоб не було стрибків макета після завантаження. */
export function DashboardSkeleton() {
  const t = useT();
  return (
    <div className="flex flex-col gap-5 md:gap-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>
      <Skeleton className="h-24 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12 lg:gap-5">
        <Skeleton className="col-span-2 h-80 rounded-card lg:col-span-7" />
        <Skeleton className="col-span-2 h-80 rounded-card lg:col-span-5" />
        <Skeleton className="h-72 rounded-card lg:col-span-5 lg:col-start-8" />
        <Skeleton className="h-72 rounded-card lg:col-span-5 lg:col-start-8" />
        <Skeleton className="col-span-2 h-96 rounded-card lg:col-span-7 lg:col-start-1 lg:row-span-2 lg:row-start-2" />
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}

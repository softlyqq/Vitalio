import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-[skeleton-pulse_1.6s_ease-in-out_infinite] rounded-2xl bg-sunken", className)}
      {...props}
    />
  );
}

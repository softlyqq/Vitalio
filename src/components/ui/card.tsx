import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Базова bento-плитка: м'яка поверхня, велике скруглення, ледь помітна тінь. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn("rounded-card bg-surface p-5 shadow-card ring-1 ring-line sm:p-6", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  title: string;
  titleId: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({ title, titleId, icon, action, className }: CardHeaderProps) {
  return (
    <header className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 id={titleId} className="flex items-center gap-2 text-[0.9375rem] font-semibold text-muted">
        {icon}
        {title}
      </h2>
      {action}
    </header>
  );
}

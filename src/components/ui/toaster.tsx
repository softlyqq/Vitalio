"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";
import { useT } from "@/i18n";
import { useUiStore, type Toast } from "@/stores/ui-store";

const TOAST_LIFETIME_MS = 3200;

function ToastItem({ toast }: { toast: Toast }) {
  const t = useT();
  const dismiss = useUiStore((state) => state.dismissToast);

  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), TOAST_LIFETIME_MS);
    return () => window.clearTimeout(id);
  }, [dismiss, toast.id]);

  return (
    <li className="pointer-events-auto flex animate-[toast-in_0.35s_var(--ease-out-expo)] items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-bg shadow-float">
      <CheckCircle2 className="size-5 shrink-0 text-brand" aria-hidden="true" />
      <span className="min-w-0 flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t.toast.dismiss}
        className="grid size-6 place-items-center rounded-full opacity-70 transition-opacity hover:opacity-100"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </li>
  );
}

/** Сповіщення над нижньою навігацією (враховує Safe Area); читаються скрінрідерами через aria-live. */
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts);
  return (
    <ul
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(6.5rem+var(--safe-bottom))] z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 md:bottom-8"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ul>
  );
}

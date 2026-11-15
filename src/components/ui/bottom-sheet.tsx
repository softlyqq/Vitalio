"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion, useDragControls, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useT } from "@/i18n";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}

const DISMISS_OFFSET = 120;
const DISMISS_VELOCITY = 600;

/**
 * Модальне вікно у стилі нативного iOS bottom sheet з миттєвим відкриттям.
 * Мобільні: виїжджає знизу, закривається свайпом за «ручку»/шапку, враховує Safe Area.
 * Планшет/десктоп: центрований діалог. Доступність (фокус-пастка, Esc, aria) — від Radix Dialog.
 */
export function BottomSheet({ open, onOpenChange, title, description, children }: BottomSheetProps) {
  const t = useT();
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();

  const hidden = isDesktop ? { opacity: 0, y: 12, scale: 0.98 } : { y: "100%" };
  const shown = isDesktop ? { opacity: 1, y: 0, scale: 1 } : { y: 0 };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {open ? (
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim" />

          <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
            <Dialog.Content asChild>
              <motion.div
                className="pointer-events-auto flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-surface shadow-float ring-1 ring-line md:max-h-[min(44rem,88dvh)] md:max-w-xl md:rounded-[2rem]"
                initial={reduceMotion ? false : hidden}
                animate={shown}
                transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.16, 1, 0.3, 1] }}
                drag={isDesktop ? false : "y"}
                dragListener={false}
                dragControls={dragControls}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.7 }}
                onDragEnd={(_event, info) => {
                  if (info.offset.y > DISMISS_OFFSET || info.velocity.y > DISMISS_VELOCITY) {
                    onOpenChange(false);
                  }
                }}
              >
                <div
                  className="shrink-0 touch-none px-5 pb-3 pt-2 sm:px-6"
                  onPointerDown={(event) => {
                    if (!isDesktop) dragControls.start(event);
                  }}
                >
                  <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line-strong md:hidden" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-xl font-semibold tracking-tight text-ink">{title}</Dialog.Title>
                      <Dialog.Description className="sr-only">{description}</Dialog.Description>
                    </div>
                    <Dialog.Close asChild>
                      <Button variant="secondary" size="icon-sm" aria-label={t.common.close}>
                        <X className="size-4" aria-hidden="true" />
                      </Button>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,var(--safe-bottom))] sm:px-6">
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      ) : null}
    </Dialog.Root>
  );
}

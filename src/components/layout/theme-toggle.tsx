"use client";

import { Moon, Sun } from "lucide-react";
import { useAppTheme } from "@/components/layout/theme-provider";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n";

export function ThemeToggle() {
  const t = useT();
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === "dark";

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={isDark ? t.theme.toLight : t.theme.toDark}
      onClick={toggleTheme}
    >
      {isDark ? <Sun className="size-5" aria-hidden="true" /> : <Moon className="size-5" aria-hidden="true" />}
    </Button>
  );
}

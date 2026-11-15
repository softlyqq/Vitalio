import { BarChart3, BookOpen, Home, UserRound, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/i18n/uk";
import type { AppTab } from "@/stores/ui-store";

export interface NavItem {
  tab: AppTab;
  href: string;
  icon: LucideIcon;
  label: (t: Dictionary) => string;
}

/** Єдине джерело навігації для BottomNav (мобільні) та Sidebar (десктоп). */
export const NAV_ITEMS: readonly NavItem[] = [
  { tab: "home", href: "/", icon: Home, label: (t) => t.nav.home },
  { tab: "diary", href: "/diary", icon: BookOpen, label: (t) => t.nav.diary },
  { tab: "progress", href: "/progress", icon: BarChart3, label: (t) => t.nav.progress },
  { tab: "profile", href: "/profile", icon: UserRound, label: (t) => t.nav.profile },
];

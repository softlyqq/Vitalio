import type { FastingProtocol, FastingState } from "@/types/domain";

export interface FastingPhaseInfo {
  id: "digestion" | "glycogen" | "lipolysis" | "autophagy";
  title: string;
  subtitle: string;
  minHour: number;
}

export const FASTING_PHASES: readonly FastingPhaseInfo[] = [
  {
    id: "digestion",
    title: "Стабілізація цукру",
    subtitle: "Рівень інсуліну плавно знижується після їжі",
    minHour: 0,
  },
  {
    id: "glycogen",
    title: "Спалювання глікогену",
    subtitle: "Тіло використовує запаси енергії з печінки",
    minHour: 4,
  },
  {
    id: "lipolysis",
    title: "Активний ліполіз (жироспалювання)",
    subtitle: "Організм переходить на спалювання жирових запасів",
    minHour: 12,
  },
  {
    id: "autophagy",
    title: "Автофагія та оновлення клітин",
    subtitle: "Глибоке клітинне очищення та максимальна чутливість до інсуліну",
    minHour: 16,
  },
];

export function parseProtocolHours(protocol: FastingProtocol): {
  fastHours: number;
  feedHours: number;
} {
  const [fastStr, feedStr] = protocol.split(":");
  return {
    fastHours: Number(fastStr) || 16,
    feedHours: Number(feedStr) || 8,
  };
}

export function getPhaseForElapsedHours(elapsedHours: number): FastingPhaseInfo {
  let current = FASTING_PHASES[0]!;
  for (const phase of FASTING_PHASES) {
    if (elapsedHours >= phase.minHour) {
      current = phase;
    }
  }
  return current;
}

export interface FastingProgress {
  fastHours: number;
  feedHours: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  elapsedHours: number;
  progressPct: number;
  isGoalReached: boolean;
  phase: FastingPhaseInfo;
}

export function computeFastingProgress(state: FastingState, nowMs: number): FastingProgress {
  const { fastHours, feedHours } = parseProtocolHours(state.protocol);
  const targetSeconds = fastHours * 3600;

  if (!state.active || !state.startedAt) {
    return {
      fastHours,
      feedHours,
      elapsedSeconds: 0,
      remainingSeconds: targetSeconds,
      elapsedHours: 0,
      progressPct: 0,
      isGoalReached: false,
      phase: FASTING_PHASES[0]!,
    };
  }

  const startedMs = Date.parse(state.startedAt);
  const elapsedSeconds = Number.isFinite(startedMs)
    ? Math.max(0, Math.floor((nowMs - startedMs) / 1000))
    : 0;
  const remainingSeconds = Math.max(0, targetSeconds - elapsedSeconds);
  const elapsedHours = Math.round((elapsedSeconds / 3600) * 10) / 10;
  const progressPct = Math.min(100, Math.round((elapsedSeconds / targetSeconds) * 100));

  return {
    fastHours,
    feedHours,
    elapsedSeconds,
    remainingSeconds,
    elapsedHours,
    progressPct,
    isGoalReached: elapsedSeconds >= targetSeconds,
    phase: getPhaseForElapsedHours(elapsedHours),
  };
}

export function formatDurationHms(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

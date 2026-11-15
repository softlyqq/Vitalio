import { describe, expect, it } from "vitest";
import {
  computeFastingProgress,
  formatDurationHms,
  getPhaseForElapsedHours,
  parseProtocolHours,
} from "@/lib/fasting";
import type { FastingState } from "@/types/domain";

describe("fasting domain logic", () => {
  it("parses protocol hours accurately", () => {
    expect(parseProtocolHours("16:8")).toEqual({ fastHours: 16, feedHours: 8 });
    expect(parseProtocolHours("18:6")).toEqual({ fastHours: 18, feedHours: 6 });
    expect(parseProtocolHours("20:4")).toEqual({ fastHours: 20, feedHours: 4 });
  });

  it("identifies physiological phase for elapsed hours", () => {
    expect(getPhaseForElapsedHours(1.5).id).toBe("digestion");
    expect(getPhaseForElapsedHours(6).id).toBe("glycogen");
    expect(getPhaseForElapsedHours(13.5).id).toBe("lipolysis");
    expect(getPhaseForElapsedHours(17).id).toBe("autophagy");
  });

  it("computes active fasting progress and completion", () => {
    const startMs = Date.parse("2026-11-14T00:00:00Z");
    const state: FastingState = {
      active: true,
      protocol: "16:8",
      startedAt: new Date(startMs).toISOString(),
      completedSessions: 4,
    };

    const after8Hours = computeFastingProgress(state, startMs + 8 * 3600 * 1000);
    expect(after8Hours.progressPct).toBe(50);
    expect(after8Hours.elapsedHours).toBe(8);
    expect(after8Hours.isGoalReached).toBe(false);
    expect(after8Hours.phase.id).toBe("glycogen");

    const after16Hours = computeFastingProgress(state, startMs + 16 * 3600 * 1000);
    expect(after16Hours.progressPct).toBe(100);
    expect(after16Hours.isGoalReached).toBe(true);
    expect(after16Hours.phase.id).toBe("autophagy");
  });

  it("formats HH:MM:SS cleanly", () => {
    expect(formatDurationHms(3661)).toBe("01:01:01");
    expect(formatDurationHms(0)).toBe("00:00:00");
  });
});

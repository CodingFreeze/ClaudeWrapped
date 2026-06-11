import { describe, expect, it } from "vitest";
import { computeSuperlatives } from "./superlatives";
import type { WrappedStats } from "../types";

function makeStats(overrides: Partial<WrappedStats> = {}): WrappedStats {
  return {
    provider: "claude-ai",
    range: { start: "2025-01-01", end: "2025-12-31" },
    sessionCount: 100,
    conversationCount: 100,
    messageCount: 500,
    userMessageCount: 250,
    assistantMessageCount: 250,
    monthlySeries: [],
    source: { fileCount: 1, bytes: 1000, parseWarnings: [] },
    isCoding: false,
    ...overrides,
  };
}

function makeHistogram(opts: { nightHeavy?: boolean; morningHeavy?: boolean; even?: boolean }): number[] {
  const h = new Array<number>(24).fill(0);
  if (opts.nightHeavy) {
    // >40% between 22-02
    h[22] = 50; h[23] = 50; h[0] = 50; h[1] = 20; h[2] = 20;
    // some daytime
    for (let i = 9; i <= 18; i++) h[i] = 5;
  } else if (opts.morningHeavy) {
    // >40% between 05-08
    h[5] = 60; h[6] = 60; h[7] = 50; h[8] = 40;
    // some rest
    for (let i = 9; i <= 18; i++) h[i] = 5;
  } else if (opts.even) {
    for (let i = 0; i < 24; i++) h[i] = 10;
  }
  return h;
}

describe("computeSuperlatives", () => {
  it("returns all false when no optional fields present", () => {
    const sups = computeSuperlatives(makeStats());
    expect(sups.nightOwl).toBe(false);
    expect(sups.earlyBird).toBe(false);
    expect(sups.weekendWarrior).toBe(false);
    expect(sups.marathoner).toBe(false);
    expect(sups.tokenBurner).toBeUndefined();
  });

  it("detects nightOwl when >40% of messages are between 22:00-02:59", () => {
    const sups = computeSuperlatives(makeStats({ hourHistogram: makeHistogram({ nightHeavy: true }) }));
    expect(sups.nightOwl).toBe(true);
    expect(sups.earlyBird).toBe(false);
  });

  it("detects earlyBird when >40% of messages are between 05:00-08:59", () => {
    const sups = computeSuperlatives(makeStats({ hourHistogram: makeHistogram({ morningHeavy: true }) }));
    expect(sups.earlyBird).toBe(true);
    expect(sups.nightOwl).toBe(false);
  });

  it("does NOT flag nightOwl for even histogram", () => {
    const sups = computeSuperlatives(makeStats({ hourHistogram: makeHistogram({ even: true }) }));
    expect(sups.nightOwl).toBe(false);
    expect(sups.earlyBird).toBe(false);
  });

  it("detects weekendWarrior when >40% of messages fall on Sat/Sun", () => {
    // 2025-01-04 is a Saturday, 2025-01-05 is Sunday
    const daily = [
      { date: "2025-01-04", messages: 50 }, // Sat
      { date: "2025-01-05", messages: 50 }, // Sun
      { date: "2025-01-06", messages: 10 }, // Mon
      { date: "2025-01-07", messages: 10 }, // Tue
    ];
    const sups = computeSuperlatives(makeStats({ dailySeries: daily }));
    expect(sups.weekendWarrior).toBe(true);
  });

  it("does NOT flag weekendWarrior for mostly weekday activity", () => {
    const daily = [
      { date: "2025-01-06", messages: 100 }, // Mon
      { date: "2025-01-07", messages: 100 }, // Tue
      { date: "2025-01-08", messages: 100 }, // Wed
      { date: "2025-01-04", messages: 5 },   // Sat
    ];
    const sups = computeSuperlatives(makeStats({ dailySeries: daily }));
    expect(sups.weekendWarrior).toBe(false);
  });

  it("detects marathoner when longestDays >= 30", () => {
    const sups = computeSuperlatives(
      makeStats({
        streak: { longestDays: 30, longestStart: "2025-01-01", busiestDate: "2025-01-15", busiestCount: 20 },
      }),
    );
    expect(sups.marathoner).toBe(true);
  });

  it("does NOT detect marathoner when longestDays < 30", () => {
    const sups = computeSuperlatives(
      makeStats({
        streak: { longestDays: 29, longestStart: "2025-01-01", busiestDate: "2025-01-15", busiestCount: 20 },
      }),
    );
    expect(sups.marathoner).toBe(false);
  });

  it("detects tokenBurner for real token counts > 1M", () => {
    const sups = computeSuperlatives(
      makeStats({
        tokenUsage: { input: 800_000, output: 300_000, estimated: false },
      }),
    );
    expect(sups.tokenBurner).toBe(true);
  });

  it("does NOT set tokenBurner for estimated tokens", () => {
    const sups = computeSuperlatives(
      makeStats({
        tokenUsage: { input: 2_000_000, output: 500_000, estimated: true },
      }),
    );
    expect(sups.tokenBurner).toBeUndefined();
  });
});

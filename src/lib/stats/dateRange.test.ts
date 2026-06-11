import { describe, expect, it } from "vitest";
import { filterStatsByRange } from "./dateRange";
import type { WrappedStats } from "../types";

function makeStats(overrides: Partial<WrappedStats> = {}): WrappedStats {
  const dailySeries = [
    { date: "2025-01-10", messages: 5 },
    { date: "2025-01-15", messages: 8 },
    { date: "2025-02-03", messages: 12 },
    { date: "2025-02-04", messages: 10 },
    { date: "2025-02-05", messages: 7 },
    { date: "2025-03-20", messages: 15 },
    { date: "2025-06-01", messages: 20 },
    { date: "2025-06-02", messages: 18 },
  ];
  const monthlySeries = [
    { month: "2025-01", messages: 13 },
    { month: "2025-02", messages: 29 },
    { month: "2025-03", messages: 15 },
    { month: "2025-06", messages: 38 },
  ];
  const totalMessages = dailySeries.reduce((s, d) => s + d.messages, 0);

  return {
    provider: "claude-ai",
    range: { start: "2025-01-10", end: "2025-06-02" },
    sessionCount: 50,
    conversationCount: 50,
    messageCount: totalMessages,
    userMessageCount: Math.round(totalMessages * 0.5),
    assistantMessageCount: Math.round(totalMessages * 0.5),
    monthlySeries,
    dailySeries,
    hourHistogram: new Array<number>(24).fill(4),
    streak: {
      longestDays: 3,
      longestStart: "2025-02-03",
      busiestDate: "2025-06-01",
      busiestCount: 20,
    },
    source: { fileCount: 1, bytes: 1000, parseWarnings: [] },
    isCoding: false,
    ...overrides,
  };
}

describe("filterStatsByRange", () => {
  it("all-time passthrough: returns shallow clone with updated range when range covers full import", () => {
    const stats = makeStats();
    const result = filterStatsByRange(stats, "2025-01-01", "2025-12-31");
    // Passthrough: no changes to message counts
    expect(result.messageCount).toBe(stats.messageCount);
    expect(result.dailySeries).toBe(stats.dailySeries);
    expect(result.monthlySeries).toBe(stats.monthlySeries);
    expect(result.hourHistogram).toBe(stats.hourHistogram);
    expect(result.range.start).toBe("2025-01-01");
    expect(result.range.end).toBe("2025-12-31");
  });

  it("mid-year range sums dailySeries correctly", () => {
    const stats = makeStats();
    // Filter to Feb–Mar only
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");

    // Feb days: 12+10+7 = 29; Mar days: 15 = 15; total = 44
    expect(result.messageCount).toBe(44);
    expect(result.dailySeries?.length).toBe(4);
    expect(result.monthlySeries.length).toBe(2);
    expect(result.monthlySeries.find((m) => m.month === "2025-02")?.messages).toBe(29);
    expect(result.monthlySeries.find((m) => m.month === "2025-03")?.messages).toBe(15);
  });

  it("streak is recomputed within the filtered range", () => {
    const stats = makeStats();
    // Feb 3-5 is a 3-day consecutive streak; Mar 20 is isolated
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");

    expect(result.streak?.longestDays).toBe(3);
    expect(result.streak?.longestStart).toBe("2025-02-03");
    expect(result.streak?.busiestDate).toBe("2025-03-20");
    expect(result.streak?.busiestCount).toBe(15);
  });

  it("range outside data returns zeroed counts", () => {
    const stats = makeStats();
    const result = filterStatsByRange(stats, "2024-01-01", "2024-12-31");

    expect(result.messageCount).toBe(0);
    expect(result.userMessageCount).toBe(0);
    expect(result.assistantMessageCount).toBe(0);
    expect(result.dailySeries).toBeUndefined();
    expect(result.monthlySeries.length).toBe(0);
    expect(result.streak).toBeUndefined();
  });

  it("hourHistogram is dropped when range does not cover full import", () => {
    const stats = makeStats();
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(result.hourHistogram).toBeUndefined();
  });

  it("hourHistogram is preserved for full-range passthrough", () => {
    const stats = makeStats();
    const result = filterStatsByRange(stats, "2025-01-01", "2025-12-31");
    expect(result.hourHistogram).toBe(stats.hourHistogram);
  });

  it("adds parseWarning when modelBreakdown is present and range is filtered", () => {
    const stats = makeStats({
      modelBreakdown: [{ model: "claude-3-5-sonnet", messages: 100 }],
    });
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(
      result.source.parseWarnings.some((w) => w.includes("full import")),
    ).toBe(true);
  });

  it("does not duplicate parseWarning on repeated calls", () => {
    const stats = makeStats({
      modelBreakdown: [{ model: "claude-3-5-sonnet", messages: 100 }],
    });
    const first = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    const second = filterStatsByRange(first, "2025-02-01", "2025-03-31");
    const count = second.source.parseWarnings.filter((w) => w.includes("full import")).length;
    expect(count).toBe(1);
  });

  it("single-day range returns only that day's data", () => {
    const stats = makeStats();
    const result = filterStatsByRange(stats, "2025-06-01", "2025-06-01");
    expect(result.messageCount).toBe(20);
    expect(result.dailySeries?.length).toBe(1);
  });

  it("user/assistant ratio is preserved proportionally", () => {
    const stats = makeStats();
    // Feb+Mar = 44 messages out of 94 total
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(result.userMessageCount + result.assistantMessageCount).toBe(
      result.messageCount,
    );
  });

  it("projectStats keeps only projects overlapping the range", () => {
    const stats = makeStats({
      projectStats: [
        {
          name: "early-project",
          sessions: 10,
          messages: 100,
          firstSeen: "2025-01-10",
          lastSeen: "2025-01-20",
          activeDays: 5,
        },
        {
          name: "spring-project",
          sessions: 20,
          messages: 200,
          firstSeen: "2025-02-01",
          lastSeen: "2025-04-15",
          activeDays: 12,
        },
      ],
    });
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(result.projectStats?.map((p) => p.name)).toEqual(["spring-project"]);
  });

  it("extras temporal fields are recomputed from filtered dailySeries", () => {
    const stats = makeStats({
      extras: {
        busiestWeekday: 0,
        busiestWeekdayName: "Sunday",
        totalActiveDays: 8,
        avgMessagesPerActiveDay: 12,
        longestSessionMessages: 40,
        longestSessionDate: "2025-06-01",
        firstSessionDate: "2025-01-10",
        thinkingBlockCount: 7,
      },
    });
    // Feb 3 (Mon) 12, Feb 4 (Tue) 10, Feb 5 (Wed) 7, Mar 20 (Thu) 15
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(result.extras?.totalActiveDays).toBe(4);
    expect(result.extras?.avgMessagesPerActiveDay).toBe(Math.round(44 / 4));
    expect(result.extras?.firstSessionDate).toBe("2025-02-03");
    // 2025-03-20 is a Thursday and is the single busiest weekday bucket (15)
    expect(result.extras?.busiestWeekdayName).toBe("Thursday");
    // Full-import-only fields are kept as-is (covered by the parseWarning)
    expect(result.extras?.longestSessionMessages).toBe(40);
    expect(result.extras?.thinkingBlockCount).toBe(7);
  });

  it("adds parseWarning when word/tool/project stats are present and range is filtered", () => {
    const stats = makeStats({
      toolStats: {
        topTools: [{ name: "Read", count: 10 }],
        totalInvocations: 10,
      },
    });
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(
      result.source.parseWarnings.some((w) => w.includes("full import")),
    ).toBe(true);
  });

  it("wordStats and toolStats pass through unchanged on sub-range (full-import values)", () => {
    const stats = makeStats({
      wordStats: {
        userTopWords: [{ word: "refactor", count: 12 }],
        perModelTopWords: [],
        totalUserWords: 1000,
        totalAssistantWords: 3000,
        distinctUserWords: 400,
        verbosityRatio: 3,
      },
      toolStats: {
        topTools: [{ name: "Read", count: 10 }],
        totalInvocations: 10,
      },
    });
    const result = filterStatsByRange(stats, "2025-02-01", "2025-03-31");
    expect(result.wordStats).toBe(stats.wordStats);
    expect(result.toolStats).toBe(stats.toolStats);
  });
});

import { describe, expect, it } from "vitest";
import { computeStreak, daysBetween } from "./streaks";

describe("daysBetween", () => {
  it("returns 1 for consecutive dates", () => {
    expect(daysBetween("2025-01-01", "2025-01-02")).toBe(1);
  });

  it("returns 0 for same date", () => {
    expect(daysBetween("2025-06-10", "2025-06-10")).toBe(0);
  });

  it("returns 7 for dates one week apart", () => {
    expect(daysBetween("2025-01-01", "2025-01-08")).toBe(7);
  });
});

describe("computeStreak", () => {
  it("returns undefined for empty series", () => {
    expect(computeStreak([])).toBeUndefined();
  });

  it("returns undefined for series with no active days", () => {
    expect(computeStreak([{ date: "2025-01-01", messages: 0 }])).toBeUndefined();
  });

  it("returns streak of 1 for a single active day", () => {
    const result = computeStreak([{ date: "2025-01-15", messages: 10 }]);
    expect(result?.longestDays).toBe(1);
    expect(result?.busiestDate).toBe("2025-01-15");
    expect(result?.busiestCount).toBe(10);
  });

  it("computes a streak of 3 consecutive days", () => {
    const daily = [
      { date: "2025-03-01", messages: 5 },
      { date: "2025-03-02", messages: 8 },
      { date: "2025-03-03", messages: 3 },
    ];
    const result = computeStreak(daily);
    expect(result?.longestDays).toBe(3);
    expect(result?.longestStart).toBe("2025-03-01");
    expect(result?.busiestDate).toBe("2025-03-02");
    expect(result?.busiestCount).toBe(8);
  });

  it("finds the longest streak when there are gaps", () => {
    const daily = [
      { date: "2025-01-01", messages: 5 },
      { date: "2025-01-02", messages: 3 },
      // gap
      { date: "2025-01-05", messages: 10 },
      { date: "2025-01-06", messages: 7 },
      { date: "2025-01-07", messages: 2 },
      { date: "2025-01-08", messages: 1 },
    ];
    const result = computeStreak(daily);
    expect(result?.longestDays).toBe(4);
    expect(result?.longestStart).toBe("2025-01-05");
  });

  it("correctly identifies busiest date from full series", () => {
    const daily = [
      { date: "2025-06-01", messages: 4 },
      { date: "2025-06-02", messages: 100 },
      { date: "2025-06-10", messages: 20 },
    ];
    const result = computeStreak(daily);
    expect(result?.busiestDate).toBe("2025-06-02");
    expect(result?.busiestCount).toBe(100);
  });

  it("skips days with 0 messages in streak calculation", () => {
    const daily = [
      { date: "2025-05-01", messages: 3 },
      { date: "2025-05-02", messages: 0 }, // inactive gap
      { date: "2025-05-03", messages: 5 },
    ];
    // Day 2 is skipped, so longest streak is 1 (not 3)
    const result = computeStreak(daily);
    expect(result?.longestDays).toBe(1);
  });

  it("two isolated active days: longestDays=1, longestStart is the earliest", () => {
    const daily = [
      { date: "2025-05-01", messages: 3 },
      { date: "2025-05-03", messages: 5 }, // gap of 2 days
    ];
    const result = computeStreak(daily);
    expect(result?.longestDays).toBe(1);
    expect(result?.longestStart).toBe("2025-05-01");
  });

  it("multiple equal-length runs keep the EARLIEST start", () => {
    const daily = [
      { date: "2025-01-01", messages: 2 },
      { date: "2025-01-02", messages: 2 },
      // gap
      { date: "2025-02-01", messages: 5 },
      { date: "2025-02-02", messages: 5 },
    ];
    const result = computeStreak(daily);
    expect(result?.longestDays).toBe(2);
    expect(result?.longestStart).toBe("2025-01-01");
  });

  it("single active day returns longestDays=1 and correct longestStart", () => {
    const result = computeStreak([{ date: "2025-06-10", messages: 7 }]);
    expect(result?.longestDays).toBe(1);
    expect(result?.longestStart).toBe("2025-06-10");
  });
});

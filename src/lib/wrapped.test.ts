import { describe, expect, it } from "vitest";
import { toMonthlySeries } from "./wrapped";

describe("toMonthlySeries", () => {
  it("buckets messages by month and returns sorted [{month,count}]", () => {
    const msgs = [
      { ts: "2025-01-15" },
      { ts: "2025-01-20" },
      { ts: "2025-03-01" },
    ];
    expect(toMonthlySeries(msgs)).toEqual([
      { month: "2025-01", count: 2 },
      { month: "2025-03", count: 1 },
    ]);
  });

  it("handles full ISO timestamps", () => {
    const msgs = [
      { ts: "2024-12-31T23:59:59Z" },
      { ts: "2025-01-01T00:00:01Z" },
      { ts: "2025-01-15T12:00:00.000Z" },
    ];
    expect(toMonthlySeries(msgs)).toEqual([
      { month: "2024-12", count: 1 },
      { month: "2025-01", count: 2 },
    ]);
  });

  it("returns an empty array for no messages", () => {
    expect(toMonthlySeries([])).toEqual([]);
  });

  it("skips messages without a usable timestamp", () => {
    const msgs = [
      { ts: "2025-02-10" },
      { ts: undefined },
      { ts: "not-a-date" },
      {},
    ];
    expect(toMonthlySeries(msgs)).toEqual([{ month: "2025-02", count: 1 }]);
  });
});

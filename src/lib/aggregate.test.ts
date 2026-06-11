// ---------------------------------------------------------------------------
// Unit tests for aggregateStats — codingStats merge and general merging.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { aggregateStats } from "./aggregate";
import type { WrappedStats } from "./types";

function makeStats(overrides: Partial<WrappedStats> = {}): WrappedStats {
  return {
    provider: "claude-code",
    range: { start: "2025-01-01", end: "2025-12-31" },
    sessionCount: 10,
    conversationCount: 10,
    messageCount: 100,
    userMessageCount: 50,
    assistantMessageCount: 50,
    monthlySeries: [],
    source: { fileCount: 1, bytes: 1000, parseWarnings: [] },
    isCoding: true,
    ...overrides,
  };
}

describe("aggregateStats — codingStats merge", () => {
  it("merges topProjects from CC + Codex: combines by name, sums sessions, top 5", () => {
    const cc = makeStats({
      provider: "claude-code",
      codingStats: {
        topProjects: [
          { name: "myapp", sessions: 10 },
          { name: "shared-lib", sessions: 5 },
        ],
        topBranches: [{ name: "main", sessions: 8 }],
        avgSessionDurationMs: 1000,
      },
    });

    const codex = makeStats({
      provider: "codex",
      codingStats: {
        topProjects: [
          { name: "myapp", sessions: 6 },   // same name → should sum to 16
          { name: "other-proj", sessions: 4 },
        ],
        topBranches: [{ name: "feat/x", sessions: 3 }],
        avgSessionDurationMs: 2000,
      },
    });

    const merged = aggregateStats([cc, codex], "merged");

    expect(merged.codingStats).toBeDefined();
    const projects = merged.codingStats!.topProjects;

    // "myapp" sessions should be summed: 10 + 6 = 16
    const myapp = projects.find((p) => p.name === "myapp");
    expect(myapp?.sessions).toBe(16);

    // sorted desc: myapp(16) > shared-lib(5) > other-proj(4)
    expect(projects[0].name).toBe("myapp");
    expect(projects[0].sessions).toBe(16);
  });

  it("merges topBranches from CC + Codex: combines by name", () => {
    const cc = makeStats({
      codingStats: {
        topProjects: [{ name: "proj", sessions: 5 }],
        topBranches: [
          { name: "main", sessions: 8 },
          { name: "feat/a", sessions: 3 },
        ],
      },
    });

    const codex = makeStats({
      codingStats: {
        topProjects: [{ name: "proj", sessions: 3 }],
        topBranches: [
          { name: "main", sessions: 4 }, // same branch → should sum to 12
          { name: "fix/b", sessions: 2 },
        ],
      },
    });

    const merged = aggregateStats([cc, codex], "merged");
    const mainBranch = merged.codingStats!.topBranches.find((b) => b.name === "main");
    expect(mainBranch?.sessions).toBe(12);
  });

  it("returns undefined codingStats when no provider has coding data", () => {
    const a = makeStats({ provider: "claude-ai", isCoding: false, codingStats: undefined });
    const b = makeStats({ provider: "chatgpt", isCoding: false, codingStats: undefined });
    const merged = aggregateStats([a, b], "merged");
    expect(merged.codingStats).toBeUndefined();
  });

  it("limits topProjects result to top 5", () => {
    const cc = makeStats({
      codingStats: {
        topProjects: [
          { name: "a", sessions: 1 },
          { name: "b", sessions: 2 },
          { name: "c", sessions: 3 },
          { name: "d", sessions: 4 },
          { name: "e", sessions: 5 },
          { name: "f", sessions: 6 },
        ],
        topBranches: [],
      },
    });

    const merged = aggregateStats([cc, makeStats({ codingStats: { topProjects: [], topBranches: [] } })], "merged");
    expect(merged.codingStats!.topProjects.length).toBeLessThanOrEqual(5);
  });
});

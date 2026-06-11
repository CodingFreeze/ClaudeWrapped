// ---------------------------------------------------------------------------
// Unit tests for new metrics: projectStats, toolStats, wordStats in CC parser
// and new aggregate merges.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { parseClaudeCodeFiles } from "./claudeCode";
import { aggregateStats } from "../aggregate";
import type { WrappedStats } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonlFile(name: string, lines: object[]): File {
  const content = lines.map((l) => JSON.stringify(l)).join("\n");
  return new File([content], name, { type: "application/json" });
}

function userEvent(opts: {
  cwd?: string;
  gitBranch?: string;
  timestamp?: string;
  textContent?: string;
}) {
  return {
    type: "user",
    sessionId: "sess-001",
    uuid: "uuid-u",
    isSidechain: false,
    isMeta: false,
    timestamp: opts.timestamp ?? "2025-06-01T10:00:00.000Z",
    cwd: opts.cwd ?? "/home/user/projects/alpha/src",
    gitBranch: opts.gitBranch ?? "main",
    message: {
      role: "user",
      content: opts.textContent ?? "How do I refactor this component to improve performance?",
    },
  };
}

function assistantEvent(opts: {
  model?: string;
  timestamp?: string;
  toolNames?: string[];
  thinking?: boolean;
  textContent?: string;
}) {
  const content: object[] = [];
  for (const name of opts.toolNames ?? []) {
    content.push({ type: "tool_use", id: `tu-${name}`, name });
  }
  if (opts.thinking) {
    content.push({ type: "thinking", thinking: "Let me reason through this..." });
  }
  content.push({
    type: "text",
    text: opts.textContent ?? "The implementation approach follows the interface pattern.",
  });

  return {
    type: "assistant",
    sessionId: "sess-001",
    uuid: "uuid-a",
    isSidechain: false,
    timestamp: opts.timestamp ?? "2025-06-01T10:01:00.000Z",
    cwd: "/home/user/projects/alpha/src",
    message: {
      role: "assistant",
      model: opts.model ?? "claude-opus-4-8",
      content,
      usage: { input_tokens: 500, output_tokens: 200, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    },
  };
}

// ---------------------------------------------------------------------------
// projectStats tests
// ---------------------------------------------------------------------------

describe("parseClaudeCodeFiles — projectStats", () => {
  it("accumulates project stats from cwd across sessions", async () => {
    const files = [
      makeJsonlFile("sess-a.jsonl", [
        userEvent({ cwd: "/home/user/projects/alpha/src" }),
        assistantEvent({}),
      ]),
      makeJsonlFile("sess-b.jsonl", [
        userEvent({ cwd: "/home/user/projects/alpha/src", timestamp: "2025-06-02T10:00:00.000Z" }),
        assistantEvent({ timestamp: "2025-06-02T10:01:00.000Z" }),
      ]),
      makeJsonlFile("sess-c.jsonl", [
        userEvent({ cwd: "/home/user/projects/beta" }),
        assistantEvent({}),
      ]),
    ];

    const stats = await parseClaudeCodeFiles(files);

    expect(stats.projectStats).toBeDefined();
    expect(stats.projectStats!.length).toBeGreaterThanOrEqual(2);

    const alpha = stats.projectStats!.find((p) => p.name.includes("alpha"));
    expect(alpha).toBeDefined();
    expect(alpha!.sessions).toBe(2);
    expect(alpha!.messages).toBe(4); // 2 sessions × (1 user + 1 assistant)
    expect(alpha!.activeDays).toBeGreaterThanOrEqual(1);
  });

  it("returns top 8 by messages", async () => {
    const files = Array.from({ length: 12 }, (_, i) =>
      makeJsonlFile(`sess-${i}.jsonl`, [
        userEvent({ cwd: `/home/user/projects/proj${i}` }),
        assistantEvent({}),
      ]),
    );

    const stats = await parseClaudeCodeFiles(files);
    expect(stats.projectStats).toBeDefined();
    expect(stats.projectStats!.length).toBeLessThanOrEqual(8);
  });
});

// ---------------------------------------------------------------------------
// toolStats tests
// ---------------------------------------------------------------------------

describe("parseClaudeCodeFiles — toolStats", () => {
  it("counts tool invocations by name", async () => {
    const file = makeJsonlFile("sess-tools.jsonl", [
      userEvent({}),
      assistantEvent({ toolNames: ["Read", "Edit", "Read"] }),
      userEvent({ timestamp: "2025-06-01T11:00:00.000Z" }),
      assistantEvent({ toolNames: ["Bash", "Read"], timestamp: "2025-06-01T11:01:00.000Z" }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.toolStats).toBeDefined();
    const readTool = stats.toolStats!.topTools.find((t) => t.name === "Read");
    expect(readTool).toBeDefined();
    expect(readTool!.count).toBe(3);
    expect(stats.toolStats!.totalInvocations).toBe(5);
  });

  it("returns undefined toolStats when no tools used", async () => {
    const file = makeJsonlFile("sess-notools.jsonl", [
      userEvent({}),
      assistantEvent({ toolNames: [] }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);
    expect(stats.toolStats).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// wordStats tests (CC parser)
// ---------------------------------------------------------------------------

describe("parseClaudeCodeFiles — wordStats", () => {
  it("extracts user top words from message content", async () => {
    const file = makeJsonlFile("sess-words.jsonl", [
      userEvent({ textContent: "refactor the pipeline component for better performance" }),
      assistantEvent({}),
      userEvent({
        textContent: "refactor animation layout integration",
        timestamp: "2025-06-01T11:00:00.000Z",
      }),
      assistantEvent({ timestamp: "2025-06-01T11:01:00.000Z" }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.wordStats).toBeDefined();
    const refactorEntry = stats.wordStats!.userTopWords.find((w) => w.word === "refactor");
    expect(refactorEntry).toBeDefined();
    expect(refactorEntry!.count).toBe(2);
  });

  it("extracts per-model words from assistant text blocks", async () => {
    const file = makeJsonlFile("sess-modelwords.jsonl", [
      userEvent({}),
      assistantEvent({
        model: "claude-opus-4-8",
        textContent: "The implementation approach follows the interface pattern for better structure",
      }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.wordStats).toBeDefined();
    const opusWords = stats.wordStats!.perModelTopWords.find((m) => m.model === "claude-opus-4-8");
    expect(opusWords).toBeDefined();
    expect(opusWords!.words.length).toBeGreaterThan(0);
  });

  it("counts thinking blocks", async () => {
    const file = makeJsonlFile("sess-thinking.jsonl", [
      userEvent({}),
      assistantEvent({ thinking: true }),
      userEvent({ timestamp: "2025-06-01T11:00:00.000Z" }),
      assistantEvent({ thinking: true, timestamp: "2025-06-01T11:01:00.000Z" }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.extras).toBeDefined();
    expect(stats.extras!.thinkingBlockCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// extras tests
// ---------------------------------------------------------------------------

describe("parseClaudeCodeFiles — extras", () => {
  it("computes busiestWeekday and totalActiveDays", async () => {
    const files = [
      // Monday 2025-06-02
      makeJsonlFile("sess-mon.jsonl", [
        userEvent({ timestamp: "2025-06-02T10:00:00.000Z" }),
        assistantEvent({ timestamp: "2025-06-02T10:01:00.000Z" }),
        userEvent({ timestamp: "2025-06-02T11:00:00.000Z" }),
        assistantEvent({ timestamp: "2025-06-02T11:01:00.000Z" }),
      ]),
      // Tuesday 2025-06-03
      makeJsonlFile("sess-tue.jsonl", [
        userEvent({ timestamp: "2025-06-03T10:00:00.000Z" }),
        assistantEvent({ timestamp: "2025-06-03T10:01:00.000Z" }),
      ]),
    ];

    const stats = await parseClaudeCodeFiles(files);

    expect(stats.extras).toBeDefined();
    expect(stats.extras!.totalActiveDays).toBeGreaterThanOrEqual(1);
    expect(typeof stats.extras!.busiestWeekday).toBe("number");
    expect(stats.extras!.busiestWeekdayName).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// aggregate merge tests for new fields
// ---------------------------------------------------------------------------

describe("aggregateStats — new field merges", () => {
  function makeStats(overrides: Partial<WrappedStats>): WrappedStats {
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

  it("merges wordStats across providers: sums counts and re-tops", () => {
    const s1 = makeStats({
      wordStats: {
        userTopWords: [{ word: "refactor", count: 10 }, { word: "pipeline", count: 5 }],
        perModelTopWords: [],
        totalUserWords: 100,
        totalAssistantWords: 500,
        distinctUserWords: 50,
        verbosityRatio: 5,
      },
    });
    const s2 = makeStats({
      wordStats: {
        userTopWords: [{ word: "refactor", count: 8 }, { word: "deploy", count: 12 }],
        perModelTopWords: [],
        totalUserWords: 80,
        totalAssistantWords: 400,
        distinctUserWords: 40,
        verbosityRatio: 5,
      },
    });

    const merged = aggregateStats([s1, s2]);

    expect(merged.wordStats).toBeDefined();
    const refactor = merged.wordStats!.userTopWords.find((w) => w.word === "refactor");
    expect(refactor!.count).toBe(18); // 10 + 8
    // totalUserWords summed
    expect(merged.wordStats!.totalUserWords).toBe(180);
  });

  it("merges toolStats across providers: sums tool counts", () => {
    const s1 = makeStats({
      toolUseCount: 100,
      toolStats: {
        topTools: [{ name: "Read", count: 60 }, { name: "Edit", count: 40 }],
        totalInvocations: 100,
      },
    });
    const s2 = makeStats({
      toolUseCount: 50,
      toolStats: {
        topTools: [{ name: "Read", count: 30 }, { name: "Bash", count: 20 }],
        totalInvocations: 50,
      },
    });

    const merged = aggregateStats([s1, s2]);

    expect(merged.toolStats).toBeDefined();
    const read = merged.toolStats!.topTools.find((t) => t.name === "Read");
    expect(read!.count).toBe(90); // 60 + 30
    expect(merged.toolStats!.totalInvocations).toBe(150);
  });

  it("merges projectStats across providers: combines by name", () => {
    const s1 = makeStats({
      projectStats: [
        { name: "alpha/src", sessions: 5, messages: 80, firstSeen: "2025-02-01", lastSeen: "2025-06-30", activeDays: 20 },
      ],
    });
    const s2 = makeStats({
      projectStats: [
        { name: "alpha/src", sessions: 3, messages: 40, firstSeen: "2025-03-01", lastSeen: "2025-08-15", activeDays: 12 },
        { name: "beta", sessions: 2, messages: 30, firstSeen: "2025-04-01", lastSeen: "2025-07-01", activeDays: 8 },
      ],
    });

    const merged = aggregateStats([s1, s2]);

    expect(merged.projectStats).toBeDefined();
    const alpha = merged.projectStats!.find((p) => p.name === "alpha/src");
    expect(alpha).toBeDefined();
    expect(alpha!.sessions).toBe(8);
    expect(alpha!.messages).toBe(120);
    expect(alpha!.firstSeen).toBe("2025-02-01"); // earlier date wins
    expect(alpha!.lastSeen).toBe("2025-08-15");  // later date wins
  });
});

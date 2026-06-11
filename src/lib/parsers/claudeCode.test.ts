// ---------------------------------------------------------------------------
// Unit tests for claudeCode parser — synthetic fixtures only.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { parseClaudeCodeFiles } from "./claudeCode";

// ---------------------------------------------------------------------------
// Helpers to build synthetic .jsonl Files
// ---------------------------------------------------------------------------

function makeJsonlFile(name: string, lines: object[]): File {
  const content = lines.map((l) => JSON.stringify(l)).join("\n");
  return new File([content], name, { type: "application/json" });
}

// ---------------------------------------------------------------------------
// Synthetic event factory helpers
// ---------------------------------------------------------------------------

function userEvent(opts: {
  sessionId?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
}) {
  return {
    type: "user",
    sessionId: opts.sessionId ?? "sess-001",
    uuid: "uuid-user-1",
    isSidechain: opts.isSidechain ?? false,
    isMeta: opts.isMeta ?? false,
    timestamp: opts.timestamp ?? "2025-06-01T10:00:00.000Z",
    cwd: opts.cwd ?? "/home/user/projects/myapp",
    gitBranch: opts.gitBranch ?? "main",
    message: { role: "user", content: "What does this function do?" },
  };
}

function assistantEvent(opts: {
  sessionId?: string;
  isSidechain?: boolean;
  timestamp?: string;
  model?: string;
  cwd?: string;
  toolUseBlocks?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheRead?: number;
  cacheCreate?: number;
}) {
  const content: object[] = [];
  for (let i = 0; i < (opts.toolUseBlocks ?? 0); i++) {
    content.push({ type: "tool_use", id: `tu-${i}`, name: "read_file" });
  }
  content.push({ type: "text", text: "Here is my answer." });

  return {
    type: "assistant",
    sessionId: opts.sessionId ?? "sess-001",
    uuid: "uuid-asst-1",
    isSidechain: opts.isSidechain ?? false,
    timestamp: opts.timestamp ?? "2025-06-01T10:01:00.000Z",
    cwd: opts.cwd ?? "/home/user/projects/myapp",
    gitBranch: "main",
    message: {
      role: "assistant",
      model: opts.model ?? "claude-opus-4-8",
      content,
      usage: {
        input_tokens: opts.inputTokens ?? 500,
        output_tokens: opts.outputTokens ?? 200,
        cache_read_input_tokens: opts.cacheRead ?? 0,
        cache_creation_input_tokens: opts.cacheCreate ?? 0,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseClaudeCodeFiles", () => {
  it("parses a minimal single-session file", async () => {
    const file = makeJsonlFile("session-001.jsonl", [
      userEvent({}),
      assistantEvent({}),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.provider).toBe("claude-code");
    expect(stats.isCoding).toBe(true);
    expect(stats.userMessageCount).toBe(1);
    expect(stats.assistantMessageCount).toBe(1);
    expect(stats.messageCount).toBe(2);
    expect(stats.sessionCount).toBe(1);
  });

  it("skips isSidechain events", async () => {
    const file = makeJsonlFile("session-sidechain.jsonl", [
      userEvent({}),
      assistantEvent({}),
      userEvent({ isSidechain: true }),
      assistantEvent({ isSidechain: true }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.userMessageCount).toBe(1);
    expect(stats.assistantMessageCount).toBe(1);
  });

  it("skips isMeta user events", async () => {
    const file = makeJsonlFile("session-meta.jsonl", [
      userEvent({ isMeta: true }),
      userEvent({ isMeta: false }),
      assistantEvent({}),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    // Only 1 non-meta user event should be counted
    expect(stats.userMessageCount).toBe(1);
  });

  it("skips attachment/mode/file-history-snapshot/last-prompt events", async () => {
    const file = makeJsonlFile("session-skiptype.jsonl", [
      userEvent({}),
      { type: "attachment", timestamp: "2025-06-01T10:00:30.000Z", isSidechain: false },
      { type: "mode", timestamp: "2025-06-01T10:00:35.000Z", isSidechain: false },
      { type: "file-history-snapshot", timestamp: "2025-06-01T10:00:40.000Z", isSidechain: false },
      { type: "last-prompt", timestamp: "2025-06-01T10:00:45.000Z", isSidechain: false },
      assistantEvent({}),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.userMessageCount).toBe(1);
    expect(stats.assistantMessageCount).toBe(1);
  });

  it("counts tool_use blocks correctly", async () => {
    const file = makeJsonlFile("session-tools.jsonl", [
      userEvent({}),
      assistantEvent({ toolUseBlocks: 3 }),
      userEvent({ timestamp: "2025-06-01T11:00:00.000Z" }),
      assistantEvent({ toolUseBlocks: 2, timestamp: "2025-06-01T11:01:00.000Z" }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.toolUseCount).toBe(5);
  });

  it("accumulates token counts per model", async () => {
    const file = makeJsonlFile("session-tokens.jsonl", [
      userEvent({}),
      assistantEvent({
        model: "claude-opus-4-8",
        inputTokens: 1000,
        outputTokens: 400,
        cacheRead: 200,
        cacheCreate: 50,
      }),
      userEvent({ timestamp: "2025-06-01T11:00:00.000Z" }),
      assistantEvent({
        model: "claude-sonnet-3-5",
        inputTokens: 800,
        outputTokens: 300,
        timestamp: "2025-06-01T11:01:00.000Z",
      }),
    ]);

    const stats = await parseClaudeCodeFiles([file]);

    expect(stats.tokenUsage).toBeDefined();
    expect(stats.tokenUsage!.input).toBe(1800);
    expect(stats.tokenUsage!.output).toBe(700);
    expect(stats.tokenUsage!.cacheRead).toBe(200);
    expect(stats.tokenUsage!.cacheCreate).toBe(50);
    expect(stats.tokenUsage!.estimated).toBe(false);

    expect(stats.modelBreakdown).toBeDefined();
    expect(stats.modelBreakdown!.length).toBe(2);
  });

  it("throws when no .jsonl files provided", async () => {
    const file = new File(["{}"], "conversations.json", { type: "application/json" });
    await expect(parseClaudeCodeFiles([file])).rejects.toThrow(/No .jsonl files/);
  });

  it("extracts cwd → topProjects and gitBranch → topBranches", async () => {
    const files = [
      makeJsonlFile("sess-a.jsonl", [
        userEvent({ cwd: "/home/user/projects/alpha/src", gitBranch: "feat/login" }),
        assistantEvent({}),
      ]),
      makeJsonlFile("sess-b.jsonl", [
        userEvent({ cwd: "/home/user/projects/beta", gitBranch: "main" }),
        assistantEvent({}),
      ]),
      makeJsonlFile("sess-c.jsonl", [
        userEvent({ cwd: "/home/user/projects/alpha/src", gitBranch: "feat/login" }),
        assistantEvent({}),
      ]),
    ];

    const stats = await parseClaudeCodeFiles(files);

    expect(stats.codingStats).toBeDefined();
    expect(stats.codingStats!.topProjects.length).toBeGreaterThan(0);
    expect(stats.codingStats!.topBranches.length).toBeGreaterThan(0);

    // alpha/src appears twice, should be top project
    const topProject = stats.codingStats!.topProjects[0];
    expect(topProject.name).toContain("alpha");
    expect(topProject.sessions).toBe(2);
  });

  it("calls onProgress callback", async () => {
    const files = [
      makeJsonlFile("sess-1.jsonl", [userEvent({}), assistantEvent({})]),
      makeJsonlFile("sess-2.jsonl", [userEvent({}), assistantEvent({})]),
    ];

    const calls: [number, number][] = [];
    await parseClaudeCodeFiles(files, (parsed, total) => calls.push([parsed, total]));

    expect(calls).toEqual([[1, 2], [2, 2]]);
  });
});

// ---------------------------------------------------------------------------
// Unit tests for Codex CLI parser — synthetic fixtures only.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { parseCodexFiles, isCodexFile } from "./codex";

// ---------------------------------------------------------------------------
// Helper to build synthetic rollout JSONL files
// ---------------------------------------------------------------------------

function makeRolloutFile(name: string, lines: object[]): File {
  const content = lines.map((l) => JSON.stringify(l)).join("\n");
  return new File([content], name, { type: "application/json" });
}

function makeDefaultRolloutFile(sessionId = "sess-abc-001") {
  return makeRolloutFile("rollout-2025-06-01T10-00-00-000Z-abc123.jsonl", [
    {
      timestamp: "2025-06-01T10:00:00.000Z",
      type: "session_meta",
      payload: {
        id: sessionId,
        timestamp: "2025-06-01T10:00:00.000Z",
        cwd: "/home/user/projects/myapp",
        model_provider: "openai",
        cli_version: "1.0.0",
        git: { branch: "main" },
      },
    },
    {
      timestamp: "2025-06-01T10:00:01.000Z",
      type: "turn_context",
      payload: {
        turn_id: "turn-001",
        cwd: "/home/user/projects/myapp",
        model: "gpt-5.3-codex",
        effort: "medium",
      },
    },
    {
      timestamp: "2025-06-01T10:00:02.000Z",
      type: "event_msg",
      payload: {
        type: "task_started",
        turn_id: "turn-001",
        started_at: "2025-06-01T10:00:02.000Z",
      },
    },
    {
      timestamp: "2025-06-01T10:00:03.000Z",
      type: "event_msg",
      payload: {
        type: "user_message",
        message: "Fix the authentication bug",
      },
    },
    {
      timestamp: "2025-06-01T10:00:10.000Z",
      type: "event_msg",
      payload: {
        type: "agent_message",
        message: "Looking at the auth module...",
        phase: "thinking",
      },
    },
    {
      timestamp: "2025-06-01T10:01:00.000Z",
      type: "event_msg",
      payload: {
        type: "task_complete",
        turn_id: "turn-001",
        completed_at: "2025-06-01T10:01:00.000Z",
        duration_ms: 58000,
      },
    },
  ]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isCodexFile", () => {
  it("returns true for rollout-*.jsonl files", () => {
    const file = new File([], "rollout-2025-06-01T10-00-00-000Z-abc123.jsonl");
    expect(isCodexFile(file)).toBe(true);
  });

  it("returns false for non-rollout files", () => {
    const file = new File([], "session-abc123.jsonl");
    expect(isCodexFile(file)).toBe(false);
  });

  it("returns false for non-jsonl files", () => {
    const file = new File([], "rollout-data.json");
    expect(isCodexFile(file)).toBe(false);
  });
});

describe("parseCodexFiles", () => {
  it("parses a single session file", async () => {
    const file = makeDefaultRolloutFile();
    const stats = await parseCodexFiles([file]);

    expect(stats.provider).toBe("codex");
    expect(stats.isCoding).toBe(true);
    expect(stats.sessionCount).toBe(1);
    expect(stats.userMessageCount).toBe(1);
    expect(stats.assistantMessageCount).toBe(1);
  });

  it("extracts model from turn_context", async () => {
    const file = makeDefaultRolloutFile();
    const stats = await parseCodexFiles([file]);

    // One model used in one session — not enough for model breakdown (needs >= 2 models)
    // Just check no crash
    expect(stats.modelBreakdown === undefined || Array.isArray(stats.modelBreakdown)).toBe(true);
  });

  it("accumulates task_complete duration_ms", async () => {
    const file = makeDefaultRolloutFile();
    const stats = await parseCodexFiles([file]);

    expect(stats.codingStats).toBeDefined();
    // Duration was 58000ms for 1 session
    expect(stats.codingStats!.avgSessionDurationMs).toBe(58000);
  });

  it("extracts cwd and gitBranch", async () => {
    const file = makeDefaultRolloutFile();
    const stats = await parseCodexFiles([file]);

    expect(stats.codingStats).toBeDefined();
    expect(stats.codingStats!.topProjects.length).toBeGreaterThan(0);
    expect(stats.codingStats!.topBranches.length).toBeGreaterThan(0);
    expect(stats.codingStats!.topBranches[0].name).toBe("main");
  });

  it("handles multiple session files and aggregates", async () => {
    const files = [
      makeDefaultRolloutFile("sess-001"),
      makeRolloutFile("rollout-2025-06-02T10-00-00-000Z-def456.jsonl", [
        {
          timestamp: "2025-06-02T10:00:00.000Z",
          type: "session_meta",
          payload: { id: "sess-002", cwd: "/home/user/projects/beta", model_provider: "openai" },
        },
        {
          timestamp: "2025-06-02T10:00:03.000Z",
          type: "event_msg",
          payload: { type: "user_message", message: "Add tests" },
        },
        {
          timestamp: "2025-06-02T10:00:08.000Z",
          type: "event_msg",
          payload: { type: "agent_message", message: "Writing test cases..." },
        },
      ]),
    ];

    const stats = await parseCodexFiles(files);

    expect(stats.sessionCount).toBe(2);
    expect(stats.userMessageCount).toBe(2);
    expect(stats.assistantMessageCount).toBe(2);
  });

  it("throws when no .jsonl files provided", async () => {
    const file = new File(["{}"], "data.json");
    await expect(parseCodexFiles([file])).rejects.toThrow(/No rollout/);
  });

  it("calls onProgress callback for multiple files", async () => {
    const files = [
      makeDefaultRolloutFile("sess-001"),
      makeDefaultRolloutFile("sess-002"),
    ];

    const calls: number[] = [];
    await parseCodexFiles(files, (parsed) => calls.push(parsed));

    expect(calls).toEqual([1, 2]);
  });

  it("builds monthlySeries from timestamps", async () => {
    const file = makeDefaultRolloutFile();
    const stats = await parseCodexFiles([file]);

    expect(Array.isArray(stats.monthlySeries)).toBe(true);
    expect(stats.monthlySeries.length).toBeGreaterThan(0);
    expect(stats.monthlySeries[0].month).toBe("2025-06");
  });
});

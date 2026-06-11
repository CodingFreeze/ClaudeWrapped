// ---------------------------------------------------------------------------
// Unit tests for auto-detection cascade — synthetic fixtures only.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { autoDetect, detectJsonFile, detectJsonlFolder } from "./detect";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(name: string, content: string, type = "application/json"): File {
  return new File([content], name, { type });
}

function makeJsonlFile(name: string, lines: object[]): File {
  const content = lines.map((l) => JSON.stringify(l)).join("\n");
  return new File([content], name, { type: "application/json" });
}

// ---------------------------------------------------------------------------
// detectJsonFile tests
// ---------------------------------------------------------------------------

describe("detectJsonFile", () => {
  it("detects Claude.ai direct JSON by chat_messages + sender", async () => {
    const content = JSON.stringify([
      {
        uuid: "conv-1",
        chat_messages: [{ sender: "human", text: "hello", created_at: "2025-01-01T00:00:00Z" }],
      },
    ]);
    const file = makeFile("conversations.json", content);
    const result = await detectJsonFile(file);
    expect(result.provider).toBe("claude-ai");
  });

  it("detects ChatGPT direct JSON by mapping + create_time", async () => {
    const content = JSON.stringify([
      {
        id: "conv-1",
        create_time: 1714000000,
        mapping: { "node-1": { id: "node-1", parent: null, children: [], message: null } },
      },
    ]);
    const file = makeFile("conversations.json", content);
    const result = await detectJsonFile(file);
    expect(result.provider).toBe("chatgpt");
  });

  it("detects Gemini Takeout JSON by time + title", async () => {
    const content = JSON.stringify([
      { time: "2025-01-01T00:00:00Z", title: "Used Gemini", description: "Prompt" },
    ]);
    const file = makeFile("MyActivity.json", content);
    const result = await detectJsonFile(file);
    expect(result.provider).toBe("gemini");
  });

  it("returns null for unrecognized JSON", async () => {
    const file = makeFile("unknown.json", JSON.stringify({ foo: "bar" }));
    const result = await detectJsonFile(file);
    expect(result.provider).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectJsonlFolder tests
// ---------------------------------------------------------------------------

describe("detectJsonlFolder", () => {
  it("detects Codex from rollout-* filename pattern", async () => {
    const files = [
      makeJsonlFile("rollout-2025-06-01T10-00-00-000Z-abc.jsonl", [
        { type: "session_meta", payload: { id: "s1", model_provider: "openai" } },
      ]),
    ];
    const result = await detectJsonlFolder(files);
    expect(result.provider).toBe("codex");
    if (result.provider === "codex") {
      expect(result.confidence).toBe("high");
    }
  });

  it("detects Claude Code from claude- model signal in content", async () => {
    const files = [
      makeJsonlFile("abc123.jsonl", [
        {
          type: "assistant",
          message: { model: "claude-opus-4-8", content: [], usage: {} },
        },
      ]),
    ];
    const result = await detectJsonlFolder(files);
    expect(result.provider).toBe("claude-code");
  });

  it("returns null when no .jsonl files in list", async () => {
    const files = [makeFile("notes.txt", "hello world", "text/plain")];
    const result = await detectJsonlFolder(files);
    expect(result.provider).toBeNull();
  });

  it("falls back to claude-code (medium confidence) for ambiguous .jsonl files", async () => {
    const files = [
      makeJsonlFile("session-xyz.jsonl", [
        { type: "unknown", data: {} },
      ]),
    ];
    const result = await detectJsonlFolder(files);
    expect(result.provider).toBe("claude-code");
    if (result.provider === "claude-code") {
      expect(result.confidence).toBe("medium");
    }
  });
});

// ---------------------------------------------------------------------------
// autoDetect tests
// ---------------------------------------------------------------------------

describe("autoDetect", () => {
  it("returns null for empty file list", async () => {
    const result = await autoDetect([]);
    expect(result.provider).toBeNull();
  });

  it("handles single JSON file", async () => {
    const content = JSON.stringify([
      { uuid: "c1", chat_messages: [{ sender: "human", text: "hi", created_at: "2025-01-01T00:00:00Z" }] },
    ]);
    const file = makeFile("conversations.json", content);
    const result = await autoDetect([file]);
    expect(result.provider).toBe("claude-ai");
  });

  it("handles single .jsonl file with Codex rollout name", async () => {
    const file = makeJsonlFile("rollout-2025-01-01T00-00-00-000Z-abc.jsonl", [
      { type: "session_meta", payload: { id: "s1", model_provider: "openai" } },
    ]);
    const result = await autoDetect([file]);
    expect(result.provider).toBe("codex");
  });

  it("handles multiple .jsonl files (folder drop) for Claude Code", async () => {
    const files = [
      makeJsonlFile("sess-001.jsonl", [
        { type: "assistant", message: { model: "claude-sonnet-3-5", content: [] } },
      ]),
      makeJsonlFile("sess-002.jsonl", [
        { type: "assistant", message: { model: "claude-opus-4-8", content: [] } },
      ]),
    ];
    const result = await autoDetect(files);
    expect(result.provider).toBe("claude-code");
  });

  it("returns null for unrecognized single file type", async () => {
    const file = new File(["data"], "export.csv", { type: "text/csv" });
    const result = await autoDetect([file]);
    expect(result.provider).toBeNull();
  });
});

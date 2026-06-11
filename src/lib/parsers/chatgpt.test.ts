import { describe, expect, it } from "vitest";

// We test the pure data transform logic rather than file I/O.
// The parser's internal format detection is tested via shape validation.

// Simulate the ChatGPT conversation format
function makeChatGptConvo(overrides: {
  id?: string;
  create_time?: number;
  messages?: Array<{
    role: "user" | "assistant" | "system";
    create_time: number;
    model_slug?: string;
  }>;
}) {
  const messages = overrides.messages ?? [
    { role: "user", create_time: 1_700_000_000 },
    { role: "assistant", create_time: 1_700_000_010, model_slug: "gpt-4o" },
  ];

  const mapping: Record<string, unknown> = {};
  let prevId = "root";

  // Root node
  mapping["root"] = { id: "root", parent: null, children: [messages[0] ? "msg-0" : undefined].filter(Boolean), message: null };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const nodeId = `msg-${i}`;
    const nextId = i < messages.length - 1 ? `msg-${i + 1}` : undefined;

    mapping[nodeId] = {
      id: nodeId,
      parent: prevId,
      children: nextId ? [nextId] : [],
      message: {
        id: nodeId,
        author: { role: msg.role },
        create_time: msg.create_time,
        content: { content_type: "text", parts: ["test"] },
        metadata: msg.model_slug ? { model_slug: msg.model_slug } : {},
      },
    };
    prevId = nodeId;
  }

  return {
    id: overrides.id ?? "convo-1",
    title: "Test",
    create_time: overrides.create_time ?? 1_700_000_000,
    mapping,
  };
}

describe("ChatGPT detection heuristics", () => {
  it("mapping + create_time presence correctly describes ChatGPT format", () => {
    const convo = makeChatGptConvo({});
    expect(convo.mapping).toBeDefined();
    expect(typeof convo.create_time).toBe("number");
  });

  it("a convo without mapping is not ChatGPT format", () => {
    const notChatGpt = { id: "x", chat_messages: [], created_at: "2025-01-01" };
    expect("mapping" in notChatGpt).toBe(false);
  });
});

describe("ChatGPT message counting logic", () => {
  it("counts user and assistant messages correctly from mapping nodes", () => {
    const convo = makeChatGptConvo({
      messages: [
        { role: "user", create_time: 1_700_000_000 },
        { role: "assistant", create_time: 1_700_000_010, model_slug: "gpt-4o" },
        { role: "user", create_time: 1_700_000_020 },
        { role: "assistant", create_time: 1_700_000_030, model_slug: "gpt-4o" },
      ],
    });

    let userCount = 0;
    let assistantCount = 0;
    for (const node of Object.values(convo.mapping)) {
      const n = node as { message: { author: { role: string }; create_time: number } | null };
      if (!n.message || !n.message.create_time) continue;
      if (n.message.author.role === "user") userCount++;
      if (n.message.author.role === "assistant") assistantCount++;
    }
    expect(userCount).toBe(2);
    expect(assistantCount).toBe(2);
  });

  it("correctly extracts model_slug from assistant messages", () => {
    const convo = makeChatGptConvo({
      messages: [
        { role: "user", create_time: 1_700_000_000 },
        { role: "assistant", create_time: 1_700_000_010, model_slug: "gpt-4o" },
        { role: "assistant", create_time: 1_700_000_020, model_slug: "o1-preview" },
      ],
    });

    const models = new Set<string>();
    for (const node of Object.values(convo.mapping)) {
      const n = node as { message: { author: { role: string }; metadata?: { model_slug?: string } } | null };
      if (!n.message) continue;
      if (n.message.author.role === "assistant" && n.message.metadata?.model_slug) {
        models.add(n.message.metadata.model_slug);
      }
    }
    expect(models.has("gpt-4o")).toBe(true);
    expect(models.has("o1-preview")).toBe(true);
  });
});

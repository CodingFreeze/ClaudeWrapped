// ---------------------------------------------------------------------------
// Unit tests for wordExtract helpers.
// ---------------------------------------------------------------------------

import { describe, it, expect } from "vitest";
import { extractWords, accumulateWords, topWords } from "./wordExtract";

describe("extractWords", () => {
  it("lowercases and splits on whitespace/punctuation", () => {
    const words = extractWords("Hello World, Refactor the Code!");
    expect(words).toContain("refactor");
    // 'hello', 'world', 'code' all < 4 or stop-word  → may not appear
  });

  it("strips code fences including their content", () => {
    const input =
      "Could you refactor this snippet:\n```js\nconst snippetInternals = true;\n```\nThanks";
    const words = extractWords(input);
    // Prose outside the fence survives
    expect(words).toContain("refactor");
    // Words inside the fence are dropped with the fence
    expect(words).not.toContain("snippetinternals");
    // Ensure raw fence artifacts don't appear
    expect(words.some((w) => w.includes("`"))).toBe(false);
  });

  it("strips inline code", () => {
    const input = "Call `fetchData()` to load refactor results";
    const words = extractWords(input);
    expect(words).toContain("refactor");
    expect(words.some((w) => w.includes("`"))).toBe(false);
  });

  it("strips URLs", () => {
    const input = "Visit https://example.com/refactor-guide for details";
    const words = extractWords(input);
    expect(words.some((w) => w.includes("http"))).toBe(false);
    expect(words.some((w) => w.includes("example"))).toBe(false);
  });

  it("filters stop words", () => {
    const input = "that which should would could have been";
    const words = extractWords(input);
    expect(words).toHaveLength(0);
  });

  it("filters words shorter than 4 chars", () => {
    const input = "the and for we use";
    const words = extractWords(input);
    // All are either stop-words or <4 chars
    expect(words).toHaveLength(0);
  });

  it("retains meaningful long words", () => {
    const words = extractWords("pipeline animation database integration parser");
    expect(words).toContain("pipeline");
    expect(words).toContain("animation");
    expect(words).toContain("database");
    expect(words).toContain("integration");
    expect(words).toContain("parser");
  });

  it("filters coding noise words", () => {
    const words = extractWords("error test build check using import export");
    // All in noise list → should not appear (length >= 4 but stop-word)
    for (const w of words) {
      expect(["error", "test", "build", "check", "using", "import", "export"]).not.toContain(w);
    }
  });
});

describe("accumulateWords", () => {
  it("adds new words to an empty map", () => {
    const map = new Map<string, number>();
    accumulateWords(map, ["refactor", "pipeline"]);
    expect(map.get("refactor")).toBe(1);
    expect(map.get("pipeline")).toBe(1);
  });

  it("increments existing words", () => {
    const map = new Map<string, number>([["refactor", 5]]);
    accumulateWords(map, ["refactor", "refactor"]);
    expect(map.get("refactor")).toBe(7);
  });

  it("enforces 5000 key cap — new keys over cap are dropped", () => {
    const map = new Map<string, number>();
    // Fill map to exactly 5000 keys
    for (let i = 0; i < 5000; i++) {
      map.set(`word${i}`, 1);
    }
    // Attempt to add a brand-new key past cap
    accumulateWords(map, ["newcomer"]);
    expect(map.has("newcomer")).toBe(false);
    expect(map.size).toBe(5000);
  });

  it("increments existing keys even past cap", () => {
    const map = new Map<string, number>();
    for (let i = 0; i < 5000; i++) {
      map.set(`word${i}`, 1);
    }
    // "word0" already exists — should increment
    accumulateWords(map, ["word0"]);
    expect(map.get("word0")).toBe(2);
  });
});

describe("topWords", () => {
  it("returns top-N sorted by count descending", () => {
    const map = new Map([
      ["alpha", 10],
      ["beta", 50],
      ["gamma", 30],
      ["delta", 20],
    ]);
    const result = topWords(map, 3);
    expect(result).toHaveLength(3);
    expect(result[0].word).toBe("beta");
    expect(result[0].count).toBe(50);
    expect(result[1].word).toBe("gamma");
    expect(result[2].word).toBe("delta");
  });

  it("returns all items when N > map size", () => {
    const map = new Map([["only", 1]]);
    expect(topWords(map, 10)).toHaveLength(1);
  });

  it("returns empty array for empty map", () => {
    expect(topWords(new Map(), 5)).toHaveLength(0);
  });
});

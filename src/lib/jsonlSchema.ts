import type { JsonlDiscoveryResult } from "./types";

// ---------------------------------------------------------------------------
// Schema-discovery parser for Claude Code .jsonl logs.
//
// We DO NOT assume the event schema. This reads the first N lines of each
// dropped .jsonl file, parses each line as JSON, and tallies:
//   - distinct top-level keys (with frequency)
//   - distinct `type` values (with frequency)
//   - parse successes / failures
// plus a handful of raw sample events to eyeball. Once the real shape is
// confirmed, we build the typed aggregations on top of this. See HANDOFF.md.
// ---------------------------------------------------------------------------

const SAMPLE_LINES_PER_FILE = 50; // per the spec: first 50 lines of each file
const MAX_RAW_SAMPLES = 5;

export async function discoverJsonlSchema(
  files: File[],
): Promise<JsonlDiscoveryResult> {
  const warnings: string[] = [];
  const jsonlFiles = files.filter((f) => /\.jsonl$/i.test(f.name));

  if (jsonlFiles.length === 0) {
    throw new Error(
      "No .jsonl files found in the dropped folder. Point this at ~/.claude/projects/.",
    );
  }

  const keyCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const samples: string[] = [];
  const fileSummaries: JsonlDiscoveryResult["files"] = [];

  let lineCount = 0;
  let parsedCount = 0;
  let parseErrorCount = 0;
  let sampledLineCount = 0;

  for (const file of jsonlFiles) {
    const text = await file.text();
    const allLines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    lineCount += allLines.length;

    const sampled = allLines.slice(0, SAMPLE_LINES_PER_FILE);
    sampledLineCount += sampled.length;

    let fileParseErrors = 0;

    for (const line of sampled) {
      let event: unknown;
      try {
        event = JSON.parse(line);
      } catch {
        parseErrorCount++;
        fileParseErrors++;
        continue;
      }
      parsedCount++;

      if (event && typeof event === "object" && !Array.isArray(event)) {
        const obj = event as Record<string, unknown>;

        for (const key of Object.keys(obj)) {
          keyCounts[key] = (keyCounts[key] ?? 0) + 1;
        }

        const typeVal = obj["type"];
        if (typeof typeVal === "string") {
          typeCounts[typeVal] = (typeCounts[typeVal] ?? 0) + 1;
        } else if (typeVal !== undefined) {
          const label = `(${typeof typeVal})`;
          typeCounts[label] = (typeCounts[label] ?? 0) + 1;
        }

        if (samples.length < MAX_RAW_SAMPLES) {
          samples.push(JSON.stringify(obj, null, 2));
        }
      } else {
        warnings.push(
          `A line in ${file.name} parsed to a non-object (${typeof event}).`,
        );
      }
    }

    if (fileParseErrors > 0) {
      warnings.push(`${file.name}: ${fileParseErrors} line(s) failed to parse.`);
    }

    fileSummaries.push({
      name: file.name,
      lines: allLines.length,
      sampled: sampled.length,
    });
  }

  const trimmedWarnings =
    warnings.length > 10
      ? [...warnings.slice(0, 10), `…and ${warnings.length - 10} more.`]
      : warnings;

  return {
    source: "claude-code",
    fileCount: jsonlFiles.length,
    lineCount,
    parsedCount,
    parseErrorCount,
    keyCounts,
    typeCounts,
    sampledLineCount,
    samples,
    files: fileSummaries,
    warnings: trimmedWarnings,
  };
}

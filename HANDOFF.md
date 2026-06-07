# Claude Wrapped — Handoff

A client-side "Claude Wrapped" web app that visualizes Claude usage. **Runs
100% in-browser — no backend, no data leaves the device.**

---

## Status

| Phase | Scope | State |
| ----- | ----- | ----- |
| **1** | Scaffold, two file-drop zones, schema-discovery parser, print counts | ✅ Built — awaiting review |
| **2** | Confirm Claude Code `.jsonl` schema, then build aggregations | ⏸ Blocked on schema confirmation |
| **3** | Visualizations (Recharts), "wrapped" narrative/share cards | ⏳ Not started |

---

## Stack & decisions

- **Vite + React 19 + TypeScript** — static SPA, no server.
- **Tailwind CSS v4** — via the `@tailwindcss/vite` plugin + `@import "tailwindcss"`
  in `src/index.css` (no `tailwind.config.js` / PostCSS needed in v4).
- **JSZip** — unzip the Claude.ai export in-browser.
- **`webkitdirectory`** — folder picker for the Claude Code `.jsonl` logs.
  Typed in `src/vite-env.d.ts` (non-standard attribute missing from React types).
- **Recharts** — installed for Phase 3; not used yet.
- **Vercel** — static deploy (`vercel.json`, framework `vite`).

### Privacy

All parsing happens in the browser. No network calls. `.gitignore` blocks
`*.zip` and `sample-data/` so personal data can't be committed by accident.

---

## Data sources

### 1. Claude.ai export ZIP → `src/lib/claudeAiZip.ts`

- User drops the export `.zip`; we locate `conversations.json` (matched anywhere
  in the archive via regex, since the export sometimes nests it).
- Expected shape (**documented by user, treated as known**): an array of
  conversations, each with `chat_messages[]` whose messages have `sender`,
  `text`, `created_at`.
- Phase-1 output: conversation count, message count, messages-by-sender,
  earliest/latest timestamp, non-fatal warnings.

### 2. Claude Code `.jsonl` logs → `src/lib/jsonlSchema.ts`

- User picks the `~/.claude/projects/` folder (`webkitdirectory`); we gather all
  `.jsonl` files.
- **Schema is NOT assumed.** The discovery parser reads the **first 50 lines of
  each file**, `JSON.parse`s each line, and tallies:
  - distinct **top-level keys** (with frequency)
  - distinct **`type` values** (with frequency)
  - parse successes / failures
  - a few **raw sample events** (pretty-printed) to eyeball
- Output is rendered on screen AND logged to the console
  (`[Claude Wrapped] JSONL schema discovery: …`) for easy copy/paste.

---

## Confirmed Claude Code `.jsonl` schema

> **⏳ TBD — not yet confirmed.**
>
> Paste a sample `.jsonl` (or run the app against your `~/.claude/projects/`
> folder and share the discovered keys / `type` values). Once confirmed, record
> the real shape here and replace the discovery step with a typed parser +
> aggregations.

Fields we'll likely want to map once known (to verify against the real schema):

- timestamp(s) — per-event time, for activity-over-time charts
- event `type` taxonomy — what distinguishes a user turn, an assistant turn, a
  tool call, etc.
- token / cost fields — if present, for usage totals
- model identifier — for per-model breakdowns
- session / project identifiers — for grouping

---

## Project layout

```
src/
  App.tsx                     # wires the two drop zones + result panels
  main.tsx
  index.css                   # Tailwind v4 entry
  vite-env.d.ts               # webkitdirectory typing
  components/
    DropZone.tsx              # reusable file/folder drop zone
    ResultPanels.tsx          # Stat / CountsTable / result panels
  lib/
    types.ts                  # shared types (claude.ai known; jsonl = discovery only)
    claudeAiZip.ts            # JSZip parse of conversations.json
    jsonlSchema.ts            # schema-discovery parser (no schema assumptions)
```

---

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # typecheck + production build
npm run typecheck  # types only
```

---

## Next steps (Phase 2 — blocked)

1. **Confirm the `.jsonl` schema** from real discovery output (above).
2. Add typed Claude Code event types to `src/lib/types.ts`.
3. Build aggregations: activity over time, per-model/per-type breakdowns,
   token/cost totals (if those fields exist), streaks, busiest day, etc.
4. Define which "wrapped" stats matter most before designing charts.

## Open questions for the user

- Should Claude.ai and Claude Code stats be merged into one "wrapped", or kept
  as separate sections?
- Any specific headline stats you want featured (e.g. total messages, longest
  streak, favorite model)?
- Target time window — all-time, or a specific year ("2025 Wrapped")?

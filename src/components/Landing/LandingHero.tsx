// ---------------------------------------------------------------------------
// LandingHero — editorial headline + date-range selector + privacy badge.
// ---------------------------------------------------------------------------

import { useState, useId } from "react";

type DateRange = { start: string; end: string } | null;

interface LandingHeroProps {
  /** Currently selected range (null = all time). */
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  /** The actual min/max dates available from imported data (null while no data loaded). */
  dataRange: { start: string; end: string } | null;
  onTrySample: () => void;
  sampleBusy: boolean;
}

// Lock SVG
function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  );
}

// Play icon
function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  );
}

// Spinner icon
function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="9"/>
      <path className="opacity-90" d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round"/>
    </svg>
  );
}

/** Extract unique calendar years (sorted desc) from a data range. */
function yearsFromRange(dataRange: { start: string; end: string }): number[] {
  const startYear = Number(dataRange.start.slice(0, 4));
  const endYear = Number(dataRange.end.slice(0, 4));
  const years: number[] = [];
  for (let y = endYear; y >= startYear; y--) {
    years.push(y);
  }
  return years;
}

/** Format a YYYY-MM-DD string as "Mon YYYY". */
function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** Label shown in the sticker chip. */
function rangeLabel(dateRange: DateRange): string {
  if (!dateRange) return "All time";
  // If it looks like a full calendar year, display just the year.
  const sYear = dateRange.start.slice(0, 4);
  const isFullYear =
    dateRange.start === `${sYear}-01-01` && dateRange.end === `${sYear}-12-31`;
  if (isFullYear) return sYear;
  return `${fmtDate(dateRange.start)} – ${fmtDate(dateRange.end)}`;
}

// ---------------------------------------------------------------------------
// Custom-range sub-form (reveals when "Custom…" is chosen)
// ---------------------------------------------------------------------------

interface CustomRangeFormProps {
  dataRange: { start: string; end: string };
  current: DateRange;
  onApply: (range: DateRange) => void;
  onCancel: () => void;
}

function CustomRangeForm({ dataRange, current, onApply, onCancel }: CustomRangeFormProps) {
  const startId = useId();
  const endId = useId();
  const [start, setStart] = useState(current?.start ?? dataRange.start);
  const [end, setEnd] = useState(current?.end ?? dataRange.end);

  function handleApply() {
    if (start && end && start <= end) {
      onApply({ start, end });
    }
  }

  const invalid = !start || !end || start > end;

  return (
    <div
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border p-3"
      style={{
        borderColor: "var(--aw-coral)",
        background: "oklch(70% 0.17 40 / 0.06)",
      }}
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor={startId}
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--aw-ink-soft)" }}
        >
          From
        </label>
        <input
          id={startId}
          type="date"
          value={start}
          min={dataRange.start}
          max={dataRange.end}
          onChange={(e) => setStart(e.target.value)}
          className="rounded border px-2 py-1 text-sm font-bold focus:outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--aw-coral)",
            background: "oklch(24% 0.010 58)",
            color: "oklch(94% 0.020 80)",
            colorScheme: "dark",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor={endId}
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--aw-ink-soft)" }}
        >
          To
        </label>
        <input
          id={endId}
          type="date"
          value={end}
          min={dataRange.start}
          max={dataRange.end}
          onChange={(e) => setEnd(e.target.value)}
          className="rounded border px-2 py-1 text-sm font-bold focus:outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--aw-coral)",
            background: "oklch(24% 0.010 58)",
            color: "oklch(94% 0.020 80)",
            colorScheme: "dark",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={invalid}
        className="rounded px-3 py-1.5 text-sm font-bold transition-opacity disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "var(--aw-coral)",
          color: "var(--aw-paper)",
        }}
      >
        Apply
      </button>

      <button
        type="button"
        onClick={onCancel}
        className="rounded px-2 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2"
        style={{ color: "var(--aw-ink-mute)" }}
      >
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RangeSelector — the sticker chip + optional custom-range form
// ---------------------------------------------------------------------------

interface RangeSelectorProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dataRange: { start: string; end: string } | null;
}

function RangeSelector({ dateRange, onDateRangeChange, dataRange }: RangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(false);
  const selectorId = useId();

  const years = dataRange ? yearsFromRange(dataRange) : [];

  // Build option values: "all", "YYYY", "custom"
  // Selected value corresponds to current dateRange.
  function currentSelectValue(): string {
    if (!dateRange) return "all";
    const sYear = dateRange.start.slice(0, 4);
    const isFullYear =
      dateRange.start === `${sYear}-01-01` && dateRange.end === `${sYear}-12-31`;
    if (isFullYear && years.includes(Number(sYear))) return sYear;
    return "custom";
  }

  function handleSelectChange(value: string) {
    if (value === "all") {
      setShowCustom(false);
      onDateRangeChange(null);
    } else if (value === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const y = value;
      onDateRangeChange({ start: `${y}-01-01`, end: `${y}-12-31` });
    }
  }

  function handleCustomApply(range: DateRange) {
    setShowCustom(false);
    onDateRangeChange(range);
  }

  const label = rangeLabel(dateRange);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="aw-sticker">
        <label htmlFor={selectorId} className="sr-only">
          Select date range
        </label>
        <select
          id={selectorId}
          value={currentSelectValue()}
          onChange={(e) => handleSelectChange(e.target.value)}
          className="rounded-lg border border-dashed px-3 py-1 text-sm font-bold cursor-pointer focus:outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--aw-coral)",
            background: "oklch(70% 0.17 40 / 0.06)",
            color: "var(--aw-coral)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
          aria-label="Select date range"
        >
          <option
            value="all"
            style={{ background: "oklch(24% 0.010 58)", color: "oklch(94% 0.020 80)" }}
          >
            All time
          </option>
          {years.map((y) => (
            <option
              key={y}
              value={String(y)}
              style={{ background: "oklch(24% 0.010 58)", color: "oklch(94% 0.020 80)" }}
            >
              {y}
            </option>
          ))}
          {/* Fallback years when no data loaded yet */}
          {years.length === 0 && [2025, 2024, 2023].map((y) => (
            <option
              key={y}
              value={String(y)}
              style={{ background: "oklch(24% 0.010 58)", color: "oklch(94% 0.020 80)" }}
            >
              {y}
            </option>
          ))}
          <option
            value="custom"
            style={{ background: "oklch(24% 0.010 58)", color: "oklch(94% 0.020 80)" }}
          >
            Custom...
          </option>
        </select>
      </div>

      {/* Label showing active range */}
      {dateRange && !showCustom && (
        <span
          className="text-[10px] font-semibold"
          style={{ color: "var(--aw-coral)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {label}
        </span>
      )}

      {/* Custom date input panel */}
      {showCustom && dataRange && (
        <CustomRangeForm
          dataRange={dataRange}
          current={dateRange}
          onApply={handleCustomApply}
          onCancel={() => setShowCustom(false)}
        />
      )}

      {showCustom && !dataRange && (
        <p
          className="text-xs mt-1"
          style={{ color: "var(--aw-ink-mute)" }}
        >
          Import data first to enable custom range.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LandingHero
// ---------------------------------------------------------------------------

export function LandingHero({
  dateRange,
  onDateRangeChange,
  dataRange,
  onTrySample,
  sampleBusy,
}: LandingHeroProps) {
  return (
    <header className="aw-rise relative z-10 mb-14">
      {/* Privacy badge */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
          style={{
            borderColor: "var(--aw-coral)",
            color: "var(--aw-ink-soft)",
            background: "oklch(70% 0.17 40 / 0.06)",
          }}
        >
          <LockIcon />
          100% browser-local — zero network calls
        </div>

        {/* Date-range selector sticker */}
        <RangeSelector
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          dataRange={dataRange}
        />
      </div>

      {/* Display headline.
          The h1 carries the full accessible label "Your year in AI — Wrapped"
          so screen readers announce the complete brand phrase exactly once.
          The decorative coral "Wrapped" div is aria-hidden to avoid a
          double-announcement of that word. */}
      <h1
        className="font-display aw-display-xl mb-3 uppercase"
        style={{ color: "var(--aw-ink)" }}
        aria-label="Your year in AI — Wrapped"
      >
        Your year{" "}
        <br className="hidden sm:block" />
        in AI
      </h1>
      <div
        className="font-display aw-display-xl uppercase aw-headline-shadow mb-6 inline-block"
        style={{ color: "var(--aw-coral)" }}
        aria-hidden="true"
      >
        Wrapped
      </div>

      <p
        className="max-w-lg text-base leading-relaxed mb-8"
        style={{ color: "var(--aw-ink-soft)" }}
      >
        Drop your AI exports. See your year. Your data never leaves this browser.
      </p>

      {/* Try sample CTA */}
      <button
        type="button"
        onClick={onTrySample}
        disabled={sampleBusy}
        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2"
        style={{
          background: "var(--aw-coral)",
          color: "var(--aw-paper)",
          boxShadow: "0 8px 24px -8px oklch(70% 0.170 40 / 0.5)",
        }}
        aria-busy={sampleBusy}
      >
        {sampleBusy ? <SpinnerIcon /> : <PlayIcon />}
        {sampleBusy ? "Loading..." : "Try with sample data"}
      </button>
    </header>
  );
}

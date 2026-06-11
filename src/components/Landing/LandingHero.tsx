// ---------------------------------------------------------------------------
// LandingHero — editorial headline + year selector + privacy badge.
// ---------------------------------------------------------------------------

interface LandingHeroProps {
  year: number;
  onYearChange: (year: number) => void;
  onTrySample: () => void;
  sampleBusy: boolean;
}

const AVAILABLE_YEARS = [2025, 2024, 2023];

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

export function LandingHero({ year, onYearChange, onTrySample, sampleBusy }: LandingHeroProps) {
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

        {/* Year selector sticker */}
        <div className="aw-sticker">
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="rounded-lg border border-dashed px-3 py-1 text-sm font-bold cursor-pointer focus:outline-none focus-visible:ring-2"
            style={{
              borderColor: "var(--aw-coral)",
              background: "oklch(70% 0.17 40 / 0.06)",
              color: "var(--aw-coral)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
            aria-label="Select year"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option
                key={y}
                value={y}
                style={{ background: "oklch(24% 0.010 58)", color: "oklch(94% 0.020 80)" }}
              >
                {y}
              </option>
            ))}
          </select>
        </div>
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
        {sampleBusy ? "Loading…" : "Try with sample data"}
      </button>
    </header>
  );
}

// ---------------------------------------------------------------------------
// DeckProgress — thin coral hairline at the top of the deck.
// ---------------------------------------------------------------------------

interface DeckProgressProps {
  current: number;
  total: number;
}

export function DeckProgress({ current, total }: DeckProgressProps) {
  const fraction = total > 0 ? (current + 1) / total : 0;

  return (
    <div
      className="absolute left-0 right-0 top-0 z-20 h-[3px]"
      style={{ background: "var(--aw-hairline)" }}
      role="progressbar"
      aria-valuenow={current + 1}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Slide ${current + 1} of ${total}`}
    >
      <div
        className="h-full"
        style={{
          width: `${fraction * 100}%`,
          background: "var(--aw-coral)",
          transition: "width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  );
}

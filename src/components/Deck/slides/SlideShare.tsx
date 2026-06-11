// ---------------------------------------------------------------------------
// SlideShare — S10: share card preview + download/copy actions.
// Uses ShareCard (off-screen) + shareCardExport for html-to-image export.
// ---------------------------------------------------------------------------

import { useRef, useState } from "react";
import { motion } from "motion/react";
import type { WrappedStats } from "../../../lib/types";
import { ShareCard } from "../../Share/ShareCard";
import { downloadShareCard, copyShareCardToClipboard } from "../../Share/shareCardExport";

const springBouncy = { type: "spring", stiffness: 600, damping: 20, mass: 0.8 } as const;
const springRelaxed = { type: "spring", stiffness: 200, damping: 24 } as const;

interface SlideShareProps {
  stats: WrappedStats;
  isVisible: boolean;
  onReset: () => void;
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="1 4 1 10 7 10"/>
      <path d="M3.51 15a9 9 0 1 0 .49-3.41"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export function SlideShare({ stats, isVisible, onReset }: SlideShareProps) {
  const year = stats.range.start.slice(0, 4);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const sups = stats.superlatives;
  const badges = sups
    ? [
        sups.nightOwl && "Night Owl",
        sups.earlyBird && "Early Bird",
        sups.weekendWarrior && "Weekend Warrior",
        sups.marathoner && "Marathoner",
      ].filter((s): s is string => Boolean(s))
    : [];

  async function handleDownload() {
    if (!cardRef.current || downloading) return;
    setDownloading(true);
    try {
      await downloadShareCard(cardRef.current, { year });
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    if (!cardRef.current || copying) return;
    setCopying(true);
    try {
      const ok = await copyShareCardToClipboard(cardRef.current);
      if (ok) {
        setCopySuccess(true);
        window.setTimeout(() => setCopySuccess(false), 2500);
      }
    } finally {
      setCopying(false);
    }
  }

  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-8 px-8 py-14"
      style={{ background: "var(--aw-paper)" }}
    >
      {/* Off-screen share card for html-to-image */}
      <ShareCard stats={stats} nodeRef={cardRef} />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 50%, oklch(70% 0.17 40 / 0.12) 0%, transparent 70%)",
        }}
      />

      {/* On-screen preview card */}
      <motion.div
        className="relative z-10 w-full max-w-xs rounded-2xl border p-6 text-center"
        style={{ borderColor: "var(--aw-coral)", background: "var(--aw-surface)" }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ ...springBouncy, delay: 0.1 }}
      >
        <p
          className="font-display aw-display-lg uppercase mb-2"
          style={{ color: "var(--aw-coral)" }}
        >
          AI Wrapped
        </p>
        <p className="font-stat text-4xl mb-1" style={{ color: "var(--aw-ink)" }}>
          {stats.messageCount.toLocaleString()}
        </p>
        <p className="text-xs uppercase tracking-wide mb-4" style={{ color: "var(--aw-ink-mute)" }}>
          messages in {year}
        </p>

        {stats.streak && (
          <p className="text-sm mb-3" style={{ color: "var(--aw-ink-soft)" }}>
            <span className="font-stat" style={{ color: "var(--aw-coral)" }}>
              {stats.streak.longestDays}
            </span>{" "}
            day streak
          </p>
        )}

        {stats.projectStats && stats.projectStats.length > 0 && (
          <p className="text-xs mb-1" style={{ color: "var(--aw-ink-mute)" }}>
            Top project:{" "}
            <span className="font-stat" style={{ color: "var(--aw-ink-soft)" }}>
              {stats.projectStats[0].name.split("/").slice(-1)[0]}
            </span>
          </p>
        )}

        {stats.wordStats && stats.wordStats.userTopWords.length > 0 && (
          <p className="text-xs mb-1" style={{ color: "var(--aw-ink-mute)" }}>
            Top word:{" "}
            <span className="font-stat" style={{ color: "var(--aw-coral)" }}>
              {stats.wordStats.userTopWords[0].word}
            </span>
          </p>
        )}

        {stats.toolStats && stats.toolStats.totalInvocations > 0 && (
          <p className="text-xs mb-3" style={{ color: "var(--aw-ink-mute)" }}>
            <span className="font-stat" style={{ color: "var(--aw-ink-soft)" }}>
              {stats.toolStats.totalInvocations.toLocaleString()}
            </span>{" "}
            tool calls
          </p>
        )}

        {badges.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ borderColor: "var(--aw-coral)", color: "var(--aw-coral)" }}
              >
                {b}
              </span>
            ))}
          </div>
        )}

        <p className="mt-4 text-[10px]" style={{ color: "var(--aw-ink-mute)" }}>
          Your year in AI, wrapped.
        </p>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="relative z-10 flex flex-wrap justify-center gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ ...springRelaxed, delay: 0.4 }}
      >
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2"
          style={{ background: "var(--aw-coral)", color: "var(--aw-paper)" }}
          aria-label="Download share card as PNG"
        >
          <DownloadIcon />
          {downloading ? "Generating…" : "Download card"}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          disabled={copying}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: copySuccess ? "oklch(70% 0.14 155)" : "var(--aw-coral)",
            color: copySuccess ? "oklch(70% 0.14 155)" : "var(--aw-coral)",
            background: "transparent",
          }}
          aria-label="Copy share card to clipboard"
        >
          {copySuccess ? <CheckIcon /> : <CopyIcon />}
          {copySuccess ? "Copied!" : copying ? "Copying…" : "Copy image"}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--aw-hairline)",
            color: "var(--aw-ink-soft)",
            background: "transparent",
          }}
          aria-label="Start over with new data"
        >
          <ResetIcon />
          Start over
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShareCard — off-screen 1080×1920px card rendered for html-to-image capture.
// This component is rendered invisible; shareCardExport.ts captures it.
// ---------------------------------------------------------------------------

import type { WrappedStats } from "../../lib/types";

const CARD_W = 1080;
const CARD_H = 1920;

const PROVIDER_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  "claude-ai": "Claude.ai",
  chatgpt: "ChatGPT",
  codex: "Codex CLI",
  grok: "Grok",
  gemini: "Gemini",
  merged: "All AI",
  coding: "Coding",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

interface ShareCardProps {
  stats: WrappedStats;
  /** Ref forwarded from the exporter to target for html-to-image. */
  nodeRef: React.RefObject<HTMLDivElement | null>;
}

export function ShareCard({ stats, nodeRef }: ShareCardProps) {
  const year = stats.range.start.slice(0, 4);
  const sups = stats.superlatives;

  const badges = sups
    ? [
        sups.nightOwl && "Night Owl",
        sups.earlyBird && "Early Bird",
        sups.weekendWarrior && "Weekend Warrior",
        sups.marathoner && "Marathoner",
        sups.tokenBurner && "Token Burner",
      ].filter((s): s is string => Boolean(s))
    : [];

  const providerLabel = PROVIDER_LABELS[stats.provider] ?? stats.provider;

  // Find busiest month
  const busiestMonth = stats.monthlySeries.reduce(
    (best, m) => (m.messages > best.messages ? m : best),
    stats.monthlySeries[0] ?? { month: "", messages: 0 },
  );

  // Compact bar chart for share card (max 12 months)
  const barData = stats.monthlySeries.slice(-12);
  const maxBar = Math.max(...barData.map((d) => d.messages), 1);

  return (
    <div
      ref={nodeRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        overflow: "hidden",
        background: "oklch(20% 0.012 60)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "80px 80px",
        boxSizing: "border-box",
        fontFamily: "'Fraunces', serif",
        color: "oklch(94% 0.020 80)",
      }}
      aria-hidden="true"
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(70% 50% at 50% 30%, oklch(70% 0.17 40 / 0.20) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top: provider badge + year */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "2px solid oklch(70% 0.17 40)",
            borderRadius: 12,
            padding: "10px 24px",
            fontSize: 32,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 600,
            color: "oklch(70% 0.17 40)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {providerLabel}
        </div>
        <div
          style={{
            fontSize: 32,
            fontFamily: "'Inter', sans-serif",
            color: "oklch(58% 0.010 75)",
            fontWeight: 600,
          }}
        >
          {year}
        </div>
      </div>

      {/* Center: headline stats */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          textAlign: "center",
          flex: 1,
          justifyContent: "center",
        }}
      >
        {/* Total messages */}
        <div
          style={{
            fontSize: 160,
            fontWeight: 900,
            lineHeight: 1,
            color: "oklch(70% 0.17 40)",
            fontFamily: "'Fraunces', serif",
            textShadow: "6px 6px 0 oklch(70% 0.17 40 / 0.5)",
          }}
        >
          {fmt(stats.messageCount)}
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 400,
            color: "oklch(78% 0.015 75)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontFamily: "'Inter', sans-serif",
          }}
        >
          messages
        </div>

        {/* Secondary stats row */}
        <div
          style={{
            display: "flex",
            gap: 64,
            marginTop: 32,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 72, fontWeight: 700, color: "oklch(94% 0.020 80)", lineHeight: 1 }}>
              {fmt(stats.conversationCount)}
            </div>
            <div style={{ fontSize: 26, color: "oklch(58% 0.010 75)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              conversations
            </div>
          </div>
          {stats.streak && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 72, fontWeight: 700, color: "oklch(94% 0.020 80)", lineHeight: 1 }}>
                {stats.streak.longestDays}
              </div>
              <div style={{ fontSize: 26, color: "oklch(58% 0.010 75)", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                day streak
              </div>
            </div>
          )}
        </div>

        {/* Busiest month */}
        {busiestMonth.month && (
          <div
            style={{
              marginTop: 24,
              fontSize: 32,
              color: "oklch(78% 0.015 75)",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Busiest month:{" "}
            <span style={{ color: "oklch(70% 0.17 40)", fontWeight: 600 }}>
              {new Date(busiestMonth.month + "-01").toLocaleString("en-US", { month: "long" })}{" "}
              ({fmt(busiestMonth.messages)} msgs)
            </span>
          </div>
        )}

        {/* Mini bar chart */}
        {barData.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 8,
              height: 120,
              marginTop: 32,
              padding: "0 16px",
              width: "100%",
              justifyContent: "center",
            }}
          >
            {barData.map((d, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  maxWidth: 48,
                  height: `${Math.round((d.messages / maxBar) * 120)}px`,
                  background:
                    d.messages === busiestMonth.messages
                      ? "oklch(70% 0.17 40)"
                      : "oklch(94% 0.020 80 / 0.3)",
                  borderRadius: 4,
                  minHeight: 4,
                }}
              />
            ))}
          </div>
        )}

        {/* Superlative badges */}
        {badges.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "center",
              marginTop: 24,
            }}
          >
            {badges.map((b) => (
              <div
                key={b}
                style={{
                  border: "2px solid oklch(70% 0.17 40)",
                  borderRadius: 8,
                  padding: "8px 20px",
                  fontSize: 28,
                  fontWeight: 600,
                  color: "oklch(70% 0.17 40)",
                  fontFamily: "'Inter', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                {b}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom: wordmark */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "oklch(70% 0.17 40)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            textShadow: "3px 3px 0 oklch(70% 0.17 40 / 0.5)",
          }}
        >
          AI Wrapped
        </div>
        <div
          style={{
            fontSize: 24,
            color: "oklch(58% 0.010 75)",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.08em",
          }}
        >
          Your year in AI, wrapped.
        </div>
      </div>
    </div>
  );
}

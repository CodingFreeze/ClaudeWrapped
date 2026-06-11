// ---------------------------------------------------------------------------
// Token cost estimation formulas (Claude pricing, claude-3.5-sonnet rates).
// ---------------------------------------------------------------------------

/** Rates per million tokens (USD) — claude-3.5-sonnet. */
const RATES = {
  input: 3.0,         // $3.00 / 1M
  output: 15.0,       // $15.00 / 1M
  cacheRead: 0.30,    // $0.30 / 1M
  cacheCreate: 3.75,  // $3.75 / 1M
} as const;

export interface TokenCostResult {
  totalTokens: number;
  estimatedCostUSD: number;
  rateLabel: string;
}

export function estimateTokenCost(opts: {
  input: number;
  output: number;
  cacheRead?: number;
  cacheCreate?: number;
}): TokenCostResult {
  const { input, output, cacheRead = 0, cacheCreate = 0 } = opts;
  const totalTokens = input + output + cacheRead + cacheCreate;
  const cost =
    (input / 1_000_000) * RATES.input +
    (output / 1_000_000) * RATES.output +
    (cacheRead / 1_000_000) * RATES.cacheRead +
    (cacheCreate / 1_000_000) * RATES.cacheCreate;

  return {
    totalTokens,
    estimatedCostUSD: Math.round(cost * 100) / 100,
    rateLabel: "Based on claude-3.5-sonnet pricing. Actual cost may vary by model.",
  };
}

/** Format a token count compactly: 1.2M, 843K, etc. */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

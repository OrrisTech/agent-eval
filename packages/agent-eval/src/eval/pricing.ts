/**
 * Model pricing — USD per million tokens.
 *
 * Numbers track Anthropic's published list prices as of 2026. Keep the map
 * in sync with api.anthropic.com/pricing when adding new models; the eval
 * engine falls back to 0 for unknown model IDs rather than guessing, since
 * an incorrect price is worse than no price at all.
 */

export interface ModelPrice {
  /** USD per million input tokens */
  inputPerMTok: number;
  /** USD per million output tokens */
  outputPerMTok: number;
}

const PRICES: Record<string, ModelPrice> = {
  // Anthropic Claude 4.x family
  "claude-opus-4-6": { inputPerMTok: 15, outputPerMTok: 75 },
  "claude-opus-4-7": { inputPerMTok: 15, outputPerMTok: 75 },
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 1, outputPerMTok: 5 },
  // Short aliases — agent scripts frequently refer to these
  opus: { inputPerMTok: 15, outputPerMTok: 75 },
  sonnet: { inputPerMTok: 3, outputPerMTok: 15 },
  haiku: { inputPerMTok: 1, outputPerMTok: 5 },
};

/**
 * Compute the USD cost of a single run given model ID and token counts.
 * Returns 0 when the model is unknown so callers can safely render it.
 */
export function computeCostUsd(
  model: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number {
  if (!model || inputTokens == null || outputTokens == null) return 0;
  const price = PRICES[model] ?? PRICES[model.toLowerCase()];
  if (!price) return 0;
  return (
    (inputTokens * price.inputPerMTok) / 1_000_000 +
    (outputTokens * price.outputPerMTok) / 1_000_000
  );
}

/** Expose the price map so tests and tooling can enumerate supported models. */
export function getPrice(model: string): ModelPrice | null {
  return PRICES[model] ?? PRICES[model.toLowerCase()] ?? null;
}

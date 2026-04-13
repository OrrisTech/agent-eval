import type Anthropic from "@anthropic-ai/sdk";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

/**
 * Call Claude API with automatic retry on transient errors (429, 529, network).
 * Uses exponential backoff: 2s, 4s, 8s.
 */
export async function callWithRetry(
  client: Anthropic,
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
  },
): Promise<string> {
  const model = options?.model ?? "claude-sonnet-4-20250514";
  const maxTokens = options?.maxTokens ?? 2048;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      });

      return response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");
    } catch (err) {
      const isRetryable = isTransientError(err);
      const isLastAttempt = attempt === MAX_RETRIES;

      if (!isRetryable || isLastAttempt) {
        throw err;
      }

      const delay = BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }
  }

  // Unreachable, but TypeScript needs it
  throw new Error("Exhausted retries");
}

function isTransientError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  // Anthropic overloaded (529), rate limited (429), or network errors
  return (
    msg.includes("529") ||
    msg.includes("overloaded") ||
    msg.includes("429") ||
    msg.includes("rate") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

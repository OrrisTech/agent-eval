import { describe, expect, it } from "vitest";
import { computeCostUsd, getPrice } from "../src/eval/pricing.js";

describe("pricing", () => {
  it("returns 0 for unknown models so cost renders safely", () => {
    expect(computeCostUsd("unknown-model", 1000, 1000)).toBe(0);
  });

  it("returns 0 when token counts are missing", () => {
    expect(computeCostUsd("claude-sonnet-4-6", undefined, 100)).toBe(0);
    expect(computeCostUsd("claude-sonnet-4-6", 100, undefined)).toBe(0);
    expect(computeCostUsd(undefined, 100, 100)).toBe(0);
  });

  it("computes Sonnet 4.6 cost: 1M input + 1M output = $3 + $15 = $18", () => {
    const cost = computeCostUsd("claude-sonnet-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 5);
  });

  it("computes Opus 4.6 cost: 1M input + 1M output = $15 + $75 = $90", () => {
    const cost = computeCostUsd("claude-opus-4-6", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(90, 5);
  });

  it("computes Haiku 4.5 cost: 1M input + 1M output = $1 + $5 = $6", () => {
    const cost = computeCostUsd("claude-haiku-4-5", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(6, 5);
  });

  it("accepts short aliases like 'sonnet' for ergonomics", () => {
    const cost = computeCostUsd("sonnet", 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(18, 5);
  });

  it("getPrice returns null for unknown models", () => {
    expect(getPrice("gpt-9000")).toBeNull();
  });

  it("getPrice returns structured data for known models", () => {
    expect(getPrice("claude-sonnet-4-6")).toEqual({
      inputPerMTok: 3,
      outputPerMTok: 15,
    });
  });
});

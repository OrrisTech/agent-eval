import { describe, expect, it, vi } from "vitest";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  let callCount = 0;
  class MockAnthropic {
    messages = {
      create: vi.fn().mockImplementation(async () => {
        callCount++;
        // Fail first 2 calls to test retry, succeed on 3rd
        if (callCount <= 2) {
          throw new Error("529 overloaded");
        }
        return {
          content: [{ type: "text", text: "success response" }],
        };
      }),
    };
  }
  return {
    default: MockAnthropic,
    __resetCallCount: () => {
      callCount = 0;
    },
  };
});

const { callWithRetry } = await import("../src/eval/llm-client.js");
const Anthropic = (await import("@anthropic-ai/sdk")).default;

describe("callWithRetry", () => {
  it("should return text on successful call", async () => {
    // Reset mock to succeed immediately
    const client = new Anthropic({ apiKey: "test" }) as any;
    client.messages.create = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "hello world" }],
    });

    const result = await callWithRetry(client, "test prompt");
    expect(result).toBe("hello world");
  });

  it("should pass model and maxTokens options", async () => {
    const client = new Anthropic({ apiKey: "test" }) as any;
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    client.messages.create = createMock;

    await callWithRetry(client, "test", {
      model: "claude-haiku-4-5-20251001",
      maxTokens: 512,
    });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
      }),
    );
  });

  it("should use default model when not specified", async () => {
    const client = new Anthropic({ apiKey: "test" }) as any;
    const createMock = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    });
    client.messages.create = createMock;

    await callWithRetry(client, "test");

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-sonnet-4-20250514",
      }),
    );
  });

  it("should throw on non-retryable errors", async () => {
    const client = new Anthropic({ apiKey: "test" }) as any;
    client.messages.create = vi
      .fn()
      .mockRejectedValue(new Error("400 invalid request"));

    await expect(callWithRetry(client, "test")).rejects.toThrow(
      "400 invalid request",
    );
  });
});

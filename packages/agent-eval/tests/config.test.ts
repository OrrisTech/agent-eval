import { describe, expect, it } from "vitest";
import { AgentEvalConfig } from "../src/config/schema.js";

describe("AgentEvalConfig schema", () => {
  it("should parse a valid config", () => {
    const input = {
      agent: {
        name: "test-agent",
        version: "1.0.0",
        protocol: "mcp",
        endpoint: "npx @test/agent",
        capabilities: ["code-review"],
      },
      eval: {
        runs: 50,
      },
    };

    const result = AgentEvalConfig.parse(input);
    expect(result.agent.name).toBe("test-agent");
    expect(result.agent.protocol).toBe("mcp");
    expect(result.eval.runs).toBe(50);
    // Verify defaults are applied
    expect(result.eval.dimensions.capability.weight).toBe(0.3);
    expect(result.eval.dimensions.reliability.weight).toBe(0.25);
    expect(result.eval.dimensions.efficiency.weight).toBe(0.2);
    expect(result.eval.dimensions.safety.weight).toBe(0.15);
    expect(result.eval.dimensions.developer_experience.weight).toBe(0.1);
  });

  it("should reject config with missing required fields", () => {
    const input = {
      agent: {
        name: "test-agent",
        // missing protocol, endpoint, capabilities
      },
      eval: {},
    };

    expect(() => AgentEvalConfig.parse(input)).toThrow();
  });

  it("should reject invalid protocol", () => {
    const input = {
      agent: {
        name: "test-agent",
        protocol: "invalid",
        endpoint: "http://example.com",
        capabilities: ["general"],
      },
      eval: { runs: 10 },
    };

    expect(() => AgentEvalConfig.parse(input)).toThrow();
  });

  it("should reject empty capabilities array", () => {
    const input = {
      agent: {
        name: "test-agent",
        protocol: "mcp",
        endpoint: "npx @test/agent",
        capabilities: [],
      },
      eval: { runs: 10 },
    };

    expect(() => AgentEvalConfig.parse(input)).toThrow();
  });

  it("should accept optional pricing", () => {
    const input = {
      agent: {
        name: "test-agent",
        protocol: "rest",
        endpoint: "https://api.example.com/agent",
        capabilities: ["summarization"],
        pricing: {
          model: "per-task",
          estimated_cost: 0.05,
          currency: "USD",
        },
      },
      eval: { runs: 30 },
    };

    const result = AgentEvalConfig.parse(input);
    expect(result.agent.pricing?.model).toBe("per-task");
    expect(result.agent.pricing?.estimated_cost).toBe(0.05);
  });

  it("should accept optional judge config", () => {
    const input = {
      agent: {
        name: "test-agent",
        protocol: "mcp",
        endpoint: "npx @test/agent",
        capabilities: ["general"],
      },
      eval: {
        runs: 10,
        judge: { model: "claude-haiku-4-5-20251001" },
      },
    };

    const result = AgentEvalConfig.parse(input);
    expect(result.eval.judge?.model).toBe("claude-haiku-4-5-20251001");
  });

  it("should work without judge config (backward compatible)", () => {
    const input = {
      agent: {
        name: "test-agent",
        protocol: "mcp",
        endpoint: "npx @test/agent",
        capabilities: ["general"],
      },
      eval: { runs: 10 },
    };

    const result = AgentEvalConfig.parse(input);
    expect(result.eval.judge).toBeUndefined();
  });
});

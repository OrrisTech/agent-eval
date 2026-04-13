import { describe, expect, it } from "vitest";
import { buildReport } from "../src/report/generator.js";
import type { AgentEvalConfig } from "../src/config/schema.js";
import type { ExecutionResults } from "../src/eval/executor.js";
import type { AggregatedScores } from "../src/eval/scorer.js";
import type { ToolInfo } from "../src/protocols/base.js";

const mockConfig: AgentEvalConfig = {
  agent: {
    name: "test-agent",
    version: "1.0.0",
    protocol: "mcp",
    endpoint: "npx @test/agent",
    capabilities: ["code-review"],
  },
  eval: {
    runs: 10,
    dimensions: {
      capability: { weight: 0.3 },
      reliability: { weight: 0.25 },
      efficiency: { weight: 0.2 },
      safety: { weight: 0.15 },
      developer_experience: { weight: 0.1 },
    },
  },
};

const mockTools: ToolInfo[] = [
  { name: "review", description: "Reviews code", inputSchema: {} },
];

const mockExecution: ExecutionResults = {
  taskResults: [
    {
      task: {
        toolName: "review",
        args: {},
        expectedBehavior: "Review code",
        difficulty: "basic",
      },
      runs: [
        {
          task: {} as any,
          runIndex: 1,
          invocation: { success: true, output: "ok", latencyMs: 200 },
        },
      ],
      successCount: 1,
      successRate: 1,
      latency: { avg: 200, p50: 200, p95: 200, p99: 200, min: 200, max: 200 },
    },
  ],
  totalRuns: 1,
  totalSuccessful: 1,
  overallSuccessRate: 1,
  totalDurationMs: 500,
};

const mockScores: AggregatedScores = {
  capability: 85,
  reliability: 100,
  efficiency: 90,
  safety: 80,
  developerExperience: 70,
  overall: 87,
  taskScores: [],
};

describe("buildReport", () => {
  it("should build a complete report with all fields", () => {
    const report = buildReport(
      mockConfig,
      mockTools,
      mockExecution,
      mockScores
    );

    expect(report.meta.agentName).toBe("test-agent");
    expect(report.meta.protocol).toBe("mcp");
    expect(report.scores.overall).toBe(87);
    expect(report.execution.totalRuns).toBe(1);
    expect(report.tools).toHaveLength(1);
    expect(report.meta.evaluatedAt).toBeTruthy();
  });

  it("should compute aggregate latency from task results", () => {
    const report = buildReport(
      mockConfig,
      mockTools,
      mockExecution,
      mockScores
    );

    expect(report.execution.latency.avgMs).toBe(200);
    expect(report.execution.latency.p95Ms).toBe(200);
  });
});

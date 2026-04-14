import { z } from "zod/v4";

// Supported protocols for agent communication
export const ProtocolType = z.enum(["mcp", "a2a", "rest", "executable"]);
export type ProtocolType = z.infer<typeof ProtocolType>;

// Agent pricing model
const PricingSchema = z
  .object({
    model: z.enum(["free", "per-task", "per-token", "subscription"]),
    estimated_cost: z.number().optional(),
    currency: z.string().default("USD"),
  })
  .optional();

// Evaluation dimension with weight
const DimensionSchema = z.object({
  weight: z.number().min(0).max(1),
});

// Default weights for evaluation dimensions
const DEFAULT_DIMENSIONS = {
  capability: { weight: 0.3 },
  reliability: { weight: 0.25 },
  efficiency: { weight: 0.2 },
  safety: { weight: 0.15 },
  developer_experience: { weight: 0.1 },
};

// Judge configuration for LLM-as-judge scoring
const JudgeSchema = z
  .object({
    model: z.string().default("claude-sonnet-4-20250514"),
  })
  .optional();

// Full agent-eval.yaml config schema
export const AgentEvalConfig = z.object({
  agent: z.object({
    name: z.string().min(1),
    version: z.string().default("0.1.0"),
    protocol: ProtocolType,
    endpoint: z.string().min(1),
    capabilities: z.array(z.string()).min(1),
    pricing: PricingSchema,
  }),
  eval: z.object({
    runs: z.number().int().min(1).default(20),
    judge: JudgeSchema,
    dimensions: z
      .object({
        capability: DimensionSchema,
        reliability: DimensionSchema,
        efficiency: DimensionSchema,
        safety: DimensionSchema,
        developer_experience: DimensionSchema,
      })
      .default(DEFAULT_DIMENSIONS),
  }),
});

export type AgentEvalConfig = z.infer<typeof AgentEvalConfig>;

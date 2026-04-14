import { z } from "zod/v4";

// Task definition — what we ask the agent to do
export const TaskEvalConfig = z.object({
  task: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    success_criteria: z.array(z.string()).min(1),
  }),
  agent: z.object({
    type: z.enum(["cli", "api"]),
    // For CLI agents: the command to run
    command: z.string().min(1),
    // Arguments — {{description}} gets replaced with task description
    args: z.array(z.string()).default([]),
    // Working directory (isolated workspace for the agent)
    workdir: z.string().optional(),
  }),
  eval: z
    .object({
      timeout: z.number().int().min(10).default(300),
      runs: z.number().int().min(1).default(1),
    })
    .default({ timeout: 300, runs: 1 }),
});

export type TaskEvalConfig = z.infer<typeof TaskEvalConfig>;

// Public API for programmatic use (batch runner, etc.)

export { loadConfig } from "./config/loader.js";
export type { AgentEvalConfig } from "./config/schema.js";
export type {
  EvalOptions,
  EvalResult,
  ProgressCallback,
} from "./eval/engine.js";
export { runEvaluation } from "./eval/engine.js";
export type { EvalReport } from "./report/generator.js";

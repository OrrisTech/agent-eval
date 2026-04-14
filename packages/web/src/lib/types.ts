// Matches results/summary.json entries
export interface AgentSummary {
  name: string;
  category: string;
  score: number;
  capability: number;
  reliability: number;
  efficiency: number;
  safety: number;
  dx: number;
  tools: number;
  tasks: number;
  successRate: number;
  avgLatencyMs: number;
  status: "success" | "failed";
}

// Matches results/{name}/report.json
export interface AgentReport {
  meta: {
    agentName: string;
    agentVersion: string;
    protocol: string;
    endpoint: string;
    capabilities: string[];
    evalFrameworkVersion: string;
    judgeModel?: string;
    evaluatedAt: string;
  };
  tools: ToolInfo[];
  scores: {
    capability: number;
    reliability: number;
    efficiency: number;
    safety: number;
    developerExperience: number;
    overall: number;
    dxSubScores?: {
      schemaQuality: number;
      documentation: number;
      errorMessages: number;
      overall: number;
    };
    taskScores: TaskScore[];
  };
  execution: {
    totalTasks: number;
    totalRuns: number;
    totalSuccessful: number;
    overallSuccessRate: number;
    totalDurationMs: number;
    latency: {
      avgMs: number;
      p95Ms: number;
    };
  };
}

export interface ToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface TaskScore {
  toolName: string;
  difficulty: string;
  capabilityScore: number;
  safetyScore: number;
  reasoning: string;
}

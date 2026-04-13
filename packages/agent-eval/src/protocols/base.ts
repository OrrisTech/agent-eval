/**
 * Common interface for all protocol adapters (MCP, A2A, REST, etc.).
 * Each adapter knows how to connect to an agent, discover its capabilities,
 * invoke tools/tasks, and disconnect cleanly.
 */

/** Describes a single tool/capability exposed by the agent */
export interface ToolInfo {
  name: string;
  description: string;
  /** JSON Schema for the tool's input parameters */
  inputSchema: Record<string, unknown>;
}

/** Result of invoking a tool */
export interface InvocationResult {
  /** Whether the invocation completed without errors */
  success: boolean;
  /** The tool's output (text, JSON, etc.) */
  output: string;
  /** Wall-clock time in milliseconds */
  latencyMs: number;
  /** Error message if success is false */
  error?: string;
}

export interface ProtocolAdapter {
  /** Human-readable protocol name (e.g. "MCP", "A2A") */
  readonly protocol: string;

  /** Connect to the agent and prepare for invocations */
  connect(): Promise<void>;

  /** Discover all tools/capabilities the agent exposes */
  listTools(): Promise<ToolInfo[]>;

  /** Invoke a specific tool with the given arguments */
  invoke(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<InvocationResult>;

  /** Cleanly disconnect from the agent */
  disconnect(): Promise<void>;
}

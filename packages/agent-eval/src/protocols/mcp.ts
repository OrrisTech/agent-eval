import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { InvocationResult, ProtocolAdapter, ToolInfo } from "./base.js";

/**
 * MCP protocol adapter — spawns an MCP server as a child process via stdio,
 * discovers tools, and invokes them using the official MCP SDK.
 *
 * Supports two endpoint formats:
 *   - "npx @scope/package"      → command: "npx", args: ["@scope/package"]
 *   - "node ./path/to/server.js" → command: "node", args: ["./path/to/server.js"]
 */
export class McpAdapter implements ProtocolAdapter {
  readonly protocol = "MCP";

  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async connect(): Promise<void> {
    const { command, args } = this.parseEndpoint(this.endpoint);

    this.transport = new StdioClientTransport({
      command,
      args,
      stderr: "pipe",
    });

    this.client = new Client({
      name: "agent-eval",
      version: "0.1.0",
    });

    await this.client.connect(this.transport);
  }

  async listTools(): Promise<ToolInfo[]> {
    if (!this.client) {
      throw new Error("Not connected. Call connect() first.");
    }

    const result = await this.client.listTools();
    return result.tools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      inputSchema: (tool.inputSchema as Record<string, unknown>) || {},
    }));
  }

  async invoke(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<InvocationResult> {
    if (!this.client) {
      throw new Error("Not connected. Call connect() first.");
    }

    const start = performance.now();
    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });
      const latencyMs = Math.round(performance.now() - start);

      // Extract text content from MCP response
      const output = (result.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === "text")
        .map((c) => c.text || "")
        .join("\n");

      return {
        success: !result.isError,
        output,
        latencyMs,
        error: result.isError ? output : undefined,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        output: "",
        latencyMs,
        error: message,
      };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
    }
  }

  /**
   * Parse endpoint string like "npx @scope/pkg" or "node ./server.js"
   * into { command, args } for StdioClientTransport.
   */
  private parseEndpoint(endpoint: string): {
    command: string;
    args: string[];
  } {
    const parts = endpoint.split(/\s+/);
    if (parts.length === 0 || !parts[0]) {
      throw new Error(
        `Invalid endpoint: "${endpoint}". Expected format: "command arg1 arg2"`,
      );
    }
    return {
      command: parts[0],
      args: parts.slice(1),
    };
  }
}

import type { ProtocolType } from "../config/schema.js";
import type { ProtocolAdapter } from "./base.js";
import { McpAdapter } from "./mcp.js";

/**
 * Create the appropriate protocol adapter based on config.
 * Extensible — add new adapters here as we support more protocols.
 */
export function createAdapter(
  protocol: ProtocolType,
  endpoint: string,
): ProtocolAdapter {
  switch (protocol) {
    case "mcp":
      return new McpAdapter(endpoint);
    case "a2a":
      throw new Error("A2A protocol adapter not yet implemented (Phase 2).");
    case "rest":
      throw new Error("REST protocol adapter not yet implemented (Phase 2).");
    case "executable":
      throw new Error(
        "Executable protocol adapter not yet implemented (Phase 2).",
      );
    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}

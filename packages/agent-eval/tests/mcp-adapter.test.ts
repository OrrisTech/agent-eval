import { describe, expect, it } from "vitest";
import { McpAdapter } from "../src/protocols/mcp.js";

describe("McpAdapter", () => {
  it("should have protocol set to MCP", () => {
    const adapter = new McpAdapter("echo hello");
    expect(adapter.protocol).toBe("MCP");
  });

  it("should throw on invoke before connect", async () => {
    const adapter = new McpAdapter("echo hello");
    await expect(
      adapter.invoke("test", {})
    ).rejects.toThrow("Not connected");
  });

  it("should throw on listTools before connect", async () => {
    const adapter = new McpAdapter("echo hello");
    await expect(adapter.listTools()).rejects.toThrow("Not connected");
  });

  it("should parse simple endpoint", () => {
    // Access private method via casting for testing
    const adapter = new McpAdapter("npx @scope/pkg --flag");
    const parsed = (adapter as any).parseEndpoint("npx @scope/pkg --flag");
    expect(parsed.command).toBe("npx");
    expect(parsed.args).toEqual(["@scope/pkg", "--flag"]);
  });

  it("should parse single-word endpoint", () => {
    const adapter = new McpAdapter("mycommand");
    const parsed = (adapter as any).parseEndpoint("mycommand");
    expect(parsed.command).toBe("mycommand");
    expect(parsed.args).toEqual([]);
  });

  it("should throw on empty endpoint", () => {
    const adapter = new McpAdapter("");
    expect(() => (adapter as any).parseEndpoint("")).toThrow("Invalid endpoint");
  });
});

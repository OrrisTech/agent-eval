import { describe, expect, it } from "vitest";
import { createAdapter } from "../src/protocols/factory.js";
import { McpAdapter } from "../src/protocols/mcp.js";

describe("createAdapter", () => {
  it("should create McpAdapter for mcp protocol", () => {
    const adapter = createAdapter("mcp", "npx @test/server");
    expect(adapter).toBeInstanceOf(McpAdapter);
    expect(adapter.protocol).toBe("MCP");
  });

  it("should throw for a2a protocol (not yet implemented)", () => {
    expect(() => createAdapter("a2a", "https://example.com")).toThrow(
      "not yet implemented"
    );
  });

  it("should throw for rest protocol (not yet implemented)", () => {
    expect(() => createAdapter("rest", "https://api.example.com")).toThrow(
      "not yet implemented"
    );
  });

  it("should throw for executable protocol (not yet implemented)", () => {
    expect(() => createAdapter("executable", "./my-agent")).toThrow(
      "not yet implemented"
    );
  });
});

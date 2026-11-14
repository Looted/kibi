import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../src/server/tools.js";

/**
 * MCP checks a catalog operation's input against the same canonical contract
 * as the CLI JSON route, over a real MCP round trip: a field the contract does
 * not define and a value of the wrong type both come back as the coded
 * VALIDATION_FAILED envelope instead of being dropped or refused with a bare
 * protocol message. MCP-native tools keep the SDK's own validation.
 */
type ToolResult = {
  isError?: boolean;
  content?: readonly { type: string; text?: string }[];
  structuredContent?: {
    status?: string;
    error?: { code?: string; message?: string; retryable?: boolean };
  };
};

async function withClient(
  run: (client: Client) => Promise<void>,
): Promise<void> {
  const server = new McpServer({ name: "kibi-test", version: "0.0.0" });
  registerAllTools(server);
  const client = new Client({ name: "kibi-test-client", version: "0.0.0" });
  const [serverTransport, clientTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  try {
    await run(client);
  } finally {
    await Promise.all([client.close(), server.close()]);
  }
}

describe("MCP canonical input validation", () => {
  test("a field the operation contract does not define is refused, not dropped", async () => {
    await withClient(async (client) => {
      const result = (await client.callTool({
        name: "kb_plan_bootstrap",
        arguments: { maxCandidates: 1, legacyAlias: true },
      })) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.structuredContent?.status).toBe("error");
      expect(result.structuredContent?.error).toEqual({
        code: "VALIDATION_FAILED",
        message: "/ must NOT have additional properties: legacyAlias",
        retryable: false,
      });
    });
  });

  test("a value of the wrong type gets the coded envelope, not a protocol message", async () => {
    await withClient(async (client) => {
      const result = (await client.callTool({
        name: "kb_plan_bootstrap",
        arguments: { maxCandidates: "many" },
      })) as ToolResult;
      expect(result.isError).toBe(true);
      expect(result.structuredContent?.error?.code).toBe("VALIDATION_FAILED");
      expect(result.structuredContent?.error?.message).toBe(
        "/maxCandidates must be integer: integer",
      );
      expect(result.content?.[0]?.text).not.toContain("MCP error -32602");
    });
  });

  test("every contract violation is reported, separated by semicolons", async () => {
    await withClient(async (client) => {
      const result = (await client.callTool({
        name: "kb_plan_bootstrap",
        arguments: { maxCandidates: "many", legacyAlias: true },
      })) as ToolResult;
      expect(result.structuredContent?.error?.code).toBe("VALIDATION_FAILED");
      expect(result.structuredContent?.error?.message).toBe(
        "/ must NOT have additional properties: legacyAlias; /maxCandidates must be integer: integer",
      );
    });
  });

  test("the MCP request id is not part of the operation contract", async () => {
    await withClient(async (client) => {
      const result = (await client.callTool({
        name: "kb_skills",
        arguments: { action: "list", _requestId: "request-1" },
      })) as ToolResult;
      expect(result.structuredContent?.error?.code).not.toBe(
        "VALIDATION_FAILED",
      );
    });
  });

  test("an MCP-native tool keeps the SDK's own input validation", async () => {
    const previous = process.env.KIBI_MCP_OPTIONAL_TOOLS;
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
    try {
      await withClient(async (client) => {
        const result = (await client.callTool({
          name: "kb_job_status",
          arguments: { jobId: 7 },
        })) as ToolResult;
        expect(result.isError).toBe(true);
        expect(result.content?.[0]?.text).toContain("Input validation error");
      });
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
      else process.env.KIBI_MCP_OPTIONAL_TOOLS = previous;
    }
  });
});

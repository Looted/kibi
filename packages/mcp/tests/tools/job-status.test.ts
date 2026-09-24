import { describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "../../src/server/tools.js";

/**
 * kb_job_status is an MCP-server-native tool registered outside the canonical
 * operation catalog. These tests pin the observable call contract over a real
 * MCP round trip: annotations are published on tools/list (the annotations
 * object must land in the annotations slot, not the outputSchema slot, or the
 * SDK's output validation crashes the call with a `_zod` read of undefined),
 * and polling an unknown job returns a typed kibi.job.v1 receipt instead of
 * an error result.
 */
describe("kb_job_status tool", () => {
  test("polling an unknown job returns a typed receipt, not an error", async () => {
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
      const result = await client.callTool({
        name: "kb_job_status",
        arguments: { jobId: "job-kb_check-1-does-not-exist" },
      });
      expect(result.isError).toBeFalsy();
      const receipt = JSON.parse(result.content[0]?.text ?? "{}") as {
        kibiProtocol?: number;
        jobVersion?: string;
        jobId?: string;
        status?: string;
      };
      expect(receipt.kibiProtocol).toBe(1);
      expect(receipt.jobVersion).toBe("kibi.job.v1");
      expect(receipt.status).toBe("unknown");
    } finally {
      await Promise.all([server.close(), client.close()]);
    }
  });

  test("publishes tool annotations on tools/list", async () => {
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
      const { tools } = await client.listTools();
      const jobStatus = tools.find((tool) => tool.name === "kb_job_status");
      expect(jobStatus).toBeDefined();
      expect(jobStatus?.annotations?.title).toBe("Poll a Kibi background job");
      expect(jobStatus?.annotations?.readOnlyHint).toBe(true);
    } finally {
      await Promise.all([server.close(), client.close()]);
    }
  });
});

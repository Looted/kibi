import { afterEach, describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { getJob, jobSnapshot, startJob } from "../../src/server/jobs.js";
import { registerAllTools } from "../../src/server/tools.js";
import { setWorkspaceRouter } from "../../src/server/workspace-router.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent: Record<string, unknown>;
}>;

const previous = process.env.KIBI_MCP_OPTIONAL_TOOLS;
afterEach(() => {
  if (previous === undefined)
    Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
  else process.env.KIBI_MCP_OPTIONAL_TOOLS = previous;
});

function register(): Map<string, { config: unknown; handler: Handler }> {
  const tools = new Map<string, { config: unknown; handler: Handler }>();
  const server = {
    registerTool: (name: string, config: unknown, handler: Handler) => {
      tools.set(name, { config, handler });
    },
  } as unknown as McpServer;
  registerAllTools(server);
  return tools;
}

const UNKNOWN_JOB_ERROR =
  "No such job. Jobs are process-local and dropped on server restart; check the jobId or re-run the operation with async:true.";

describe("kb_job_status", () => {
  test("is registered only when opted in", () => {
    Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
    expect(register().has("kb_job_status")).toBe(false);
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
    const tool = register().get("kb_job_status");
    expect(tool).toBeDefined();
    const config = tool?.config as {
      description: string;
      annotations: unknown;
      inputSchema: { safeParse: (value: unknown) => { success: boolean } };
    };
    expect(config.description).toBe(
      "Poll a background job started with async:true (kb_check or kb_apply_plan async jobs). Returns the kibi.job.v1 state: running, succeeded (with the full result), or failed (with the error).",
    );
    expect(config.annotations).toStrictEqual({
      title: "Poll a Kibi background job",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    expect(config.inputSchema.safeParse({}).success).toBe(false);
    expect(config.inputSchema.safeParse({ jobId: "j" }).success).toBe(true);
    expect(
      (
        z.toJSONSchema(config.inputSchema as never) as {
          properties: unknown;
        }
      ).properties,
    ).toStrictEqual({
      jobId: {
        type: "string",
        description: "The jobId from the kibi.job.v1 receipt.",
      },
    });
  });

  test("unknown and empty job ids report an unknown job", async () => {
    setWorkspaceRouter(undefined);
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
    const tool = register().get("kb_job_status");
    for (const [args, jobId] of [
      [{ jobId: "missing" }, "missing"],
      [{ jobId: "" }, ""],
      [{ jobId: 5 }, ""],
    ] as const) {
      const result = await tool?.handler(args);
      const body = {
        kibiProtocol: 1,
        jobVersion: "kibi.job.v1",
        jobId,
        status: "unknown",
        error: UNKNOWN_JOB_ERROR,
      };
      expect(result?.content).toStrictEqual([
        { type: "text", text: JSON.stringify(body) },
      ]);
      expect(result?.structuredContent.data).toStrictEqual(body);
    }
  });

  test("a known job returns its snapshot", async () => {
    setWorkspaceRouter(undefined);
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
    const tool = register().get("kb_job_status");
    const receipt = startJob("kb_check", async () => ({ ok: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    const result = await tool?.handler({ jobId: receipt.jobId });
    const text = result?.content[0]?.text ?? "";
    const snapshot = JSON.parse(text) as Record<string, unknown>;
    expect(snapshot.jobId).toBe(receipt.jobId);
    expect(snapshot.status).toBe("succeeded");
    expect(snapshot.result).toStrictEqual({ ok: true });
    const job = getJob(receipt.jobId as string);
    if (job === undefined) throw new Error("job missing");
    expect(result?.content).toStrictEqual([
      { type: "text", text: JSON.stringify(jobSnapshot(job)) },
    ]);
  });
});

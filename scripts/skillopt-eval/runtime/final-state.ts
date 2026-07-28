import { createHash } from "node:crypto";
import { open, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import {
  type EvidenceBinding,
  EvidenceBindingError,
  type PredicateCaseSnapshot,
  decodePredicateCaseSnapshot,
} from "../contracts/evidence";
import { redactJsonRpcValue } from "./jsonrpc";

const FINAL_STATE_TOOLS = [
  "kb_query",
  "kb_status",
  "kb_check",
  "kb_graph",
] as const;
const FinalStateToolSchema = z.enum(FINAL_STATE_TOOLS);
const FinalStateRequestSchema = z
  .object({
    tool: FinalStateToolSchema,
    args: z.record(z.string(), z.unknown()),
  })
  .strict();
const FinalStateOptionsSchema = z
  .object({
    launch: z
      .object({
        command: z.string().min(1),
        args: z.array(z.string()),
        cwd: z.string().min(1),
        env: z.record(z.string(), z.string()).optional(),
      })
      .strict(),
    receiptPath: z.string().min(1),
    requests: z.array(FinalStateRequestSchema).min(1),
    timeoutMs: z.number().int().positive(),
  })
  .strict();

export type FinalStateOptions = Readonly<
  z.infer<typeof FinalStateOptionsSchema>
>;
// implements REQ-skillopt-predicate-first-requirements
export const FinalStateReceiptSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    workspaceRoot: z.string().min(1),
    requests: z.array(
      z
        .object({
          tool: FinalStateToolSchema,
          args: z.record(z.string(), z.unknown()),
          result: z.unknown(),
          resultHash: z.string().regex(/^[a-f0-9]{64}$/),
        })
        .strict(),
    ),
  })
  .strict();
export type FinalStateReceipt = Readonly<
  z.infer<typeof FinalStateReceiptSchema>
>;

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

async function writeDurableJson(path: string, value: unknown): Promise<void> {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  const file = await open(temporary, "r");
  try {
    await file.sync();
  } finally {
    await file.close();
  }
  await rename(temporary, path);
  const directory = await open(dirname(path), "r");
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

// implements REQ-skillopt-predicate-first-requirements
export function decodeFinalStatePredicateSnapshot(
  text: string,
  binding: EvidenceBinding,
): PredicateCaseSnapshot {
  let parsed: FinalStateReceipt;
  try {
    parsed = FinalStateReceiptSchema.parse(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof z.ZodError) {
      throw new EvidenceBindingError("malformed-snapshot");
    }
    throw error;
  }
  const snapshots = parsed.requests.filter(({ tool }) => tool === "kb_query");
  if (snapshots.length !== 1) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const snapshot = snapshots[0];
  if (snapshot === undefined) {
    throw new EvidenceBindingError("malformed-snapshot");
  }
  const resultHash = createHash("sha256")
    .update(JSON.stringify(snapshot.result))
    .digest("hex");
  if (resultHash !== snapshot.resultHash) {
    throw new EvidenceBindingError("snapshot-hash");
  }
  return decodePredicateCaseSnapshot(snapshot.result, binding);
}

// implements REQ-skillopt-codex-optimization
export async function runIndependentFinalState(
  rawOptions: FinalStateOptions,
): Promise<FinalStateReceipt> {
  const options = FinalStateOptionsSchema.parse(rawOptions);
  const transport = new StdioClientTransport({
    command: options.launch.command,
    args: [...options.launch.args],
    cwd: options.launch.cwd,
    env: options.launch.env ?? stringEnvironment(process.env),
    stderr: "pipe",
  });
  const client = new Client({
    name: "skillopt-independent-final-state",
    version: "1.0.0",
  });
  const results: FinalStateReceipt["requests"][number][] = [];
  try {
    await client.connect(transport, { timeout: options.timeoutMs });
    const advertised = await client.listTools(undefined, {
      timeout: options.timeoutMs,
    });
    const toolNames = new Set(advertised.tools.map(({ name }) => name));
    for (const request of options.requests) {
      if (!toolNames.has(request.tool)) {
        throw new TypeError(`final_state_tool_unavailable:${request.tool}`);
      }
      const rawResult = await client.callTool(
        { name: request.tool, arguments: request.args },
        undefined,
        { timeout: options.timeoutMs },
      );
      const result = redactJsonRpcValue(rawResult);
      results.push({
        tool: request.tool,
        args: request.args,
        result,
        resultHash: createHash("sha256")
          .update(JSON.stringify(result))
          .digest("hex"),
      });
    }
  } finally {
    await client.close();
  }
  const receipt: FinalStateReceipt = {
    schemaVersion: "1.0.0",
    workspaceRoot: resolve(options.launch.cwd),
    requests: results,
  };
  await writeDurableJson(options.receiptPath, receipt);
  return receipt;
}

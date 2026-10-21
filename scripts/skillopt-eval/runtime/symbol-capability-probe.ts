import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { RequiredMcpStartupError } from "./canary-errors";
import { FIXTURE_BRANCH, fixtureCliEnv } from "./fixture-kb-setup";
import { stageKibiMcpRuntime } from "./staged-mcp";

const STARTUP_TIMEOUT_MS = 15_000;
const TOOL_TIMEOUT_MS = 120_000;
const MAX_DETAIL_LENGTH = 400;
const PROBE_TELEMETRY = {
  is_autonomous: true,
  reasoning: "Evaluator readiness probe of the staged symbol runtime.",
  confidence_score: 1,
  attempt_number: 1,
  missing_context: "",
} as const;

/** The seeded fixture's requirement, source file and exported symbol. */
export type SymbolProbeSeed = Readonly<{
  requirementId: string;
  sourceFile: string;
  symbolTitle: string;
}>;

const SEEDED_FRESH_FIXTURE: SymbolProbeSeed = {
  requirementId: "REQ-SETUP-BASE",
  sourceFile: "src/fixture.ts",
  symbolTitle: "fixtureFamily",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resultText(result: unknown): string {
  if (!isRecord(result) || !Array.isArray(result.content)) return "";
  return result.content
    .map((entry) =>
      isRecord(entry) && typeof entry.text === "string" ? entry.text : "",
    )
    .join(" ");
}

/**
 * Returns a failure detail, or null when a tool result is a success envelope.
 * A dry-run upsert must also report the payload as valid: the staged runtime
 * reports module-load failures as invalid payloads.
 */
// implements REQ-skillopt-codex-optimization
export function symbolProbeFailure(
  tool: "kb_upsert" | "kb_coverage",
  result: unknown,
): string | null {
  const content =
    isRecord(result) && isRecord(result.structuredContent)
      ? result.structuredContent
      : null;
  const data = content !== null && isRecord(content.data) ? content.data : null;
  const succeeded =
    isRecord(result) &&
    result.isError !== true &&
    content?.status === "success" &&
    (tool !== "kb_upsert" || data?.valid === true);
  if (succeeded) return null;
  const detail = resultText(result).replaceAll("\n", " ").trim();
  return `symbol_capability:${tool}:${(detail || "no_detail").slice(0, MAX_DETAIL_LENGTH)}`;
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

/**
 * Stages the Kibi MCP runtime exactly as an evaluation cell does and asks it
 * for a symbol dry-run upsert and a coverage report against a seeded fixture
 * knowledge base. Symbol extraction loads modules the bundle cannot inline, so
 * a runtime that starts and lists tools can still fail every symbol write and
 * every coverage read; this probe rejects such a runtime before paid work.
 * The fixture's own engine must already be stopped.
 */
// implements REQ-skillopt-codex-optimization
export async function probeStagedSymbolCapability(
  workspaceTarget: string,
  sourceWorktree: string,
  seed: SymbolProbeSeed = SEEDED_FRESH_FIXTURE,
): Promise<void> {
  const privateEvidence = join(workspaceTarget, ".runtime", "probe-private");
  await mkdir(privateEvidence, { recursive: true, mode: 0o700 });
  const launch = await stageKibiMcpRuntime(
    { target: workspaceTarget, privateEvidence },
    sourceWorktree,
  );
  const transport = new StdioClientTransport({
    command: launch.command,
    args: [...launch.args],
    cwd: launch.cwd,
    env: stringEnvironment({
      ...fixtureCliEnv(workspaceTarget),
      KIBI_BRANCH: FIXTURE_BRANCH,
    }),
    stderr: "pipe",
  });
  const client = new Client({
    name: "skillopt-symbol-capability-probe",
    version: "1.0.0",
  });
  const call = async (
    tool: "kb_upsert" | "kb_coverage",
    args: Record<string, unknown>,
  ): Promise<void> => {
    let result: unknown;
    try {
      result = await client.callTool(
        {
          name: tool,
          arguments: { ...args, _diagnostic_telemetry: PROBE_TELEMETRY },
        },
        undefined,
        { timeout: TOOL_TIMEOUT_MS },
      );
    } catch (error) {
      throw new RequiredMcpStartupError(
        `symbol_capability:${tool}:${error instanceof Error ? error.name : "unknown"}`,
        { cause: error },
      );
    }
    const failure = symbolProbeFailure(tool, result);
    if (failure !== null) throw new RequiredMcpStartupError(failure);
  };
  try {
    try {
      await client.connect(transport, { timeout: STARTUP_TIMEOUT_MS });
    } catch (error) {
      throw new RequiredMcpStartupError("symbol_capability:startup", {
        cause: error,
      });
    }
    // A new symbol with a relationship runs source extraction; an unchanged
    // existing symbol can short-circuit it.
    const symbolId = "SYM-READINESS-PROBE";
    await call("kb_upsert", {
      type: "symbol",
      id: symbolId,
      properties: {
        title: seed.symbolTitle,
        status: "active",
        sourceFile: seed.sourceFile,
      },
      relationships: [
        { type: "implements", from: symbolId, to: seed.requirementId },
      ],
      dryRun: true,
    });
    await call("kb_coverage", {});
  } finally {
    await client.close();
  }
}

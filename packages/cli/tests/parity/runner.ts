import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { isolatedCliSandboxEnv } from "../helpers/isolated-env.js";

// implements REQ-kibi-operation-interface-parity
export type CliResult = {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

// implements REQ-kibi-operation-interface-parity
export type McpResult = {
  readonly structuredContent: unknown;
  readonly error?: unknown;
};

// implements REQ-kibi-operation-interface-parity
export type ComparisonResult = {
  readonly parity: boolean;
  readonly diff?: string;
};

type McpAdapterModule = {
  readonly runMcpOperation: (
    workspaceRoot: string,
    opName: string,
    input: unknown,
  ) => Promise<McpResult>;
};

const REPOSITORY_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_BIN = path.join(REPOSITORY_ROOT, "packages/cli/bin/kibi");

function isMcpAdapterModule(value: unknown): value is McpAdapterModule {
  return (
    value !== null &&
    typeof value === "object" &&
    "runMcpOperation" in value &&
    typeof value.runMcpOperation === "function"
  );
}

// implements REQ-kibi-operation-interface-parity
export async function runCliJsonRoute(
  workspaceRoot: string,
  opName: string,
  input: unknown,
): Promise<CliResult> {
  const inputRoot = await mkdtemp(path.join(os.tmpdir(), "kibi-parity-input-"));
  const inputPath = path.join(inputRoot, "input.json");
  await writeFile(inputPath, JSON.stringify(input), "utf8");
  try {
    const child = Bun.spawn(
      [
        "bun",
        "run",
        KIBI_BIN,
        opName.replaceAll(" ", "-"),
        "--input",
        inputPath,
      ],
      {
        cwd: workspaceRoot,
        env: isolatedCliSandboxEnv({ KIBI_WORKSPACE: workspaceRoot }),
        stdout: "pipe",
        stderr: "pipe",
      },
    );
    const stdoutPromise = new Response(child.stdout).text();
    const stderrPromise = new Response(child.stderr).text();
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      stdoutPromise,
      stderrPromise,
    ]);
    return { exitCode, stdout, stderr };
  } finally {
    await rm(inputRoot, { recursive: true, force: true });
  }
}

// implements REQ-kibi-operation-interface-parity
export async function runMCPAdapter(
  workspaceRoot: string,
  opName: string,
  input: unknown,
): Promise<McpResult> {
  const adapterSpecifier = ["../../../mcp/tests/parity", "adapter.js"].join(
    "/",
  );
  const adapter: unknown = await import(adapterSpecifier);
  if (!isMcpAdapterModule(adapter)) {
    throw new TypeError("Invalid MCP parity adapter module");
  }
  const originalKibiBranch = process.env.KIBI_BRANCH;
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  try {
    return await adapter.runMcpOperation(workspaceRoot, opName, input);
  } finally {
    if (originalKibiBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalKibiBranch;
    }
  }
}

function semanticCliResult(result: CliResult): unknown {
  if (result.exitCode === 0) {
    return JSON.parse(result.stdout);
  }
  return {
    error: {
      category: result.exitCode === 2 ? "validation" : "operation",
    },
  };
}

function semanticMcpResult(result: McpResult): unknown {
  if (result.error === undefined) {
    return result.structuredContent;
  }
  const serialized = JSON.stringify(result.error);
  return {
    error: {
      category: /invalid|validation|required/i.test(serialized)
        ? "validation"
        : "operation",
    },
  };
}

// implements REQ-kibi-operation-interface-parity
export function compareResults(
  cli: CliResult,
  mcp: McpResult,
  normalizer: (result: unknown) => unknown,
): ComparisonResult {
  const normalizedCli = normalizer(semanticCliResult(cli));
  const normalizedMcp = normalizer(semanticMcpResult(mcp));
  if (Bun.deepEquals(normalizedCli, normalizedMcp)) {
    return { parity: true };
  }
  return {
    parity: false,
    diff: `CLI:\n${JSON.stringify(normalizedCli, null, 2)}\nMCP:\n${JSON.stringify(normalizedMcp, null, 2)}`,
  };
}

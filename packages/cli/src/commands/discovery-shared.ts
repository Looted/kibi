import path from "node:path";
import { EngineClient } from "../engine.js";
import { getBranchOverride } from "../env.js";
import { PrologProcess, resolveKbPlPath } from "../prolog.js";
import { escapeAtom } from "../prolog/codec.js";
import {
  type OperationSpec,
  type RuntimeOptions,
  executeOperation,
} from "../public/operations/index.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { safeCleanupProlog } from "../utils/prolog-cleanup.js";
import { renderDiscoveryTable } from "./discovery-table.js";
import { getCurrentBranch } from "./init-helpers.js";

export { renderCoverageTable } from "./discovery-table.js";

export interface DiscoveryCommandOptions {
  format?: "json" | "table";
}

/** Dependencies that can be injected for testing. */
export interface DiscoveryDeps {
  createProlog: (opts: { timeout: number }) => PrologProcess;
  resolveKbPl: typeof resolveKbPlPath;
}

// implements REQ-kibi-operation-interface-parity
export async function executeReportingSpec<TInput, TOutput>(
  spec: OperationSpec<TInput, TOutput>,
  input: TInput,
  options: RuntimeOptions = {},
) {
  return executeOperation(createCliRuntime(options), spec, input, options);
}

// implements REQ-003
export async function withAttachedBranchProlog<T>(
  callback: (prolog: PrologProcess) => Promise<T>,
  deps?: Partial<DiscoveryDeps>,
): Promise<T> {
  const usesEngine = deps?.createProlog === undefined;
  const createProlog =
    deps?.createProlog ?? ((opts) => new PrologProcess(opts));
  let prolog: PrologProcess | null = null;
  let engine: EngineClient | null = null;
  let attached = false;
  let branchName: string;

  try {
    try {
      branchName =
        getBranchOverride() || (await getCurrentBranch(process.cwd()));
    } catch {
      branchName = getBranchOverride() || "main";
    }

    if (usesEngine) {
      engine = new EngineClient({
        workspaceRoot: process.cwd(),
        branch: branchName,
        timeout: 120_000,
      });
      await engine.start();
      prolog = engine as unknown as PrologProcess;
    } else {
      prolog = createProlog({ timeout: 120000 });
      await prolog.start();
    }
    await prolog.query(
      "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
    );

    if (!usesEngine) {
      const kbPath = path.join(process.cwd(), ".kb/branches", branchName);
      const attachResult = await prolog.query(
        `kb_attach('${escapeAtom(kbPath)}')`,
      );
      if (!attachResult.success) {
        throw new Error(
          `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
        );
      }
      attached = true;
    }

    return await callback(prolog);
  } finally {
    if (usesEngine) {
      await engine?.terminate();
    } else {
      await safeCleanupProlog(prolog);
    }
  }
}

// implements REQ-003
// implements REQ-003
export async function resolveCurrentKbPath(): Promise<string> {
  let branch: string;
  try {
    branch = getBranchOverride() || (await getCurrentBranch(process.cwd()));
  } catch {
    branch = getBranchOverride() || "main";
  }

  return path.join(process.cwd(), ".kb/branches", branch);
}

// implements REQ-003
export function resolveCoreModulePath(
  fileName: string,
  deps?: Partial<DiscoveryDeps>,
): string {
  const resolve = deps?.resolveKbPl ?? resolveKbPlPath;
  return path.join(path.dirname(resolve()), fileName);
}

// implements REQ-003
export async function runJsonModuleQuery<T>(
  prolog: PrologProcess,
  fileName: string,
  goal: string,
  errorLabel: string,
  kbPath?: string,
  deps?: Partial<DiscoveryDeps>,
): Promise<T> {
  const modulePath = escapeAtom(
    resolveCoreModulePath(fileName, deps).replace(/\\/g, "/"),
  );
  const wrappedGoal = kbPath
    ? `(use_module('${modulePath}'), kb_attach('${escapeAtom(kbPath)}'), ${goal}, kb_detach)`
    : `(use_module('${modulePath}'), ${goal})`;
  const result = await prolog.query(wrappedGoal);

  if (!result.success) {
    throw new Error(`${errorLabel}: ${result.error || "Unknown error"}`);
  }

  const rawJson = result.bindings.JsonString;
  if (!rawJson) {
    throw new Error(`${errorLabel}: missing JsonString binding`);
  }

  let parsed: unknown = JSON.parse(rawJson);
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  return parsed as T;
}

// implements REQ-003
export function printDiscoveryResult(
  format: "json" | "table" | undefined,
  structured: unknown,
  fallbackText: string,
): void {
  if (format === "json") {
    console.log(JSON.stringify(structured, null, 2));
    return;
  }

  const rendered = renderDiscoveryTable(structured);
  console.log(rendered || fallbackText);
}

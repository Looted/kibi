import path from "node:path";
import { EngineClient } from "../engine.js";
import { type PrologProcess, resolveKbPlPath } from "../prolog.js";
import { escapeAtom } from "../prolog/codec.js";
import {
  type RuntimeOptions,
  executeOperation,
} from "../public/operations/runtime-types.js";
import type { OperationSpec } from "../public/operations/types.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";
import { refreshDetachedSnapshot } from "../runtime/detached-snapshot.js";
import {
  resolveBranchAttachment,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";
import { safeCleanupProlog } from "../utils/prolog-cleanup.js";
import { renderDiscoveryTable } from "./discovery-table.js";

export { renderCoverageTable } from "./discovery-table.js";

export interface DiscoveryCommandOptions {
  format?: "json" | "table";
}

/** Dependencies that can be injected for testing. */
export interface DiscoveryDeps {
  createProlog: (opts: { timeout: number }) => PrologProcess;
  resolveKbPl: typeof resolveKbPlPath;
}

export async function executeReportingSpec<TInput, TOutput>(
  spec: OperationSpec<TInput, TOutput>,
  input: TInput,
  options: RuntimeOptions = {},
) {
  return executeOperation(createCliRuntime(options), spec, input, options);
}

export async function withAttachedBranchProlog<T>(
  callback: (prolog: PrologProcess) => Promise<T>,
  deps?: Partial<DiscoveryDeps>,
): Promise<T> {
  // Without an injected process the branch engine serves the queries.
  const createProlog = deps?.createProlog;
  let prolog: PrologProcess | null = null;
  let engine: EngineClient | null = null;

  try {
    // Callers only read: a detached HEAD reads its read-only snapshot.
    const attachment = resolveReadBranchAttachment(process.cwd());
    if ("error" in attachment) throw new Error(attachment.error);
    if (attachment.readOnly !== undefined) {
      console.warn(`[KIBI] ${attachment.readOnly.notice}`);
      await refreshDetachedSnapshot(process.cwd(), attachment);
    }

    if (createProlog === undefined) {
      engine = new EngineClient({
        workspaceRoot: process.cwd(),
        branch: attachment.kbBranch,
        timeout: 120_000,
      });
      await engine.start();
      prolog = engine as unknown as PrologProcess;
    } else {
      prolog = createProlog({ timeout: 120000 });
      await prolog.start();
      const attachResult = await prolog.query(
        `kb_attach('${escapeAtom(attachment.storePath)}')`,
      );
      if (!attachResult.success) {
        throw new Error(
          `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
        );
      }
    }

    return await callback(prolog);
  } finally {
    if (createProlog === undefined) {
      await engine?.terminate();
    } else {
      await safeCleanupProlog(prolog);
    }
  }
}

export async function resolveCurrentKbPath(): Promise<string> {
  const attachment = resolveBranchAttachment(process.cwd());
  if ("error" in attachment) throw new Error(attachment.error);
  return attachment.storePath;
}

export function resolveCoreModulePath(
  fileName: string,
  deps?: Partial<DiscoveryDeps>,
): string {
  const resolve = deps?.resolveKbPl ?? resolveKbPlPath;
  return path.join(path.dirname(resolve()), fileName);
}

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

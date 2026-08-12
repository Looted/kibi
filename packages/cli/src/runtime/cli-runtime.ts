import path from "node:path";

import { EngineClient } from "../engine.js";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../public/operations/node-ports.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "../public/operations/runtime-types.js";
import { resolveActiveBranch } from "../utils/branch-resolver.js";

type ManagedPrologPort = PrologPort & {
  readonly start?: () => Promise<void>;
  readonly terminate?: () => Promise<void>;
};

function createDefaultProlog(root: string, branch: string): ManagedPrologPort {
  const engine = new EngineClient({
    workspaceRoot: root,
    branch,
    timeout: 120_000,
  });
  // Keep the concrete client so sync and operation runtimes can use its
  // batched queue, storage controls, and cancellation-aware socket lifecycle.
  return engine as unknown as ManagedPrologPort;
}

function workspaceRoot(options: RuntimeOptions): string {
  const envRoot =
    process.env.KIBI_WORKSPACE ??
    process.env.KIBI_PROJECT_ROOT ??
    process.env.KIBI_ROOT;
  return path.resolve(options.workspaceRoot ?? envRoot ?? process.cwd());
}

function quoteProlog(value: string): string {
  return value.replaceAll("'", "''");
}

// implements REQ-kibi-operation-interface-parity
export function createCliRuntime(
  options: RuntimeOptions = {},
): OperationRuntime {
  const ownedPrologs = new WeakMap<OperationContext, ManagedPrologPort>();

  return {
    open: async (spec, invocationOptions = {}) => {
      const merged = {
        ...options,
        ...invocationOptions,
      } satisfies RuntimeOptions;
      const root = workspaceRoot(merged);
      const signal = merged.signal ?? new AbortController().signal;
      const clock = merged.clock ?? (() => new Date());
      const git = merged.git ?? nodeGit;
      const contextBase = {
        workspaceRoot: root,
        signal,
        clock,
        fs: merged.fs ?? nodeFilesystem,
        git,
        net: merged.net ?? nodeNetwork,
      } satisfies Omit<OperationContext, "prolog">;

      if (!spec.requiresProlog) {
        return contextBase;
      }

      let branch = process.env.KIBI_BRANCH?.trim();
      if (!branch) {
        const resolved = resolveActiveBranch(root);
        if ("error" in resolved) {
          const isNonGitContext =
            resolved.code === "NOT_A_GIT_REPO" ||
            resolved.code === "GIT_NOT_AVAILABLE";
          if (isNonGitContext) {
            branch = "main";
          } else {
            await (
              merged.prolog as ManagedPrologPort | undefined
            )?.terminate?.();
            throw new Error(
              `Failed to resolve active branch: ${resolved.error}`,
            );
          }
        } else {
          branch = resolved.branch;
        }
      }
      const usesEngine = merged.prolog === undefined;
      const prolog: ManagedPrologPort =
        merged.prolog ?? createDefaultProlog(root, branch);
      try {
        await prolog.start?.();
        const kbPath = path.join(root, ".kb", "branches", branch);
        if (!usesEngine) {
          const attached = await prolog.query(
            `kb_attach('${quoteProlog(kbPath)}')`,
          );
          if (!attached.success) {
            throw new Error(attached.error ?? "Failed to attach branch KB");
          }
        }
        const context: OperationContext = { ...contextBase, prolog };
        ownedPrologs.set(context, prolog);
        return context;
      } catch (error) {
        await prolog.terminate?.();
        throw error;
      }
    },
    afterSuccess: async () => undefined,
    close: async (context) => {
      await ownedPrologs.get(context)?.terminate?.();
      ownedPrologs.delete(context);
    },
  };
}

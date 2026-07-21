import path from "node:path";

import { PrologProcess } from "../prolog.js";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../public/operations/node-ports.js";
import type {
  OperationContext,
  OperationRuntime,
  PrologPort,
  PrologQueryResult,
  RuntimeOptions,
} from "../public/operations/runtime-types.js";

type ManagedPrologPort = PrologPort & {
  readonly start?: () => Promise<void>;
  readonly terminate?: () => Promise<void>;
};

function createDefaultProlog(): ManagedPrologPort {
  const process = new PrologProcess({ timeout: 120_000 });
  let lastResult: PrologQueryResult | null = null;
  return {
    start: () => process.start(),
    query: async (goal) => {
      lastResult = await process.query(goal);
      return lastResult;
    },
    nextSolution: async () => {
      const result = lastResult;
      lastResult = null;
      return result;
    },
    save: () => process.query("kb_save"),
    terminate: () => process.terminate(),
  };
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

      const prolog: ManagedPrologPort = merged.prolog ?? createDefaultProlog();
      try {
        await prolog.start?.();
        let branch = process.env.KIBI_BRANCH?.trim();
        if (!branch) {
          try {
            branch = await git.revParse("--abbrev-ref", "HEAD");
          } catch {
            branch = "main";
          }
        }
        if (branch === "master") branch = "main";
        const kbPath = path.join(root, ".kb", "branches", branch);
        const attached = await prolog.query(
          `kb_attach('${quoteProlog(kbPath)}')`,
        );
        if (!attached.success) {
          throw new Error(attached.error ?? "Failed to attach branch KB");
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

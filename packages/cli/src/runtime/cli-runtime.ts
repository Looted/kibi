import path from "node:path";

import { EngineClient } from "../engine.js";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../public/operations/node-ports.js";
import type {
  EngineCommandV1,
  EnginePort,
  OperationContext,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "../public/operations/runtime-types.js";
import { resolveBranchAttachment } from "../utils/branch-resolver.js";

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

function bindSignal(
  port: ManagedPrologPort,
  signal: AbortSignal,
): ManagedPrologPort {
  return new Proxy(port, {
    get(target, property, receiver) {
      if (property === "query") {
        return (goal: string) => target.query(goal, signal);
      }
      if (property === "queryEntities") {
        return (
          input: Parameters<NonNullable<PrologPort["queryEntities"]>>[0],
        ) => target.queryEntities?.(input, signal);
      }
      if (property === "searchEntities") {
        return (
          input: Parameters<NonNullable<PrologPort["searchEntities"]>>[0],
        ) => target.searchEntities?.(input, signal);
      }
      if (property === "save") {
        return () => target.save(signal);
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function enginePort(
  port: ManagedPrologPort,
  signal: AbortSignal,
): EnginePort | undefined {
  const candidate = port as ManagedPrologPort & {
    command?: <T>(command: unknown, signal?: AbortSignal) => Promise<T>;
    execute?: <T>(command: unknown, signal?: AbortSignal) => Promise<T>;
  };
  const execute = candidate.execute ?? candidate.command;
  if (!execute) return undefined;
  return {
    execute: <T>(command: EngineCommandV1, commandSignal?: AbortSignal) =>
      execute.call(port, command, commandSignal ?? signal) as Promise<T>,
  };
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
        // Read-only operations such as status may choose to use an explicitly
        // supplied test or host Prolog port, but must not force engine startup.
        // That keeps pre-init and damaged-store diagnostics non-mutating.
        let lazyProlog: ManagedPrologPort | undefined = merged.prolog as
          | ManagedPrologPort
          | undefined;
        const lazyContext: { current?: OperationContext } = {};
        const ensureProlog = async (): Promise<PrologPort> => {
          if (lazyProlog !== undefined) return bindSignal(lazyProlog, signal);
          const attachment = resolveBranchAttachment(root);
          if ("error" in attachment) {
            throw new Error(
              `Failed to resolve active branch: ${attachment.error}`,
            );
          }
          const engine = createDefaultProlog(root, attachment.kbBranch);
          await engine.start?.();
          lazyProlog = engine;
          if (lazyContext.current !== undefined)
            ownedPrologs.set(lazyContext.current, engine);
          return bindSignal(engine, signal);
        };
        const lazyEngine = merged.prolog
          ? enginePort(merged.prolog as ManagedPrologPort, signal)
          : undefined;
        const context: OperationContext = {
          ...contextBase,
          ...(merged.prolog
            ? { prolog: bindSignal(merged.prolog as ManagedPrologPort, signal) }
            : {}),
          ...(lazyEngine ? { engine: lazyEngine } : {}),
          ensureProlog,
        };
        lazyContext.current = context;
        return context;
      }

      const attachment = resolveBranchAttachment(root);
      if ("error" in attachment) {
        const isNonGitContext =
          attachment.code === "NOT_A_GIT_REPO" ||
          attachment.code === "GIT_NOT_AVAILABLE";
        await (merged.prolog as ManagedPrologPort | undefined)?.terminate?.();
        throw new Error(
          isNonGitContext
            ? "Kibi requires an active Git branch outside a repository; set KIBI_BRANCH explicitly for a standalone workspace."
            : `Failed to resolve active branch: ${attachment.error}`,
        );
      }
      if (attachment.migrationRequired) {
        console.warn(
          `[KIBI] Legacy branch attachment: Git '${attachment.gitBranch}' is reading KB '${attachment.kbBranch}'. Migrate with 'kibi branch migrate --from ${attachment.kbBranch} --to ${attachment.gitBranch} --apply'; writes are blocked until then.`,
        );
      }
      const usesEngine = merged.prolog === undefined;
      const rawProlog: ManagedPrologPort =
        merged.prolog ?? createDefaultProlog(root, attachment.kbBranch);
      const prolog = bindSignal(rawProlog, signal);
      try {
        await prolog.start?.();
        const kbPath = attachment.storePath;
        if (!usesEngine) {
          const attached = await prolog.query(
            `kb_attach('${quoteProlog(kbPath)}')`,
          );
          if (!attached.success) {
            throw new Error(attached.error ?? "Failed to attach branch KB");
          }
        }
        const attachedEngine = enginePort(rawProlog, signal);
        const context: OperationContext = {
          ...contextBase,
          prolog,
          ...(attachedEngine ? { engine: attachedEngine } : {}),
          branchAttachment: attachment,
        };
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

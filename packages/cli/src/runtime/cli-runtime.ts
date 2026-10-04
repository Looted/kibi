import path from "node:path";

import { retryAttachAfterBreakingStaleLock } from "../prolog/store-lock.js";

import { EngineClient } from "../engine.js";
import {
  type CapabilityRegistry,
  CapabilityRegistryCache,
  ensureCapabilityRegistry,
} from "../plugins/registry.js";
import {
  nodeFilesystem,
  nodeGit,
  nodeNetwork,
} from "../public/operations/node-ports.js";
import type {
  EngineCommandV1,
  EnginePort,
  OperationContext,
  OperationPlugins,
  OperationRuntime,
  PrologPort,
  RuntimeOptions,
} from "../public/operations/runtime-types.js";
import {
  type BranchAttachment,
  type BranchResolutionError,
  resolveReadBranchAttachment,
} from "../utils/branch-resolver.js";
import {
  declaresWriteEffect,
  refreshDetachedSnapshot,
  resolveOperationAttachment,
} from "./detached-snapshot.js";

export function attachmentFailureMessage(
  attachment: BranchResolutionError,
): string {
  const isNonGitContext =
    attachment.code === "NOT_A_GIT_REPO" ||
    attachment.code === "GIT_NOT_AVAILABLE";
  return isNonGitContext
    ? "Kibi requires an active Git branch outside a repository; set KIBI_BRANCH explicitly for a standalone workspace."
    : `Failed to resolve active branch: ${attachment.error}`;
}

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

function resolvePluginsOption(
  plugins: OperationPlugins | undefined,
): (() => Promise<CapabilityRegistry>) | undefined {
  if (plugins === undefined) return undefined;
  if (typeof plugins === "function") return plugins;
  return async () => plugins;
}

/**
 * The detached-HEAD snapshot attachment for a KB read that may run without
 * Prolog (status), or undefined when the checkout resolves normally (that
 * path keeps its lazy, non-mutating behavior). A failed snapshot compile is
 * reported but not fatal, so status can still diagnose the snapshot store.
 */
// implements REQ-branch-store-recovery-v4
async function resolveDetachedReadAttachment(
  root: string,
): Promise<BranchAttachment | undefined> {
  const attachment = resolveReadBranchAttachment(root);
  if ("error" in attachment || attachment.readOnly === undefined) {
    return undefined;
  }
  console.warn(`[KIBI] ${attachment.readOnly.notice}`);
  try {
    await refreshDetachedSnapshot(root, attachment);
  } catch (error) {
    console.warn(
      `[KIBI] ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return attachment;
}

// implements REQ-kibi-operation-interface-parity
export function createCliRuntime(
  options: RuntimeOptions = {},
): OperationRuntime {
  const ownedPrologs = new WeakMap<OperationContext, ManagedPrologPort>();
  // Per-runtime cache — not a process-global singleton.
  const pluginCache = new CapabilityRegistryCache();

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
      const injectedPlugins = resolvePluginsOption(merged.plugins);
      const ensurePlugins = async (): Promise<CapabilityRegistry> => {
        if (injectedPlugins) return injectedPlugins();
        return ensureCapabilityRegistry(root, { cache: pluginCache });
      };
      const contextBase = {
        workspaceRoot: root,
        signal,
        clock,
        fs: merged.fs ?? nodeFilesystem,
        git,
        net: merged.net ?? nodeNetwork,
        ensurePlugins,
        ...(merged.plugins !== undefined ? { plugins: merged.plugins } : {}),
      } satisfies Omit<OperationContext, "prolog">;
      if (!spec.requiresProlog) {
        // Read-only operations such as status may choose to use an explicitly
        // supplied test or host Prolog port, but must not force engine startup.
        // That keeps pre-init and damaged-store diagnostics non-mutating.
        let lazyProlog: ManagedPrologPort | undefined = merged.prolog as
          | ManagedPrologPort
          | undefined;
        const lazyContext: { current?: OperationContext } = {};
        // A KB read on a detached HEAD answers from the checkout's snapshot;
        // resolve it up front so the operation reports which store it read.
        const detachedAttachment =
          !declaresWriteEffect(spec.effects) && spec.effects.includes("kb-read")
            ? await resolveDetachedReadAttachment(root)
            : undefined;
        const ensureProlog = async (): Promise<PrologPort> => {
          if (lazyProlog !== undefined) return bindSignal(lazyProlog, signal);
          const attachment =
            detachedAttachment ??
            (await resolveOperationAttachment(root, spec));
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
          ...(detachedAttachment
            ? { branchAttachment: detachedAttachment }
            : {}),
          ensureProlog,
        };
        lazyContext.current = context;
        return context;
      }

      let attachment: BranchAttachment | BranchResolutionError;
      try {
        attachment = await resolveOperationAttachment(root, spec);
      } catch (error) {
        await (merged.prolog as ManagedPrologPort | undefined)?.terminate?.();
        throw error;
      }
      if ("error" in attachment) {
        await (merged.prolog as ManagedPrologPort | undefined)?.terminate?.();
        throw new Error(attachmentFailureMessage(attachment));
      }
      if (attachment.readOnly !== undefined) {
        console.warn(`[KIBI] ${attachment.readOnly.notice}`);
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
          let attached = await prolog.query(
            `kb_attach('${quoteProlog(kbPath)}')`,
          );
          if (!attached.success) {
            attached = await retryAttachAfterBreakingStaleLock(
              prolog,
              kbPath,
              attached,
            );
          }
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

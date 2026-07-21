import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { PrologProcess } from "../prolog.js";
import type {
  FilesystemPort,
  GitPort,
  NetworkPort,
  OperationContext,
  OperationRuntime,
  RuntimeOperationSpec,
  PrologPort,
  PrologQueryResult,
  RuntimeOptions,
} from "../public/operations/runtime-types.js";

type ManagedPrologPort = PrologPort & {
  readonly start?: () => Promise<void>;
  readonly terminate?: () => Promise<void>;
};

const execFileAsync = promisify(execFile);

const defaultFilesystem: FilesystemPort = {
  readFile: (filePath) => fs.readFile(filePath, "utf8"),
  writeFile: async (filePath, data) => {
    await fs.writeFile(filePath, data, "utf8");
  },
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  stat: (filePath) => fs.stat(filePath),
};

const defaultGit: GitPort = {
  revParse: async (...args) => {
    const { stdout } = await execFileAsync("git", ["rev-parse", ...args]);
    return stdout.trim();
  },
  showToplevel: async () => {
    const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"]);
    return stdout.trim();
  },
};

const defaultNetwork: NetworkPort = {
  fetch: (input, init) => globalThis.fetch(input, init),
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
export function createCliRuntime(options: RuntimeOptions = {}): OperationRuntime {
  const ownedPrologs = new WeakMap<OperationContext, ManagedPrologPort>();

  return {
    open: async (spec, invocationOptions = {}) => {
      const merged = { ...options, ...invocationOptions } satisfies RuntimeOptions;
      const root = workspaceRoot(merged);
      const signal = merged.signal ?? new AbortController().signal;
      const clock = merged.clock ?? (() => new Date());
      const git = merged.git ?? defaultGit;
      const contextBase = {
        workspaceRoot: root,
        signal,
        clock,
        fs: merged.fs ?? defaultFilesystem,
        git,
        net: merged.net ?? defaultNetwork,
      } satisfies Omit<OperationContext, "prolog">;

      if (!spec.requiresProlog) {
        return contextBase;
      }

      const prolog: ManagedPrologPort = merged.prolog ?? createDefaultProlog();
      try {
        await prolog.start?.();
        const branch =
          process.env.KIBI_BRANCH?.trim() ||
          (await git.revParse("--abbrev-ref", "HEAD"));
        const kbPath = path.join(root, ".kb", "branches", branch);
        const attached = await prolog.query(`kb_attach('${quoteProlog(kbPath)}')`);
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

/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getKbPlPathOverride, isPrologDebugEnabled } from "./env.js";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));
const PROLOG_OUTPUT_MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const PROLOG_OUTPUT_OVERFLOW_ERROR =
  "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation or reduce stored entity size";
const INTERACTIVE_QUERY_FRAME_END = "__KIBI_QUERY_FRAME_END__";

const require = createRequire(import.meta.url);

function packageVersion(packagePath: string): string {
  try {
    const packageJson = require(packagePath) as { version?: unknown };
    return typeof packageJson.version === "string"
      ? packageJson.version
      : "unknown";
  } catch {
    return "unknown";
  }
}

const KIBI_PACKAGE_VERSIONS = [
  `kibi-cli@${packageVersion(path.join(importMetaDir, "..", "package.json"))}`,
  `kibi-core@${packageVersion(path.join(importMetaDir, "..", "..", "core", "package.json"))}`,
  `kibi-mcp@${packageVersion(path.join(importMetaDir, "..", "..", "mcp", "package.json"))}`,
].join(",");

export function resolveKbPlPath(): string {
  // implements REQ-009
  const overrideKbPath = getKbPlPathOverride();
  if (overrideKbPath) {
    return overrideKbPath;
  }

  // Strategy 1: Resolve kibi-core package and derive the source file path.
  // This works in npm workspaces where kibi-core is a direct dependency of kibi-cli.
  try {
    try {
      // First try: resolve as a file within the package
      return require.resolve("kibi-core/src/kb.pl");
    } catch {
      // Fall back: resolve package entry point and derive path
      const coreMain = require.resolve("kibi-core");
      const coreDir = path.dirname(coreMain);
      return path.join(coreDir, "src", "kb.pl");
    }
  } catch {
    // Both resolution strategies failed
  }

  // Strategy 2: Walk up from importMetaDir looking for packages/core/src/kb.pl.
  // This works when running from the source tree (e.g., during development).
  let currentDir = importMetaDir;
  while (currentDir !== path.dirname(currentDir)) {
    const candidate = path.join(currentDir, "packages", "core", "src", "kb.pl");
    if (existsSync(candidate)) {
      return candidate;
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error(
    "Unable to resolve kb.pl. Expected kibi-core to be installed (node_modules) " +
      "or to be running inside the monorepo checkout.",
  );
}
export interface PrologOptions {
  swiplPath?: string;
  timeout?: number;
  /**
   * Force one-shot SWI execution. Production callers are Node-only and keep
   * one interactive process alive; the fallback is retained for isolated
   * repository tests that still run under Bun.
   */
  oneShot?: boolean;
}

export interface QueryResult {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
}

export function registerProcessExitOnce(
  current: (() => void) | null,
  handler: () => void,
  on: (
    event: "exit",
    listener: () => void,
  ) => void = (event, listener) => process.on(event, listener),
): () => void {
  if (current) return current;
  on("exit", handler);
  return handler;
}

// implements REQ-core-prolog-process-management
export function bindProcessExitHandler(
  current: (() => void) | null,
  terminate: () => void | Promise<void>,
  on: (
    event: "exit",
    listener: () => void,
  ) => void = (event, listener) => process.on(event, listener),
): () => void {
  return registerProcessExitOnce(
    current,
    () => {
      void terminate();
    },
    on,
  );
}

export class PrologProcess {
  private process: ChildProcess | null = null;
  private swiplPath: string;
  private timeout: number;
  private outputBuffer = "";
  private outputBufferBytes = 0;
  private outputOverflowed = false;
  private errorBuffer = "";
  private errorBufferBytes = 0;
  private cache: Map<string, QueryResult> = new Map();
  private interactiveQueryTail: Promise<void> = Promise.resolve();
  private terminationPromise: Promise<void> | null = null;
  private oneShotProcesses = new Set<ChildProcess>();
  private useOneShotMode: boolean;
  private attachedKbPath: string | null = null;
  private onProcessExit: (() => void) | null = null;

  constructor(options: PrologOptions = {}) {
    this.swiplPath = options.swiplPath || "swipl";
    this.timeout = options.timeout || 30000;
    this.useOneShotMode =
      options.oneShot ??
      (process.env.NODE_ENV === "test" &&
        typeof (globalThis as { Bun?: unknown }).Bun !== "undefined");
  }

  // implements REQ-core-prolog-process-management
  attachProcessExitHandler(
    on: (
      event: "exit",
      listener: () => void,
    ) => void = (event, listener) => process.on(event, listener),
  ): void {
    this.onProcessExit = bindProcessExitHandler(
      this.onProcessExit,
      () => this.terminate(),
      on,
    );
  }

  async start(): Promise<void> {
    if (!existsSync(this.swiplPath) && this.swiplPath !== "swipl") {
      throw new Error(
        `SWI-Prolog not found at ${this.swiplPath}. Please install SWI-Prolog or check your PATH.`,
      );
    }

    const kbPath = resolveKbPlPath();
    this.process = spawn(
      this.swiplPath,
      [
        "-g",
        `use_module('${kbPath}'), use_module(library(semweb/rdf_db)), set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])`,
        "--quiet",
      ],
      {
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          KIBI_RUNTIME_NAME:
            process.versions.bun !== undefined ? "bun" : "node",
          KIBI_RUNTIME_VERSION:
            process.versions.bun ?? process.versions.node ?? "unknown",
          KIBI_PACKAGE_VERSIONS:
            process.env.KIBI_PACKAGE_VERSIONS ?? KIBI_PACKAGE_VERSIONS,
        },
      },
    );
    this.clearQueryBuffers();

    if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
      throw new Error("Failed to spawn Prolog process");
    }

    this.process.stdout.on("data", (chunk: Buffer) => {
      this.appendOutputChunk(chunk);
    });

    this.process.stderr.on("data", (chunk: Buffer) => {
      this.appendErrorChunk(chunk);
    });

    this.process.stdin.write("true.\n");

    this.attachProcessExitHandler();

    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    // Wait for Prolog to initialize and detect startup failures explicitly.
    const start = Date.now();
    const maxStartWait = 2000; // ms

    while (Date.now() - start < maxStartWait) {
      // If process exited or was killed, surface the error buffer. A signal
      // kill leaves exitCode null but populates signalCode, so both must be
      // checked or an externally killed child looks "still starting".
      if (
        !this.process ||
        this.process.killed ||
        this.process.exitCode !== null ||
        this.process.signalCode !== null
      ) {
        throw new Error(
          `Prolog process terminated unexpectedly during startup: ${this.translateError(this.errorBuffer)}`,
        );
      }

      // If stderr contains an ERROR, fail fast with translated message.
      if (this.errorBuffer.includes("ERROR")) {
        throw new Error(
          `Failed to load kb module: ${this.translateError(this.errorBuffer)}`,
        );
      }

      if (this.outputBuffer.includes("true.")) {
        this.clearQueryBuffers();
        return;
      }

      // brief pause
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    // Final sanity check
    if (this.errorBuffer.includes("ERROR")) {
      throw new Error(
        `Failed to load kb module: ${this.translateError(this.errorBuffer)}`,
      );
    }

    this.clearQueryBuffers();
  }

  // implements REQ-core-prolog-process-management
  async query(goal: string | string[]): Promise<QueryResult> {
    const isSingleGoal = typeof goal === "string";
    const goalKey = isSingleGoal ? goal : null;
    const cacheable = goalKey !== null && this.isCacheableGoal(goalKey);

    if (cacheable) {
      const cachedResult = this.cache.get(goalKey);
      if (cachedResult) {
        return cachedResult;
      }
    }

    if (this.useOneShotMode) {
      const oneShotResult = await this.queryOneShot(goal);
      // Compound goals are read-after-write sensitive, so keep them out of the
      // cache to mirror the interactive path and let later reads observe
      // same-session writes (e.g. kb_status freshness after a file lands).
      const isBatchGoal =
        isSingleGoal && /^\s*\(/.test(this.normalizeGoal(goal));
      const shouldCache = cacheable && !isBatchGoal;
      if (!shouldCache && oneShotResult.success) {
        this.invalidateCache();
      }
      if (shouldCache && oneShotResult.success) {
        this.cache.set(goalKey, oneShotResult);
      }
      return oneShotResult;
    }

    if (!isSingleGoal) {
      // A batch is one logical write.  Wrapping it here keeps RDF mutations
      // atomic in the long-lived process; persistence is appended by the
      // interactive wrapper once the transaction succeeds.
      const batchGoal = `rdf_transaction((${goal.map((item) => this.normalizeGoal(item)).join(", ")}))`;
      return this.query(batchGoal);
    }

    if (!this.isProcessUsable()) {
      // Keep the low-level PrologPort useful for isolated callers that only
      // need a single read (and for legacy unit fixtures).  Normal CLI/MCP
      // runtimes provide an EngineClient, while explicitly attached callers
      // call start() and stay interactive; this fallback never participates
      // in the engine-backed workflow.
      if (this.process === null) {
        return this.execOneShot(goal as string, this.attachedKbPath);
      }
      throw new Error("Prolog process not started");
    }

    const runInteractiveQuery = async (): Promise<QueryResult> => {
      this.clearQueryBuffers();

      const debug = isPrologDebugEnabled();
      const normalizedGoal = this.normalizeGoal(goal as string);
      const goalLabel = this.goalLabel(normalizedGoal);
      const shouldPersist =
        this.isMutatingGoal(normalizedGoal) &&
        !normalizedGoal.includes("kb_save") &&
        !normalizedGoal.includes("kb_commit_upsert");
      const goalWithPersistence = shouldPersist
        ? `(${normalizedGoal}, kb_save)`
        : normalizedGoal;
      const wrappedGoal = /^once\s*\(/.test(goalWithPersistence)
        ? `catch(${goalWithPersistence}, _E, (print_message(error, _E), fail))`
        : `catch(once((${goalWithPersistence})), _E, (print_message(error, _E), fail))`;
      const start = Date.now();

      if (debug) {
        console.error(`[prolog debug] start query: ${goalLabel}`);
      }

      this.process?.stdin?.write(
        `${wrappedGoal}.\nwriteln('${INTERACTIVE_QUERY_FRAME_END}').\n`,
      );

      return new Promise((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          const stage = this.lastDiagnosticStage(this.errorBuffer) ?? "unknown";
          const msg = `Query timeout after ${this.timeout / 1000}s (stage=${stage}, pid=${this.process?.pid ?? 0}, killed=${this.process?.killed ? "yes" : "no"}, exitCode=${this.process?.exitCode ?? "null"}, signal=${this.process?.signalCode ?? "null"}, goal=${goalLabel})`;
          if (debug) {
            console.error(`[prolog debug] timeout: ${msg}`);
            const runtime = this.errorBuffer
              .split("\n")
              .find((line) => line.includes("__KIBI_RUNTIME__"));
            console.error(
              `[prolog debug] runtime=${runtime ?? "unknown"} packages=${process.env.KIBI_PACKAGE_VERSIONS ?? KIBI_PACKAGE_VERSIONS}`,
            );
          }
          settled = true;
          void this.terminate().finally(() => {
            reject(new Error(msg));
          });
        }, this.timeout);

        const checkResult = () => {
          if (settled) {
            return;
          }
          if (this.outputOverflowed) {
            clearTimeout(timeoutId);
            settled = true;
            void this.terminate().finally(() => {
              resolve({
                success: false,
                bindings: {},
                error: PROLOG_OUTPUT_OVERFLOW_ERROR,
              });
            });
            return;
          }
          if (!this.isProcessUsable()) {
            clearTimeout(timeoutId);
            settled = true;
            resolve({
              success: false,
              bindings: {},
              error: "Query interrupted because the Prolog process terminated",
            });
            return;
          }
          if (
            this.errorBuffer.length > 0 &&
            this.errorBuffer.includes("ERROR")
          ) {
            clearTimeout(timeoutId);
            settled = true;
            if (debug) {
              console.error(
                `[prolog debug] query error: ${goalLabel} error=${this.errorBuffer.split("\n")[0]}`,
              );
            }
            resolve({
              success: false,
              bindings: {},
              error: this.addDiagnosticStage(
                this.translateError(this.errorBuffer),
                normalizedGoal,
                this.errorBuffer,
              ),
            });
            return;
          }

          const frameEnd = this.outputBuffer.indexOf(
            INTERACTIVE_QUERY_FRAME_END,
          );
          if (frameEnd >= 0) {
            clearTimeout(timeoutId);
            settled = true;
            const framedOutput = this.outputBuffer.slice(0, frameEnd).trimEnd();
            if (/(?:^|\n)(?:false|fail)\.\s*$/.test(framedOutput)) {
              resolve({
                success: false,
                bindings: {},
                error: "Query failed",
              });
              return;
            }
            const result = {
              success: true,
              bindings: this.extractBindings(framedOutput),
            };
            // Treat any batch/compound goal as non-cacheable to preserve
            // read-after-write consistency. A batch goal is produced when
            // query(string[]) rewrites its inputs into "(goal1, goal2, ...)"
            // which isCacheableGoal() would otherwise mis-classify as cacheable.
            const isBatchGoal = /^\s*\(/.test(normalizedGoal);
            const shouldCache = cacheable && !isBatchGoal;
            if (!shouldCache) {
              this.invalidateCache();
            }
            if (shouldCache) {
              this.cache.set(goalKey, result);
            }
            if (debug) {
              console.error(
                `[prolog debug] query success: ${goalLabel} elapsed=${(Date.now() - start) / 1000}s`,
              );
            }
            resolve(result);
            return;
          }

          setTimeout(checkResult, 50);
        };

        checkResult();
      });
    };

    const previousQuery = this.interactiveQueryTail;
    let releaseQuery!: () => void;
    this.interactiveQueryTail = new Promise<void>((resolve) => {
      releaseQuery = resolve;
    });

    await previousQuery;
    try {
      if (!this.isProcessUsable()) {
        throw new Error("Prolog process not started");
      }
      return await runInteractiveQuery();
    } finally {
      releaseQuery();
    }
  }

  /** Execute a group of goals as one transaction and one durable save. */
  async queryBatch(goals: readonly string[]): Promise<QueryResult> {
    return this.query([...goals]);
  }

  invalidateCache(): void {
    this.cache.clear();
  }

  private isCacheableGoal(goal: string): boolean {
    const trimmed = goal.trim();
    if (
      trimmed.startsWith("rdf_transaction(") ||
      this.isMutatingGoal(trimmed)
    ) {
      return false;
    }
    return !(
      trimmed.startsWith("kb_attach(") ||
      trimmed.startsWith("kb_detach") ||
      trimmed.startsWith("kb_save") ||
      trimmed.startsWith("kb_storage_status") ||
      trimmed.startsWith("kb_storage_compact") ||
      trimmed.startsWith("kb_storage_export") ||
      trimmed.startsWith("status:") ||
      trimmed.startsWith("kb_commit_upsert(") ||
      trimmed.startsWith("kb_assert_") ||
      trimmed.startsWith("kb_delete_") ||
      trimmed.startsWith("kb_retract_")
    );
  }

  // implements REQ-009
  private isMutatingGoal(goal: string): boolean {
    return /(?:kb_(?:assert|delete|retract|commit|save|log)_|\bkb_save\b|\brdf_(?:assert|retract))/u.test(
      goal,
    );
  }

  // implements REQ-009
  private isExplicitSaveGoal(goal: string): boolean {
    return goal.trim().startsWith("kb_save");
  }

  private async queryOneShot(goal: string | string[]): Promise<QueryResult> {
    if (Array.isArray(goal)) {
      return this.execOneShot(goal, this.attachedKbPath);
    }

    const trimmedGoal = this.normalizeGoal(goal);

    // Keep a lightweight compatibility layer for callers that rely on
    // stateful attach/detach across multiple query() calls.
    if (trimmedGoal.startsWith("kb_detach")) {
      this.attachedKbPath = null;
      return { success: true, bindings: {} };
    }

    const attachMatch = trimmedGoal.match(/^kb_attach\('(.+)'\)$/);
    if (attachMatch) {
      const attachPath = attachMatch[1] ?? null;
      if (!attachPath) {
        return {
          success: false,
          bindings: {},
          error: "Invalid KB attach path",
        };
      }

      if (this.attachedKbPath !== null) {
        return {
          success: false,
          bindings: {},
          error: "KB already attached",
        };
      }
      const attachResult = await this.execOneShot(trimmedGoal, null);
      if (attachResult.success) {
        this.attachedKbPath = attachPath;
      }
      return attachResult;
    }

    return this.execOneShot(trimmedGoal, this.attachedKbPath);
  }

  // implements REQ-009
  private execOneShot(
    goal: string,
    kbPath: string | null,
  ): Promise<QueryResult>;
  private execOneShot(
    goal: string[],
    kbPath: string | null,
  ): Promise<QueryResult>;
  private async execOneShot(
    goal: string | string[],
    kbPath: string | null,
  ): Promise<QueryResult> {
    const originalGoalList = Array.isArray(goal)
      ? goal.map((item) => this.normalizeGoal(item))
      : [this.normalizeGoal(goal)];
    const explicitSaveRequested = Array.isArray(goal)
      ? originalGoalList.some((item) => this.isExplicitSaveGoal(item))
      : false;
    const goalList = explicitSaveRequested
      ? originalGoalList.filter((item) => !this.isExplicitSaveGoal(item))
      : originalGoalList;
    const isBatch = goalList.length > 1;
    const combinedGoal =
      goalList.length === 0
        ? "true"
        : goalList.length === 1
          ? goalList[0]
          : `(${goalList.join(", ")})`;
    const kbModulePath = resolveKbPlPath();
    const prologGoal = [
      `use_module('${kbModulePath}')`,
      "use_module(library(semweb/rdf_db))",
      "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])",
      "getenv('KIBI_GOAL', GoalAtom)",
      "read_term_from_atom(GoalAtom, Goal, [variable_names(Vars)])",
      kbPath ? "getenv('KIBI_KB_PATH', KBPath), kb_attach(KBPath)" : "true",
      isBatch ? "WrappedGoal = rdf_transaction(Goal)" : "WrappedGoal = Goal",
      "(catch(call(WrappedGoal), E, (print_message(error, E), fail)) -> QuerySucceeded = true ; QuerySucceeded = false)",
      kbPath &&
      (explicitSaveRequested ||
        goalList.some((item) => this.isMutatingGoal(item)))
        ? "(QuerySucceeded == true -> kb_save ; true)"
        : "true",
      kbPath ? "kb_detach" : "true",
      "(QuerySucceeded == true -> (forall(member(Name=Value, Vars), (write(Name), write('='), write_term(Value, [quoted(true), max_depth(0)]), writeln('.'))), writeln('__KIBI_TRUE__.')) ; writeln('__KIBI_FALSE__.'))",
    ].join(", ");

    const runtimeName = process.versions.bun !== undefined ? "bun" : "node";
    const runtimeVersion =
      process.versions.bun ?? process.versions.node ?? "unknown";
    const packageVersions =
      process.env.KIBI_PACKAGE_VERSIONS ?? KIBI_PACKAGE_VERSIONS;

    let child: ChildProcess;
    try {
      child = spawn(this.swiplPath, ["-q", "-g", prologGoal, "-t", "halt"], {
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          KIBI_GOAL: combinedGoal,
          KIBI_RUNTIME_NAME: runtimeName,
          KIBI_RUNTIME_VERSION: runtimeVersion,
          KIBI_PACKAGE_VERSIONS: packageVersions,
          ...(kbPath ? { KIBI_KB_PATH: kbPath } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      return {
        success: false,
        bindings: {},
        error: error instanceof Error ? error.message : String(error),
      };
    }

    this.oneShotProcesses.add(child);
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let errorBytes = 0;
    let outputOverflowed = false;
    let timedOut = false;
    let settled = false;
    let closed = false;
    let termination: Promise<void> | null = null;

    const appendChunk = (chunk: Buffer, target: "stdout" | "stderr"): void => {
      if (outputOverflowed) return;
      const bytes = target === "stdout" ? outputBytes : errorBytes;
      const remaining = PROLOG_OUTPUT_MAX_BUFFER_BYTES - bytes;
      if (chunk.byteLength > remaining) {
        const clipped = chunk.subarray(0, Math.max(0, remaining)).toString();
        if (target === "stdout") stdout += clipped;
        else stderr += clipped;
        outputOverflowed = true;
        termination ??= this.terminateProcessTree(child);
        return;
      }
      if (target === "stdout") {
        stdout += chunk.toString();
        outputBytes += chunk.byteLength;
      } else {
        stderr += chunk.toString();
        errorBytes += chunk.byteLength;
      }
    };

    child.stdout?.on("data", (chunk: Buffer) => appendChunk(chunk, "stdout"));
    child.stderr?.on("data", (chunk: Buffer) => appendChunk(chunk, "stderr"));

    const completion = new Promise<{
      readonly code: number | null;
      readonly signal: NodeJS.Signals | null;
      readonly error?: Error;
    }>((resolve) => {
      child.once("error", (error) => {
        closed = true;
        resolve({ code: null, signal: null, error });
      });
      child.once("close", (code, signal) => {
        closed = true;
        resolve({ code, signal });
      });
    });

    const timeoutId = setTimeout(() => {
      if (settled || closed) return;
      timedOut = true;
      termination ??= this.terminateProcessTree(child);
    }, this.timeout);

    const result = await completion;
    settled = true;
    clearTimeout(timeoutId);
    if (termination !== null) await termination;
    this.oneShotProcesses.delete(child);

    const stage = this.lastDiagnosticStage(stderr) ?? "unknown";
    if (isPrologDebugEnabled()) {
      const runtime = stderr
        .split("\n")
        .find((line) => line.includes("__KIBI_RUNTIME__"));
      if (runtime !== undefined) {
        console.error(`[prolog debug] ${runtime}`);
      }
      console.error(
        `[prolog debug] child pid=${child.pid ?? 0} runtime=${runtimeName}@${runtimeVersion} packages=${packageVersions} stage=${stage}`,
      );
    }

    if (timedOut) {
      throw new Error(
        `Query timeout after ${this.timeout / 1000}s (stage=${stage}, pid=${child.pid ?? 0}, goal=${this.goalLabel(combinedGoal ?? "true")})`,
      );
    }

    if (outputOverflowed) {
      return {
        success: false,
        bindings: {},
        error: this.addDiagnosticStage(
          PROLOG_OUTPUT_OVERFLOW_ERROR,
          combinedGoal ?? "true",
          stderr,
        ),
      };
    }

    if (result.error !== undefined) {
      return {
        success: false,
        bindings: {},
        error: this.addDiagnosticStage(
          result.error.message,
          combinedGoal ?? "true",
          stderr,
        ),
      };
    }

    if (stderr.includes("ERROR")) {
      return {
        success: false,
        bindings: {},
        error: this.addDiagnosticStage(
          this.translateError(stderr),
          combinedGoal ?? "true",
          stderr,
        ),
      };
    }

    if (stdout.includes("__KIBI_TRUE__")) {
      const clean = stdout
        .split("\n")
        .filter((line) => !line.includes("__KIBI_TRUE__"))
        .join("\n");
      return {
        success: true,
        bindings: this.extractBindings(clean),
      };
    }

    if (stdout.includes("__KIBI_FALSE__")) {
      return {
        success: false,
        bindings: {},
        error: "Query returned false",
      };
    }

    return {
      success: false,
      bindings: {},
      error: this.addDiagnosticStage(
        `Query failed - stdout: ${stdout.substring(0, 200)}, stderr: ${stderr.substring(0, 200)}`,
        combinedGoal ?? "true",
        stderr,
      ),
    };
  }

  private normalizeGoal(goal: string): string {
    return goal.trim().replace(/\.+\s*$/, "");
  }

  private clearQueryBuffers(): void {
    this.outputBuffer = "";
    this.outputBufferBytes = 0;
    this.outputOverflowed = false;
    this.errorBuffer = "";
    this.errorBufferBytes = 0;
  }

  private appendOutputChunk(chunk: Buffer): void {
    if (this.outputOverflowed) return;
    const remaining = PROLOG_OUTPUT_MAX_BUFFER_BYTES - this.outputBufferBytes;
    if (chunk.byteLength > remaining) {
      this.outputBuffer += chunk.subarray(0, remaining).toString();
      this.outputBufferBytes = PROLOG_OUTPUT_MAX_BUFFER_BYTES;
      this.outputOverflowed = true;
      return;
    }
    this.outputBuffer += chunk.toString();
    this.outputBufferBytes += chunk.byteLength;
  }

  private appendErrorChunk(chunk: Buffer): void {
    if (this.outputOverflowed) return;
    const remaining = PROLOG_OUTPUT_MAX_BUFFER_BYTES - this.errorBufferBytes;
    if (chunk.byteLength > remaining) {
      this.errorBuffer += chunk.subarray(0, remaining).toString();
      this.errorBufferBytes = PROLOG_OUTPUT_MAX_BUFFER_BYTES;
      this.outputOverflowed = true;
      return;
    }
    this.errorBuffer += chunk.toString();
    this.errorBufferBytes += chunk.byteLength;
  }

  private goalLabel(goal: string): string {
    const match = goal
      .trim()
      .match(/^([a-z][A-Za-z0-9_]*(?::[a-z][A-Za-z0-9_]*)?)/);
    return match?.[1] ?? "anonymous";
  }

  private addDiagnosticStage(
    message: string,
    goal: string,
    diagnostics: string,
  ): string {
    if (this.goalLabel(goal) !== "kb_commit_upsert") return message;
    const stage = this.lastDiagnosticStage(diagnostics);
    return stage === null ? message : `${message} (stage=${stage})`;
  }

  private lastDiagnosticStage(text: string): string | null {
    const matches = [...text.matchAll(/__KIBI_STAGE__:([^\s\r\n]+)/g)];
    return matches.at(-1)?.[1] ?? null;
  }

  private signalProcessTree(child: ChildProcess, signal: NodeJS.Signals): void {
    const pid = child.pid;
    if (pid === undefined || pid <= 0) return;
    if (process.platform !== "win32") {
      try {
        process.kill(-pid, signal);
        return;
      } catch {
        // Fall back to the direct child when a process group is unavailable.
      }
    }
    try {
      child.kill(signal);
    } catch {
      // The child may have exited between the group and direct kill attempts.
    }
  }

  private async terminateProcessTree(child: ChildProcess): Promise<void> {
    let closed = false;
    const exited = new Promise<void>((resolve) => {
      const markExited = () => {
        closed = true;
        resolve();
      };
      child.once("close", markExited);
      child.once("error", markExited);
    });
    if (child.exitCode === null) this.signalProcessTree(child, "SIGTERM");
    await Promise.race([
      exited,
      new Promise<void>((resolve) => setTimeout(resolve, 1000)),
    ]);
    if (!closed) {
      this.signalProcessTree(child, "SIGKILL");
      await Promise.race([
        exited,
        new Promise<void>((resolve) => setTimeout(resolve, 1000)),
      ]);
    }
  }

  // implements REQ-009
  private isProcessUsable(): boolean {
    return Boolean(
      this.process?.stdin &&
        !this.process?.killed &&
        this.process?.exitCode === null &&
        this.process?.signalCode === null,
    );
  }

  private extractBindings(output: string): Record<string, string> {
    const bindings: Record<string, string> = {};
    let variableName: string | undefined;
    let valueLines: string[] = [];

    const flush = (): void => {
      if (variableName === undefined) return;
      bindings[variableName] = valueLines
        .join("\n")
        .trim()
        .replace(/\.$/, "")
        .replace(/,$/, "");
      variableName = undefined;
      valueLines = [];
    };

    // Prolog may print a quoted string over multiple physical lines when the
    // long-lived session's answer formatting is configured for readable JSON.
    // Parse assignment records as blocks instead of dropping every continuation
    // line after the first one (which previously reduced JsonString to "{").
    for (const line of output.split("\n")) {
      const match = line.match(/^([A-Z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        flush();
        variableName = match[1];
        valueLines = [match[2]];
        continue;
      }
      if (variableName !== undefined) valueLines.push(line);
    }
    flush();

    return bindings;
  }

  // implements REQ-core-prolog-process-management
  private translateError(errorText: string): string {
    // Diagnostic markers intentionally contain words such as `lock` and the
    // audit path. Remove them before classifying the actual Prolog error so a
    // contradiction at the check stage is not mistaken for an audit lock.
    const cleanError = errorText.replace(
      /^__KIBI_(?:STAGE|RUNTIME)__:[^\r\n]*\r?\n?/gm,
      "",
    );
    if (cleanError.includes("stale_snapshot")) {
      return "KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)";
    }
    if (
      (cleanError.includes("audit_log") ||
        cleanError.includes("audit.log") ||
        cleanError.includes("Resource temporarily unavailable")) &&
      (cleanError.includes("lock") || cleanError.includes("permission"))
    ) {
      return "Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying";
    }
    // SWI-Prolog print_message/2 formats errors as human-readable messages,
    // not raw Prolog terms. Match the actual output format.
    if (
      cleanError.includes("does not exist") &&
      /entity [`'"].+?[`'"]/.test(cleanError)
    ) {
      // SWI-Prolog doubles single quotes in formatted messages: ''REQ-TEST''
      const entityIdMatch = cleanError.match(
        /entity [`'"]+(.+?)[`'"]+ does not exist/,
      );
      const matchedEntityId = entityIdMatch?.[1];
      const entityId =
        matchedEntityId !== undefined
          ? matchedEntityId.replace(/^`?'+|'+`?$/g, "")
          : "unknown";
      if (cleanError.includes("Target entity does not exist")) {
        return `Target entity does not exist: ${entityId}`;
      }
      if (cleanError.includes("Source entity does not exist")) {
        return `Source entity does not exist: ${entityId}`;
      }
      return `Entity does not exist: ${entityId}`;
    }
    if (cleanError.includes("Type error: `relationship' expected")) {
      const relMatch = cleanError.match(/\(Invalid relationship: ([^)]+)\)/);
      const invalidRelationship = relMatch?.[1];
      if (invalidRelationship !== undefined) {
        return `Invalid relationship: ${invalidRelationship.trim()}`;
      }
      return "Invalid relationship type or direction";
    }
    // Fallback: check for raw Prolog error terms (used by other tools)
    if (
      cleanError.includes("existence_error") ||
      cleanError.includes("Unknown procedure")
    ) {
      return "Predicate or file not found";
    }
    if (cleanError.includes("permission_error")) {
      return "Access denied or KB locked";
    }
    if (
      cleanError.includes("syntax_error") ||
      cleanError.includes("Operator expected")
    ) {
      return "Invalid query syntax";
    }
    if (cleanError.includes("timeout_error")) {
      return `Operation exceeded ${this.timeout / 1000}s timeout`;
    }
    const simpleError = (
      cleanError
        .replace(/ERROR:\s*/g, "")
        .replace(/^\*\*.*\*\*$/gm, "")
        .replace(/^\s+/gm, "")
        .split("\n")[0] ?? ""
    ).trim();
    return simpleError || "Unknown error";
  }

  isRunning(): boolean {
    return Boolean(
      this.process &&
        !this.process.killed &&
        this.process?.exitCode === null &&
        this.process?.signalCode === null,
    );
  }

  getPid(): number {
    return this.process?.pid || 0;
  }

  async terminate(): Promise<void> {
    if (this.terminationPromise) {
      await this.terminationPromise;
      return;
    }

    if (this.onProcessExit) {
      process.off("exit", this.onProcessExit);
      this.onProcessExit = null;
    }

    const current = this.process;
    const oneShots = [...this.oneShotProcesses];
    this.process = null;
    this.clearQueryBuffers();

    if (current || oneShots.length > 0) {
      this.terminationPromise = (async () => {
        if (current) {
          current.stdin?.end();
          await this.terminateProcessTree(current);
        }
        await Promise.all(
          oneShots.map((child) => this.terminateProcessTree(child)),
        );
      })();

      try {
        await this.terminationPromise;
      } finally {
        this.terminationPromise = null;
      }
    }
  }
}
// FIX_VERSION_2024_03_06

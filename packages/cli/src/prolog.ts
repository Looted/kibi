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

import { type ChildProcess, spawn, spawnSync } from "node:child_process";
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
}

export interface QueryResult {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
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
  private useOneShotMode =
    typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
  private attachedKbPath: string | null = null;
  private onProcessExit: (() => void) | null = null;

  constructor(options: PrologOptions = {}) {
    this.swiplPath = options.swiplPath || "swipl";
    this.timeout = options.timeout || 30000;
  }

  async start(): Promise<void> {
    if (!existsSync(this.swiplPath) && this.swiplPath !== "swipl") {
      throw new Error(
        `SWI-Prolog not found at ${this.swiplPath}. Please install SWI-Prolog or check your PATH.`,
      );
    }

    const kbPath = resolveKbPlPath();
    this.process = spawn(this.swiplPath, [
      "-g",
      `use_module('${kbPath}'), use_module(library(semweb/rdf_db)), set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])`,
      "--quiet",
    ]);
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

    if (!this.onProcessExit) {
      this.onProcessExit = () => {
        void this.terminate();
      };
      process.on("exit", this.onProcessExit);
    }

    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    // Wait for Prolog to initialize and detect startup failures explicitly.
    const start = Date.now();
    const maxStartWait = 2000; // ms

    while (Date.now() - start < maxStartWait) {
      // If process exited or was killed, surface the error buffer.
      if (!this.process || this.process.killed) {
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
      if (!cacheable && oneShotResult.success) {
        this.invalidateCache();
      }
      if (cacheable && oneShotResult.success) {
        this.cache.set(goalKey, oneShotResult);
      }
      return oneShotResult;
    }

    if (!isSingleGoal) {
      const batchGoal = `(${goal.map((item) => this.normalizeGoal(item)).join(", ")})`;
      return this.query(batchGoal);
    }

    if (!this.isProcessUsable()) {
      throw new Error("Prolog process not started");
    }

    const runInteractiveQuery = async (): Promise<QueryResult> => {
      this.clearQueryBuffers();

      const debug = isPrologDebugEnabled();
      const normalizedGoal = this.normalizeGoal(goal as string);
      const wrappedGoal = /^once\s*\(/.test(normalizedGoal)
        ? `catch(${normalizedGoal}, _E, (print_message(error, _E), fail))`
        : `catch(once((${normalizedGoal})), _E, (print_message(error, _E), fail))`;
      const start = Date.now();

      if (debug) {
        console.error(`[prolog debug] start query: ${normalizedGoal}`);
      }

      this.process?.stdin?.write(
        `${wrappedGoal}.\nwriteln('${INTERACTIVE_QUERY_FRAME_END}').\n`,
      );

      return new Promise((resolve, reject) => {
        let settled = false;
        const timeoutId = setTimeout(() => {
          const msg = `Query timeout after ${this.timeout / 1000}s (pid=${this.process?.pid ?? 0}, killed=${this.process?.killed ? "yes" : "no"}, exitCode=${this.process?.exitCode ?? "null"}, goal=${JSON.stringify(normalizedGoal.slice(0, 120))})`;
          if (debug) {
            const tailOut = this.outputBuffer.slice(-2048);
            const tailErr = this.errorBuffer.slice(-2048);
            console.error(`[prolog debug] timeout: ${msg}`);
            console.error(`[prolog debug] last stdout: ---\n${tailOut}\n---`);
            console.error(`[prolog debug] last stderr: ---\n${tailErr}\n---`);
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
                `[prolog debug] query error: ${normalizedGoal} error=${this.errorBuffer.split("\n")[0]}`,
              );
            }
            resolve({
              success: false,
              bindings: {},
              error: this.translateError(this.errorBuffer),
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
                `[prolog debug] query success: ${normalizedGoal} elapsed=${(Date.now() - start) / 1000}s`,
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

  invalidateCache(): void {
    this.cache.clear();
  }

  private isCacheableGoal(goal: string): boolean {
    const trimmed = goal.trim();
    return !(
      trimmed.startsWith("kb_attach(") ||
      trimmed.startsWith("kb_detach") ||
      trimmed.startsWith("kb_save") ||
      trimmed.startsWith("kb_assert_") ||
      trimmed.startsWith("kb_delete_") ||
      trimmed.startsWith("kb_retract_")
    );
  }

  // implements REQ-009
  private isMutatingGoal(goal: string): boolean {
    return (
      goal.includes("kb_assert_") ||
      goal.includes("kb_delete_") ||
      goal.includes("kb_retract_")
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
      const attachResult = this.execOneShot(trimmedGoal, null);
      if (attachResult.success) {
        this.attachedKbPath = attachPath;
      }
      return attachResult;
    }

    return this.execOneShot(trimmedGoal, this.attachedKbPath);
  }

  // implements REQ-009
  private execOneShot(goal: string, kbPath: string | null): QueryResult;
  private execOneShot(goal: string[], kbPath: string | null): QueryResult;
  private execOneShot(
    goal: string | string[],
    kbPath: string | null,
  ): QueryResult {
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

    const result = spawnSync(
      this.swiplPath,
      ["-q", "-g", prologGoal, "-t", "halt"],
      {
        encoding: "utf8",
        timeout: this.timeout,
        maxBuffer: PROLOG_OUTPUT_MAX_BUFFER_BYTES,
        env: {
          ...process.env,
          KIBI_GOAL: combinedGoal,
          ...(kbPath ? { KIBI_KB_PATH: kbPath } : {}),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    if (
      result.error &&
      (result.error.message.includes("timed out") ||
        // Bun/Node differ here; keep a conservative timeout detection.
        result.error.message.includes("ETIMEDOUT"))
    ) {
      throw new Error(`Query timeout after ${this.timeout / 1000}s`);
    }

    if (result.error?.message.includes("ENOBUFS")) {
      return {
        success: false,
        bindings: {},
        error: PROLOG_OUTPUT_OVERFLOW_ERROR,
      };
    }

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

    if (stderr.includes("ERROR")) {
      return {
        success: false,
        bindings: {},
        error: this.translateError(stderr),
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
      error: `Query failed - stdout: ${stdout.substring(0, 200)}, stderr: ${stderr.substring(0, 200)}`,
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

  // implements REQ-009
  private isProcessUsable(): boolean {
    return Boolean(
      this.process?.stdin &&
        !this.process?.killed &&
        this.process?.exitCode === null,
    );
  }

  private extractBindings(output: string): Record<string, string> {
    const bindings: Record<string, string> = {};
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Za-z0-9_]*)\s*=\s*(.+)\.?\s*$/);
      if (match) {
        const [, varName, value] = match;
        if (varName !== undefined && value !== undefined) {
          bindings[varName] = value.trim().replace(/\.$/, "").replace(/,$/, "");
        }
      }
    }

    return bindings;
  }

  // implements REQ-core-prolog-process-management
  private translateError(errorText: string): string {
    // SWI-Prolog print_message/2 formats errors as human-readable messages,
    // not raw Prolog terms. Match the actual output format.
    if (
      errorText.includes("does not exist") &&
      /entity [`'"].+?[`'"]/.test(errorText)
    ) {
      // SWI-Prolog doubles single quotes in formatted messages: ''REQ-TEST''
      const entityIdMatch = errorText.match(
        /entity [`'"]+(.+?)[`'"]+ does not exist/,
      );
      const matchedEntityId = entityIdMatch?.[1];
      const entityId =
        matchedEntityId !== undefined
          ? matchedEntityId.replace(/^`?'+|'+`?$/g, "")
          : "unknown";
      if (errorText.includes("Target entity does not exist")) {
        return `Target entity does not exist: ${entityId}`;
      }
      if (errorText.includes("Source entity does not exist")) {
        return `Source entity does not exist: ${entityId}`;
      }
      return `Entity does not exist: ${entityId}`;
    }
    if (errorText.includes("Type error: `relationship' expected")) {
      const relMatch = errorText.match(/\(Invalid relationship: ([^)]+)\)/);
      const invalidRelationship = relMatch?.[1];
      if (invalidRelationship !== undefined) {
        return `Invalid relationship: ${invalidRelationship.trim()}`;
      }
      return "Invalid relationship type or direction";
    }
    // Fallback: check for raw Prolog error terms (used by other tools)
    if (
      errorText.includes("existence_error") ||
      errorText.includes("Unknown procedure")
    ) {
      return "Predicate or file not found";
    }
    if (errorText.includes("permission_error")) {
      return "Access denied or KB locked";
    }
    if (
      errorText.includes("syntax_error") ||
      errorText.includes("Operator expected")
    ) {
      return "Invalid query syntax";
    }
    if (errorText.includes("timeout_error")) {
      return `Operation exceeded ${this.timeout / 1000}s timeout`;
    }
    const simpleError = (
      errorText
        .replace(/ERROR:\s*/g, "")
        .replace(/^\*\*.*\*\*$/gm, "")
        .replace(/^\s+/gm, "")
        .split("\n")[0] ?? ""
    ).trim();
    return simpleError || "Unknown error";
  }

  isRunning(): boolean {
    return Boolean(
      this.process && !this.process.killed && this.process?.exitCode === null,
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
    this.process = null;
    this.clearQueryBuffers();

    if (current) {
      this.terminationPromise = (async () => {
        current.stdin?.end();
        current.kill("SIGTERM");

        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            current.kill("SIGKILL");
            resolve(undefined);
          }, 1000);

          current.on("exit", () => {
            clearTimeout(timeout);
            resolve(undefined);
          });
        });
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

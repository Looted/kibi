import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));

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
  private errorBuffer = "";
  private cache: Map<string, QueryResult> = new Map();
  private useOneShotMode =
    typeof (globalThis as { Bun?: unknown }).Bun !== "undefined";
  private attachedKbPath: string | null = null;

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

    const kbPath = path.resolve(importMetaDir, "../../core/src/kb.pl");

    this.process = spawn(this.swiplPath, [
      "-g",
      `use_module('${kbPath}'), set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])`,
      "--quiet",
    ]);

    if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
      throw new Error("Failed to spawn Prolog process");
    }

    this.process.stdout.on("data", (chunk) => {
      this.outputBuffer += chunk.toString();
    });

    this.process.stderr.on("data", (chunk) => {
      this.errorBuffer += chunk.toString();
    });

    process.on("exit", () => {
      this.terminate();
    });

    await this.waitForReady();
  }

  private async waitForReady(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (this.errorBuffer.includes("ERROR")) {
      throw new Error(
        `Failed to load kb module: ${this.translateError(this.errorBuffer)}`,
      );
    }

    this.outputBuffer = "";
    this.errorBuffer = "";
  }

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

    if (!this.process || !this.process.stdin) {
      throw new Error("Prolog process not started");
    }

    this.outputBuffer = "";
    this.errorBuffer = "";

    this.process.stdin.write(`${goal}.
`);

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error("Query timeout after 30s"));
      }, this.timeout);

      const checkResult = () => {
        if (this.errorBuffer.length > 0 && this.errorBuffer.includes("ERROR")) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            bindings: {},
            error: this.translateError(this.errorBuffer),
          });
        } else if (
          this.outputBuffer.includes("true.") ||
          this.outputBuffer.match(/^[A-Z_][A-Za-z0-9_]*\s*=\s*.+\./m)
        ) {
          clearTimeout(timeoutId);
          const result = {
            success: true,
            bindings: this.extractBindings(this.outputBuffer),
          };
          if (cacheable) {
            this.cache.set(goalKey, result);
          }
          resolve(result);
        } else if (
          this.outputBuffer.includes("false.") ||
          this.outputBuffer.includes("fail.")
        ) {
          clearTimeout(timeoutId);
          resolve({
            success: false,
            bindings: {},
            error: "Query failed",
          });
        } else {
          setTimeout(checkResult, 50);
        }
      };

      checkResult();
    });
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
      const attachResult = this.execOneShot(trimmedGoal, null);
      if (attachResult.success) {
        this.attachedKbPath = attachMatch[1];
      }
      return attachResult;
    }

    return this.execOneShot(trimmedGoal, this.attachedKbPath);
  }

  private execOneShot(goal: string, kbPath: string | null): QueryResult;
  private execOneShot(goal: string[], kbPath: string | null): QueryResult;
  private execOneShot(
    goal: string | string[],
    kbPath: string | null,
  ): QueryResult {
    const goalList = Array.isArray(goal)
      ? goal.map((item) => this.normalizeGoal(item))
      : [this.normalizeGoal(goal)];
    const isBatch = goalList.length > 1;
    const combinedGoal =
      goalList.length === 1 ? goalList[0] : `(${goalList.join(", ")})`;
    const kbModulePath = path.resolve(importMetaDir, "../../core/src/kb.pl");
    const prologGoal = [
      `use_module('${kbModulePath}')`,
      "use_module(library(semweb/rdf_db))",
      "set_prolog_flag(answer_write_options, [max_depth(0), quoted(true)])",
      "getenv('KIBI_GOAL', GoalAtom)",
      "read_term_from_atom(GoalAtom, Goal, [variable_names(Vars)])",
      kbPath ? "getenv('KIBI_KB_PATH', KBPath), kb_attach(KBPath)" : "true",
      isBatch ? "WrappedGoal = rdf_transaction(Goal)" : "WrappedGoal = Goal",
      "(catch(call(WrappedGoal), E, (print_message(error, E), fail)) -> (forall(member(Name=Value, Vars), (write(Name), write('='), write_term(Value, [quoted(true), max_depth(0)]), writeln('.'))), writeln('__KIBI_TRUE__.')) ; writeln('__KIBI_FALSE__.'))",
      kbPath ? "kb_save, kb_detach" : "true",
    ].join(", ");

    const result = spawnSync(
      this.swiplPath,
      ["-q", "-g", prologGoal, "-t", "halt"],
      {
        encoding: "utf8",
        timeout: this.timeout,
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
      throw new Error("Query timeout after 30s");
    }

    const stdout = result.stdout ?? "";
    const stderr = result.stderr ?? "";

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

    if (stderr.includes("ERROR")) {
      return {
        success: false,
        bindings: {},
        error: this.translateError(stderr),
      };
    }

    return {
      success: false,
      bindings: {},
      error: "Query failed",
    };
  }

  private normalizeGoal(goal: string): string {
    return goal.trim().replace(/\.+\s*$/, "");
  }

  private extractBindings(output: string): Record<string, string> {
    const bindings: Record<string, string> = {};
    const lines = output.split("\n");

    for (const line of lines) {
      const match = line.match(/^([A-Z_][A-Za-z0-9_]*)\s*=\s*(.+)\.?\s*$/);
      if (match) {
        const [, varName, value] = match;
        bindings[varName] = value.trim().replace(/\.$/, "").replace(/,$/, "");
      }
    }

    return bindings;
  }

  private translateError(errorText: string): string {
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
      return "Operation exceeded 30s timeout";
    }

    const simpleError = errorText
      .replace(/ERROR:\s*/g, "")
      .replace(/^\*\*.*\*\*$/gm, "")
      .replace(/^\s+/gm, "")
      .split("\n")[0]
      .trim();

    return simpleError || "Unknown error";
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  getPid(): number {
    return this.process?.pid || 0;
  }

  async terminate(): Promise<void> {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill("SIGTERM");

      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.process?.kill("SIGKILL");
          resolve(undefined);
        }, 1000);

        this.process?.on("exit", () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });

      this.process = null;
    }
  }
}

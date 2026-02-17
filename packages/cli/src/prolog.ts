import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

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

    const kbPath = path.resolve(import.meta.dir, "../../core/src/kb.pl");

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

  async query(goal: string): Promise<QueryResult> {
    if (!this.process || !this.process.stdin) {
      throw new Error("Prolog process not started");
    }

    this.outputBuffer = "";
    this.errorBuffer = "";

    this.process.stdin.write(`${goal}.\n`);

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
          resolve({
            success: true,
            bindings: this.extractBindings(this.outputBuffer),
          });
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

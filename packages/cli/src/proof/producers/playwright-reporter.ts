import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  PROOF_RUN_VERSION,
  type ProofAttempt,
  type ProofResult,
  type ProofRunArtifact,
} from "../../public/proof-protocol.js";
import {
  normalizePlaywrightSourceFile,
  playwrightCaseId,
} from "./playwright-case-id.js";

// implements REQ-kibi-proof-evidence-protocol
export { PROOF_RUN_VERSION };

// implements REQ-kibi-proof-evidence-protocol
export type KibiPlaywrightProducerOptions = Readonly<{
  outputPath?: string;
  codeSnapshot?: string;
  commandArgv?: readonly string[];
  integration?: string;
  workspaceRoot?: string;
  now?: () => Date;
}>;

function outputPath(options: KibiPlaywrightProducerOptions): string {
  const configured = options.outputPath ?? process.env.KIBI_PROOF_OUTPUT;
  if (!configured) throw new Error("KIBI_PROOF_OUTPUT is required");
  return path.resolve(configured);
}

function titlePath(test: unknown): string[] {
  const candidate = test as { titlePath?: () => unknown };
  const value = candidate.titlePath?.();
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function sourceLocation(test: unknown): { file: string; line: number } {
  const location = (test as { location?: { file?: string; line?: number } })
    .location;
  return {
    file: typeof location?.file === "string" ? location.file : "unknown",
    line: Number.isInteger(location?.line) ? Number(location?.line) : 1,
  };
}

function targetName(test: unknown, result: unknown): string {
  const project = (test as { project?: () => { name?: string } }).project?.();
  if (typeof project?.name === "string" && project.name) return project.name;
  const resultProject = (result as { projectName?: string }).projectName;
  return typeof resultProject === "string" && resultProject
    ? resultProject
    : "default";
}

function environment(): ProofRunArtifact["environment"] {
  return {
    os: process.platform,
    arch: process.arch,
    runtime: { name: "node", version: process.version },
  };
}

/**
 * First-party Playwright producer. It reports what happened as a
 * kibi.proof-run.v1 artifact with complete attempt history; Kibi evaluates
 * proof obligations and policies. Structural callback surface only — no
 * Playwright dependency.
 */
export class KibiPlaywrightProducer {
  private readonly options: KibiPlaywrightProducerOptions;
  private readonly results = new Map<string, ProofResult>();
  private startedAt: string;

  constructor(options: KibiPlaywrightProducerOptions = {}) {
    this.options = options;
    this.startedAt = (options.now ?? (() => new Date()))().toISOString();
  }

  // implements REQ-kibi-proof-evidence-protocol
  onBegin(): void {
    this.startedAt = (this.options.now ?? (() => new Date()))().toISOString();
  }

  // implements REQ-kibi-proof-evidence-protocol
  onTestEnd(test: unknown, result: unknown): void {
    const resultValue = result as {
      status?: string;
      duration?: number;
    };
    const titles = titlePath(test);
    const title = titles.join(" > ");
    const status = resultValue.status;
    const attempt: ProofAttempt = {
      outcome:
        status === "passed"
          ? "passed"
          : status === "timedOut"
            ? "timed_out"
            : status === "skipped"
              ? "skipped"
              : status === "interrupted"
                ? "interrupted"
                : "failed",
      ...(Number.isInteger(resultValue.duration)
        ? { duration_ms: Number(resultValue.duration) }
        : {}),
    };
    const location = sourceLocation(test);
    const sourceFile = normalizePlaywrightSourceFile(
      location.file,
      this.options.workspaceRoot ?? process.cwd(),
    );
    const symbol_id = playwrightCaseId(sourceFile, title);
    const target = targetName(test, result);
    const key = `${target}\0${symbol_id}`;
    const existing = this.results.get(key);
    if (existing && existing.attempts.status === "complete") {
      this.results.set(key, {
        ...existing,
        attempts: {
          status: "complete",
          entries: [...existing.attempts.entries, attempt],
        },
      });
      return;
    }
    this.results.set(key, {
      symbol_id,
      target,
      outcome: attempt.outcome,
      binding: "native_case",
      attempts: { status: "complete", entries: [attempt] },
    });
  }

  // implements REQ-kibi-proof-evidence-protocol
  async onEnd(result?: unknown): Promise<void> {
    const now = this.options.now ?? (() => new Date());
    const status = (result as { status?: string } | undefined)?.status;
    const commandArgv =
      this.options.commandArgv ??
      (process.env.KIBI_PROOF_COMMAND_ARGV
        ? (JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV) as string[])
        : []);
    const artifact: ProofRunArtifact = {
      version: PROOF_RUN_VERSION,
      producer: { name: "kibi-playwright-producer" },
      executor: { name: "playwright" },
      ...((this.options.integration ?? process.env.KIBI_PROOF_INTEGRATION)
        ? {
            integration: (this.options.integration ??
              process.env.KIBI_PROOF_INTEGRATION) as string,
          }
        : {}),
      command_argv: [...commandArgv],
      code_snapshot:
        this.options.codeSnapshot ?? process.env.KIBI_PROOF_SNAPSHOT ?? "",
      environment: environment(),
      run: {
        outcome: status === "passed" ? "passed" : "failed",
        exit_code: status === "passed" ? 0 : 1,
        started_at: this.startedAt,
        finished_at: now().toISOString(),
      },
      proof_results: [...this.results.values()],
    };
    const target = outputPath(this.options);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
}

export default KibiPlaywrightProducer;

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  normalizePlaywrightSourceFile,
  playwrightCaseId,
} from "../public/playwright-case-id.js";

// implements REQ-kibi-verification-evidence-contract
export const PLAYWRIGHT_RUN_VERSION = "kibi.playwright-run.v1" as const;

// implements REQ-kibi-verification-evidence-contract
export type KibiPlaywrightReporterOptions = Readonly<{
  outputPath?: string;
  codeSnapshot?: string;
  commandArgv?: readonly string[];
  environmentHash?: string;
  workspaceRoot?: string;
  now?: () => Date;
}>;

type CaseResult = {
  symbol_id: string;
  project: string;
  outcome: "passed" | "failed" | "timed_out" | "skipped" | "interrupted";
  retries: number;
  duration_ms: number;
};

function envHash(): string {
  const lockfile = process.env.KIBI_LOCKFILE_DIGEST ?? "unknown";
  return createHash("sha256")
    .update(
      JSON.stringify({
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        lockfile,
        projects: process.env.KIBI_VERIFICATION_PROJECTS ?? "",
      }),
    )
    .digest("hex");
}

function outputPath(options: KibiPlaywrightReporterOptions): string {
  const configured = options.outputPath ?? process.env.KIBI_VERIFICATION_OUTPUT;
  if (!configured) throw new Error("KIBI_VERIFICATION_OUTPUT is required");
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

function projectName(test: unknown, result: unknown): string {
  const project = (test as { project?: () => { name?: string } }).project?.();
  if (typeof project?.name === "string" && project.name) return project.name;
  const resultProject = (result as { projectName?: string }).projectName;
  return typeof resultProject === "string" && resultProject
    ? resultProject
    : "default";
}

/** Reporter callback surface intentionally uses structural types, no Playwright dependency. */
export class KibiPlaywrightReporter {
  private readonly options: KibiPlaywrightReporterOptions;
  private readonly cases: CaseResult[] = [];
  private startedAt: string;

  constructor(options: KibiPlaywrightReporterOptions = {}) {
    this.options = options;
    this.startedAt = (options.now ?? (() => new Date()))().toISOString();
  }

  // implements REQ-kibi-verification-evidence-contract
  onBegin(): void {
    this.startedAt = (this.options.now ?? (() => new Date()))().toISOString();
  }

  // implements REQ-kibi-verification-evidence-contract
  onTestEnd(test: unknown, result: unknown): void {
    const resultValue = result as {
      status?: string;
      retry?: number;
      duration?: number;
    };
    const location = sourceLocation(test);
    const titles = titlePath(test);
    const title = titles.join(" > ");
    const status = resultValue.status;
    const outcome: CaseResult["outcome"] =
      status === "passed"
        ? "passed"
        : status === "timedOut"
          ? "timed_out"
          : status === "skipped"
            ? "skipped"
            : "failed";
    const sourceFile = normalizePlaywrightSourceFile(
      location.file,
      this.options.workspaceRoot ?? process.cwd(),
    );
    this.cases.push({
      symbol_id: playwrightCaseId(sourceFile, title),
      project: projectName(test, result),
      outcome,
      retries: Number.isInteger(resultValue.retry)
        ? Number(resultValue.retry)
        : 0,
      duration_ms: Number.isInteger(resultValue.duration)
        ? Number(resultValue.duration)
        : 0,
    });
  }

  // implements REQ-kibi-verification-evidence-contract
  async onEnd(result?: unknown): Promise<void> {
    const now = this.options.now ?? (() => new Date());
    const status = (result as { status?: string } | undefined)?.status;
    const artifact = {
      version: PLAYWRIGHT_RUN_VERSION,
      runner: "playwright",
      command_argv: [
        ...(this.options.commandArgv ??
          (process.env.KIBI_VERIFICATION_COMMAND_ARGV
            ? JSON.parse(process.env.KIBI_VERIFICATION_COMMAND_ARGV)
            : [])),
      ],
      code_snapshot:
        this.options.codeSnapshot ??
        process.env.KIBI_VERIFICATION_SNAPSHOT ??
        "",
      environment_hash: this.options.environmentHash ?? envHash(),
      started_at: this.startedAt,
      finished_at: now().toISOString(),
      process_exit_code: status === "passed" ? 0 : 1,
      cases: this.cases,
    };
    const target = outputPath(this.options);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  }
}

export default KibiPlaywrightReporter;

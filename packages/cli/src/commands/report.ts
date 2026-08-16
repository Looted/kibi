import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type {
  OperationContext,
  RuntimeOperationSpec,
} from "../public/operations/runtime-types.js";
import { coverageSpec } from "../public/operations/specs/reporting.js";
import {
  type HtmlReportCoverage,
  renderHtmlReport,
} from "../report/html-report.js";
import { createCliRuntime } from "../runtime/cli-runtime.js";

export type ReportOptions = Readonly<{
  output?: string;
  open?: boolean;
  tag?: string;
  limit?: string;
}>;

type ReportCoverage = Readonly<{
  requirements: HtmlReportCoverage;
  symbols: HtmlReportCoverage;
  branch: string;
}>;

export type ReportCommandDeps = Readonly<{
  loadCoverage?: (
    tags: readonly string[],
    limit: number,
  ) => Promise<ReportCoverage>;
  openReport?: (filePath: string) => Promise<void>;
  now?: () => Date;
  cwd?: () => string;
}>;

function parseTags(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseLimit(value?: string): number {
  const raw = (value ?? "10000").trim();
  const limit = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100_000) {
    throw new Error("Report limit must be an integer between 1 and 100000");
  }
  return limit;
}

function reportTarget(root: string, output?: string): string {
  const requested = output?.trim() || "kibi-report";
  const absolute = path.resolve(root, requested);
  return [".html", ".htm"].includes(path.extname(absolute).toLowerCase())
    ? absolute
    : path.join(absolute, "index.html");
}

async function executeCoverageInContext(
  context: OperationContext,
  tags: readonly string[],
  limit: number,
): Promise<ReportCoverage> {
  const requirements = await coverageSpec.execute(
    {
      by: "req",
      tags,
      includePassing: true,
      includeTransitive: true,
      limit,
      offset: 0,
    },
    context,
  );
  const symbols = await coverageSpec.execute(
    {
      by: "symbol",
      tags,
      includePassing: false,
      includeTransitive: true,
      // Only the complete summary is needed for the unowned-code metric.
      limit: 0,
      offset: 0,
    },
    context,
  );
  if (!requirements.structuredContent || !symbols.structuredContent) {
    throw new Error("Coverage did not return structured report data");
  }
  return {
    requirements: requirements.structuredContent,
    symbols: symbols.structuredContent,
    branch:
      context.branchAttachment?.gitBranch ??
      String(requirements.structuredContent.meta?.branch ?? "unknown"),
  };
}

async function loadCoverage(
  tags: readonly string[],
  limit: number,
): Promise<ReportCoverage> {
  const runtime = createCliRuntime();
  const runtimeSpec = coverageSpec as RuntimeOperationSpec<unknown, unknown>;
  const context = await runtime.open(runtimeSpec);
  let result: ReportCoverage;
  try {
    result = await executeCoverageInContext(context, tags, limit);
  } catch (error) {
    await runtime.close(context, { status: "error", error });
    throw error;
  }
  await runtime.close(context, { status: "success", result });
  return result;
}

async function writeAtomically(
  filePath: string,
  contents: string,
): Promise<void> {
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${randomUUID()}.tmp`,
  );
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(temporaryPath, contents, "utf8");
    await rename(temporaryPath, filePath);
  } catch (error) {
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

export async function openReport(filePath: string): Promise<void> {
  const fileUrl = pathToFileURL(filePath).href;
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [fileUrl]]
      : process.platform === "win32"
        ? ["rundll32", ["url.dll,FileProtocolHandler", fileUrl]]
        : ["xdg-open", [fileUrl]];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function assertCompleteRequirementRows(
  coverage: HtmlReportCoverage,
  limit: number,
): void {
  const total = Number(coverage.summary.total ?? 0);
  if (Number.isFinite(total) && coverage.rows.length < total) {
    throw new Error(
      `Report requires complete requirement rows, but ${coverage.rows.length} of ${total} were returned. Increase --limit above ${limit}.`,
    );
  }
}

// implements REQ-kibi-html-health-report
export async function reportCommand(
  options: ReportOptions,
  deps: ReportCommandDeps = {},
): Promise<string> {
  const limit = parseLimit(options.limit);
  const tags = parseTags(options.tag);
  const coverage = await (deps.loadCoverage ?? loadCoverage)(tags, limit);
  assertCompleteRequirementRows(coverage.requirements, limit);

  const now = (deps.now ?? (() => new Date()))();
  const html = renderHtmlReport({
    requirements: coverage.requirements,
    symbols: coverage.symbols,
    branch: coverage.branch,
    generatedAt: now,
  });
  const outputPath = reportTarget(
    (deps.cwd ?? (() => process.cwd()))(),
    options.output,
  );
  await writeAtomically(outputPath, html);

  console.log(`Kibi report written to ${outputPath}`);
  if (options.open === true) {
    await (deps.openReport ?? openReport)(outputPath);
    console.log("Opened Kibi report in the default browser");
  }
  return outputPath;
}

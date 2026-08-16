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
  const requestedOutput = options.output?.trim() || "kibi-report";
  const outputIsHtmlFile = [".html", ".htm"].includes(
    path.extname(requestedOutput).toLowerCase(),
  );
  const badgePath = outputIsHtmlFile
    ? path.join(
        path.dirname(outputPath),
        `${path.basename(outputPath, path.extname(outputPath))}.badge.svg`,
      )
    : path.join(path.dirname(outputPath), "badge.svg");

  const summary = coverage.requirements.summary;
  const total = Number(summary.total ?? 0);
  const notApplicable = Number(summary.proofNotApplicable ?? 0);
  const proven = Number(summary.proofProven ?? 0);
  const currentRequirements = Math.max(0, total - notApplicable);
  const proofPercent =
    currentRequirements === 0
      ? 0
      : Math.round((proven / currentRequirements) * 100);
  const hasContradiction = coverage.requirements.rows.some(
    (row) =>
      Array.isArray(row.proofGaps) &&
      row.proofGaps.includes("blocking_contradiction"),
  );
  const snapshotStale =
    coverage.requirements.meta?.dirty === true ||
    coverage.requirements.meta?.verificationSnapshotDirty === true;
  const badgeMessage =
    currentRequirements === 0 ? "no requirements" : `${proofPercent}% proven`;
  const badgeColor =
    currentRequirements === 0
      ? "#6b7280"
      : hasContradiction
        ? "#d14d64"
        : snapshotStale
          ? "#c68a2b"
          : proofPercent === 100
            ? "#2fba83"
            : proofPercent >= 90
              ? "#4a9f78"
              : proofPercent >= 70
                ? "#c68a2b"
                : "#d14d64";
  const badge = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="kibi: ${badgeMessage}" width="138" height="20">
  <title>kibi: ${badgeMessage}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>
  <clipPath id="r"><rect width="138" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="36" height="20" fill="#4b3f72"/>
    <rect x="36" width="102" height="20" fill="${badgeColor}"/>
    <rect width="138" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="18" y="15" fill="#010101" fill-opacity=".3">kibi</text>
    <text x="18" y="14">kibi</text>
    <text x="87" y="15" fill="#010101" fill-opacity=".3">${badgeMessage}</text>
    <text x="87" y="14">${badgeMessage}</text>
  </g>
</svg>`;

  await writeAtomically(outputPath, html);
  await writeAtomically(badgePath, badge);

  console.log(`Kibi report written to ${outputPath}`);
  console.log(`Kibi badge written to ${badgePath}`);
  if (options.open === true) {
    await (deps.openReport ?? openReport)(outputPath);
    console.log("Opened Kibi report in the default browser");
  }
  return outputPath;
}

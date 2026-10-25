import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type {
  OperationContext,
  RuntimeOperationSpec,
} from "../public/operations/runtime-types.js";
import { coverageSpec } from "../public/operations/specs/reporting.js";
import { KIBI_BRAND, renderKibiBadge } from "../report/brand.js";
import {
  type HtmlReportCoverage,
  type HtmlReportKbCertificates,
  renderHtmlReport,
} from "../report/html-report.js";
import {
  type ReportRepository,
  resolveReportRepository,
} from "../report/repository.js";
import { listGitRemotes } from "./github-init.js";

export type ReportOptions = Readonly<{
  output?: string;
  open?: boolean;
  tag?: string;
  limit?: string;
  certificates?: string;
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
  repository?: ReportRepository;
}>;

function gitCommitSha(cwd: string): string | undefined {
  try {
    const sha = execFileSync("git", ["-C", cwd, "rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return /^[0-9a-f]{7,64}$/i.test(sha) ? sha : undefined;
  } catch {
    return undefined;
  }
}

function loadReportRepository(cwd: string, branch: string): ReportRepository {
  const commitSha = gitCommitSha(cwd);
  return resolveReportRepository({
    remotes: listGitRemotes(cwd),
    ...(commitSha ? { commitSha } : {}),
    branch,
  });
}

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
  // Lazy-load the CLI runtime so coverage suites that inject loadCoverage do
  // not pull the engine/plugin graph into every reportCommand import.
  const { createCliRuntime } = await import("../runtime/cli-runtime.js");
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
    const timer = setTimeout(() => {
      try {
        child.unref();
      } catch {
        // Best-effort unref if the child never spawned.
      }
      reject(new Error(`Timed out opening report via ${command}`));
    }, 5_000);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("spawn", () => {
      clearTimeout(timer);
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

const KB_CERTIFICATES_VERSION = "kibi.certificates.v1";

/**
 * Read a saved kibi check --write-certificates bundle, so the report can
 * publish it next to the page and say how many certificates it holds.
 */
// implements REQ-kibi-kb-certificates
async function readKbCertificates(
  bundlePath: string,
): Promise<{ raw: string; certificates: readonly unknown[] }> {
  const raw = await readFile(bundlePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`report: ${bundlePath} is not JSON`);
  }
  const bundle =
    parsed !== null && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  if (
    bundle.version !== KB_CERTIFICATES_VERSION ||
    !Array.isArray(bundle.certificates)
  )
    throw new Error(
      `report: ${bundlePath} is not a ${KB_CERTIFICATES_VERSION} bundle (write one with kibi check --write-certificates)`,
    );
  return { raw, certificates: bundle.certificates };
}

function certificateKinds(
  certificates: readonly unknown[],
): Readonly<Record<string, number>> {
  const kinds: Record<string, number> = {};
  for (const certificate of certificates) {
    const kind =
      certificate !== null &&
      typeof certificate === "object" &&
      typeof (certificate as Record<string, unknown>).kind === "string"
        ? ((certificate as Record<string, unknown>).kind as string)
        : "unknown";
    kinds[kind] = (kinds[kind] ?? 0) + 1;
  }
  return kinds;
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
  const workspace = (deps.cwd ?? (() => process.cwd()))();
  const outputPath = reportTarget(workspace, options.output);
  const requestedOutput = options.output?.trim() || "kibi-report";
  const outputIsHtmlFile = [".html", ".htm"].includes(
    path.extname(requestedOutput).toLowerCase(),
  );
  const kbCertificatesSource =
    options.certificates?.trim() === undefined ||
    options.certificates.trim() === ""
      ? undefined
      : await readKbCertificates(
          path.resolve(workspace, options.certificates.trim()),
        );
  const kbCertificatesPath = outputIsHtmlFile
    ? path.join(
        path.dirname(outputPath),
        `${path.basename(outputPath, path.extname(outputPath))}.kb-certificates.json`,
      )
    : path.join(path.dirname(outputPath), "kb-certificates.json");
  const kbCertificates: HtmlReportKbCertificates | undefined =
    kbCertificatesSource === undefined
      ? undefined
      : {
          count: kbCertificatesSource.certificates.length,
          kinds: certificateKinds(kbCertificatesSource.certificates),
          href: path.basename(kbCertificatesPath),
        };
  const html = renderHtmlReport({
    requirements: coverage.requirements,
    symbols: coverage.symbols,
    branch: coverage.branch,
    generatedAt: now,
    repository:
      deps.repository ?? loadReportRepository(workspace, coverage.branch),
    ...(kbCertificates === undefined ? {} : { kbCertificates }),
  });
  const badgePath = outputIsHtmlFile
    ? path.join(
        path.dirname(outputPath),
        `${path.basename(outputPath, path.extname(outputPath))}.badge.svg`,
      )
    : path.join(path.dirname(outputPath), "badge.svg");

  const summary = coverage.requirements.summary;
  const total = Number(summary.total ?? 0);
  const notApplicable = Number(summary.proofNotApplicable ?? 0);
  const tested = Number(summary.proofTested ?? 0);
  const currentRequirements = Math.max(0, total - notApplicable);
  const proofPercent =
    currentRequirements === 0
      ? 0
      : Math.round((tested / currentRequirements) * 100);
  const hasContradiction = coverage.requirements.rows.some(
    (row) =>
      Array.isArray(row.proofGaps) &&
      row.proofGaps.includes("blocking_contradiction"),
  );
  // implements REQ-kibi-evidence-floors
  // A requirement below its evidence floor fails kibi check, like a
  // contradiction, so the badge turns red whatever the tested share.
  const belowFloor = coverage.requirements.rows.some((row) => {
    const floor = row.evidenceFloor;
    return (
      row.proofStatus !== "not_applicable" &&
      floor !== null &&
      typeof floor === "object" &&
      (floor as Record<string, unknown>).status === "below" &&
      (floor as Record<string, unknown>).required !== "unverified"
    );
  });
  const snapshotStale =
    coverage.requirements.meta?.dirty === true ||
    coverage.requirements.meta?.proofSnapshotDirty === true;
  const badgeMessage =
    currentRequirements === 0 ? "no requirements" : `${proofPercent}% tested`;
  const badgeColor =
    currentRequirements === 0
      ? KIBI_BRAND.rail
      : hasContradiction || belowFloor
        ? KIBI_BRAND.danger
        : snapshotStale
          ? KIBI_BRAND.warning
          : proofPercent === 100
            ? KIBI_BRAND.success
            : proofPercent >= 90
              ? KIBI_BRAND.signal
              : proofPercent >= 70
                ? KIBI_BRAND.warning
                : KIBI_BRAND.danger;
  const badge = renderKibiBadge(badgeMessage, badgeColor);

  await writeAtomically(outputPath, html);
  await writeAtomically(badgePath, badge);
  if (kbCertificatesSource !== undefined)
    await writeAtomically(kbCertificatesPath, kbCertificatesSource.raw);

  console.log(`Kibi report written to ${outputPath}`);
  console.log(`Kibi badge written to ${badgePath}`);
  if (kbCertificatesSource !== undefined)
    console.log(`KB certificates written to ${kbCertificatesPath}`);
  if (options.open === true) {
    await (deps.openReport ?? openReport)(outputPath);
    console.log("Opened Kibi report in the default browser");
  }
  return outputPath;
}

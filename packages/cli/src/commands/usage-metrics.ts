import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Table from "cli-table3";
import type { CommandResult } from "../cli.js";
import {
  type TelemetryAcceptanceReport,
  type TelemetryUsageEvent,
  analyzeTelemetryAcceptance,
  parseTelemetryUsageLog,
} from "../public/telemetry-acceptance.js";

export interface UsageMetricsOptions {
  format?: "json" | "table";
  limit?: string;
  requireAcceptance?: boolean;
}

export interface UsageLogRow extends TelemetryUsageEvent {
  branch?: string;
  active_branch?: string;
  sourceFile?: string;
  args?: {
    sourceFile?: string;
    [key: string]: unknown;
  };
  business_args?: Readonly<{
    sourceFile?: string;
    [key: string]: unknown;
  }>;
  result_summary?: string;
  violation_count?: number;
  error?: string;
  error_message?: string;
  error_category?: string;
  error_stage?: string;
}

export interface UsageMetricsReport {
  rowCount: number;
  dateRange: {
    first: string | null;
    last: string | null;
  };
  toolCounts: Record<string, number>;
  branchCounts: Record<string, number>;
  outcomeCounts: {
    success: number;
    error: number;
  };
  telemetry: {
    completeCount: number;
    missingCount: number;
    completenessRate: number;
  };
  zeroResults: {
    count: number;
    rate: number;
    byTool: Record<string, number>;
    topSourceFiles: Array<{
      sourceFile: string;
      count: number;
    }>;
  };
  kbCheck: {
    violationTrend: Array<{
      timestamp: string;
      violationCount: number;
    }>;
  };
  upsertErrors: {
    categories: Record<string, number>;
  };
  errors: {
    categories: Record<string, number>;
    stages: Record<string, number>;
    byTool: Record<string, number>;
  };
  acceptance: TelemetryAcceptanceReport;
}

// implements REQ-003
export async function usageMetricsCommand(
  options: UsageMetricsOptions,
): Promise<CommandResult | undefined> {
  const limit = Number.parseInt(options.limit || "10", 10);
  if (!Number.isFinite(limit) || limit < 1) {
    console.error("Error: --limit must be a positive integer");
    return { exitCode: 1 };
  }

  const usageLogPath = path.join(process.cwd(), ".kb", "usage.log");
  if (!existsSync(usageLogPath)) {
    console.error(`Error: usage log not found at ${usageLogPath}`);
    return { exitCode: 1 };
  }

  const rows = parseUsageLog(readFileSync(usageLogPath, "utf8"));
  const report = buildUsageMetricsReport(rows, limit);
  const gateResult =
    options.requireAcceptance === true && report.acceptance.status !== "passed"
      ? { exitCode: 1 as const }
      : undefined;

  if (options.format === "json") {
    console.log(JSON.stringify(report, null, 2));
    return gateResult;
  }

  console.log(renderUsageMetricsReport(report));
  if (gateResult) {
    console.error(
      `Telemetry acceptance gate: ${report.acceptance.status}. Review the acceptance metrics and quality diagnostics before completion.`,
    );
  }
  return gateResult;
}

export function parseUsageLog(contents: string): UsageLogRow[] {
  return parseTelemetryUsageLog(contents) as UsageLogRow[];
}

export function buildUsageMetricsReport(
  rows: UsageLogRow[],
  limit: number,
  now: Date = new Date(),
): UsageMetricsReport {
  const timestamps = rows
    .map((row) => row.timestamp)
    .filter((value): value is string => typeof value === "string")
    .sort((left, right) => left.localeCompare(right));

  const toolCounts = new Map<string, number>();
  const branchCounts = new Map<string, number>();
  const zeroResultToolCounts = new Map<string, number>();
  const zeroResultSourceFileCounts = new Map<string, number>();
  const upsertErrorCategories = new Map<string, number>();
  const errorCategories = new Map<string, number>();
  const errorStages = new Map<string, number>();
  const errorsByTool = new Map<string, number>();
  const violationTrend: Array<{ timestamp: string; violationCount: number }> =
    [];

  let successCount = 0;
  let errorCount = 0;
  let telemetryCompleteCount = 0;
  let telemetryMissingCount = 0;
  let zeroResultCount = 0;

  for (const row of rows) {
    increment(toolCounts, countKey(row.tool));
    increment(branchCounts, countKey(row.active_branch || row.branch));

    const outcome = getOutcome(row);
    if (outcome === "success") {
      successCount += 1;
    }
    if (outcome === "error") {
      errorCount += 1;
      const category =
        row.error_category ?? categorizeError(row.error_message ?? row.error);
      increment(errorCategories, category);
      increment(
        errorStages,
        row.error_stage ?? inferErrorStage(row.error_message ?? row.error),
      );
      increment(errorsByTool, countKey(row.tool));
    }

    if (hasCompleteTelemetry(row)) {
      telemetryCompleteCount += 1;
    } else {
      telemetryMissingCount += 1;
    }

    if (isZeroResult(row)) {
      zeroResultCount += 1;
      increment(zeroResultToolCounts, countKey(row.tool));

      const sourceFile = getSourceFile(row);
      if (sourceFile) {
        increment(zeroResultSourceFileCounts, sourceFile);
      }
    }

    if (
      row.tool === "kb_check" &&
      typeof row.violation_count === "number" &&
      typeof row.timestamp === "string"
    ) {
      violationTrend.push({
        timestamp: row.timestamp,
        violationCount: row.violation_count,
      });
    }

    if (row.tool === "kb_upsert" && outcome === "error") {
      increment(
        upsertErrorCategories,
        categorizeError(row.error_message ?? row.error),
      );
    }
  }

  violationTrend.sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  );

  return {
    rowCount: rows.length,
    dateRange: {
      first: timestamps[0] ?? null,
      last: timestamps.at(-1) ?? null,
    },
    toolCounts: mapToSortedObject(toolCounts),
    branchCounts: mapToSortedObject(branchCounts),
    outcomeCounts: {
      success: successCount,
      error: errorCount,
    },
    telemetry: {
      completeCount: telemetryCompleteCount,
      missingCount: telemetryMissingCount,
      completenessRate:
        rows.length === 0 ? 0 : telemetryCompleteCount / rows.length,
    },
    zeroResults: {
      count: zeroResultCount,
      rate: rows.length === 0 ? 0 : zeroResultCount / rows.length,
      byTool: mapToSortedObject(zeroResultToolCounts),
      topSourceFiles: sortCountEntries(zeroResultSourceFileCounts)
        .slice(0, limit)
        .map(([sourceFile, count]) => ({ sourceFile, count })),
    },
    kbCheck: {
      violationTrend,
    },
    upsertErrors: {
      categories: mapToSortedObject(upsertErrorCategories),
    },
    errors: {
      categories: mapToSortedObject(errorCategories),
      stages: mapToSortedObject(errorStages),
      byTool: mapToSortedObject(errorsByTool),
    },
    acceptance: analyzeTelemetryAcceptance(rows, now),
  };
}

function hasCompleteTelemetry(row: UsageLogRow): boolean {
  if (row.telemetry_status === "provided") {
    return true;
  }
  if (row.telemetry_status === "missing") {
    return false;
  }
  return row.telemetry !== null && row.telemetry !== undefined;
}

function getOutcome(row: UsageLogRow): "success" | "error" | null {
  if (row.status === "success" || row.status === "error") {
    return row.status;
  }
  if (row.success === true) {
    return "success";
  }
  if (row.success === false) {
    return "error";
  }
  return null;
}

function isZeroResult(row: UsageLogRow): boolean {
  if (row.zero_results === true) {
    return true;
  }
  if (row.zero_results === false) {
    return false;
  }
  if (row.result_count === 0) {
    return true;
  }
  return row.result_summary === "0 results";
}

function getSourceFile(row: UsageLogRow): string | null {
  const candidates = [
    row.sourceFile,
    row.args?.sourceFile,
    row.business_args?.sourceFile,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

function categorizeError(errorMessage: string | undefined): string {
  if (!errorMessage) {
    return "Unknown error";
  }

  const lower = errorMessage.toLowerCase();

  if (lower.includes("stale_snapshot")) {
    return "stale_snapshot";
  }

  if (lower.includes("unknown option") && lower.includes("h for help")) {
    return "prolog_unknown_option";
  }

  if (lower.includes("prolog process not started")) {
    return "prolog_process_not_started";
  }

  if (lower.includes("coarsely while granular symbols are available")) {
    return "coarse_symbol_linkage";
  }

  if (lower.includes("module load failed")) {
    return "prolog_module_load_failed";
  }

  if (lower.includes("query failed")) {
    return "prolog_query_failed";
  }

  if (errorMessage.startsWith("Entity validation failed:")) {
    return "Entity validation failed";
  }

  if (
    errorMessage.startsWith(
      "Relationship source must match the upserted entity",
    )
  ) {
    return "Relationship source must match the upserted entity";
  }

  const semicolonIndex = errorMessage.indexOf(";");
  if (semicolonIndex > 0) {
    return errorMessage.slice(0, semicolonIndex).trim();
  }

  const colonIndex = errorMessage.indexOf(":");
  if (colonIndex > 0) {
    return errorMessage.slice(0, colonIndex).trim();
  }
  return errorMessage.trim() || "Unknown error";
}

function inferErrorStage(errorMessage: string | undefined): string {
  if (!errorMessage) {
    return "unknown";
  }

  const lower = errorMessage.toLowerCase();

  if (lower.includes("stale_snapshot")) {
    return "persistence";
  }

  if (
    lower.includes("unknown option") ||
    lower.includes("module load failed") ||
    lower.includes("query failed")
  ) {
    return "prolog_runtime";
  }

  if (lower.includes("prolog process not started")) {
    return "prolog_lifecycle";
  }

  if (
    lower.includes("validation failed") ||
    lower.includes("relationship source must match") ||
    lower.includes("coarsely while granular symbols are available")
  ) {
    return "validation";
  }

  return "unknown";
}

function increment(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function countKey(value: string | undefined): string {
  return typeof value === "string" && value.trim() ? value : "unknown";
}

function sortCountEntries(
  counts: Map<string, number>,
): Array<[string, number]> {
  return [...counts.entries()].sort(
    ([leftKey, leftCount], [rightKey, rightCount]) =>
      rightCount - leftCount || leftKey.localeCompare(rightKey),
  );
}

function mapToSortedObject(
  counts: Map<string, number>,
): Record<string, number> {
  return Object.fromEntries(sortCountEntries(counts));
}

function renderUsageMetricsReport(report: UsageMetricsReport): string {
  const sections = [
    renderSummaryTable(report),
    renderAcceptanceTable(report.acceptance),
    renderCountsTable("Tool Counts", "Tool", report.toolCounts),
    renderCountsTable("Branch Counts", "Branch", report.branchCounts),
    renderCountsTable("Outcome Counts", "Outcome", report.outcomeCounts),
    renderTelemetryTable(report),
    renderZeroResultsTable(report),
    renderViolationTrendTable(report),
    renderCountsTable(
      "Upsert Error Categories",
      "Category",
      report.upsertErrors.categories,
    ),
    renderCountsTable("Error Categories", "Category", report.errors.categories),
    renderCountsTable("Error Stages", "Stage", report.errors.stages),
    renderCountsTable("Errors By Tool", "Tool", report.errors.byTool),
  ];

  return sections.join("\n\n");
}

function renderTable(
  head: string[],
  colWidths: number[],
  rows: string[][],
): string {
  const table = new Table({ head, colWidths, wordWrap: true });
  table.push(...rows);
  return table.toString();
}

/** Count rows, or one placeholder row when there is nothing to count. */
function countRows(rows: string[][]): string[][] {
  return rows.length === 0 ? [["-", "0"]] : rows;
}

function renderAcceptanceTable(report: TelemetryAcceptanceReport): string {
  return [
    `Telemetry Acceptance (${report.version})`,
    `Status: ${report.status}; evidence fresh: ${report.scope.fresh ? "yes" : "no"}`,
    renderTable(
      ["Metric", "Status", "Observed", "Rate"],
      [36, 24, 18, 14],
      report.metrics.map((metric) => [
        metric.id,
        metric.status,
        `${metric.numerator}/${metric.denominator}`,
        metric.rate === undefined ? "-" : formatRate(metric.rate),
      ]),
    ),
  ].join("\n");
}

function renderSummaryTable(report: UsageMetricsReport): string {
  return renderTable(
    ["Field", "Value"],
    [24, 56],
    [
      ["Row Count", String(report.rowCount)],
      ["First Timestamp", report.dateRange.first ?? "-"],
      ["Last Timestamp", report.dateRange.last ?? "-"],
    ],
  );
}

function renderCountsTable(
  title: string,
  label: string,
  counts: Record<string, number>,
): string {
  const rows = Object.entries(counts).map(([key, count]) => [
    key,
    String(count),
  ]);
  return `${title}\n${renderTable([label, "Count"], [48, 12], countRows(rows))}`;
}

function renderTelemetryTable(report: UsageMetricsReport): string {
  return `Telemetry\n${renderTable(
    ["Metric", "Value"],
    [32, 28],
    [
      ["Complete", String(report.telemetry.completeCount)],
      ["Missing", String(report.telemetry.missingCount)],
      ["Completeness Rate", formatRate(report.telemetry.completenessRate)],
    ],
  )}`;
}

function renderZeroResultsTable(report: UsageMetricsReport): string {
  return [
    "Zero Results",
    renderTable(
      ["Metric", "Value"],
      [32, 28],
      [
        ["Count", String(report.zeroResults.count)],
        ["Rate", formatRate(report.zeroResults.rate)],
      ],
    ),
    renderCountsTable(
      "Zero-Result Counts By Tool",
      "Tool",
      report.zeroResults.byTool,
    ),
    "Zero-Result Source Files",
    renderTable(
      ["Source File", "Zero Results"],
      [48, 14],
      countRows(
        report.zeroResults.topSourceFiles.map((entry) => [
          entry.sourceFile,
          String(entry.count),
        ]),
      ),
    ),
  ].join("\n");
}

function renderViolationTrendTable(report: UsageMetricsReport): string {
  const rows = report.kbCheck.violationTrend.map((entry) => [
    entry.timestamp,
    String(entry.violationCount),
  ]);
  return `KB Check Violation Trend\n${renderTable(["Timestamp", "Violations"], [32, 12], countRows(rows))}`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import Table from "cli-table3";
import type { CommandResult } from "../cli.js";
import {
  type TelemetryRemediationReport,
  buildTelemetryRemediationReport,
} from "../public/telemetry-remediation.js";
import { parseTelemetryUsageLog } from "../public/telemetry-acceptance.js";

export interface UsageRemediationOptions {
  readonly format?: "json" | "table";
  readonly limit?: string;
}

export function renderUsageRemediationReport(
  report: TelemetryRemediationReport,
  limit: number
): string {
  const table = new Table({
    head: ["Rank", "Metric", "Line", "Target", "Reason", "Repair"],
    colWidths: [7, 28, 8, 26, 42, 48],
    wordWrap: true,
  });
  for (const item of report.items.slice(0, limit)) {
    table.push([
      item.rank,
      item.metric,
      item.event?.logLine ?? "report",
      item.target,
      item.reason,
      item.action,
    ]);
  }
  const suffix =
    report.items.length > limit
      ? `\nShowing ${limit}/${report.items.length} remediation items.`
      : "";
  return (
    [
      `Telemetry remediation: ${report.status} (${report.summary.eventItems} event, ${report.summary.reportItems} report-level)`,
      table.toString(),
    ].join("\n") + suffix
  );
}

export async function usageRemediationCommand(
  options: UsageRemediationOptions
): Promise<CommandResult | undefined> {
  const limit = Number.parseInt(options.limit ?? "50", 10);
  if (!Number.isFinite(limit) || limit < 1) {
    console.error("Error: --limit must be a positive integer");
    return { exitCode: 1 };
  }
  if (
    options.format !== undefined &&
    !["json", "table"].includes(options.format)
  ) {
    console.error("Error: --format must be json or table");
    return { exitCode: 1 };
  }
  const usageLogPath = path.join(process.cwd(), ".kb", "usage.log");
  if (!existsSync(usageLogPath)) {
    console.error(`Error: usage log not found at ${usageLogPath}`);
    return { exitCode: 1 };
  }
  const events = parseTelemetryUsageLog(readFileSync(usageLogPath, "utf8"));
  const report = buildTelemetryRemediationReport(events);
  console.log(
    options.format === "json"
      ? JSON.stringify(report, null, 2)
      : renderUsageRemediationReport(report, limit)
  );
  return undefined;
}

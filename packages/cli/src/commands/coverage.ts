import { coverageSpec } from "../public/operations/specs/reporting.js";
import {
  executeReportingSpec,
  printDiscoveryResult,
} from "./discovery-shared.js";

interface CoverageOptions {
  by?: "req" | "symbol" | "type";
  tag?: string;
  includePassing?: boolean;
  status?: string;
  includeTransitive?: boolean;
  limit?: string;
  offset?: string;
  includeMigrationPreview?: boolean;
  migrationLimit?: string;
  migrationOffset?: string;
  migrationPredicateLimit?: string;
  migrationPredicateMinScore?: string;
  format?: "json" | "table";
  cases?: boolean;
}

// implements REQ-002, REQ-003
export async function coverageCommand(options: CoverageOptions): Promise<void> {
  const result = await executeReportingSpec(coverageSpec, {
    by: options.by ?? "req",
    tags: options.tag
      ? options.tag
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    includePassing: options.includePassing ?? false,
    statuses: options.status
      ? options.status
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    includeTransitive: options.includeTransitive ?? true,
    limit: Number.parseInt(options.limit || "100", 10),
    offset: Number.parseInt(options.offset || "0", 10),
    includeMigrationPreview: options.includeMigrationPreview ?? false,
    migrationLimit: Number.parseInt(options.migrationLimit || "1", 10),
    migrationOffset: Number.parseInt(options.migrationOffset || "0", 10),
    migrationPredicateLimit: Number.parseInt(
      options.migrationPredicateLimit || "5",
      10,
    ),
    migrationPredicateMinScore: Number.parseFloat(
      options.migrationPredicateMinScore || "0.35",
    ),
  });
  if (options.cases === true) {
    printCaseTable(options.format, result.structuredContent);
    return;
  }
  printDiscoveryResult(
    options.format,
    result.structuredContent,
    result.content[0]?.text ?? "Coverage summary unavailable.",
  );
}

type CaseRow = {
  caseId: string;
  factId: string;
  constraint: string;
  predicted: string;
  coverage: string;
  scenarios?: string[];
  assumption?: Record<string, unknown>;
};

// implements REQ-kibi-case-coverage
// The edge cases of each returned requirement: one line per case with its
// predicted outcome and coverage, and the assumption an uncovered rejection
// case needs.  JSON keeps the requirement id with its cases stage.
function printCaseTable(
  format: "json" | "table" | undefined,
  structured: unknown,
): void {
  const rows = Array.isArray((structured as { rows?: unknown })?.rows)
    ? ((structured as { rows: unknown[] }).rows as Record<string, unknown>[])
    : [];
  const withCases = rows.flatMap((row) => {
    const stages = row.proofStages as Record<string, unknown> | undefined;
    const stage = stages?.cases as
      | { status?: string; cases?: CaseRow[]; summary?: Record<string, number> }
      | undefined;
    return stage?.cases?.length ? [{ id: String(row.id), stage }] : [];
  });
  if (format === "json") {
    console.log(
      JSON.stringify(
        { rows: withCases.map(({ id, stage }) => ({ id, cases: stage })) },
        null,
        2,
      ),
    );
    return;
  }
  if (withCases.length === 0) {
    console.log("No requirement in this page has derived edge cases.");
    return;
  }
  const lines: string[] = [];
  for (const { id, stage } of withCases) {
    const summary = stage.summary ?? {};
    lines.push(
      `${id}: ${stage.status} (${summary.covered ?? 0} covered, ${summary.uncovered ?? 0} uncovered, ${summary.unspecified ?? 0} unspecified, ${summary.waived ?? 0} waived)`,
    );
    for (const row of stage.cases ?? []) {
      const where =
        row.coverage === "covered"
          ? ` by ${(row.scenarios ?? []).join(", ")}`
          : "";
      lines.push(
        `  ${row.caseId} ${row.factId} ${row.constraint} -> ${row.predicted}: ${row.coverage}${where}`,
      );
      if (row.coverage === "uncovered" && row.predicted === "rejection")
        lines.push(`    assumes ${JSON.stringify(row.assumption ?? {})}`);
    }
  }
  console.log(lines.join("\n"));
}

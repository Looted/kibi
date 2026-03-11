/**
 * Diagnostic categories for drift detection and sync failures
 *
 * These categories provide stable identifiers for common failure modes,
 * making it easier for both CLI users and MCP consumers to understand
 * and respond to issues programmatically.
 */

export type DiagnosticCategory =
  | "BRANCH_RESOLUTION_FAILURE"
  | "KB_MISSING"
  | "DOCS_NOT_INDEXED"
  | "INVALID_AUTHORING"
  | "SYNC_ERROR"
  | "EXTRACTION_ERROR"
  | "RELATIONSHIP_ERROR";

export interface Diagnostic {
  category: DiagnosticCategory;
  severity: "error" | "warning";
  message: string;
  file?: string;
  suggestion?: string;
}

export interface SyncSummary {
  branch: string;
  commit?: string;
  timestamp: string;
  entityCounts: Record<string, number>;
  relationshipCount: number;
  success: boolean;
  published: boolean;
  failures: Diagnostic[];
  durationMs?: number;
}

/**
 * Branch resolution error codes mapping to diagnostic categories
 */
export type BranchErrorCode =
  | "DETACHED_HEAD"
  | "UNBORN_BRANCH"
  | "GIT_NOT_AVAILABLE"
  | "NOT_A_GIT_REPO"
  | "ENV_OVERRIDE"
  | "UNKNOWN_ERROR";

/**
 * Convert branch error code to diagnostic category
 */
export function branchErrorToDiagnostic(
  code: BranchErrorCode,
  message: string,
  branch?: string,
): Diagnostic {
  return {
    category: "BRANCH_RESOLUTION_FAILURE",
    severity: "error",
    message: `Failed to resolve active branch: ${message}`,
    suggestion: branch
      ? `Detected branch: ${branch}. Set KIBI_BRANCH environment variable to explicitly specify the branch.`
      : "Set KIBI_BRANCH environment variable or ensure you're in a git repository with a valid checked-out branch.",
  };
}

/**
 * Create KB_MISSING diagnostic
 */
export function createKbMissingDiagnostic(
  branch: string,
  path: string,
): Diagnostic {
  return {
    category: "KB_MISSING",
    severity: "warning",
    message: `Branch KB does not exist for '${branch}'`,
    suggestion: `Run 'kibi sync' to create the KB at ${path}`,
  };
}

/**
 * Create DOCS_NOT_INDEXED diagnostic
 */
export function createDocsNotIndexedDiagnostic(
  docCount: number,
  entityCount: number,
): Diagnostic {
  return {
    category: "DOCS_NOT_INDEXED",
    severity: "warning",
    message: `${docCount} markdown files found but only ${entityCount} entities in KB`,
    suggestion:
      "Some documents may have extraction errors. Run 'kibi sync --validate-only' to check.",
  };
}

/**
 * Create INVALID_AUTHORING diagnostic for embedded entities
 */
export function createInvalidAuthoringDiagnostic(
  filePath: string,
  embeddedTypes: string[],
): Diagnostic {
  return {
    category: "INVALID_AUTHORING",
    severity: "error",
    message: `Requirement contains embedded ${embeddedTypes.join(" and ")} fields`,
    file: filePath,
    suggestion: `Move ${embeddedTypes.join(" and ")} to separate entity files and link them using 'links' with relationship types like 'specified_by' or 'verified_by'.`,
  };
}

/**
 * Format sync summary for CLI output
 */
export function formatSyncSummary(summary: SyncSummary): string {
  const lines: string[] = [];
  lines.push("═══ Sync Summary ═══");
  lines.push(`Branch: ${summary.branch}`);
  if (summary.commit) {
    lines.push(`Commit: ${summary.commit.slice(0, 8)}`);
  }
  lines.push(`Timestamp: ${summary.timestamp}`);
  lines.push("");

  // Entity counts by type
  lines.push("Entity Counts:");
  const sortedTypes = Object.keys(summary.entityCounts).sort();
  if (sortedTypes.length === 0) {
    lines.push("  (none)");
  } else {
    for (const type of sortedTypes) {
      lines.push(`  ${type}: ${summary.entityCounts[type]}`);
    }
  }
  lines.push(`Total Relationships: ${summary.relationshipCount}`);
  lines.push("");

  // Status
  lines.push(`Status: ${summary.success ? "✓ Success" : "✗ Failed"}`);
  lines.push(`Published: ${summary.published ? "Yes" : "No"}`);

  if (summary.durationMs !== undefined) {
    lines.push(`Duration: ${summary.durationMs}ms`);
  }

  // Failures
  if (summary.failures.length > 0) {
    lines.push("");
    lines.push(`Failures (${summary.failures.length}):`);
    for (const failure of summary.failures) {
      lines.push(
        `  [${failure.category}] ${failure.severity.toUpperCase()}: ${failure.message}`,
      );
      if (failure.file) {
        lines.push(`    File: ${failure.file}`);
      }
      if (failure.suggestion) {
        lines.push(`    Suggestion: ${failure.suggestion}`);
      }
    }
  }

  lines.push("═══ End Summary ═══");

  return lines.join("\n");
}

/**
 * Format diagnostics for MCP structured response
 */
export function formatDiagnosticsForMcp(
  diagnostics: Diagnostic[],
): Array<{
  category: string;
  severity: string;
  message: string;
  file?: string;
  suggestion?: string;
}> {
  return diagnostics.map((d) => ({
    category: d.category,
    severity: d.severity,
    message: d.message,
    file: d.file,
    suggestion: d.suggestion,
  }));
}

const SUPPORTED_BEHAVIOR_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

const ENTITY_EVIDENCE_SEGMENTS = [
  "/requirements/",
  "/scenarios/",
  "/tests/",
  "/facts/",
  "/adr/",
  "/flags/",
  "/events/",
];

export const KIBI_IMPACT_DIAGNOSTIC_IDS = [
  "kibi_impact_evidence_missing",
  "symbols_manifest_stale",
  "kibi_impact_override_missing_rationale",
] as const;

export type KibiImpactDiagnosticId =
  (typeof KIBI_IMPACT_DIAGNOSTIC_IDS)[number];

export type KibiImpactEvidenceKind =
  | "entity_markdown"
  | "symbols_manifest"
  | "audited_no_impact";

export interface KibiImpactDiagnosticContract {
  id: KibiImpactDiagnosticId;
  title: string;
  resolution: [string, string, string];
}

export interface KibiImpactEvidenceInput {
  filePath?: string;
  extractionOutputChanged?: boolean;
  overrideDeclared?: boolean;
  overrideRationale?: string | null;
}

export interface BehaviorSourceEditInput {
  path: string;
  diffText: string;
  intersectsBehaviorBearingSymbol: boolean;
  knownUserFacingSurface?: boolean;
}

export interface ParsedKibiImpactOverride {
  declared: boolean;
  rationale: string | null;
}

export interface AuditedNoImpactOverrideInput {
  behaviorSourceEdit: boolean;
  override: ParsedKibiImpactOverride;
}

/**
 * Staged Kibi impact contract for `kibi check --staged`.
 *
 * This is intentionally a small, stable contract for tests and future staged
 * enforcement wiring:
 * - `behavior_source_edit` is a supported source-file edit whose staged hunks
 *   intersect exported or other behavior-bearing/user-facing surfaces and whose
 *   changed lines are not comment-only or formatting-only.
 * - `kibi_impact_evidence` is staged entity markdown, staged authored
 *   `documentation/symbols.yaml` metadata, refreshed
 *   `documentation/symbol-coordinates.yaml` when extraction output changes, or
 *   an explicit audited `Kibi-Impact: none` declaration with
 *   rationale for false positives/non-behavior-only edits.
 * - `Kibi-Impact: none` never satisfies a genuine behavior change.
 * - Test-only edits do not require new KB evidence unless they introduce
 *   executable test symbols that need traceability.
 *
 * This contract deliberately avoids broad semantic diffing and stays
 * conservative so later staged-check enforcement can share exact diagnostic IDs
 * and operator-facing remediation steps.
 */
export const KIBI_IMPACT_DIAGNOSTICS: Record<
  KibiImpactDiagnosticId,
  KibiImpactDiagnosticContract
> = {
  kibi_impact_evidence_missing: {
    id: "kibi_impact_evidence_missing",
    title: "Behavior edit requires staged Kibi impact evidence",
    resolution: [
      "Query Kibi via MCP first: use kb_search for discovery, then kb_query for exact follow-up.",
      "Stage related KB entity markdown, stage authored documentation/symbols.yaml metadata, or refresh coordinates with kibi sync --refresh-symbol-coordinates and stage documentation/symbol-coordinates.yaml documentation/symbols.yaml.",
      "Re-run or let the hook run kibi check --staged.",
    ],
  },
  symbols_manifest_stale: {
    id: "symbols_manifest_stale",
    title: "Symbol coordinates evidence is stale for changed extraction output",
    resolution: [
      "Refresh symbol coordinates for the changed source file with kibi sync --refresh-symbol-coordinates.",
      "Stage documentation/symbol-coordinates.yaml in the same change as the behavior edit, and stage documentation/symbols.yaml only if migration cleanup changed it.",
      "Re-run or let the hook run kibi check --staged.",
    ],
  },
  kibi_impact_override_missing_rationale: {
    id: "kibi_impact_override_missing_rationale",
    title: "Kibi no-impact override requires an explicit rationale",
    resolution: [
      "Use an audited declaration only for false positives or non-behavioral edits.",
      "Include both 'Kibi-Impact: none' and a nearby 'Rationale:' line describing why the edit has no behavior impact.",
      "Re-run or let the hook run kibi check --staged.",
    ],
  },
};

export function classifyKibiImpactEvidence(
  input: KibiImpactEvidenceInput,
): KibiImpactEvidenceKind | null {
  if (input.overrideDeclared && hasText(input.overrideRationale)) {
    return "audited_no_impact";
  }

  const filePath = input.filePath ?? "";
  if (!filePath) {
    return null;
  }

  if (isEntityEvidenceMarkdown(filePath)) {
    return "entity_markdown";
  }

  if (isSymbolsManifest(filePath) && input.extractionOutputChanged) {
    return "symbols_manifest";
  }

  return null;
}

export function parseKibiImpactOverride(
  text: string,
): ParsedKibiImpactOverride {
  const declared = /^Kibi-Impact:\s*none\s*$/im.test(text);
  const rationaleMatch = text.match(/^Rationale:\s*(.+)\s*$/im);
  return {
    declared,
    rationale: hasText(rationaleMatch?.[1]) ? rationaleMatch?.[1]?.trim() ?? null : null,
  };
}

export function isAuditedNoImpactOverrideAllowed(
  input: AuditedNoImpactOverrideInput,
): boolean {
  return (
    input.override.declared &&
    hasText(input.override.rationale) &&
    !input.behaviorSourceEdit
  );
}

export function isBehaviorSourceEdit(input: BehaviorSourceEditInput): boolean {
  if (!isSupportedBehaviorSourcePath(input.path)) {
    return false;
  }

  if (
    !input.intersectsBehaviorBearingSymbol &&
    !input.knownUserFacingSurface
  ) {
    return false;
  }

  const changes = extractChangedLines(input.diffText);
  if (changes.length === 0) {
    return false;
  }

  if (changes.every((line) => isIgnorableChangeLine(line))) {
    return false;
  }

  const removed = normalizeChangedLines(changes.filter((line) => line.kind === "remove"));
  const added = normalizeChangedLines(changes.filter((line) => line.kind === "add"));

  if (removed.length > 0 && removed.join("\n") === added.join("\n")) {
    return false;
  }

  return true;
}

export function isSupportedBehaviorSourcePath(filePath: string): boolean {
  for (const extension of SUPPORTED_BEHAVIOR_SOURCE_EXTENSIONS) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

function isEntityEvidenceMarkdown(filePath: string): boolean {
  if (!filePath.endsWith(".md")) {
    return false;
  }

  return ENTITY_EVIDENCE_SEGMENTS.some((segment) => filePath.includes(segment));
}

function isSymbolsManifest(filePath: string): boolean {
  return filePath.endsWith("/symbols.yaml") || filePath === "symbols.yaml";
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

type ChangedLine = { kind: "add" | "remove"; text: string };

function extractChangedLines(diffText: string): ChangedLine[] {
  const lines = diffText.split(/\r?\n/);
  const changes: ChangedLine[] = [];

  for (const line of lines) {
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      continue;
    }

    if (line.startsWith("+")) {
      changes.push({ kind: "add", text: line.slice(1) });
      continue;
    }

    if (line.startsWith("-")) {
      changes.push({ kind: "remove", text: line.slice(1) });
    }
  }

  return changes;
}

function isIgnorableChangeLine(line: ChangedLine): boolean {
  const trimmed = line.text.trim();
  if (!trimmed) {
    return true;
  }

  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*/") ||
    trimmed.startsWith("*")
  );
}

function normalizeChangedLines(lines: ChangedLine[]): string[] {
  return lines
    .map((line) => line.text.replace(/\s+/g, ""))
    .filter((line) => line.length > 0);
}

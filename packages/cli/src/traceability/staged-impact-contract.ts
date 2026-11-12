import { isTsJsSourcePath } from "../plugins/source-classification.js";
import { isEntityLanePath, isSymbolsManifestPath } from "../utils/kb-paths.js";

export const KIBI_IMPACT_DIAGNOSTIC_IDS = [
  "kibi_impact_evidence_missing",
  "symbols_manifest_stale",
] as const;

export type KibiImpactDiagnosticId =
  (typeof KIBI_IMPACT_DIAGNOSTIC_IDS)[number];

export type KibiImpactEvidenceKind = "entity_markdown" | "symbols_manifest";

export interface KibiImpactDiagnosticContract {
  id: KibiImpactDiagnosticId;
  title: string;
  resolution: [string, string, string];
}

export interface KibiImpactEvidenceInput {
  filePath?: string;
  extractionOutputChanged?: boolean;
  symbolsManifestPath?: string;
}

export interface BehaviorSourceEditInput {
  path: string;
  diffText: string;
  intersectsBehaviorBearingSymbol: boolean;
  knownUserFacingSurface?: boolean;
}

/**
 * Staged Kibi impact contract for `kibi check --staged`.
 *
 * This is intentionally a small, stable contract for tests and future staged
 * enforcement wiring:
 * - `behavior_source_edit` is a supported source-file edit whose staged hunks
 *   intersect exported or other behavior-bearing/user-facing surfaces and whose
 *   changed lines are not comment-only or formatting-only.
 * - `kibi_impact_evidence` is staged entity markdown under `.kb/`, staged
 *   authored `.kb/symbols.yaml` metadata, a symbol manifest that covers
 *   every declaration of the edited file.
 * - No declaration line in a commit message or note waives a behavior edit; a
 *   false positive is cleared by authoring symbol entries for the file.
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
      "Query Kibi via visible MCP tools or the trusted project-local CLI (peer surfaces): use kb_search for discovery, then kb_query for exact follow-up.",
      "MCP writes update KB state but do not stage tracked evidence; also stage related KB entity markdown under .kb/ or authored .kb/symbols.yaml metadata (the Detail lines name the symbols lacking evidence).",
      "Re-run or let the hook run kibi check --staged.",
    ],
  },
  symbols_manifest_stale: {
    id: "symbols_manifest_stale",
    title: "Symbol manifest does not cover the staged declarations",
    resolution: [
      "Read the Detail lines: they name the extracted symbols the staged .kb/symbols.yaml does not cover, and the entries whose declaration is gone.",
      "Author .kb/symbols.yaml entries for the uncovered symbols (kibi upsert, with implements/covered_by links); re-point or remove (kibi delete) entries whose declaration is gone.",
      "Stage .kb/symbols.yaml in the same change as the behavior edit, then re-run or let the hook run kibi check --staged. Symbol coordinates are derived locally and never staged.",
    ],
  },
};

export function classifyKibiImpactEvidence(
  input: KibiImpactEvidenceInput,
): KibiImpactEvidenceKind | null {
  const filePath = input.filePath;
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

export function isBehaviorSourceEdit(input: BehaviorSourceEditInput): boolean {
  if (!isSupportedBehaviorSourcePath(input.path)) {
    return false;
  }

  if (!input.intersectsBehaviorBearingSymbol && !input.knownUserFacingSurface) {
    return false;
  }

  // No changed lines at all are trivially all ignorable.
  const changes = extractChangedLines(input.diffText);
  if (changes.every((line) => isIgnorableChangeLine(line))) {
    return false;
  }

  const removed = normalizeChangedLines(
    changes.filter((line) => line.kind === "remove"),
  );
  const added = normalizeChangedLines(
    changes.filter((line) => line.kind === "add"),
  );

  // Some line is neither blank nor a comment, so the two sides cannot both
  // normalize to nothing: an edit that only adds lines never matches.
  if (removed.join("\n") === added.join("\n")) {
    return false;
  }

  return true;
}

export function isSupportedBehaviorSourcePath(filePath: string): boolean {
  return isTsJsSourcePath(filePath);
}

function isEntityEvidenceMarkdown(filePath: string): boolean {
  if (!filePath.endsWith(".md")) {
    return false;
  }

  return isEntityLanePath(filePath);
}

function isSymbolsManifest(filePath: string): boolean {
  const posix = filePath.replaceAll("\\", "/");
  return isSymbolsManifestPath(posix) || posix === ".kb/symbols.yml";
}

type ChangedLine = { kind: "add" | "remove"; text: string };

function extractChangedLines(diffText: string): ChangedLine[] {
  const lines = diffText.split(/\r?\n/);
  const changes: ChangedLine[] = [];

  for (const line of lines) {
    if (
      line.startsWith("+++") ||
      // A hunk header starts with "@@", neither "+" nor "-".
      line.startsWith("---")
    ) {
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
    // Also covers a closing */.
    trimmed.startsWith("*")
  );
}

function normalizeChangedLines(lines: ChangedLine[]): string[] {
  return lines
    .map((line) => line.text.replace(/\s/g, ""))
    .filter((line) => line.length > 0);
}

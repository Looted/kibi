import { execFileSync } from "node:child_process";
import { load as parseYaml } from "js-yaml";
import { extractFromManifestString } from "../extractors/manifest.js";
import { extractFromMarkdownString } from "../extractors/markdown.js";
import { CANONICAL_ENTITY_PATHS, isEntityLanePath } from "../utils/kb-paths.js";
import type { StagedPath } from "./git-staged.js";

export const STAGED_FILE_COVERAGE_RESULT_VERSION =
  "kibi.staged-file-coverage.v1" as const;

export interface StagedFileCoverageRecord {
  path: string;
  oldPath?: string;
  status: StagedPath["status"];
  analysisDepth: StagedPath["analysisDepth"];
  disposition: StagedPath["disposition"];
  reason?: StagedPath["skipReason"];
  requirementIds: string[];
  evidencePaths: string[];
  providerId: string | null;
  sourceAnalysis?: {
    before: {
      status: string;
      language: string;
      symbolCount: number;
      providerId: string | null;
      inputFingerprint: string;
      providerFingerprint: string | null;
    } | null;
    after: {
      status: string;
      language: string;
      symbolCount: number;
      providerId: string | null;
      inputFingerprint: string;
      providerFingerprint: string | null;
    } | null;
  };
}

export interface StagedFileCoverageDiagnostic {
  id: "staged_file_ownership_missing" | "staged_file_impact_review_needed";
  severity: "warning";
  blocking: false;
  path: string;
  message: string;
  suggestion: string;
  requirementIds: string[];
  evidencePaths: string[];
}

export interface StagedFileCoverageResult {
  version: typeof STAGED_FILE_COVERAGE_RESULT_VERSION;
  snapshot?: { baseTree: string; headTree: string; headCommit: string | null };
  files: StagedFileCoverageRecord[];
  diagnostics: StagedFileCoverageDiagnostic[];
}

type Relationship = { type: string; from: string; to: string };
type GitReader = (args: readonly string[]) => Buffer;

function defaultGitReader(args: readonly string[]): Buffer {
  return execFileSync("git", args, {
    encoding: "buffer",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function readRequired(reader: GitReader, args: readonly string[]): string {
  try {
    return reader(args).toString("utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`git command failed: git ${args.join(" ")} -> ${message}`);
  }
}

function manifestEntries(
  content: string | null,
): ReturnType<typeof extractFromManifestString> {
  if (!content?.trim()) return [];
  try {
    return extractFromManifestString(content, CANONICAL_ENTITY_PATHS.symbols);
  } catch {
    return [];
  }
}

function parseRelationships(content: string | null): Relationship[] {
  if (!content?.trim()) return [];
  try {
    const parsed = parseYaml(content) as { relationships?: unknown[] } | null;
    if (!Array.isArray(parsed?.relationships)) return [];
    return parsed.relationships.flatMap((value): Relationship[] => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      return typeof row.type === "string" &&
        typeof row.from === "string" &&
        typeof row.to === "string"
        ? [{ type: row.type, from: row.from, to: row.to }]
        : [];
    });
  } catch {
    return [];
  }
}

function headKbPaths(reader: GitReader): Set<string> {
  try {
    if (
      reader(["rev-parse", "--verify", "HEAD"]).toString("utf8").trim() === ""
    ) {
      return new Set();
    }
  } catch {
    // A repository with an unborn branch has no committed knowledge yet.
    return new Set();
  }
  const output = readRequired(reader, [
    "ls-tree",
    "-r",
    "--name-only",
    "-z",
    "HEAD",
    "--",
    ".kb",
  ]);
  return new Set(output.split("\0").filter(Boolean));
}

function effectiveRelationshipFiles(
  inventory: readonly StagedPath[],
  headPaths: ReadonlySet<string>,
  reader: GitReader,
): { head: Map<string, string>; effective: Map<string, string> } {
  const head = new Map<string, string>();
  for (const path of [...headPaths].sort()) {
    if (!path.startsWith(".kb/relationships/")) continue;
    head.set(path, readRequired(reader, ["show", `HEAD:${path}`]));
  }
  const effective = new Map(head);
  for (const entry of inventory) {
    if (!entry.path.startsWith(".kb/relationships/")) continue;
    if (entry.oldPath) effective.delete(entry.oldPath);
    if (entry.status === "D") effective.delete(entry.path);
    else if (entry.content !== undefined)
      effective.set(entry.path, entry.content);
  }
  return { head, effective };
}

function effectiveRequirementIds(
  inventory: readonly StagedPath[],
  headPaths: ReadonlySet<string>,
  reader: GitReader,
): Set<string> {
  const files = new Map<string, string>();
  for (const path of [...headPaths].sort()) {
    if (!path.startsWith(".kb/requirements/") || !path.endsWith(".md")) {
      continue;
    }
    files.set(path, readRequired(reader, ["show", `HEAD:${path}`]));
  }
  for (const entry of inventory) {
    if (entry.oldPath) files.delete(entry.oldPath);
    if (
      !entry.path.startsWith(".kb/requirements/") ||
      !entry.path.endsWith(".md")
    ) {
      continue;
    }
    if (entry.status === "D") files.delete(entry.path);
    else if (entry.content !== undefined) files.set(entry.path, entry.content);
  }

  const ids = new Set<string>();
  for (const [path, content] of files) {
    try {
      const result = extractFromMarkdownString(content, path);
      if (result.entity.type === "req") ids.add(result.entity.id);
    } catch {
      // Malformed staged entity markdown is reported by the staged validator.
    }
  }
  return ids;
}

function relationshipSet(files: ReadonlyMap<string, string>): Relationship[] {
  return [...files.values()].flatMap(parseRelationships);
}

function stagedManifestContent(
  inventory: readonly StagedPath[],
): string | null | undefined {
  const file = inventory.find(
    (entry) =>
      entry.path === CANONICAL_ENTITY_PATHS.symbols ||
      entry.path === ".kb/symbols.yml",
  );
  if (!file) return undefined;
  return file.status === "D" ? null : (file.content ?? null);
}

function sourcePaths(entry: StagedPath): Set<string> {
  return new Set([entry.path, ...(entry.oldPath ? [entry.oldPath] : [])]);
}

function entriesForPaths(
  entries: ReturnType<typeof extractFromManifestString>,
  paths: ReadonlySet<string>,
) {
  return entries.filter((entry) => {
    const source = entry.sourceFile ?? entry.entity.source;
    return (
      typeof source === "string" && paths.has(source.replaceAll("\\", "/"))
    );
  });
}

function relevantEntityEvidence(
  inventory: readonly StagedPath[],
  requirementIds: ReadonlySet<string>,
): string[] {
  return inventory.flatMap((entry): string[] => {
    if (
      entry.status === "D" ||
      entry.content === undefined ||
      !entry.path.endsWith(".md") ||
      !isEntityLanePath(entry.path)
    ) {
      return [];
    }
    try {
      const parsed = extractFromMarkdownString(entry.content, entry.path);
      return parsed.entity.type === "req" &&
        requirementIds.has(parsed.entity.id)
        ? [entry.path]
        : [];
    } catch {
      return [];
    }
  });
}

function stableEntry(
  entry: ReturnType<typeof extractFromManifestString>[number],
): string {
  return JSON.stringify({
    id: entry.entity.id,
    title: entry.entity.title,
    sourceFile: entry.sourceFile,
    relationships: entry.relationships
      .map((relationship) => ({
        type: relationship.type,
        from: relationship.from,
        to: relationship.to,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
  });
}

function changedManifestEvidence(
  paths: ReadonlySet<string>,
  headEntries: ReturnType<typeof extractFromManifestString>,
  effectiveEntries: ReturnType<typeof extractFromManifestString>,
  inventory: readonly StagedPath[],
): string[] {
  const staged = stagedManifestContent(inventory);
  if (staged === undefined) return [];
  const before = entriesForPaths(headEntries, paths).map(stableEntry).sort();
  const after = entriesForPaths(effectiveEntries, paths)
    .map(stableEntry)
    .sort();
  return JSON.stringify(before) === JSON.stringify(after)
    ? []
    : [CANONICAL_ENTITY_PATHS.symbols];
}

function changedRelationshipEvidence(
  symbolIds: ReadonlySet<string>,
  headFiles: ReadonlyMap<string, string>,
  effectiveFiles: ReadonlyMap<string, string>,
): string[] {
  const paths = new Set([...headFiles.keys(), ...effectiveFiles.keys()]);
  return [...paths].filter((path) => {
    const select = (content: string | undefined) =>
      parseRelationships(content ?? null)
        .filter((row) => row.type === "implements" && symbolIds.has(row.from))
        .map((row) => `${row.from}\0${row.to}`)
        .sort();
    return (
      JSON.stringify(select(headFiles.get(path))) !==
      JSON.stringify(select(effectiveFiles.get(path)))
    );
  });
}

/** Resolve advisory file-level ownership from committed knowledge plus staged evidence. */
export function analyzeStagedFileCoverage(
  inventory: readonly StagedPath[],
  reader: GitReader = defaultGitReader,
): StagedFileCoverageResult {
  const headPaths = headKbPaths(reader);
  const headManifest = headPaths.has(CANONICAL_ENTITY_PATHS.symbols)
    ? readRequired(reader, ["show", `HEAD:${CANONICAL_ENTITY_PATHS.symbols}`])
    : null;
  const stagedManifest = stagedManifestContent(inventory);
  const headEntries = manifestEntries(headManifest);
  const effectiveEntries = manifestEntries(
    stagedManifest === undefined ? headManifest : stagedManifest,
  );
  const relationshipFiles = effectiveRelationshipFiles(
    inventory,
    headPaths,
    reader,
  );
  const actualRequirementIds = effectiveRequirementIds(
    inventory,
    headPaths,
    reader,
  );
  const headRelationships = relationshipSet(relationshipFiles.head);
  const effectiveRelationships = relationshipSet(relationshipFiles.effective);
  const files: StagedFileCoverageRecord[] = [];
  const diagnostics: StagedFileCoverageDiagnostic[] = [];

  for (const entry of inventory) {
    const paths = sourcePaths(entry);
    const headOwned = entriesForPaths(headEntries, paths);
    const effectiveOwned = entriesForPaths(effectiveEntries, paths);
    const owned = [...headOwned, ...effectiveOwned];
    const symbolIds = new Set(owned.map((item) => item.entity.id));
    const inlineRelationships = owned.flatMap((item) => item.relationships);
    const requirementIds = [
      ...new Set(
        [
          ...inlineRelationships,
          ...headRelationships,
          ...effectiveRelationships,
        ]
          .filter(
            (row) =>
              row.type === "implements" &&
              symbolIds.has(row.from) &&
              actualRequirementIds.has(row.to),
          )
          .map((row) => row.to),
      ),
    ].sort();
    const evidencePaths = [
      ...new Set([
        ...changedManifestEvidence(
          paths,
          headEntries,
          effectiveEntries,
          inventory,
        ),
        ...changedRelationshipEvidence(
          symbolIds,
          relationshipFiles.head,
          relationshipFiles.effective,
        ),
        ...relevantEntityEvidence(inventory, new Set(requirementIds)),
      ]),
    ].sort();

    files.push({
      path: entry.path,
      ...(entry.oldPath ? { oldPath: entry.oldPath } : {}),
      status: entry.status,
      analysisDepth: entry.analysisDepth,
      disposition: entry.disposition,
      ...(entry.skipReason ? { reason: entry.skipReason } : {}),
      requirementIds,
      evidencePaths,
      providerId: entry.analysisDepth === "symbol" ? "ts-morph" : null,
    });

    if (entry.analysisDepth !== "file") continue;
    if (requirementIds.length === 0) {
      diagnostics.push({
        id: "staged_file_ownership_missing",
        severity: "warning",
        blocking: false,
        path: entry.path,
        message: `Staged text file has no source-linked requirement ownership: ${entry.path}`,
        suggestion:
          "Review the change and add an authored file/module symbol with an implements relationship when it affects product behavior.",
        requirementIds: [],
        evidencePaths: [],
      });
    } else if (evidencePaths.length === 0) {
      diagnostics.push({
        id: "staged_file_impact_review_needed",
        severity: "warning",
        blocking: false,
        path: entry.path,
        message: `Review staged impact for ${entry.path}; existing ownership links to ${requirementIds.join(", ")} but no matching KB evidence changed.`,
        suggestion:
          "Confirm the linked requirements still describe the behavior, then stage the relevant requirement or ownership evidence when semantics changed.",
        requirementIds,
        evidencePaths: [],
      });
    }
  }

  return { version: STAGED_FILE_COVERAGE_RESULT_VERSION, files, diagnostics };
}

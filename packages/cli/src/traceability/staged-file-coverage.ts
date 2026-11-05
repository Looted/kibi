import { execFileSync } from "node:child_process";
import { load as parseYaml } from "js-yaml";
import { extractFromManifestString } from "../extractors/manifest.js";
import { extractFromMarkdownString } from "../extractors/markdown.js";
import {
  CANONICAL_ENTITY_PATHS,
  KB_ROOT,
  isEntityLanePath,
} from "../utils/kb-paths.js";
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

type Edge = { from: string; to: string };
type GitReader = (args: readonly string[]) => Buffer;

function defaultGitReader(args: readonly string[]): Buffer {
  return execFileSync("git", args, {
    maxBuffer: 64 * 1024 * 1024,
    // rationale: stdin and stderr are only kept off the terminal; nothing
    // the reader returns or throws depends on them.
    // Stryker disable next-line ArrayDeclaration,StringLiteral
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
  try {
    // No manifest (null) or a blank one has no symbols array and throws.
    return extractFromManifestString(
      content as string,
      CANONICAL_ENTITY_PATHS.symbols,
    );
  } catch {
    return [];
  }
}

/**
 * The `implements` edges of a relationship shard from one of `symbolIds`.
 * A missing, blank, malformed or non-list shard has none.
 */
function implementsEdges(
  content: string | undefined,
  symbolIds: ReadonlySet<string>,
): Edge[] {
  try {
    const parsed = parseYaml(content as string) as {
      relationships: unknown[];
    };
    return parsed.relationships.filter((value): value is Edge => {
      // Reading a property of a primitive yields undefined.
      const row = value as Record<string, unknown> | null | undefined;
      return (
        row?.type === "implements" &&
        symbolIds.has(row.from as string) &&
        typeof row.to === "string"
      );
    });
  } catch {
    return [];
  }
}

function headKbPaths(reader: GitReader): Set<string> {
  try {
    reader(["rev-parse", "--verify", "HEAD"]);
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
  // The trailing NUL adds "", which no knowledge path filter matches.
  return new Set(output.split("\0"));
}

function effectiveRelationshipFiles(
  inventory: readonly StagedPath[],
  headPaths: ReadonlySet<string>,
  reader: GitReader,
): { head: Map<string, string>; effective: Map<string, string> } {
  const head = new Map<string, string>();
  for (const path of headPaths) {
    if (!path.startsWith(".kb/relationships/")) continue;
    head.set(path, readRequired(reader, ["show", `HEAD:${path}`]));
  }
  const effective = new Map(head);
  for (const entry of inventory) {
    if (!entry.path.startsWith(".kb/relationships/")) continue;
    // Deleting an absent (or undefined) key is a no-op.
    effective.delete(entry.oldPath as string);
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
  for (const path of headPaths) {
    if (!path.startsWith(".kb/requirements/") || !path.endsWith(".md")) {
      continue;
    }
    files.set(path, readRequired(reader, ["show", `HEAD:${path}`]));
  }
  for (const entry of inventory) {
    files.delete(entry.oldPath as string);
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

function edgesOf(
  files: ReadonlyMap<string, string>,
  symbolIds: ReadonlySet<string>,
): Edge[] {
  return [...files.values()].flatMap((content) =>
    implementsEdges(content, symbolIds),
  );
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

function isKibiManagedPath(path: string): boolean {
  return path.replaceAll("\\", "/").startsWith(`${KB_ROOT}/`);
}

function sourcePaths(entry: StagedPath): Set<string | undefined> {
  return new Set([entry.path, entry.oldPath]);
}

function entriesForPaths(
  entries: ReturnType<typeof extractFromManifestString>,
  paths: ReadonlySet<string | undefined>,
) {
  return entries.filter((entry) =>
    paths.has((entry.sourceFile ?? entry.entity.source).replaceAll("\\", "/")),
  );
}

function relevantEntityEvidence(
  inventory: readonly StagedPath[],
  requirementIds: ReadonlySet<string>,
): string[] {
  return inventory.flatMap((entry): string[] => {
    if (
      entry.status === "D" ||
      !entry.path.endsWith(".md") ||
      !isEntityLanePath(entry.path)
    ) {
      return [];
    }
    try {
      // Without staged content the extraction throws.
      const parsed = extractFromMarkdownString(
        entry.content as string,
        entry.path,
      );
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

// Without a staged manifest both entry lists come from the committed one.
function changedManifestEvidence(
  paths: ReadonlySet<string | undefined>,
  headEntries: ReturnType<typeof extractFromManifestString>,
  effectiveEntries: ReturnType<typeof extractFromManifestString>,
): string[] {
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
      implementsEdges(content, symbolIds)
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
  isGenerated?: (path: string) => boolean,
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
  const files: StagedFileCoverageRecord[] = [];
  const diagnostics: StagedFileCoverageDiagnostic[] = [];

  for (const entry of inventory) {
    const paths = sourcePaths(entry);
    const headOwned = entriesForPaths(headEntries, paths);
    const effectiveOwned = entriesForPaths(effectiveEntries, paths);
    const owned = [...headOwned, ...effectiveOwned];
    const symbolIds = new Set(owned.map((item) => item.entity.id));
    // A symbol's inline relationships all start at that symbol.
    const inlineEdges = owned
      .flatMap((item) => item.relationships)
      .filter((row) => row.type === "implements");
    const requirementIds = [
      ...new Set(
        [
          ...inlineEdges,
          ...edgesOf(relationshipFiles.head, symbolIds),
          ...edgesOf(relationshipFiles.effective, symbolIds),
        ]
          .filter((row) => actualRequirementIds.has(row.to))
          .map((row) => row.to),
      ),
    ].sort();
    // The three sources name distinct paths: the manifest, relationship
    // shards and entity documents.
    const evidencePaths = [
      ...changedManifestEvidence(paths, headEntries, effectiveEntries),
      ...changedRelationshipEvidence(
        symbolIds,
        relationshipFiles.head,
        relationshipFiles.effective,
      ),
      ...relevantEntityEvidence(inventory, new Set(requirementIds)),
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

    // Kibi writes everything under .kb/ (schema, manifest, entities); it is
    // knowledge, not product code, so it needs no requirement ownership.
    // A generated file no symbol owns is the generator's output, not
    // product code someone wrote, so it needs no requirement ownership.
    if (
      entry.analysisDepth !== "file" ||
      isKibiManagedPath(entry.path) ||
      (requirementIds.length === 0 && isGenerated?.(entry.path))
    )
      continue;
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

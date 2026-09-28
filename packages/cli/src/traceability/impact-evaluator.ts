import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { load as parseYaml } from "js-yaml";
import { runtimePackageFingerprint } from "../plugins/maintenance-source-analysis.js";
import type { HostSourceAnalysisResultV2 } from "../plugins/source-analysis-service.js";
import type { SourceChangeAnalysis } from "../plugins/source-change-analysis.js";
import { snapshotFileContent } from "../public/operations/proof-receipt-projection.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import type { StagedPath } from "./git-staged.js";
import {
  type AnalysisReview,
  type Fingerprint,
  IMPACT_EVALUATOR_VERSION,
  IMPACT_POLICY_PATH,
  IMPACT_REVIEW_PATH,
  IMPACT_REVIEW_VERSION,
  type ImpactDecision,
  type ImpactFileRecord,
  type ImpactPolicy,
  type ImpactReviewDiagnostic,
  type ImpactReviewRecord,
  type SideEvidence,
  assertSha256,
  canonicalJson,
  fingerprint,
  fingerprintBytes,
  isGitObjectId,
  parseImpactPolicy,
  parseImpactReviewRecord,
} from "./impact-review.js";
import { readSnapshotKnowledge } from "./snapshot-knowledge.js";

type TreeEntry = Readonly<{
  mode: string;
  type: string;
  objectId: string;
  path: string;
}>;
type EntityRow = Readonly<{
  id: string;
  type: string;
  fingerprint: Fingerprint;
  artifactPath: string;
  sourcePath?: string;
}>;

export type ImpactPreparationOptions = Readonly<{
  /** Resolved by the trusted host from its approved provider closure. */
  providerSetFingerprint: Fingerprint;
  /** Hash of the trusted evaluator/normalizers in the host package. */
  evaluatorFingerprint: Fingerprint;
  /** Both sides must be analyzed from snapshot bytes before preparation. */
  analyses: ReadonlyMap<string, SourceChangeAnalysis>;
}>;

export type PreparedImpactReview = Readonly<{
  policy: ImpactPolicy;
  policyFingerprint: Fingerprint;
  evaluatorFingerprint: Fingerprint;
  providerSetFingerprint: Fingerprint;
  knowledgeFingerprint: Fingerprint;
  scopeFingerprint: Fingerprint;
  files: readonly Omit<ImpactFileRecord, "decision">[];
  scopedRequirementIdsByPath: ReadonlyMap<string, readonly string[]>;
  baseEntities: ReadonlyMap<string, EntityRow>;
  headEntities: ReadonlyMap<string, EntityRow>;
  /** Exact impact record digest input, excluding only the record path. */
  scopePayload: unknown;
}>;

export type ImpactEvaluation = Readonly<{
  passed: boolean;
  scopeFingerprint?: Fingerprint;
  diagnostics: readonly ImpactReviewDiagnostic[];
  /** Local review is self-claimed and never an authorization attestation. */
  reviewerAuthority: "self-claimed-local" | "none";
}>;

/** Hash the JSON contracts consumed by impact review and KB normalization. */
type ImpactSchemaRoot = Readonly<{
  label: "src" | "dist";
  traceabilityDirectory?: string;
  schemaDirectory: string;
}>;

export function fingerprintImpactSchemaFiles(
  roots: readonly ImpactSchemaRoot[],
): readonly { path: string; sha256: string }[] {
  const schemas = roots.flatMap((root) => [
    ...(root.traceabilityDirectory
      ? [
          {
            file: "impact-policy.v1.schema.json",
            path: `${root.label}/traceability/impact-policy.v1.schema.json`,
            directory: root.traceabilityDirectory,
          },
          {
            file: "impact-review.schema.json",
            path: `${root.label}/traceability/impact-review.schema.json`,
            directory: root.traceabilityDirectory,
          },
        ]
      : []),
    {
      file: "entity.schema.json",
      path: `${root.label}/schemas/entity.schema.json`,
      directory: root.schemaDirectory,
    },
  ]);
  return schemas.map((schema) => {
    const schemaPath = join(schema.directory, schema.file);
    const schemaStat = lstatSync(schemaPath);
    if (schemaStat.isSymbolicLink() || !schemaStat.isFile())
      throw new Error(
        `Trusted impact schema is not a regular file: ${schemaPath}`,
      );
    return {
      path: schema.path,
      sha256: createHash("sha256")
        .update(readFileSync(schemaPath))
        .digest("hex"),
    };
  });
}

/** Fingerprint the trusted evaluator, snapshot reader, gate and normalization closure. */
export function fingerprintImpactEvaluator(): Fingerprint {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const extension = extname(fileURLToPath(import.meta.url));
  const schemaDirectory =
    extension === ".ts"
      ? moduleDirectory
      : join(moduleDirectory, "../../src/traceability");
  const sourceSchemaDirectory = join(dirname(schemaDirectory), "schemas");
  const schemaRoots: ImpactSchemaRoot[] = [
    {
      label: "src",
      traceabilityDirectory: schemaDirectory,
      schemaDirectory: sourceSchemaDirectory,
    },
  ];
  if (extension !== ".ts")
    schemaRoots.push({
      label: "dist",
      schemaDirectory: join(moduleDirectory, "../schemas"),
    });
  const runtimeRoot = join(moduleDirectory, "..");
  const files: { path: string; sha256: string }[] = [];
  let totalBytes = 0;
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (["node_modules", ".git"].includes(entry.name)) continue;
      const absolute = join(directory, entry.name);
      const stat = lstatSync(absolute);
      if (stat.isSymbolicLink())
        throw new Error(
          `Trusted CLI closure contains a symbolic link: ${absolute}`,
        );
      if (stat.isDirectory()) {
        visit(absolute);
        continue;
      }
      if (!stat.isFile())
        throw new Error(
          `Trusted CLI closure contains a special file: ${absolute}`,
        );
      if (
        (extension === ".ts" && !entry.name.endsWith(".ts")) ||
        (extension === ".js" && !entry.name.endsWith(".js")) ||
        /\.(?:test|spec)\.(?:ts|js)$/.test(entry.name)
      )
        continue;
      totalBytes += stat.size;
      if (files.length >= 20_000 || totalBytes > 512 * 1024 * 1024)
        throw new Error("Trusted CLI code closure exceeds its bound");
      files.push({
        path: relative(runtimeRoot, absolute).replaceAll("\\", "/"),
        sha256: createHash("sha256")
          .update(readFileSync(absolute))
          .digest("hex"),
      });
    }
  };
  visit(runtimeRoot);
  files.push(...fingerprintImpactSchemaFiles(schemaRoots));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const packageRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
  const dependencyCache = new Map<string, string>();
  const dependencies = ["ajv", "gray-matter", "js-yaml"].map((name) => ({
    name,
    fingerprint: runtimePackageFingerprint(packageRoot, name, dependencyCache),
  }));
  return fingerprint({
    contractVersion: "kibi.impact-evaluator-closure.v1",
    nodeVersion: process.version,
    dependencies,
    files,
  });
}

function approvedPartialClass(
  policy: ImpactPolicy,
  analysis: NonNullable<SideEvidence["analysis"]>,
): string | null {
  if (
    analysis.status !== "partial" ||
    !analysis.providerId ||
    !analysis.providerFingerprint ||
    analysis.diagnosticCodes.length === 0
  )
    return null;
  const classes = new Set<string>();
  for (const code of analysis.diagnosticCodes) {
    const entry = policy.allowedPartial.find(
      (candidate) =>
        candidate.providerId === analysis.providerId &&
        candidate.providerFingerprint === analysis.providerFingerprint &&
        candidate.diagnosticCode === code,
    );
    if (!entry) return null;
    classes.add(entry.limitationClass);
  }
  return classes.size === 1 ? ([...classes][0] ?? null) : null;
}

function decodePath(bytes: Buffer): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function parseTreeRows(bytes: Buffer): TreeEntry[] {
  const rows: TreeEntry[] = [];
  for (const raw of bytes.toString("binary").split("\0").filter(Boolean)) {
    const tab = raw.indexOf("\t");
    if (tab < 0) throw new Error("Malformed Git tree listing");
    const [mode, type, objectId] = raw.slice(0, tab).split(" ");
    const path = decodePath(Buffer.from(raw.slice(tab + 1), "binary"));
    if (!mode || !type || !objectId || !isGitObjectId(objectId))
      throw new Error("Malformed Git tree entry");
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..")
    )
      throw new Error("Git snapshot path is not normalized");
    rows.push({ mode, type, objectId, path });
  }
  return rows;
}

function entriesForTree(
  snapshot: GitChangeSnapshot,
  tree: string,
): TreeEntry[] {
  return parseTreeRows(snapshot.readGit(["ls-tree", "-r", "-z", tree]));
}

function treeEntry(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string,
): TreeEntry | undefined {
  const output = snapshot.readGit([
    "ls-tree",
    "-z",
    tree,
    "--",
    `:(literal)${path}`,
  ]);
  return parseTreeRows(output).find((entry) => entry.path === path);
}

function blobBytes(
  snapshot: GitChangeSnapshot,
  entry: TreeEntry,
): Buffer | undefined {
  if (entry.type !== "blob") return undefined;
  const bytes = snapshot.readBlobs([entry.objectId]).get(entry.objectId);
  if (!bytes)
    throw new Error(`Snapshot did not return blob bytes for ${entry.path}`);
  return bytes;
}

function isKnowledgeMarkdown(path: string): boolean {
  return path.startsWith(".kb/") && path.endsWith(".md");
}

function projectedKnowledgeMarkdown(path: string, content: string): string {
  if (!isKnowledgeMarkdown(path)) return content;
  return snapshotFileContent(path, Buffer.from(content, "utf8")).toString(
    "utf8",
  );
}

function isReceiptOnlyChange(file: StagedPath): boolean {
  if (
    !isKnowledgeMarkdown(file.path) ||
    file.status !== "M" ||
    file.oldPath !== undefined ||
    file.copyFromPath !== undefined ||
    file.skipReason !== undefined ||
    file.previousContent === undefined ||
    file.content === undefined
  )
    return false;
  const previousMode = file.previousMode;
  const currentMode = file.gitMode;
  if (
    (previousMode !== "100644" && previousMode !== "100755") ||
    currentMode !== previousMode
  )
    return false;
  const before = Buffer.from(file.previousContent, "utf8");
  const after = Buffer.from(file.content, "utf8");
  return (
    !before.equals(after) &&
    snapshotFileContent(file.path, before).equals(
      snapshotFileContent(file.path, after),
    )
  );
}

function normalizeHunks(
  ranges: readonly Readonly<{ start: number; end: number }>[],
  content: string | undefined,
): { start: number; end: number }[] {
  const lineCount = Math.max(1, (content ?? "").split(/\r?\n/).length);
  return ranges.map((range) => ({
    start: range.start,
    end: range.end === Number.MAX_SAFE_INTEGER ? lineCount : range.end,
  }));
}

function projectedHunks(
  beforeContent: string | undefined,
  afterContent: string | undefined,
): {
  oldHunkRanges: { start: number; end: number }[];
  hunkRanges: { start: number; end: number }[];
} {
  const temporary = mkdtempSync(join(tmpdir(), "kibi-impact-projected-diff-"));
  try {
    const beforePath = join(temporary, "before.md");
    const afterPath = join(temporary, "after.md");
    writeFileSync(beforePath, beforeContent ?? "");
    writeFileSync(afterPath, afterContent ?? "");
    let diffText = "";
    try {
      diffText = execFileSync(
        "git",
        [
          "diff",
          "--no-index",
          "--no-ext-diff",
          "--no-textconv",
          "--no-color",
          "--unified=0",
          "--",
          beforePath,
          afterPath,
        ],
        {
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("status" in error) ||
        error.status !== 1
      )
        throw error;
      diffText =
        "stdout" in error && typeof error.stdout === "string"
          ? error.stdout
          : "stdout" in error && Buffer.isBuffer(error.stdout)
            ? error.stdout.toString("utf8")
            : "";
    }
    const oldHunkRanges: { start: number; end: number }[] = [];
    const hunkRanges: { start: number; end: number }[] = [];
    const regex = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
    for (const match of diffText.matchAll(regex)) {
      const oldStart = Number.parseInt(match[1] ?? "0", 10);
      const oldCount = Number.parseInt(match[2] ?? "1", 10);
      const newStart = Number.parseInt(match[3] ?? "0", 10);
      const newCount = Number.parseInt(match[4] ?? "1", 10);
      if (oldCount > 0)
        oldHunkRanges.push({
          start: oldStart,
          end: oldStart + oldCount - 1,
        });
      if (newCount > 0)
        hunkRanges.push({ start: newStart, end: newStart + newCount - 1 });
    }
    return {
      oldHunkRanges: normalizeHunks(oldHunkRanges, beforeContent),
      hunkRanges: normalizeHunks(hunkRanges, afterContent),
    };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

function projectedPathEvidence(file: StagedPath): StagedPath {
  const previousPath = file.oldPath ?? file.copyFromPath ?? file.path;
  if (!isKnowledgeMarkdown(file.path) && !isKnowledgeMarkdown(previousPath))
    return file;
  const previousContent =
    file.previousContent === undefined
      ? undefined
      : projectedKnowledgeMarkdown(previousPath, file.previousContent);
  const content =
    file.content === undefined
      ? undefined
      : projectedKnowledgeMarkdown(file.path, file.content);
  const ranges = projectedHunks(previousContent, content);
  const { diffText: _diffText, ...projected } = file;
  return {
    ...projected,
    ...(previousContent !== undefined ? { previousContent } : {}),
    ...(content !== undefined ? { content } : {}),
    oldHunkRanges: ranges.oldHunkRanges,
    hunkRanges: ranges.hunkRanges,
  };
}

function sideAnalysisFingerprint(
  result: HostSourceAnalysisResultV2,
): Fingerprint {
  return fingerprint(result);
}

const NON_WAIVABLE_ANALYSIS_MARKER =
  /(?:syntax|parse|timeout|timed[\s_-]*out|integrity|checksum|failed|failure|error|input[\s_-]*limit)/i;

function assertNoNonWaivableAnalysis(
  analysis: NonNullable<SideEvidence["analysis"]>,
  path: string,
  side: string,
): void {
  const diagnosticText = [
    ...analysis.diagnosticCodes,
    ...analysis.uncoveredRanges.map((range) => range.reason),
  ].join("\n");
  if (NON_WAIVABLE_ANALYSIS_MARKER.test(diagnosticText))
    throw new Error(
      `Non-waivable parser, provider, timeout, integrity, or syntax diagnostic for ${path} (${side})`,
    );
}

function sideEvidence(
  snapshot: GitChangeSnapshot,
  tree: string,
  path: string,
  result: HostSourceAnalysisResultV2 | null,
  content: string | undefined,
): SideEvidence | null {
  const entry = treeEntry(snapshot, tree, path);
  if (!entry) return null;
  if (!["100644", "100755", "120000", "160000"].includes(entry.mode))
    throw new Error(`Unsupported Git mode ${entry.mode} for ${path}`);
  if (
    (entry.mode === "160000") !== (entry.type === "commit") ||
    (entry.mode !== "160000" && entry.type !== "blob")
  )
    throw new Error(`Git mode/object type mismatch for ${path}`);
  const bytes = blobBytes(snapshot, entry);
  const kind =
    entry.mode === "160000" || entry.type === "commit"
      ? "gitlink"
      : entry.mode === "120000"
        ? "symlink"
        : "regular";
  const projected = bytes !== undefined && isKnowledgeMarkdown(path);
  const evidenceBytes =
    bytes && projected ? snapshotFileContent(path, bytes) : bytes;
  const byteFingerprint = evidenceBytes
    ? fingerprintBytes(evidenceBytes)
    : fingerprint({
        mode: entry.mode,
        type: entry.type,
        objectId: entry.objectId,
      });
  let analysis: SideEvidence["analysis"] = null;
  if (result) {
    if (result.sourceFile !== path)
      throw new Error(`Analysis source path mismatch for ${path}`);
    if (
      content === undefined ||
      !/^[0-9a-f]{64}$/.test(result.inputFingerprint)
    )
      throw new Error(
        `Host analysis lacks a valid input fingerprint for captured path ${path}`,
      );
    if (result.providerFingerprint !== null)
      assertSha256(
        `sha256:${result.providerFingerprint}`,
        `Provider fingerprint for ${path}`,
      );
    if (
      (result.status === "partial" && result.uncoveredRanges.length === 0) ||
      (result.status === "ok" && result.uncoveredRanges.length > 0)
    )
      throw new Error(`Source analysis status/range mismatch for ${path}`);
    analysis = {
      contractVersion: result.contractVersion,
      status: result.status,
      language: result.language,
      sourceFile: result.sourceFile,
      providerId: result.providerId,
      providerStamp: result.stamp,
      providerFingerprint:
        result.providerFingerprint === null
          ? null
          : `sha256:${result.providerFingerprint}`,
      // The wrapper supplies host-validated analysis of these exact captured
      // bytes. The byteFingerprint above independently binds the Git blob; do
      // not recompute this host contract here because v2 may include the
      // classifier, explicit language hint, and normalization version.
      inputFingerprint: `sha256:${result.inputFingerprint}`,
      resultFingerprint: sideAnalysisFingerprint(result),
      diagnosticCodes: result.diagnostics.map((row) => row.code).sort(),
      uncoveredRanges: result.uncoveredRanges.map((range) => ({
        startLine: range.startLine,
        startColumn: range.startColumn,
        endLine: range.endLine,
        endColumn: range.endColumn,
        reason: range.reason,
      })),
    };
  }
  if (kind === "regular" && bytes === undefined)
    throw new Error(`Regular tree entry has no blob: ${path}`);
  return {
    mode: entry.mode,
    objectId: projected ? null : entry.objectId,
    byteFingerprint,
    kind,
    ...(projected
      ? { contentProjection: "proof_receipts_stripped" as const }
      : {}),
    analysis,
  };
}

function assertAnalysisInput(
  file: StagedPath,
  change: SourceChangeAnalysis | undefined,
): void {
  if (file.analysisDepth === "metadata" || file.skipReason) return;
  if (file.previousContent !== undefined && !change?.before)
    throw new Error(`Missing before-side source analysis for ${file.path}`);
  if (file.content !== undefined && !change?.after)
    throw new Error(`Missing after-side source analysis for ${file.path}`);
  if (change && change.path !== file.path)
    throw new Error(`Analysis path mismatch for ${file.path}`);
}

function exactPathProjection(
  file: StagedPath,
  before: SideEvidence | null,
  after: SideEvidence | null,
): unknown {
  return {
    path: file.path,
    status: file.status,
    ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }),
    ...(file.copyFromPath === undefined
      ? {}
      : { copyFromPath: file.copyFromPath }),
    analysisDepth: file.analysisDepth,
    disposition: file.disposition,
    ...(file.skipReason === undefined ? {} : { skipReason: file.skipReason }),
    ...(file.gitMode === undefined ? {} : { gitMode: file.gitMode }),
    ...(file.previousMode === undefined
      ? {}
      : { previousMode: file.previousMode }),
    oldHunkRanges: file.oldHunkRanges ?? [],
    newHunkRanges: file.hunkRanges,
    before,
    after,
  };
}

function semanticEntityFingerprint(
  result: ReturnType<typeof readSnapshotKnowledge>[number],
): Fingerprint {
  const entity = result.entity as unknown as Record<string, unknown>;
  // This is a narrow authored-field projection, not a claim of natural-language
  // equivalence. Metadata edits still change the raw KB binding and require a
  // refreshed record, but do not prove that requirement meaning changed.
  const semantic: Record<string, unknown> =
    entity.type === "req"
      ? { id: entity.id, type: entity.type }
      : Object.fromEntries(
          Object.entries(entity)
            .filter(
              ([key]) =>
                ![
                  "source",
                  "created_at",
                  "updated_at",
                  "title",
                  "proof_receipts",
                ].includes(key),
            )
            .sort(([a], [b]) => a.localeCompare(b)),
        );
  if (entity.type === "req") {
    if (entity.semantic_source_field === "title") semantic.title = entity.title;
    else if (entity.semantic_source_field === "text_ref")
      semantic.text_ref = entity.text_ref;
    else semantic.semantic_text = entity.semantic_text;
    for (const key of [
      "semantic_clauses",
      "logic_claims",
      "proof_exempt",
      "proof_exempt_reason",
      "proof_contract",
      "proof_bindings",
    ])
      if (entity[key] !== undefined) semantic[key] = entity[key];
    if (Array.isArray(entity.semantic_inventory)) {
      semantic.semantic_inventory = entity.semantic_inventory
        .map((raw) => {
          if (typeof raw !== "object" || raw === null || Array.isArray(raw))
            throw new Error("Requirement semantic inventory row is invalid");
          const row = raw as Record<string, unknown>;
          return Object.fromEntries(
            ["claim_key", "claim_text", "role", "semantic_key"].flatMap(
              (key) => (row[key] === undefined ? [] : [[key, row[key]]]),
            ),
          );
        })
        .sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
    }
  }
  const semanticRelationshipTypes = new Set([
    "constrains",
    "depends_on",
    "requires_predicate",
    "requires_property",
    "requires_rule",
    "specified_by",
    "supersedes",
    "validates",
    "verified_by",
  ]);
  const relationships = result.relationships
    .filter(
      ({ type }) =>
        entity.type !== "req" || semanticRelationshipTypes.has(type),
    )
    .map(({ type, from, to }) => ({ type, from, to }))
    .sort((a, b) => canonicalJson(a).localeCompare(canonicalJson(b)));
  return fingerprint({ entity: semantic, relationships });
}

function entityRows(
  snapshot: GitChangeSnapshot,
  tree: string,
  knowledge = readSnapshotKnowledge(snapshot.readGit, tree, snapshot.readBlobs),
): Map<string, EntityRow> {
  const mdFiles = entriesForTree(snapshot, tree).filter(
    (entry) =>
      entry.type === "blob" &&
      entry.path.startsWith(".kb/") &&
      entry.path.endsWith(".md"),
  );
  const symbolsPath =
    entriesForTree(snapshot, tree).find(
      (entry) =>
        entry.path === ".kb/symbols.yaml" || entry.path === ".kb/symbols.yml",
    )?.path ?? "";
  const artifactById = new Map<string, string>();
  for (const entry of mdFiles) {
    const bytes = blobBytes(snapshot, entry);
    if (!bytes) continue;
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(
      source,
    )?.[1];
    if (!frontmatter) continue;
    const parsed = parseYaml(frontmatter) as { id?: unknown } | null;
    if (parsed && typeof parsed.id === "string")
      artifactById.set(parsed.id, entry.path);
  }
  const rows = new Map<string, EntityRow>();
  for (const result of knowledge) {
    const id = result.entity.id;
    const artifactPath =
      result.entity.type === "symbol"
        ? symbolsPath
        : (artifactById.get(id) ?? "");
    rows.set(id, {
      id,
      type: result.entity.type,
      fingerprint: semanticEntityFingerprint(result),
      artifactPath,
      ...(result.sourceFile ? { sourcePath: result.sourceFile } : {}),
    });
  }
  return rows;
}

function rawKnowledgeFingerprint(
  snapshot: GitChangeSnapshot,
  tree: string,
): Fingerprint {
  const entries = entriesForTree(snapshot, tree).filter(
    (entry) => entry.path === ".kb" || entry.path.startsWith(".kb/"),
  );
  const rows = entries.map((entry) => {
    const bytes = blobBytes(snapshot, entry);
    return {
      path: entry.path,
      mode: entry.mode,
      type: entry.type,
      ...(!isKnowledgeMarkdown(entry.path) ? { objectId: entry.objectId } : {}),
      bytes: bytes
        ? fingerprintBytes(snapshotFileContent(entry.path, bytes))
        : null,
    };
  });
  return fingerprint(rows);
}

function semanticKnowledgeFingerprint(
  rows: ReadonlyMap<string, EntityRow>,
): Fingerprint {
  return fingerprint(
    [...rows.values()]
      .map(
        ({
          id,
          type,
          fingerprint: entityFingerprint,
          artifactPath,
          sourcePath,
        }) => ({
          id,
          type,
          fingerprint: entityFingerprint,
          artifactPath,
          sourcePath: sourcePath ?? null,
        }),
      )
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

function requirementScope(
  rows: ReadonlyMap<string, EntityRow>,
  pathCandidates: readonly string[],
): string[] {
  const knowledge = [...rows.values()];
  const symbols = knowledge.filter(
    (row) =>
      row.type === "symbol" &&
      (pathCandidates.includes(row.sourcePath ?? "") ||
        pathCandidates.includes(row.artifactPath)),
  );
  const relationshipRows = readOnlyRelationships(rows);
  const ids = new Set<string>();
  for (const entity of knowledge)
    if (entity.type === "req" && pathCandidates.includes(entity.artifactPath))
      ids.add(entity.id);
  for (const symbol of symbols)
    for (const relation of relationshipRows.get(symbol.id) ?? []) {
      if (
        relation.type === "implements" &&
        rows.get(relation.to)?.type === "req"
      )
        ids.add(relation.to);
    }
  return [...ids].sort();
}

function readOnlyRelationships(
  rows: ReadonlyMap<string, EntityRow>,
): Map<string, readonly { type: string; to: string }[]> {
  // Filled by the private semantic side-table below; kept separate from public entity fingerprints.
  return relationshipSideTables.get(rows) ?? new Map();
}

const relationshipSideTables = new WeakMap<
  ReadonlyMap<string, EntityRow>,
  Map<string, readonly { type: string; to: string }[]>
>();

function entityRowsWithRelationships(
  snapshot: GitChangeSnapshot,
  tree: string,
): Map<string, EntityRow> {
  const knowledge = readSnapshotKnowledge(
    snapshot.readGit,
    tree,
    snapshot.readBlobs,
  );
  const rows = entityRows(snapshot, tree, knowledge);
  relationshipSideTables.set(
    rows,
    new Map(
      knowledge.map((result) => [
        result.entity.id,
        result.relationships.map(({ type, to }) => ({ type, to })),
      ]),
    ),
  );
  return rows;
}

export function loadBaseImpactPolicy(
  snapshot: GitChangeSnapshot,
): ImpactPolicy {
  const entry = treeEntry(snapshot, snapshot.baseTree, IMPACT_POLICY_PATH);
  if (
    !entry ||
    entry.type !== "blob" ||
    (entry.mode !== "100644" && entry.mode !== "100755")
  )
    throw new Error(
      `Trusted base policy missing or not a regular file: ${IMPACT_POLICY_PATH}`,
    );
  const bytes = blobBytes(snapshot, entry);
  if (!bytes) throw new Error("Trusted impact policy blob is missing");
  return parseImpactPolicy(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}

/**
 * A staged review is enabled only after a valid policy exists in the captured
 * base tree. A staged policy addition cannot authorize its own review, and a
 * candidate deletion cannot disable a policy already trusted by the base.
 * Any present but invalid entry fails closed through loadBaseImpactPolicy.
 */
export function hasValidBaseImpactPolicy(snapshot: GitChangeSnapshot): boolean {
  if (!treeEntry(snapshot, snapshot.baseTree, IMPACT_POLICY_PATH)) return false;
  loadBaseImpactPolicy(snapshot);
  return true;
}

export function prepareImpactReview(
  snapshot: GitChangeSnapshot,
  options: ImpactPreparationOptions,
): PreparedImpactReview {
  assertSha256(options.providerSetFingerprint, "Provider-set fingerprint");
  assertSha256(options.evaluatorFingerprint, "Evaluator fingerprint");
  const policy = loadBaseImpactPolicy(snapshot);
  const policyFingerprint = fingerprint(policy);
  const baseEntities = entityRowsWithRelationships(snapshot, snapshot.baseTree);
  const headEntities = entityRowsWithRelationships(snapshot, snapshot.headTree);
  const knowledgeFingerprint = fingerprint({
    baseRaw: rawKnowledgeFingerprint(snapshot, snapshot.baseTree),
    headRaw: rawKnowledgeFingerprint(snapshot, snapshot.headTree),
    baseSemantic: semanticKnowledgeFingerprint(baseEntities),
    headSemantic: semanticKnowledgeFingerprint(headEntities),
  });
  const sourceInventory = impactReviewInventory(snapshot);
  const inventoryPaths = new Set(sourceInventory.map((file) => file.path));
  const receiptOnlyPaths = new Set(
    snapshot.inventory.filter(isReceiptOnlyChange).map((file) => file.path),
  );
  for (const path of options.analyses.keys())
    if (
      path !== IMPACT_REVIEW_PATH &&
      !inventoryPaths.has(path) &&
      !receiptOnlyPaths.has(path)
    )
      throw new Error(`Analysis contains an extraneous changed path: ${path}`);
  const files: Omit<ImpactFileRecord, "decision">[] = [];
  const scopeFiles: unknown[] = [];
  const scopedRequirementIdsByPath = new Map<string, readonly string[]>();
  for (const file of sourceInventory) {
    const suppliedChange = options.analyses.get(file.path);
    const projectedFile = projectedPathEvidence(
      suppliedChange?.after?.status === "ok"
        ? { ...file, analysisDepth: "symbol", disposition: "checked" }
        : file,
    );
    const change =
      file.analysisDepth === "metadata" || file.skipReason
        ? undefined
        : suppliedChange;
    assertAnalysisInput(file, change);
    const previousPath = file.oldPath ?? file.copyFromPath ?? file.path;
    const before =
      file.status === "A"
        ? null
        : sideEvidence(
            snapshot,
            snapshot.baseTree,
            previousPath,
            change?.before ?? null,
            file.previousContent,
          );
    const after =
      file.status === "D"
        ? null
        : sideEvidence(
            snapshot,
            snapshot.headTree,
            file.path,
            change?.after ?? null,
            file.content,
          );
    if (before === null && after === null)
      throw new Error(`Changed path has no captured Git side: ${file.path}`);
    const reviews: AnalysisReview[] = [];
    const reqIds = new Set<string>();
    for (const [side, evidence, path] of [
      ["before", before, previousPath],
      ["after", after, file.path],
    ] as const) {
      const sourcePaths = path === file.path ? [file.path] : [path];
      for (const id of requirementScope(baseEntities, sourcePaths))
        reqIds.add(id);
      for (const id of requirementScope(headEntities, sourcePaths))
        reqIds.add(id);
      if (!evidence?.analysis) continue;
      const analysis = evidence.analysis;
      assertNoNonWaivableAnalysis(analysis, file.path, side);
      if (analysis.status === "failed")
        throw new Error(
          `Required source analysis failed for ${file.path} (${side})`,
        );
      if (analysis.status === "unsupported" && !policy.allowUnsupportedReview)
        throw new Error(
          `Unsupported source analysis is not reviewable by policy for ${file.path} (${side})`,
        );
      if (analysis.status === "partial") {
        if (
          analysis.diagnosticCodes.some((code) =>
            [
              "syntax_error",
              "parse_error",
              "parse_failed",
              "malformed_source",
            ].includes(code),
          )
        )
          throw new Error(
            `Syntax or malformed-source partial cannot use residual review for ${file.path} (${side})`,
          );
        const allowedClass = approvedPartialClass(policy, analysis);
        if (!allowedClass)
          throw new Error(
            `Partial source analysis is not allowed by trusted policy for ${file.path} (${side})`,
          );
        // The prepared snapshot contains requirements for a reviewer; it never
        // manufactures the review itself. The record must supply rationale.
        void allowedClass;
      }
      void side;
    }
    files.push({
      path: projectedFile.path,
      status: projectedFile.status,
      ...(projectedFile.oldPath ? { oldPath: projectedFile.oldPath } : {}),
      ...(projectedFile.copyFromPath
        ? { copyFromPath: projectedFile.copyFromPath }
        : {}),
      analysisDepth: projectedFile.analysisDepth,
      disposition: projectedFile.disposition,
      ...(projectedFile.skipReason
        ? { skipReason: projectedFile.skipReason }
        : {}),
      ...(projectedFile.gitMode ? { gitMode: projectedFile.gitMode } : {}),
      ...(projectedFile.previousMode
        ? { previousMode: projectedFile.previousMode }
        : {}),
      oldHunkRanges: projectedFile.oldHunkRanges ?? [],
      newHunkRanges: projectedFile.hunkRanges,
      before,
      after,
      analysisReviews: reviews,
    });
    scopeFiles.push(exactPathProjection(projectedFile, before, after));
    scopedRequirementIdsByPath.set(file.path, [...reqIds].sort());
  }
  const scopePayload = {
    contractVersion: IMPACT_EVALUATOR_VERSION,
    policyFingerprint,
    evaluatorFingerprint: options.evaluatorFingerprint,
    providerSetFingerprint: options.providerSetFingerprint,
    knowledgeFingerprint,
    files: scopeFiles,
  };
  const scopeFingerprint = fingerprint(scopePayload);
  return {
    policy,
    policyFingerprint,
    evaluatorFingerprint: options.evaluatorFingerprint,
    providerSetFingerprint: options.providerSetFingerprint,
    knowledgeFingerprint,
    scopeFingerprint,
    files,
    scopedRequirementIdsByPath,
    baseEntities,
    headEntities,
    scopePayload,
  };
}

export function createImpactReviewRecord(
  prepared: PreparedImpactReview,
  decisions: ReadonlyMap<
    string,
    Readonly<{
      decision: ImpactDecision;
      analysisReviews?: readonly AnalysisReview[];
    }>
  >,
  reviewerId: string,
  reviewedAt = new Date().toISOString(),
): ImpactReviewRecord {
  if (!reviewerId.trim()) throw new Error("Reviewer id is required");
  const expected = new Set(prepared.files.map((file) => file.path));
  if (
    decisions.size !== expected.size ||
    [...decisions.keys()].some((path) => !expected.has(path))
  )
    throw new Error(
      "Decisions must cover exactly the complete non-receipt inventory",
    );
  const files: ImpactFileRecord[] = prepared.files.map((file) => {
    const item = decisions.get(file.path);
    if (!item) throw new Error(`Missing decision for ${file.path}`);
    const authoredReviews = item.analysisReviews ?? [];
    return {
      ...file,
      analysisReviews: authoredReviews,
      decision: item.decision,
    };
  });
  for (const file of files) validateAnalysisReviews(file, prepared.policy);
  return parseImpactReviewRecord({
    contractVersion: IMPACT_REVIEW_VERSION,
    policy: {
      id: prepared.policy.id,
      version: prepared.policy.version,
      fingerprint: prepared.policyFingerprint,
    },
    evaluator: {
      contractVersion: IMPACT_EVALUATOR_VERSION,
      fingerprint: prepared.evaluatorFingerprint,
    },
    scope: {
      fingerprint: prepared.scopeFingerprint,
      knowledgeFingerprint: prepared.knowledgeFingerprint,
      providerSetFingerprint: prepared.providerSetFingerprint,
    },
    reviewer: { id: reviewerId, source: "self-claimed-local" },
    reviewedAt,
    files,
  });
}

function same(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}

function recordFromCapturedTree(
  snapshot: GitChangeSnapshot,
): ImpactReviewRecord {
  const entry = treeEntry(snapshot, snapshot.headTree, IMPACT_REVIEW_PATH);
  if (
    !entry ||
    entry.type !== "blob" ||
    (entry.mode !== "100644" && entry.mode !== "100755")
  )
    throw new Error(
      `Captured impact review record missing: ${IMPACT_REVIEW_PATH}`,
    );
  const bytes = blobBytes(snapshot, entry);
  if (!bytes) throw new Error("Impact review record blob is missing");
  return parseImpactReviewRecord(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
}

function validateDecisionAgainstSnapshot(
  path: string,
  decision: ImpactDecision,
  prepared: PreparedImpactReview,
  changedPaths: ReadonlySet<string>,
): void {
  if (decision.kind === "not_applicable") {
    if (!prepared.policy.notApplicablePaths.includes(path))
      throw new Error(`Policy does not permit not_applicable for ${path}`);
    return;
  }
  const inScope = prepared.scopedRequirementIdsByPath.get(path) ?? [];
  if (decision.kind === "no_impact") {
    if (inScope.length !== 0)
      throw new Error(
        `no_impact cannot omit scoped requirements for ${path}: ${inScope.join(", ")}`,
      );
    return;
  }
  const scoped = [...inScope].sort();
  const reqs = [...new Set(decision.requirementIds)].sort();
  if (
    reqs.length !== decision.requirementIds.length ||
    reqs.length !== scoped.length ||
    reqs.some((id, index) => id !== scoped[index])
  )
    throw new Error(
      `Impact requirements do not equal the complete scoped set for ${path}`,
    );
  if (decision.knowledge.state === "still_current") return;
  const after = prepared.headEntities;
  const before = prepared.baseEntities;
  let changedRequirement = false;
  const updatedRequirementIds = new Set<string>();
  for (const entity of decision.knowledge.entities) {
    const oldRow = before.get(entity.entityId);
    const newRow = after.get(entity.entityId);
    if (
      !newRow ||
      newRow.artifactPath !== entity.artifactPath ||
      !changedPaths.has(entity.artifactPath)
    )
      throw new Error(
        `Updated entity does not resolve to a changed scoped artifact: ${entity.entityId}`,
      );
    if (
      entity.beforeFingerprint !== (oldRow?.fingerprint ?? null) ||
      entity.afterFingerprint !== newRow.fingerprint ||
      entity.beforeFingerprint === entity.afterFingerprint
    )
      throw new Error(
        `Updated entity fingerprints are stale or semantically unchanged: ${entity.entityId}`,
      );
    if (newRow.type === "req") {
      if (!reqs.includes(entity.entityId))
        throw new Error(
          `Updated requirement is outside the complete scoped set: ${entity.entityId}`,
        );
      changedRequirement = true;
      updatedRequirementIds.add(entity.entityId);
    }
  }
  if (!changedRequirement)
    throw new Error(
      `Updated evidence for ${path} must include a semantically changed scoped requirement`,
    );
  const unchangedRequirementIds = new Set<string>();
  for (const item of decision.knowledge.stillCurrent ?? []) {
    if (!reqs.includes(item.requirementId))
      throw new Error(
        `stillCurrent requirement is outside the complete scoped set: ${item.requirementId}`,
      );
    if (updatedRequirementIds.has(item.requirementId))
      throw new Error(
        `Requirement is both updated and still_current: ${item.requirementId}`,
      );
    unchangedRequirementIds.add(item.requirementId);
  }
  if (
    unchangedRequirementIds.size !==
      (decision.knowledge.stillCurrent?.length ?? 0) ||
    updatedRequirementIds.size + unchangedRequirementIds.size !== reqs.length ||
    reqs.some(
      (id) =>
        !updatedRequirementIds.has(id) && !unchangedRequirementIds.has(id),
    )
  )
    throw new Error(
      `Updated evidence must account for every scoped requirement on ${path}`,
    );
}

function validateAnalysisReviews(
  record: ImpactFileRecord,
  policy: ImpactPolicy,
): void {
  for (const side of ["before", "after"] as const) {
    const evidence = record[side];
    const analysis = evidence?.analysis;
    const reviews = record.analysisReviews.filter(
      (review) => review.side === side,
    );
    if (!analysis) {
      if (reviews.length)
        throw new Error(
          `Review exists for absent ${side} analysis on ${record.path}`,
        );
      continue;
    }
    if (analysis.status === "failed")
      throw new Error(
        `Failed provider result cannot be waived for ${record.path} (${side})`,
      );
    assertNoNonWaivableAnalysis(analysis, record.path, side);
    if (analysis.status === "ok" && reviews.length)
      throw new Error(
        `Unnecessary analysis review for complete result on ${record.path} (${side})`,
      );
    if (analysis.status === "unsupported") {
      if (
        !policy.allowUnsupportedReview ||
        reviews.length !== 1 ||
        reviews[0]?.kind !== "unsupported_review"
      )
        throw new Error(
          `Unsupported side lacks one explicit whole-file review: ${record.path} (${side})`,
        );
    }
    if (analysis.status === "partial") {
      if (
        analysis.diagnosticCodes.some((code) =>
          [
            "syntax_error",
            "parse_error",
            "parse_failed",
            "malformed_source",
          ].includes(code),
        )
      )
        throw new Error(
          `Syntax or malformed-source partial cannot use residual review for ${record.path} (${side})`,
        );
      const allowedClass = approvedPartialClass(policy, analysis);
      if (!allowedClass)
        throw new Error(
          `Partial side is not approved by policy: ${record.path} (${side})`,
        );
      const review = reviews[0];
      if (
        reviews.length !== 1 ||
        review?.kind !== "partial_review" ||
        review.limitationClass !== allowedClass ||
        !same(review.ranges, analysis.uncoveredRanges)
      )
        throw new Error(
          `Partial review must cover every exact uncovered range: ${record.path} (${side})`,
        );
    }
  }
}

export function evaluateImpactReview(
  snapshot: GitChangeSnapshot,
  options: ImpactPreparationOptions,
): ImpactEvaluation {
  const diagnostics: ImpactReviewDiagnostic[] = [];
  try {
    const record = recordFromCapturedTree(snapshot);
    const prepared = prepareImpactReview(snapshot, options);
    if (
      record.policy.id !== prepared.policy.id ||
      record.policy.version !== prepared.policy.version ||
      record.policy.fingerprint !== prepared.policyFingerprint
    )
      throw new Error(
        "Review policy binding does not match trusted base policy",
      );
    if (
      record.evaluator.contractVersion !== IMPACT_EVALUATOR_VERSION ||
      record.evaluator.fingerprint !== prepared.evaluatorFingerprint
    )
      throw new Error("Review evaluator binding is stale");
    if (record.scope.providerSetFingerprint !== prepared.providerSetFingerprint)
      throw new Error("Review provider-set binding is stale");
    if (record.scope.knowledgeFingerprint !== prepared.knowledgeFingerprint)
      throw new Error("Review captured-knowledge binding is stale");
    const expected = new Map(prepared.files.map((file) => [file.path, file]));
    if (record.files.length !== expected.size)
      throw new Error("Review omits or adds changed paths");
    const changedPaths = new Set(snapshot.inventory.map((file) => file.path));
    const seen = new Set<string>();
    for (const file of record.files) {
      if (seen.has(file.path))
        throw new Error(`Duplicate review path: ${file.path}`);
      seen.add(file.path);
      const captured = expected.get(file.path);
      if (!captured)
        throw new Error(`Review contains extraneous path: ${file.path}`);
      const {
        decision: _decision,
        analysisReviews: _analysisReviews,
        ...capturedEvidence
      } = file;
      const { analysisReviews: _capturedReviews, ...expectedEvidence } =
        captured;
      if (!same(capturedEvidence, expectedEvidence)) {
        const capturedFields = capturedEvidence as Record<string, unknown>;
        const expectedFields = expectedEvidence as Record<string, unknown>;
        const changedFields = [
          ...new Set([
            ...Object.keys(capturedFields),
            ...Object.keys(expectedFields),
          ]),
        ]
          .filter(
            (field) => !same(capturedFields[field], expectedFields[field]),
          )
          .sort();
        throw new Error(
          `Per-file Git or analysis fingerprint is stale: ${file.path} (${changedFields.join(", ")})`,
        );
      }
      validateAnalysisReviews(file, prepared.policy);
      validateDecisionAgainstSnapshot(
        file.path,
        file.decision,
        prepared,
        changedPaths,
      );
    }
    for (const path of expected.keys())
      if (!seen.has(path)) throw new Error(`Missing review path: ${path}`);
    if (record.scope.fingerprint !== prepared.scopeFingerprint)
      throw new Error(
        `Review scope fingerprint is stale (record ${record.scope.fingerprint}; prepared ${prepared.scopeFingerprint})`,
      );
    snapshot.assertUnchanged();
    return {
      passed: true,
      scopeFingerprint: prepared.scopeFingerprint,
      diagnostics,
      reviewerAuthority: "self-claimed-local",
    };
  } catch (error) {
    diagnostics.push({
      code: "impact_review_invalid",
      message: error instanceof Error ? error.message : String(error),
    });
    return { passed: false, diagnostics, reviewerAuthority: "none" };
  }
}

/** Verify that the transport path is unique and that no second path is excluded. */
export function impactReviewInventory(
  snapshot: GitChangeSnapshot,
): readonly StagedPath[] {
  const transport = snapshot.inventory.filter(
    (file) => file.path === IMPACT_REVIEW_PATH,
  );
  if (transport.length > 1)
    throw new Error("Duplicate impact review transport path");
  const receipt = transport[0];
  if (
    receipt &&
    ((receipt.status !== "A" && receipt.status !== "M") ||
      receipt.oldPath !== undefined ||
      receipt.copyFromPath !== undefined)
  )
    throw new Error(
      "Impact review receipt may only be added or modified at its exact path; rename/copy cannot hide another changed path",
    );
  return snapshot.inventory.filter(
    (file) => file.path !== IMPACT_REVIEW_PATH && !isReceiptOnlyChange(file),
  );
}

/** Policy digest helper for tooling that prints a reviewable base policy. */
export function impactPolicyFingerprint(policy: ImpactPolicy): Fingerprint {
  return fingerprint(parseImpactPolicy(policy));
}

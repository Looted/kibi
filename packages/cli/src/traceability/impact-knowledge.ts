import { load as parseYaml } from "js-yaml";
import { snapshotFileContent } from "../public/operations/proof-receipt-projection.js";
import type { GitChangeSnapshot } from "./git-change-snapshot.js";
import { blobBytes, entriesForTree } from "./impact-git-tree.js";
import {
  type Fingerprint,
  canonicalJson,
  fingerprint,
  fingerprintBytes,
} from "./impact-review.js";
import { isKnowledgeMarkdown } from "./impact-side-evidence.js";
import { readSnapshotKnowledge } from "./snapshot-knowledge.js";

/** Captured knowledge rows, semantic fingerprints and requirement scope. */
// implements REQ-impact-policy-stage-e-content-bound-review
export type EntityRow = Readonly<{
  id: string;
  type: string;
  fingerprint: Fingerprint;
  artifactPath: string;
  sourcePath?: string;
}>;

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
      : // canonicalJson orders the keys, so entry order is irrelevant here.
        Object.fromEntries(
          Object.entries(entity).filter(
            ([key]) =>
              ![
                "source",
                "created_at",
                "updated_at",
                "title",
                "proof_receipts",
                // Provenance metadata, not authored meaning.
                "origin",
              ].includes(key),
          ),
        );
  if (entity.type === "req") {
    const sourceField =
      entity.semantic_source_field === "title" ||
      entity.semantic_source_field === "text_ref"
        ? entity.semantic_source_field
        : "semantic_text";
    // A requirement may have no text in its source field (a title-only
    // requirement has no semantic_text); an absent field is simply not bound.
    // rationale explains why a requirement exists; it is not checked meaning,
    // so editing it does not count as a semantic change.
    for (const key of [
      sourceField,
      "semantic_clauses",
      "logic_claims",
      "proof_exempt",
      "proof_exempt_reason",
      "required_evidence",
      "approved_by",
      "approval_ref",
      "failure_side_waiver",
      "failure_side_waiver_approved_by",
      "exempts_claims",
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

// implements REQ-impact-policy-stage-e-content-bound-review
export function entityRows(
  snapshot: GitChangeSnapshot,
  tree: string,
  knowledge = readSnapshotKnowledge(snapshot.readGit, tree, snapshot.readBlobs),
): Map<string, EntityRow> {
  const mdFiles = entriesForTree(snapshot, tree).filter(
    (entry) => entry.path.startsWith(".kb/") && entry.path.endsWith(".md"),
  );
  const symbolsPath =
    entriesForTree(snapshot, tree).find(
      (entry) =>
        entry.path === ".kb/symbols.yaml" || entry.path === ".kb/symbols.yml",
    )?.path ?? "";
  const artifactById = new Map<string, string>();
  for (const entry of mdFiles) {
    // A non-blob entry has no bytes and decodes as an empty file.
    const source = new TextDecoder("utf-8", { fatal: true }).decode(
      blobBytes(snapshot, entry),
    );
    // The pattern is anchored at the start, so a file has at most one
    // frontmatter match, and a file without frontmatter has none.
    for (const [, frontmatter] of source.matchAll(
      /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/g,
    )) {
      const parsed = parseYaml(frontmatter as string) as
        | { id?: unknown }
        | undefined;
      if (typeof parsed?.id === "string")
        artifactById.set(parsed.id, entry.path);
    }
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

// implements REQ-impact-policy-stage-e-content-bound-review
export function rawKnowledgeFingerprint(
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

// implements REQ-impact-policy-stage-e-content-bound-review
export function semanticKnowledgeFingerprint(
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

// implements REQ-impact-policy-stage-e-content-bound-review
export function requirementScope(
  rows: ReadonlyMap<string, EntityRow>,
  pathCandidates: readonly string[],
): string[] {
  const knowledge = [...rows.values()];
  const symbols = knowledge.filter(
    (row) =>
      row.type === "symbol" &&
      pathCandidates.some(
        (path) => path === row.sourcePath || path === row.artifactPath,
      ),
  );
  const relationshipRows = readOnlyRelationships(rows);
  const ids = new Set<string>();
  for (const entity of knowledge)
    if (entity.type === "req" && pathCandidates.includes(entity.artifactPath))
      ids.add(entity.id);
  const symbolIds = new Set(symbols.map((symbol) => symbol.id));
  for (const [from, relations] of relationshipRows) {
    if (!symbolIds.has(from)) continue;
    for (const relation of relations)
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

// implements REQ-impact-policy-stage-e-content-bound-review
export function entityRowsWithRelationships(
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

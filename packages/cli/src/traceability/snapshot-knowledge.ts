import { load as parseYaml } from "js-yaml";
import { extractFromManifestString } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdownString,
} from "../extractors/markdown.js";
import { convertRecordToRelationship } from "../extractors/relationships.js";
import type { RelationshipRecord } from "../relationships/shards.js";
import { isEntityLanePath } from "../utils/kb-paths.js";

type KnowledgeKind = "manifest" | "entity" | "shard";

function knowledgeKind(file: string): KnowledgeKind | null {
  if (file === ".kb/symbols.yaml" || file === ".kb/symbols.yml")
    return "manifest";
  if (isEntityLanePath(file) && file.endsWith(".md")) return "entity";
  if (file.startsWith(".kb/relationships/") && /\.ya?ml$/.test(file))
    return "shard";
  return null;
}

/** Compile authored knowledge from regular blobs of one immutable Git tree. */
export function readSnapshotKnowledge(
  readGit: (args: readonly string[]) => Buffer,
  tree: string,
  readBlobs?: (oids: readonly string[]) => ReadonlyMap<string, Buffer>,
): ExtractionResult[] {
  const authored = readGit(["ls-tree", "-r", "-z", tree, "--", ".kb"])
    .toString("utf8")
    .split("\0")
    // The empty tail after the last NUL names no knowledge file.
    .flatMap((entry) => {
      const tab = entry.indexOf("\t");
      const file = entry.slice(tab + 1);
      const kind = knowledgeKind(file);
      return kind === null
        ? []
        : [{ metadata: entry.slice(0, tab).split(" "), file, kind }];
    });
  const blobs = readBlobs?.(authored.map(({ metadata }) => metadata[2] ?? ""));
  const results: ExtractionResult[] = [];
  const relationships: RelationshipRecord[] = [];
  const compile: Record<
    KnowledgeKind,
    (content: string, file: string) => void
  > = {
    manifest: (content, file) => {
      results.push(...extractFromManifestString(content, file));
    },
    entity: (content, file) => {
      if (/^---\r?\n/.test(content))
        results.push(extractFromMarkdownString(content, file));
    },
    shard: (content, file) => {
      const parsed = parseYaml(content) as {
        relationships?: unknown;
      } | null;
      if (!parsed || !Array.isArray(parsed.relationships))
        throw new Error(`Invalid snapshot relationship shard: ${file}`);
      for (const row of parsed.relationships) {
        // A non-object row has no string type, so it fails the same check.
        if (
          !row ||
          typeof row.type !== "string" ||
          typeof row.from !== "string" ||
          typeof row.to !== "string"
        )
          throw new Error(`Invalid snapshot relationship in ${file}`);
        relationships.push(row as RelationshipRecord);
      }
    },
  };
  for (const { metadata, file, kind } of authored) {
    if (
      metadata[1] !== "blob" ||
      // includes(undefined) is false, like any other mode.
      !["100644", "100755"].includes(metadata[0] as string)
    )
      throw new Error(`Snapshot knowledge must be a regular file: ${file}`);
    const oid = metadata[2];
    if (!oid) throw new Error(`Missing snapshot object ID: ${file}`);
    const content = new TextDecoder("utf-8", { fatal: true }).decode(
      blobs?.get(oid) ?? readGit(["cat-file", "blob", oid]),
    );
    compile[kind](content, file);
  }
  const byId = new Map<string, ExtractionResult>();
  const duplicates = new Map<string, ExtractionResult[]>();
  for (const result of results) {
    const previous = byId.get(result.entity.id);
    if (previous) {
      const declarations = duplicates.get(result.entity.id) ?? [previous];
      declarations.push(result);
      duplicates.set(result.entity.id, declarations);
    } else byId.set(result.entity.id, result);
  }
  if (duplicates.size > 0)
    throw new Error(
      `Duplicate snapshot entities: ${JSON.stringify(
        [...duplicates].map(([id, declarations]) => ({
          id,
          declarations: declarations.map((row) => ({
            title: row.entity.title,
            status: row.entity.status,
            source: row.entity.source,
            sourceFile: row.sourceFile,
          })),
        })),
      )}`,
    );
  for (const row of relationships) {
    const relation = convertRecordToRelationship(row);
    const owner = byId.get(relation.from);
    if (!owner || !byId.has(relation.to))
      throw new Error(
        `Snapshot relationship has a missing endpoint: ${relation.from} -> ${relation.to}`,
      );
    owner.relationships.push(relation);
  }
  for (const result of results) {
    for (const relation of result.relationships) {
      if (!byId.has(relation.from) || !byId.has(relation.to))
        throw new Error(
          `Snapshot relationship has a missing endpoint: ${relation.from} -> ${relation.to}`,
        );
    }
  }
  return results;
}

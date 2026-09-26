import { load as parseYaml } from "js-yaml";
import { extractFromManifestString } from "../extractors/manifest.js";
import {
  type ExtractionResult,
  extractFromMarkdownString,
} from "../extractors/markdown.js";
import { convertRecordToRelationship } from "../extractors/relationships.js";
import type { RelationshipRecord } from "../relationships/shards.js";
import { isEntityLanePath } from "../utils/kb-paths.js";

/** Compile authored knowledge from regular blobs of one immutable Git tree. */
// implements REQ-014
export function readSnapshotKnowledge(
  readGit: (args: readonly string[]) => Buffer,
  tree: string,
  readBlobs?: (oids: readonly string[]) => ReadonlyMap<string, Buffer>,
): ExtractionResult[] {
  const entries = readGit(["ls-tree", "-r", "-z", tree, "--", ".kb"])
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  const authored = entries.filter((entry) => {
    const file = entry.slice(entry.indexOf("\t") + 1);
    return (
      file === ".kb/symbols.yaml" ||
      file === ".kb/symbols.yml" ||
      (isEntityLanePath(file) && file.endsWith(".md")) ||
      (file.startsWith(".kb/relationships/") && /\.ya?ml$/.test(file))
    );
  });
  const blobs = readBlobs?.(
    authored.map(
      (entry) => entry.slice(0, entry.indexOf("\t")).split(" ")[2] ?? "",
    ),
  );
  const results: ExtractionResult[] = [];
  const relationships: RelationshipRecord[] = [];
  for (const entry of authored) {
    const tab = entry.indexOf("\t");
    const metadata = entry.slice(0, tab).split(" ");
    const file = entry.slice(tab + 1);
    const isManifest =
      file === ".kb/symbols.yaml" || file === ".kb/symbols.yml";
    const isEntity = isEntityLanePath(file) && file.endsWith(".md");
    const isShard =
      file.startsWith(".kb/relationships/") && /\.ya?ml$/.test(file);
    if (!isManifest && !isEntity && !isShard) continue;
    if (
      metadata[1] !== "blob" ||
      !["100644", "100755"].includes(metadata[0] ?? "")
    )
      throw new Error(`Snapshot knowledge must be a regular file: ${file}`);
    const oid = metadata[2];
    if (!oid) throw new Error(`Missing snapshot object ID: ${file}`);
    const content = new TextDecoder("utf-8", { fatal: true }).decode(
      blobs?.get(oid) ?? readGit(["cat-file", "blob", oid]),
    );
    if (isManifest) results.push(...extractFromManifestString(content, file));
    else if (isEntity) {
      if (/^---\r?\n/.test(content))
        results.push(extractFromMarkdownString(content, file));
    } else {
      const parsed = parseYaml(content) as { relationships?: unknown } | null;
      if (!parsed || !Array.isArray(parsed.relationships))
        throw new Error(`Invalid snapshot relationship shard: ${file}`);
      for (const row of parsed.relationships) {
        if (
          !row ||
          typeof row !== "object" ||
          typeof row.type !== "string" ||
          typeof row.from !== "string" ||
          typeof row.to !== "string"
        )
          throw new Error(`Invalid snapshot relationship in ${file}`);
        relationships.push(row as RelationshipRecord);
      }
    }
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
    if (!relation) continue;
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

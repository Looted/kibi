#!/usr/bin/env bun
/**
 * Migration Script for ADR-017: Canonical Relationship Shards Storage
 *
 * This script migrates embedded relationships from:
 * 1. Markdown frontmatter (`links` field)
 * 2. Symbol manifest (`relationships` field in symbols.yaml)
 *
 * To canonical relationship shard files in `.kb/relationships/`
 *
 * Usage:
 *   cd /path/to/kibi && bun scripts/migrate-relationship-shards.ts
 *
 * The script will:
 * 1. Discover all markdown files with links in frontmatter
 * 2. Discover all relationships in symbols.yaml
 * 3. Create relationship shard files with deterministic IDs
 * 4. Validate the migration
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";

// Simple YAML frontmatter parser (avoids external dependency)
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const lines = match[1].split("\n");
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentArray: unknown[] | null = null;
  let currentObj: Record<string, string> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;

    // Check for top-level key: value pattern (no leading spaces)
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (keyMatch) {
      // If we were building an array, save it
      if (currentKey && currentArray) {
        result[currentKey] = currentArray;
      }

      const [, key, value] = keyMatch;
      currentKey = key;
      currentObj = null;

      if (value === "" || value === "[]") {
        // Could be start of array or empty value
        currentArray = [];
      } else if (value.startsWith("[") && value.endsWith("]")) {
        // Inline array
        try {
          result[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          result[key] = value;
        }
        currentArray = null;
      } else {
        result[key] = value;
        currentArray = null;
      }
    } else if (currentArray !== null && trimmed.startsWith("- ")) {
      // Array item
      const item = trimmed.slice(2).trim();
      const objPropMatch = item.match(/^(\w+):\s*(.*)$/);
      if (objPropMatch) {
        // Start of an object entry in the array (e.g. `- type: relates_to`)
        currentObj = { [objPropMatch[1]]: objPropMatch[2] };
        currentArray.push(currentObj);
      } else {
        // Simple string value
        currentObj = null;
        currentArray.push(item);
      }
    } else if (currentObj !== null && indent >= 4) {
      // Continuation property of the current array object (e.g. `  target: ADR-002`)
      const objPropMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (objPropMatch) {
        currentObj[objPropMatch[1]] = objPropMatch[2];
      }
    }
  }

  // Save final array if any
  if (currentKey && currentArray) {
    result[currentKey] = currentArray;
  }

  return result;
}

// Simple YAML parser for symbols.yaml
function parseYamlSimple(content: string): Record<string, unknown> {
  const lines = content.split("\n");
  const result: Record<string, unknown> = { symbols: [] };
  const symbols: Record<string, unknown>[] = [];
  let currentSymbol: Record<string, unknown> | null = null;
  let currentArray: string[] | null = null;
  let currentArrayKey: string | null = null;
  let currentRelationships: Record<string, string>[] | null = null;
  let inRelationships = false;
  let relIndent = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - line.trimStart().length;

    // Top level: symbols:
    if (trimmed === "symbols:") continue;

    // Symbol entry (2 spaces indent)
    if (indent === 2 && trimmed.startsWith("- ")) {
      if (currentSymbol) {
        symbols.push(currentSymbol);
      }
      currentSymbol = {};
      currentArray = null;
      currentArrayKey = null;
      currentRelationships = null;
      inRelationships = false;
      continue;
    }

    if (!currentSymbol) continue;

    // Property of symbol (4+ spaces indent)
    if (indent >= 4) {
      const propMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (propMatch) {
        const [, key, value] = propMatch;

        if (key === "links" && value === "") {
          currentArrayKey = "links";
          currentArray = [];
          currentSymbol.links = currentArray;
        } else if (key === "relationships" && value === "") {
          currentArrayKey = "relationships";
          currentRelationships = [];
          currentSymbol.relationships = currentRelationships;
          inRelationships = true;
          relIndent = indent;
        } else if (
          inRelationships &&
          currentRelationships &&
          indent > relIndent + 2
        ) {
          // Continuation property of the current relationship entry
          // (indented deeper than the `- ` item, e.g. `        target: ADR-002`)
          const rel = currentRelationships[currentRelationships.length - 1];
          if (rel && value) {
            rel[key] = value;
          }
        } else if (value) {
          currentSymbol[key] = value;
        }
      } else if (trimmed.startsWith("- ") && currentArrayKey) {
        const item = trimmed.slice(2).trim();
        if (currentArrayKey === "links" && currentArray) {
          currentArray.push(item);
        } else if (
          currentArrayKey === "relationships" &&
          currentRelationships
        ) {
          // New relationship entry (at the `- ` indent level)
          const rel: Record<string, string> = {};
          const colonIdx = item.indexOf(":");
          if (colonIdx >= 0) {
            const key = item.slice(0, colonIdx).trim();
            const val = item.slice(colonIdx + 1).trim();
            if (key) rel[key] = val;
          }
          currentRelationships.push(rel);
        }
      }
    }
  }

  if (currentSymbol) {
    symbols.push(currentSymbol);
  }

  result.symbols = symbols;
  return result;
}

interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
  source: string;
}

interface RelationshipRecord {
  id: string;
  type: string;
  from: string;
  to: string;
  created_at: string;
  created_by: string;
  source: string;
  confidence?: number;
}

const VALID_RELATIONSHIP_TYPES = new Set([
  "depends_on",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
]);

function relationshipIdFor(type: string, from: string, to: string): string {
  const hash = createHash("sha256")
    .update(`${type}|${from}|${to}`)
    .digest("hex");
  return `rel-${hash.slice(0, 12)}`;
}

function getShardPath(kbRoot: string, entityId: string): string {
  const hash = createHash("sha256").update(entityId).digest("hex");
  const shardName = hash.slice(0, 2);
  return path.join(kbRoot, "relationships", `${shardName}.yaml`);
}

function extractMarkdownLinks(filePath: string): ExtractedRelationship[] {
  const content = readFileSync(filePath, "utf8");
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter || !frontmatter.links) return [];

  const links = frontmatter.links;
  if (!Array.isArray(links)) return [];

  const relationships: ExtractedRelationship[] = [];
  const entityId = frontmatter.id as string | undefined;
  if (!entityId) return [];

  for (const link of links) {
    if (typeof link === "string") {
      // Simple string link - treat as relates_to
      relationships.push({
        type: "relates_to",
        from: entityId,
        to: link,
        source: filePath,
      });
    } else if (typeof link === "object" && link !== null) {
      // Structured link with type and target
      const linkObj = link as Record<string, string>;
      const type = linkObj.type || "relates_to";
      const target = linkObj.target || linkObj.to;
      if (target && VALID_RELATIONSHIP_TYPES.has(type)) {
        relationships.push({
          type,
          from: entityId,
          to: target,
          source: filePath,
        });
      }
    }
  }

  return relationships;
}

function extractSymbolManifestRelationships(
  manifestPath: string,
): ExtractedRelationship[] {
  if (!existsSync(manifestPath)) return [];

  const content = readFileSync(manifestPath, "utf8");
  const parsed = parseYamlSimple(content);
  if (!Array.isArray(parsed.symbols)) return [];

  const relationships: ExtractedRelationship[] = [];

  for (const symbol of parsed.symbols) {
    const symbolId = symbol.id as string | undefined;
    if (!symbolId) continue;

    // Extract from relationships field
    const rels = symbol.relationships;
    if (Array.isArray(rels)) {
      for (const rel of rels) {
        if (typeof rel === "object" && rel !== null) {
          const relObj = rel as Record<string, string>;
          const type = relObj.type || "relates_to";
          const target = relObj.target || relObj.to;
          if (target && VALID_RELATIONSHIP_TYPES.has(type)) {
            relationships.push({
              type,
              from: symbolId,
              to: target,
              source: manifestPath,
            });
          }
        }
      }
    }

    // Extract from links field (for backward compatibility)
    const links = symbol.links;
    if (Array.isArray(links)) {
      for (const link of links) {
        if (typeof link === "string") {
          relationships.push({
            type: "relates_to",
            from: symbolId,
            to: link,
            source: manifestPath,
          });
        }
      }
    }
  }

  return relationships;
}

function discoverMarkdownFiles(docsDir: string): string[] {
  const files: string[] = [];

  function traverse(dir: string) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  traverse(docsDir);
  return files;
}

function writeShard(shardPath: string, records: RelationshipRecord[]): void {
  const dir = path.dirname(shardPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Sort records deterministically
  const sorted = [...records].sort((a, b) => {
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;
    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) return typeCompare;
    return a.to.localeCompare(b.to);
  });

  // Remove duplicates
  const seen = new Set<string>();
  const unique: RelationshipRecord[] = [];
  for (const record of sorted) {
    const key = `${record.type}|${record.from}|${record.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }

  const yamlLines: string[] = [
    "# Relationship Shard",
    "# Auto-generated by ADR-017 migration script",
    `created_at: ${new Date().toISOString()}`,
    "",
    "relationships:",
  ];

  for (const r of unique) {
    yamlLines.push(`  - id: ${r.id}`);
    yamlLines.push(`    type: ${r.type}`);
    yamlLines.push(`    from: ${r.from}`);
    yamlLines.push(`    to: ${r.to}`);
    yamlLines.push(`    created_at: "${r.created_at}"`);
    yamlLines.push(`    created_by: ${r.created_by}`);
    yamlLines.push(`    source: ${r.source}`);
    if (r.confidence !== undefined) {
      yamlLines.push(`    confidence: ${r.confidence}`);
    }
  }

  writeFileSync(shardPath, `${yamlLines.join("\n")}\n`, "utf8");
}

async function migrate(): Promise<void> {
  const cwd = process.cwd();
  const kbRoot = path.join(cwd, ".kb");

  if (!existsSync(kbRoot)) {
    console.error("❌ No .kb directory found. Run 'kibi init' first.");
    process.exit(1);
  }

  console.log("🔍 Discovering relationships to migrate...\n");

  const allRelationships: ExtractedRelationship[] = [];

  // 1. Extract from markdown files
  const docsDir = path.join(cwd, "documentation");
  if (existsSync(docsDir)) {
    const mdFiles = discoverMarkdownFiles(docsDir);
    console.log(`Found ${mdFiles.length} markdown files`);
    for (const file of mdFiles) {
      const rels = extractMarkdownLinks(file);
      allRelationships.push(...rels);
    }
  }

  // 2. Extract from symbols.yaml
  const symbolsYamlPath = path.join(cwd, "documentation", "symbols.yaml");
  if (existsSync(symbolsYamlPath)) {
    const rels = extractSymbolManifestRelationships(symbolsYamlPath);
    console.log(`Found ${rels.length} relationships in symbols.yaml`);
    allRelationships.push(...rels);
  }

  console.log(
    `\n📦 Total relationships to migrate: ${allRelationships.length}`,
  );

  if (allRelationships.length === 0) {
    console.log("✅ No relationships to migrate.");
    return;
  }

  // 3. Group by shard
  const shardGroups = new Map<string, RelationshipRecord[]>();
  const now = new Date().toISOString();

  for (const rel of allRelationships) {
    const record: RelationshipRecord = {
      id: relationshipIdFor(rel.type, rel.from, rel.to),
      type: rel.type,
      from: rel.from,
      to: rel.to,
      created_at: now,
      created_by: "migration/adr-017",
      source: path.relative(cwd, rel.source),
    };

    const shardPath = getShardPath(kbRoot, rel.from);
    if (!shardGroups.has(shardPath)) {
      shardGroups.set(shardPath, []);
    }
    shardGroups.get(shardPath)?.push(record);
  }

  // 4. Write shards
  console.log(`\n📝 Writing ${shardGroups.size} shard files...\n`);
  for (const [shardPath, records] of shardGroups) {
    writeShard(shardPath, records);
    console.log(
      `  ✓ ${path.relative(cwd, shardPath)} (${records.length} relationships)`,
    );
  }

  // 5. Validate
  console.log("\n🔍 Validating migration...\n");
  let totalInShards = 0;
  for (const [shardPath, records] of shardGroups) {
    if (existsSync(shardPath)) {
      const content = readFileSync(shardPath, "utf8");
      // Count relationship entries
      const match = content.match(/relationships:/);
      if (match) {
        const lines = content.split("\n");
        let count = 0;
        for (const line of lines) {
          if (line.trim().startsWith("- id:")) count++;
        }
        totalInShards += count;
        console.log(
          `  ✓ ${path.relative(cwd, shardPath)}: ${count} relationships`,
        );
      }
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`  Source relationships: ${allRelationships.length}`);
  console.log(`  Shard files created: ${shardGroups.size}`);
  console.log(`  Relationships in shards: ${totalInShards}`);

  if (totalInShards === allRelationships.length) {
    console.log("\n✅ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("  1. Run 'kibi sync' to update the knowledge base");
    console.log(
      "  2. Verify relationships are accessible via kb_queryRelationships",
    );
    console.log(
      "  3. Optionally remove 'links' from markdown frontmatter (backup first)",
    );
    console.log(
      "  4. Optionally remove 'relationships' from symbols.yaml (backup first)",
    );
  } else {
    console.log("\n⚠️  Migration may have issues. Please verify manually.");
    process.exit(1);
  }
}

migrate().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});

/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createHash } from "node:crypto";
import {
  type Stats,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { load as parseYaml } from "js-yaml";

import { runtimeDirectory } from "./engine.js";

/**
 * The whole decision corpus of a workspace, read from the `.kb` files
 * without the Prolog store: every entity with its body and every
 * relationship. Decision search ranks all of it, and a Prolog round trip per
 * entity type costs more than a search may take.
 *
 * Each file's rows are kept in a cache file under the runtime directory,
 * keyed by the file's size and modification time, so a search after an edit
 * parses only the files that changed.
 */

export type CorpusEntity = Readonly<Record<string, unknown>> & {
  readonly id: string;
  readonly type: string;
  readonly title: string;
};

export type CorpusEdge = Readonly<{
  relationship: string;
  from: string;
  to: string;
}>;

export type DecisionCorpus = Readonly<{
  entities: readonly CorpusEntity[];
  edges: readonly CorpusEdge[];
  /** Changes whenever any file the corpus was read from changes. */
  signature: string;
}>;

const ENTITY_DIRECTORIES: ReadonlyArray<readonly [string, string]> = [
  ["requirements", "req"],
  ["facts", "fact"],
  ["tests", "test"],
  ["scenarios", "scenario"],
  ["adr", "adr"],
  ["flags", "flag"],
  ["events", "event"],
];

// Front-matter fields search never reads: large and not ranked.
const DROPPED_FIELDS = new Set([
  "semantic_inventory",
  "semantic_source_hash",
  "logic_claims",
  "proof_receipts",
  "proof_bindings",
  "pair_reviews",
  "rule_ir",
]);

const CACHE_VERSION = 1;
/** Set to 0 to read every file on every search. */
export const KIBI_DECISION_CORPUS_CACHE_ENV = "KIBI_DECISION_CORPUS_CACHE";

type FileRows = { entities: CorpusEntity[]; edges: CorpusEdge[] };
type CacheEntry = FileRows & { stamp: string };
type CacheFile = { version: number; files: Record<string, CacheEntry> };

function stampOf(stats: Stats): string {
  return `${stats.size}:${stats.mtimeMs}`;
}

function splitFrontMatter(text: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: parseYaml(match[1] as string), body: match[2] as string };
}

function linkEdges(id: string, links: unknown): CorpusEdge[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link): CorpusEdge[] => {
    if (typeof link === "string")
      return [{ relationship: "relates_to", from: id, to: link }];
    if (link && typeof link === "object") {
      const { type, target } = link as { type?: unknown; target?: unknown };
      if (typeof type === "string" && typeof target === "string")
        return [{ relationship: type, from: id, to: target }];
    }
    return [];
  });
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** The rows of one entity file; `relative` is its `.kb/<lane>/<name>` path. */
export function entityFileRows(
  text: string,
  relative: string,
  type: string,
): FileRows {
  const { data, body } = splitFrontMatter(text);
  const fields = record(data);
  const name = path.posix.basename(relative);
  const id = String(fields.id ?? name.replace(/\.md$/, ""));
  const entity: CorpusEntity = {
    ...Object.fromEntries(
      Object.entries(fields).filter(([key]) => !DROPPED_FIELDS.has(key)),
    ),
    id,
    type: String(fields.type ?? type),
    title: String(fields.title ?? id),
    source: relative,
    body,
  };
  return { entities: [entity], edges: linkEdges(id, fields.links) };
}

/** The relationships of one `.kb/relationships` shard. */
export function relationshipFileRows(text: string): FileRows {
  const rows = record(parseYaml(text)).relationships;
  const edges: CorpusEdge[] = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const { type, from, to } = record(row);
    if (
      typeof type === "string" &&
      typeof from === "string" &&
      typeof to === "string"
    )
      edges.push({ relationship: type, from, to });
  }
  return { entities: [], edges };
}

/** The symbols of `.kb/symbols.yaml` and the relationships they declare. */
export function symbolFileRows(text: string): FileRows {
  const symbols = record(parseYaml(text)).symbols;
  const entities: CorpusEntity[] = [];
  const edges: CorpusEdge[] = [];
  for (const value of Array.isArray(symbols) ? symbols : []) {
    const symbol = record(value);
    if (symbol.id === undefined) continue;
    const id = String(symbol.id);
    entities.push({
      id,
      type: "symbol",
      title: String(symbol.title ?? id),
      status: symbol.status,
      sourceFile: symbol.sourceFile,
      source: symbol.sourceFile,
      tags: Array.isArray(symbol.tags) ? symbol.tags : [],
    });
    const relationships = symbol.relationships;
    for (const entry of Array.isArray(relationships) ? relationships : []) {
      const { type, target } = record(entry);
      if (typeof type === "string" && typeof target === "string")
        edges.push({ relationship: type, from: id, to: target });
    }
    edges.push(...linkEdges(id, symbol.links));
  }
  return { entities, edges };
}

type SourceFile = Readonly<{
  relative: string;
  absolute: string;
  read: (text: string) => FileRows;
}>;

function listFiles(workspaceRoot: string): SourceFile[] {
  const kb = path.join(workspaceRoot, ".kb");
  const files: SourceFile[] = [];
  const list = (directory: string): string[] => {
    try {
      return readdirSync(path.join(kb, directory)).sort();
    } catch {
      return [];
    }
  };
  for (const [directory, type] of ENTITY_DIRECTORIES) {
    for (const name of list(directory)) {
      if (!name.endsWith(".md")) continue;
      const relative = `.kb/${directory}/${name}`;
      files.push({
        relative,
        absolute: path.join(kb, directory, name),
        read: (text) => entityFileRows(text, relative, type),
      });
    }
  }
  for (const name of list("relationships")) {
    if (!/\.ya?ml$/.test(name)) continue;
    files.push({
      relative: `.kb/relationships/${name}`,
      absolute: path.join(kb, "relationships", name),
      read: relationshipFileRows,
    });
  }
  const symbols = path.join(kb, "symbols.yaml");
  if (existsSync(symbols))
    files.push({
      relative: ".kb/symbols.yaml",
      absolute: symbols,
      read: symbolFileRows,
    });
  return files;
}

function cachePath(workspaceRoot: string): string {
  const workspace = createHash("sha256")
    .update(path.resolve(workspaceRoot))
    .digest("hex")
    .slice(0, 24);
  return path.join(runtimeDirectory(), `decision-corpus-${workspace}.json`);
}

function readCache(file: string | undefined): Map<string, CacheEntry> {
  if (file === undefined) return new Map();
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as CacheFile;
    return parsed.version === CACHE_VERSION
      ? new Map(Object.entries(parsed.files))
      : new Map();
  } catch {
    return new Map();
  }
}

function writeCache(file: string, entries: Map<string, CacheEntry>): void {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    const body: CacheFile = {
      version: CACHE_VERSION,
      files: Object.fromEntries(entries),
    };
    writeFileSync(temporary, JSON.stringify(body), { mode: 0o600 });
    renameSync(temporary, file);
  } catch {
    // A full or read-only runtime directory only costs speed.
    rmSync(temporary, { force: true });
  }
}

const loaded = new Map<string, DecisionCorpus>();

/**
 * Every entity and relationship of `<workspaceRoot>/.kb`. A file that cannot
 * be read or parsed contributes nothing: `kibi check` reports it, and search
 * answers from the rest.
 */
export function loadDecisionCorpus(workspaceRoot: string): DecisionCorpus {
  const files = listFiles(workspaceRoot);
  const stamps = files.map((file) => {
    try {
      return stampOf(statSync(file.absolute));
    } catch {
      return "missing";
    }
  });
  const signature = createHash("sha1")
    .update(
      JSON.stringify(
        files.map((file, index) => [file.relative, stamps[index]]),
      ),
    )
    .digest("base64");
  const key = path.resolve(workspaceRoot);
  const memo = loaded.get(key);
  if (memo?.signature === signature) return memo;

  let cacheFile: string | undefined;
  if (process.env[KIBI_DECISION_CORPUS_CACHE_ENV] !== "0") {
    try {
      cacheFile = cachePath(workspaceRoot);
    } catch {
      cacheFile = undefined;
    }
  }
  const cached = readCache(cacheFile);
  const next = new Map<string, CacheEntry>();
  let changed = cached.size !== files.length;
  const entities: CorpusEntity[] = [];
  const edges: CorpusEdge[] = [];
  files.forEach((file, index) => {
    const stamp = stamps[index] as string;
    let entry = cached.get(file.relative);
    if (entry === undefined || entry.stamp !== stamp) {
      changed = true;
      let rows: FileRows = { entities: [], edges: [] };
      try {
        rows = file.read(readFileSync(file.absolute, "utf8"));
      } catch {}
      entry = { stamp, ...rows };
    }
    next.set(file.relative, entry);
    entities.push(...entry.entities);
    edges.push(...entry.edges);
  });
  if (changed && cacheFile !== undefined) writeCache(cacheFile, next);
  const corpus: DecisionCorpus = { entities, edges, signature };
  loaded.set(key, corpus);
  return corpus;
}

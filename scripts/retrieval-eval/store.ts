/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Reads a `.kb` directory straight from its files, without Prolog, so the
// retrieval replay can rank the same rows Kibi's search would see and can
// clone them to measure larger stores.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export type StoreEntity = Record<string, unknown> & {
  id: string;
  type: string;
  title: string;
  body?: string;
};

export type StoreEdge = Readonly<{
  relationship: string;
  from: string;
  to: string;
}>;

export type Store = Readonly<{
  /** The directory holding `.kb`, which Kibi reads bodies relative to. */
  root: string;
  entities: StoreEntity[];
  edges: StoreEdge[];
}>;

const ENTITY_DIRECTORIES: ReadonlyArray<readonly [string, string]> = [
  ["requirements", "req"],
  ["facts", "fact"],
  ["tests", "test"],
  ["scenarios", "scenario"],
  ["adr", "adr"],
  ["adrs", "adr"],
  ["flags", "flag"],
  ["events", "event"],
];

// Front-matter fields the search rows never carry (large and not ranked).
const DROPPED_FIELDS = new Set([
  "semantic_inventory",
  "semantic_source_hash",
  "logic_claims",
]);

function parseYaml(text: string): unknown {
  return Bun.YAML.parse(text);
}

function splitFrontMatter(text: string): { data: unknown; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!match) return { data: {}, body: text };
  return { data: parseYaml(match[1] as string), body: match[2] as string };
}

function linkEdges(id: string, links: unknown): StoreEdge[] {
  if (!Array.isArray(links)) return [];
  return links.flatMap((link) => {
    if (typeof link === "string") {
      return [{ relationship: "relates_to", from: id, to: link }];
    }
    if (link && typeof link === "object") {
      const { type, target } = link as { type?: unknown; target?: unknown };
      if (typeof type === "string" && typeof target === "string")
        return [{ relationship: type, from: id, to: target }];
    }
    return [];
  });
}

/** Load the entities and relationships of `<root>/.kb`. */
export function loadStore(root: string): Store {
  const kb = path.join(root, ".kb");
  const entities: StoreEntity[] = [];
  const edges: StoreEdge[] = [];
  for (const [directory, type] of ENTITY_DIRECTORIES) {
    const dir = path.join(kb, directory);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).sort()) {
      if (!name.endsWith(".md")) continue;
      const { data, body } = splitFrontMatter(
        readFileSync(path.join(dir, name), "utf8"),
      );
      const fields = (data ?? {}) as Record<string, unknown>;
      const id = String(fields.id ?? name.replace(/\.md$/, ""));
      const row: StoreEntity = {
        ...Object.fromEntries(
          Object.entries(fields).filter(([key]) => !DROPPED_FIELDS.has(key)),
        ),
        id,
        type: String(fields.type ?? type),
        title: String(fields.title ?? id),
        source: `.kb/${directory}/${name}`,
        body,
      };
      entities.push(row);
      edges.push(...linkEdges(id, fields.links));
    }
  }
  const relationships = path.join(kb, "relationships");
  if (existsSync(relationships)) {
    for (const name of readdirSync(relationships).sort()) {
      if (!/\.ya?ml$/.test(name)) continue;
      const data = parseYaml(
        readFileSync(path.join(relationships, name), "utf8"),
      ) as { relationships?: Array<Record<string, unknown>> } | null;
      for (const row of data?.relationships ?? []) {
        if (
          typeof row.type === "string" &&
          typeof row.from === "string" &&
          typeof row.to === "string"
        )
          edges.push({ relationship: row.type, from: row.from, to: row.to });
      }
    }
  }
  const symbolsFile = path.join(kb, "symbols.yaml");
  if (existsSync(symbolsFile)) {
    const data = parseYaml(readFileSync(symbolsFile, "utf8")) as {
      symbols?: Array<Record<string, unknown>>;
    } | null;
    for (const symbol of data?.symbols ?? []) {
      const id = String(symbol.id);
      entities.push({
        id,
        type: "symbol",
        title: String(symbol.title ?? id),
        status: symbol.status,
        sourceFile: symbol.sourceFile,
        source: symbol.sourceFile,
        tags: symbol.tags ?? [],
      });
      for (const relationship of (symbol.relationships ?? []) as Array<
        Record<string, unknown>
      >) {
        if (
          typeof relationship.type === "string" &&
          typeof relationship.target === "string"
        )
          edges.push({
            relationship: relationship.type,
            from: id,
            to: relationship.target,
          });
      }
      edges.push(...linkEdges(id, symbol.links));
    }
  }
  return { root, entities, edges };
}

/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Grows a store by cloning its look-alikes: every requirement from a
// knowledge source that none of the expected decisions comes from, with its
// facts, under a new source per copy. The decisions the cases ask about are
// never cloned, so a larger store only adds competitors.

import type { Store, StoreEdge, StoreEntity } from "./store.js";

const SOURCE_TAG = "knowledge-source:";
const FACT_LINKS = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

function sourceOf(entity: StoreEntity): string | undefined {
  const tags = Array.isArray(entity.tags) ? entity.tags.map(String) : [];
  return tags.find((tag) => tag.startsWith(SOURCE_TAG));
}

// Word swaps keep a copy close to its original without being identical, so
// the copies do not tie exactly with each other.
const VARIANTS = [
  ["limit", "cap"],
  ["maximum", "upper bound"],
  ["must", "shall"],
  ["user", "account"],
  ["organization", "team"],
  ["document", "file"],
  ["search", "lookup"],
  ["tag", "label"],
];

function variantTitle(title: string, copy: number): string {
  const [from, to] = VARIANTS[copy % VARIANTS.length] ?? ["", ""];
  const swapped = title.replace(new RegExp(`\\b${from}\\b`, "i"), to);
  return `${swapped} (variant ${copy})`;
}

export function scaleStore(
  store: Store,
  factor: number,
  keepIds: ReadonlySet<string>,
): Store {
  if (factor <= 1) return store;
  const byId = new Map(store.entities.map((e) => [e.id, e]));
  const keepSources = new Set(
    [...keepIds].flatMap((id) => {
      const entity = byId.get(id);
      const source = entity ? sourceOf(entity) : undefined;
      return source ? [source] : [];
    }),
  );
  const crowd = store.entities.filter(
    (entity) =>
      entity.type === "req" &&
      !keepIds.has(entity.id) &&
      [sourceOf(entity)].some(
        (source) => source !== undefined && !keepSources.has(source),
      ),
  );
  const factEdges = new Map<string, StoreEdge[]>();
  for (const edge of store.edges) {
    if (!FACT_LINKS.has(edge.relationship)) continue;
    const rows = factEdges.get(edge.from) ?? [];
    rows.push(edge);
    factEdges.set(edge.from, rows);
  }
  const entities = [...store.entities];
  const edges = [...store.edges];
  const cloned = new Set<string>();
  for (let copy = 1; copy < factor; copy += 1) {
    for (const req of crowd) {
      const id = `${req.id}-x${copy}`;
      const tags = (Array.isArray(req.tags) ? req.tags.map(String) : []).map(
        (tag) => (tag.startsWith(SOURCE_TAG) ? `${tag}-x${copy}` : tag),
      );
      const title = variantTitle(req.title, copy);
      entities.push({
        ...req,
        id,
        title,
        semantic_text: title,
        tags,
      });
      for (const edge of factEdges.get(req.id) ?? []) {
        const fact = byId.get(edge.to);
        if (!fact) continue;
        const factId = `${fact.id}-x${copy}`;
        if (!cloned.has(factId)) {
          cloned.add(factId);
          entities.push({ ...fact, id: factId });
        }
        edges.push({ relationship: edge.relationship, from: id, to: factId });
      }
    }
  }
  return { root: store.root, entities, edges };
}

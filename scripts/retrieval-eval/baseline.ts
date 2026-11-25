/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Today's behaviour, for comparison: kb_search's intent ranking over every
// row (two passes, as executeIntentSearch runs it, without the Prolog
// candidate cap), and the edit hook's reach (the requirements linked to the
// edited files).

import {
  type MarkdownBodyCache,
  rankIntentEntities,
} from "../../packages/cli/src/intent-search.js";
import type { ReplayCase } from "./cases.js";
import type { Store } from "./store.js";

export type Retriever = Readonly<{
  name: string;
  prepare(store: Store): Promise<RetrieverRun> | RetrieverRun;
}>;

export type RetrieverRun = (
  replayCase: ReplayCase,
) => Promise<{ rows: readonly string[]; chars?: number }>;

const MAX_GRAPH_SEEDS = 5;
const MAX_GRAPH_EDGES = 2_000;

export const kibiSearchBaseline: Retriever = {
  name: "kibi-search-today",
  prepare(store) {
    const rows = store.entities.map(({ body: _body, ...row }) => row);
    const edges = store.edges.map((edge) => ({ ...edge }));
    const bodies: MarkdownBodyCache = new Map();
    return async (replayCase) => {
      const query = replayCase.query ?? replayCase.request ?? "";
      if (!query.trim()) return { rows: [] };
      const options = { query };
      const first = await rankIntentEntities(
        rows.map((row) => ({ ...row })),
        options,
        store.root,
        [],
        bodies,
      );
      const seeds = first.matches
        .slice(0, MAX_GRAPH_SEEDS)
        .map((match) => String(match.entity.id));
      const graph = edges
        .filter((edge) => seeds.includes(edge.from) || seeds.includes(edge.to))
        .slice(0, MAX_GRAPH_EDGES);
      const second = await rankIntentEntities(
        rows.map((row) => ({ ...row })),
        options,
        store.root,
        graph,
        bodies,
      );
      return { rows: second.matches.map((match) => String(match.entity.id)) };
    };
  },
};

/** The requirements linked to the edited files, most-linked first. */
export const editHookBaseline: Retriever = {
  name: "edit-hook-today",
  prepare(store) {
    const fileOf = new Map(
      store.entities
        .filter((entity) => entity.type === "symbol")
        .map((entity) => [entity.id, String(entity.sourceFile ?? "")]),
    );
    const linked = new Map<string, Map<string, number>>();
    for (const edge of store.edges) {
      if (edge.relationship !== "implements") continue;
      const file = fileOf.get(edge.from);
      if (!file) continue;
      const counts = linked.get(file) ?? new Map<string, number>();
      counts.set(edge.to, (counts.get(edge.to) ?? 0) + 1);
      linked.set(file, counts);
    }
    return async (replayCase) => {
      const scores = new Map<string, number>();
      for (const file of new Set(replayCase.edits.map((edit) => edit.path))) {
        for (const [id, count] of linked.get(file) ?? [])
          scores.set(id, (scores.get(id) ?? 0) + count);
      }
      return {
        rows: [...scores]
          .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
          .map(([id]) => id),
      };
    };
  },
};

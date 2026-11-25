/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// The decision retriever (packages/agent-core/src/retrieval.ts) as a replay
// retriever, with and without the embedding ranking fused in.

import { existsSync } from "node:fs";
import path from "node:path";
import {
  type RetrievalIndex,
  buildRetrievalIndex,
  formatCardLine,
  retrieve,
} from "../../packages/agent-core/src/retrieval.js";
import type { Retriever } from "./baseline.js";
import type { ReplayCase } from "./cases.js";
import type { Store } from "./store.js";

type Encoder = { encode(text: string): Float32Array };

let encoder: Encoder | undefined;
async function loadEncoder(): Promise<Encoder> {
  if (!encoder) {
    const { loadStaticModel } = await import(
      "../../packages/plugin-search-hints/src/model.js"
    );
    encoder = loadStaticModel();
  }
  return encoder;
}

export type CardsOptions = Readonly<{
  /** The workspace whose files decide scope; every file exists when unset. */
  workspace?: string;
  vectors: boolean;
  /** Turn scope off (every decision unscoped), for the ablation rows. */
  noScope?: boolean;
}>;

function caseText(replayCase: ReplayCase): string {
  return replayCase.query ?? "";
}

export function cardsRetriever(name: string, options: CardsOptions): Retriever {
  return {
    name,
    async prepare(store: Store) {
      const workspace = options.workspace;
      const fileExists = workspace
        ? (file: string) => existsSync(path.join(workspace, file))
        : undefined;
      const built = buildRetrievalIndex(store.entities, store.edges, {
        ...(fileExists ? { fileExists } : {}),
      });
      const index: RetrievalIndex = options.noScope
        ? {
            ...built,
            cards: built.cards.map((card) => ({
              ...card,
              scope: "unscoped" as const,
            })),
          }
        : built;
      let rankByVector: ((text: string) => number[]) | undefined;
      if (options.vectors) {
        const model = await loadEncoder();
        const vectors = index.cards.map((card) =>
          model.encode(`${card.title}\n${card.statement}`),
        );
        rankByVector = (text: string) => {
          const query = model.encode(text);
          return vectors.map((vector) => {
            let sum = 0;
            for (let i = 0; i < vector.length; i += 1)
              sum += (vector[i] as number) * (query[i] as number);
            return sum;
          });
        };
      }
      return async (replayCase: ReplayCase) => {
        const text = caseText(replayCase);
        const vectorText =
          text ||
          replayCase.edits.map((edit) => `${edit.old}\n${edit.new}`).join("\n");
        const result = retrieve(index, {
          text,
          ...(replayCase.request ? { request: replayCase.request } : {}),
          paths: replayCase.context,
          edits: replayCase.edits,
          limit: 5,
          ...(rankByVector && vectorText.trim()
            ? { vectorScores: rankByVector(vectorText) }
            : {}),
        });
        return {
          rows: result.ranking,
          chars: result.cards.map(formatCardLine).join("\n").length,
        };
      };
    },
  };
}

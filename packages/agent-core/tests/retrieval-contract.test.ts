import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";

import { loadStore } from "../../../scripts/retrieval-eval/store";
import {
  type RetrievalIndex,
  buildRetrievalIndex,
  formatCardLine,
  retrieve,
} from "../src/retrieval";

// End to end over this repository's own knowledge base: the store is read
// from .kb the way the replay harness reads it, scope comes from the files
// that exist in this checkout, and the answer is the card lines an agent
// would read.

const root = path.resolve(import.meta.dir, "../../..");
const store = loadStore(root);
const here = (file: string) => existsSync(path.join(root, file));

let cached: RetrievalIndex | undefined;
function index(): RetrievalIndex {
  cached ??= buildRetrievalIndex(store.entities, store.edges, {
    fileExists: here,
  });
  return cached;
}

describe("decision retrieval over this repository's knowledge base", () => {
  test("a plain question finds the governing decision as a short card", () => {
    const result = retrieve(index(), {
      text: "how long may a decision card line be in a search answer",
    });
    expect(result.ranking.slice(0, 5)).toContain(
      "REQ-search-decision-card-line",
    );
    expect(result.cards.length).toBeLessThanOrEqual(5);
    for (const card of result.cards) {
      const line = formatCardLine(card);
      expect(line).not.toContain("\n");
      expect(line.length).toBeLessThanOrEqual(300);
      expect(line).toContain(card.id);
    }
  });

  test("decisions linked to files here are in scope, and a checkout without those files moves them to another scope", () => {
    const card = index().cards.find(
      (entry) => entry.id === "REQ-search-decision-scope",
    );
    expect(card?.scope).toBe("in");
    const elsewhere = buildRetrievalIndex(store.entities, store.edges, {
      fileExists: (file) =>
        here(file) && !file.startsWith("packages/agent-core/"),
    });
    const moved = elsewhere.cards.find(
      (entry) => entry.id === "REQ-search-decision-scope",
    );
    expect(moved?.scope).not.toBe("in");
  });

  test("decisions in another scope are only counted", () => {
    const shown = buildRetrievalIndex(store.entities, store.edges, {
      fileExists: (file) => !file.startsWith("packages/agent-core/"),
    });
    const result = retrieve(shown, {
      text: "fold near identical decisions into the card above them",
    });
    const other = new Set(
      shown.cards.filter((card) => card.scope === "other").map((c) => c.id),
    );
    expect(other.size).toBeGreaterThan(0);
    for (const card of result.cards) expect(other.has(card.id)).toBe(false);
    expect(result.otherScopes.count).toBeGreaterThan(0);
    expect(result.otherScopes.ids.length).toBeLessThanOrEqual(3);
  });

  test("a superseded decision never leads a card", () => {
    const superseded = index().cards.filter((card) => card.supersededBy);
    expect(superseded.length).toBeGreaterThan(0);
    for (const sample of superseded.slice(0, 3)) {
      const result = retrieve(index(), { text: sample.title });
      for (const card of result.cards) expect(card.id).not.toBe(sample.id);
    }
  });

  test("a question with words no decision holds lists them and still answers", () => {
    const result = retrieve(index(), {
      text: "zyxwvut quokka decision card line length",
    });
    expect(result.uncoveredTerms).toContain("zyxwvut");
    expect(result.cards.length).toBeGreaterThan(0);
  });
});

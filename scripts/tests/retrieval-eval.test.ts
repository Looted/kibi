import { describe, expect, test } from "bun:test";
import path from "node:path";

import {
  editHookBaseline,
  kibiSearchBaseline,
} from "../retrieval-eval/baseline";
import { cardsRetriever } from "../retrieval-eval/cards";
import { type ReplayCase, replayCases } from "../retrieval-eval/cases";

const all = replayCases();
const suite = (...names: string[]) =>
  all.filter((c) => names.includes(c.suite));
import { formatSummary, rankOf, summarize } from "../retrieval-eval/metrics";
import { scaleStore } from "../retrieval-eval/scale";
import { loadStore } from "../retrieval-eval/store";

const root = path.resolve(import.meta.dir, "../..");
const store = loadStore(root);

const question = (query: string, expected: string): ReplayCase => ({
  id: "q",
  suite: "test",
  split: "dev",
  control: false,
  expectedIds: [expected],
  query,
  context: [],
  edits: [],
  group: "g",
});

describe("retrieval replay harness", () => {
  test("the store loader reads decisions, links and bodies from .kb", () => {
    const ids = new Set(store.entities.map((entity) => entity.id));
    expect(ids.has("REQ-search-decision-card-line")).toBe(true);
    expect(
      store.edges.some(
        (edge) =>
          edge.relationship === "verified_by" &&
          edge.from === "REQ-search-decision-card-line",
      ),
    ).toBe(true);
    const card = store.entities.find(
      (entity) => entity.id === "REQ-search-decision-card-line",
    );
    expect(card?.body).toContain("300 characters");
  });

  test("the case sets load with their splits, and the frozen decisions stay report-only", () => {
    const searches = suite("agent-searches", "agent-controls");
    expect(searches.length).toBeGreaterThan(200);
    expect(searches.every((c) => c.split === "report")).toBe(true);
    expect(searches.some((c) => c.control)).toBe(true);
    const sessions = suite("edit-sessions");
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((c) => c.split === "report")).toBe(true);
    expect(
      sessions.every((c) =>
        c.edits.every((edit) => !/\.test\./.test(edit.path)),
      ),
    ).toBe(true);
    const questions = suite("decision-questions");
    expect(new Set(questions.map((c) => c.split))).toEqual(
      new Set(["dev", "holdout"]),
    );
    const edits = suite("synthetic-change", "synthetic-omission");
    expect(edits.some((c) => c.suite === "synthetic-omission")).toBe(true);
    const frozen = new Set<string>(
      require("../../documentation/evaluations/retrieval/papra-frozen-decisions.json"),
    );
    for (const c of questions)
      for (const id of c.expectedIds) expect(frozen.has(id)).toBe(false);
    // An edit's other owners count as right answers too; the decision it
    // was written for never comes from a frozen arc.
    for (const c of edits) expect(frozen.has(c.group)).toBe(false);
    const gold = suite("kibi-repo-gold", "kibi-hints-gold");
    expect(new Set(gold.map((c) => c.suite))).toEqual(
      new Set(["kibi-repo-gold", "kibi-hints-gold"]),
    );
  });

  test("metrics rank, summarize and format results", () => {
    expect(rankOf(["a", "b", "c"], ["c"])).toBe(3);
    expect(rankOf(["a"], ["z"])).toBe(Number.POSITIVE_INFINITY);
    const base = question("x", "a");
    const summary = summarize([
      { case: base, rank: 1, rows: ["a"], chars: 100, ms: 2 },
      { case: base, rank: 7, rows: [], chars: 300, ms: 4 },
      { case: base, rank: Number.POSITIVE_INFINITY, rows: [], ms: 6 },
    ]);
    expect(summary.r1).toBeCloseTo(1 / 3);
    expect(summary.r10).toBeCloseTo(2 / 3);
    expect(summary.missing).toBeCloseTo(1 / 3);
    expect(summary.weakestGroup).toBe("g");
    expect(summary.meanChars).toBe(200);
    expect(summary.p50ms).toBe(4);
    expect(formatSummary("row", summary)).toContain("top10  67%");
    const empty = summarize([]);
    expect(empty.n).toBe(0);
    expect(empty.meanChars).toBeNull();
    expect(formatSummary("empty", empty)).not.toContain("chars");
  });

  test("scaling clones look-alikes but keeps the expected decisions' sources apart", () => {
    expect(scaleStore(store, 1, new Set())).toBe(store);
    const small = {
      root,
      entities: [
        {
          id: "REQ-kept",
          type: "req",
          title: "Keep the limit",
          tags: ["knowledge-source:a"],
        },
        {
          id: "REQ-crowd",
          type: "req",
          title: "The search limit holds",
          tags: ["knowledge-source:b"],
        },
        { id: "REQ-plain", type: "req", title: "No source" },
        { id: "FACT-crowd", type: "fact", title: "A limit" },
      ],
      edges: [
        {
          relationship: "requires_property",
          from: "REQ-crowd",
          to: "FACT-crowd",
        },
        { relationship: "verified_by", from: "REQ-crowd", to: "TEST-x" },
        {
          relationship: "requires_property",
          from: "REQ-crowd",
          to: "FACT-gone",
        },
      ],
    };
    const scaled = scaleStore(small, 3, new Set(["REQ-kept", "REQ-missing"]));
    const ids = scaled.entities.map((entity) => entity.id);
    expect(ids).toContain("REQ-crowd-x1");
    expect(ids).toContain("REQ-crowd-x2");
    expect(ids).toContain("FACT-crowd-x2");
    expect(ids).not.toContain("REQ-kept-x1");
    expect(ids).not.toContain("REQ-plain-x1");
    expect(new Set(ids).size).toBe(ids.length);
    const copy = scaled.entities.find((entity) => entity.id === "REQ-crowd-x1");
    expect(copy?.title).toContain("variant 1");
    expect(copy?.tags).toEqual(["knowledge-source:b-x1"]);
  });

  test("today's search, today's edit hook and the card retriever answer a question about this repository", async () => {
    const c = question(
      "how long may a decision card line be in a search answer",
      "REQ-search-decision-card-line",
    );
    const cards = await cardsRetriever("cards-words", {
      workspace: root,
      vectors: false,
    }).prepare(store);
    const answer = await cards(c);
    expect(rankOf(answer.rows, c.expectedIds)).toBeLessThanOrEqual(5);
    expect(answer.chars).toBeLessThanOrEqual(5 * 301);
    const unscoped = await cardsRetriever("cards-words-noscope", {
      vectors: false,
      noScope: true,
    }).prepare(store);
    expect((await unscoped(c)).rows.length).toBeGreaterThan(0);
    const today = await kibiSearchBaseline.prepare(store);
    expect((await today(c)).rows.length).toBeGreaterThan(0);
    const hook = await editHookBaseline.prepare(store);
    const edit: ReplayCase = {
      ...c,
      query: undefined,
      context: ["packages/agent-core/src/retrieval.ts"],
      edits: [
        {
          path: "packages/agent-core/src/retrieval.ts",
          old: "const MAX_CARD_CHARS = 300;",
          new: "const MAX_CARD_CHARS = 400;",
        },
      ],
    };
    expect(Array.isArray((await hook(edit)).rows)).toBe(true);
  });
});

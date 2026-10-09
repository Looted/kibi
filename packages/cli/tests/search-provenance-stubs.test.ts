// implements REQ-bootstrap-provenance-stubs
import { describe, expect, test } from "bun:test";
import type { IntentSearchMatch } from "../src/intent-search.js";
import { rankIntentEntities } from "../src/intent-search.js";
import {
  PROVENANCE_STUB_TAG,
  isProvenanceStub,
} from "../src/provenance-stub.js";
import type { PrologQueryResult } from "../src/public/operations/runtime-types.js";
import { buildSearchAnswer } from "../src/search-answer.js";
import { rankEntities } from "../src/search-ranking.js";

const workspaceRoot = "/tmp/kibi-search-provenance-stubs";

/** A provider stub whose title repeats the query words exactly. */
const STUB = {
  id: "FACT-GEN-SOURCE-SYMBOLS-SRC-UPLOAD-RETRY-TS",
  type: "fact",
  title: "Source module: upload retry",
  status: "active",
  fact_kind: "meta",
  tags: [PROVENANCE_STUB_TAG],
  source: "bootstrap:source_symbols:src/upload-retry.ts",
};

/** A note that states a claim and matches the query less exactly. */
const NOTE = {
  id: "FACT-upload-retry-observed",
  type: "fact",
  title: "Failed uploads retry three times before the queue gives up",
  status: "active",
  fact_kind: "observation",
  tags: ["uploads"],
  source: ".kb/facts/FACT-upload-retry-observed.md",
};

const REQ = {
  id: "REQ-upload-retry",
  type: "req",
  title: "Uploads retry after a transient failure",
  status: "open",
  source: ".kb/requirements/REQ-upload-retry.md",
};

describe("provenance stubs never outrank knowledge in search", () => {
  test("the tag marks a stub on projected and complete fact rows only", () => {
    expect(isProvenanceStub(STUB)).toBe(true);
    expect(isProvenanceStub({ ...STUB, tags: PROVENANCE_STUB_TAG })).toBe(true);
    expect(isProvenanceStub(NOTE)).toBe(false);
    expect(isProvenanceStub({ ...STUB, type: "req" })).toBe(false);
    expect(isProvenanceStub(null)).toBe(false);
  });

  test("intent-v1 ranking drops a stub below the default threshold even on an exact title match", async () => {
    const result = await rankIntentEntities(
      [STUB, NOTE, REQ],
      { query: "upload retry" },
      workspaceRoot,
      [],
    );
    expect(result.matches.map((match) => String(match.entity.id))).toEqual([
      NOTE.id,
      REQ.id,
    ]);
  });

  test("intent-v1 ranking sorts an accepted stub after every fact with a claim and says why", async () => {
    const result = await rankIntentEntities(
      [STUB, NOTE, REQ],
      { query: "upload retry", minScore: 0 },
      workspaceRoot,
      [],
    );
    const ids = result.matches.map((match) => String(match.entity.id));
    expect(ids).toContain(STUB.id);
    expect(ids.at(-1)).toBe(STUB.id);
    expect(ids.indexOf(NOTE.id)).toBeLessThan(ids.indexOf(STUB.id));
    const stub = result.matches.find((match) => match.entity.id === STUB.id);
    expect(stub?.reasons).toContain("demoted: provenance stub");
    expect(stub?.score).toBeLessThan(
      result.matches.find((match) => match.entity.id === NOTE.id)?.score ?? 0,
    );
  });

  test("legacy ranking sorts a stub last too", async () => {
    const matches = await rankEntities(
      [STUB, NOTE, REQ],
      "upload retry",
      workspaceRoot,
    );
    const ids = matches.map((match) => String(match.entity.id));
    expect(ids).toContain(STUB.id);
    expect(ids.at(-1)).toBe(STUB.id);
    expect(
      matches.find((match) => match.entity.id === STUB.id)?.reasons,
    ).toContain("demoted: provenance stub");
  });

  test("the answer layer does not list a stub among its notes", async () => {
    const rows: Record<string, Record<string, unknown>> = {
      [STUB.id]: { ...STUB, tags: undefined },
      [NOTE.id]: NOTE,
    };
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        const bindings: Record<string, string> = {};
        if (goal.includes("member(From, [")) bindings.Edges = "[]";
        const rowIds = /member\(Id, \[([^\]]*)\]\)/.exec(goal)?.[1];
        if (rowIds !== undefined) {
          const results = [...rowIds.matchAll(/'([^']+)'/g)].flatMap(
            ([, id]) => {
              const row = rows[id ?? ""];
              if (!row) return [];
              const props = Object.entries(row)
                .filter(([key, value]) => key !== "type" && value !== undefined)
                .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
                .join(",");
              return [`['${id}',${String(row.type)},[${props}]]`];
            },
          );
          bindings.Results = `[${results.join(",")}]`;
        }
        if (goal.includes("search_answer_verdicts_json"))
          bindings.JsonString = JSON.stringify(
            JSON.stringify({ requirements: [], scope: {} }),
          );
        return { success: true, bindings };
      },
    };
    const match = (
      entity: Record<string, unknown>,
      score: number,
    ): IntentSearchMatch => ({
      entity,
      score,
      reasons: ["intent token match"],
      evidence: {
        normalizedScore: score,
        matchedFacets: [],
        sourceMatches: [],
        graphPaths: [],
        abstentionEligible: false,
      },
    });
    const answer = await buildSearchAnswer(prolog, [
      match(NOTE, 0.6),
      match(STUB, 0.3),
    ]);
    expect(answer.observations.map((note) => note.id)).toEqual([NOTE.id]);
  });
});

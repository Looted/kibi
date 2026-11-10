import { afterAll, describe, expect, test } from "bun:test";
import path from "node:path";
import type {
  CompareClaimsInput,
  PluginProviderStamp,
  RankSubjectsInput,
  VocabularyAlignmentV1,
} from "kibi-plugin-sdk";
import {
  alignRequirementVocabulary,
  readSubjectClaims,
  readSubjectVocabulary,
} from "../../../src/operations/modeling/vocabulary-alignment.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
  CapabilityRegistry,
} from "../../../src/plugins/registry.js";
import { resolveKbPlPath } from "../../../src/prolog.js";
import { escapeAtom } from "../../../src/prolog/codec.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import { fail, ok, scriptedProlog } from "../fake-prolog.js";
import { cleanupWorkspaces, workspace } from "../workspace.js";

afterAll(cleanupWorkspaces);

const MODULE = escapeAtom(
  path.join(path.dirname(resolveKbPlPath()), "semantic_quality.pl"),
);
const goal = (inner: string) => `(use_module('${MODULE}'), call(${inner}))`;
const VOCABULARY_GOAL = goal("semantic_quality:subject_vocabulary_json(Json)");

describe("readSubjectVocabulary", () => {
  test("loads the module and reads the JSON binding", async () => {
    const rows = [{ factId: "F", subjectKey: "s" }];
    const { prolog, goals } = scriptedProlog([
      ok({ Json: JSON.stringify(rows) }),
    ]);
    expect(await readSubjectVocabulary(prolog)).toStrictEqual(rows);
    expect(goals).toStrictEqual([VOCABULARY_GOAL]);
  });

  test("reads double-encoded, empty, missing and non-list bindings", async () => {
    const rows = [{ factId: "F", subjectKey: "s" }];
    for (const [bindings, expected] of [
      [{ Json: JSON.stringify(JSON.stringify(rows)) }, rows],
      [{ Json: "" }, []],
      [{}, []],
      [{ Json: '{"a":1}' }, []],
    ] as const) {
      const { prolog } = scriptedProlog([ok(bindings)]);
      expect((await readSubjectVocabulary(prolog)) as unknown).toStrictEqual(
        expected,
      );
    }
  });

  test("names the query failure", async () => {
    await expect(
      readSubjectVocabulary(scriptedProlog([fail("no module")]).prolog),
    ).rejects.toThrow(new Error("Vocabulary query failed: no module"));
    await expect(
      readSubjectVocabulary(scriptedProlog([fail()]).prolog),
    ).rejects.toThrow(new Error("Vocabulary query failed: unknown error"));
  });
});

describe("readSubjectClaims", () => {
  test("queries nothing for no keys", async () => {
    const { prolog, goals } = scriptedProlog([ok()]);
    expect(await readSubjectClaims(prolog, [])).toStrictEqual([]);
    expect(goals).toStrictEqual([]);
  });

  test("lists every key as an atom", async () => {
    const claims = [{ factId: "F", subjectKey: "a.b", signature: "x" }];
    const { prolog, goals } = scriptedProlog([
      ok({ Json: JSON.stringify(claims) }),
    ]);
    expect(await readSubjectClaims(prolog, ["a.b", "c"])).toStrictEqual(claims);
    expect(goals).toStrictEqual([
      goal("semantic_quality:subject_claims_json(['a.b',c], Json)"),
    ]);
    const other = scriptedProlog([ok({ Json: "{}" })]);
    expect(await readSubjectClaims(other.prolog, ["c"])).toStrictEqual([]);
  });
});

type Choice = { choice: string; confidence: number } | null;

function provider(
  id: string,
  choice: Choice | Error,
  same: Record<string, { sameObligation: boolean; confidence: number }> = {},
  compareError?: Error,
) {
  const ranked: RankSubjectsInput[] = [];
  const compared: CompareClaimsInput[] = [];
  const capability: VocabularyAlignmentV1 = {
    id,
    rankSubjects: (input) => {
      ranked.push(input);
      if (choice instanceof Error) throw choice;
      return {
        decisions: choice
          ? input.clauses.map((clause) => ({
              claimKey: clause.claimKey,
              ...choice,
            }))
          : [],
      };
    },
    compareClaims: (input) => {
      compared.push(input);
      if (compareError) throw compareError;
      return {
        judgments: input.pairs.flatMap((pair) => {
          const judgment = same[pair.pairKey];
          return judgment ? [{ pairKey: pair.pairKey, ...judgment }] : [];
        }),
      };
    },
  };
  return { capability, ranked, compared };
}

function binding(
  capability: VocabularyAlignmentV1,
  mode: "builtin" | "replace",
): CapabilityProviderBinding<VocabularyAlignmentV1> {
  return {
    pluginId: capability.id,
    pluginVersion: "1.0.0",
    packageName: mode === "builtin" ? null : `pkg-${capability.id}`,
    mode,
    permissions: { network: false, metered: false, secrets: [] },
    external: mode !== "builtin",
    capability,
    stamp: {
      pluginId: capability.id,
      pluginVersion: "1.0.0",
      capability: "kibi.vocabulary-alignment.v1",
      mode,
      external: mode !== "builtin",
      network: false,
      metered: false,
    } as unknown as PluginProviderStamp,
  };
}

function context(
  prolog: PrologPort | undefined,
  builtin: VocabularyAlignmentV1,
  replace?: VocabularyAlignmentV1,
): OperationContext {
  const resolution: CapabilityModeResolution<VocabularyAlignmentV1> = {
    builtin: binding(builtin, "builtin"),
    replace: replace ? binding(replace, "replace") : null,
    augment: [],
    shadow: [],
  };
  const registry = {
    resolveVocabularyAlignment: async () => resolution,
  } as unknown as CapabilityRegistry;
  return {
    workspaceRoot: "/nonexistent",
    signal: new AbortController().signal,
    clock: () => new Date(0),
    ...(prolog ? { prolog } : {}),
    ensurePlugins: async () => registry,
  };
}

const VOCABULARY = [
  {
    factId: "FACT-SESSION",
    subjectKey: "session.timeout",
    title: "Session timeout",
  },
  { factId: "FACT-DERIVED", subjectKey: "req.derived", reqDerived: true },
  { factId: "FACT-CART", subjectKey: "cart.size" },
];
const CLAUSE = {
  claimKey: "CLAIM-1",
  statement: "Session timeout must be 30 minutes.",
  proposedSubjectKey: "session.timeout",
};
const builtinStamp = {
  pluginId: "builtin",
  pluginVersion: "1.0.0",
  capability: "kibi.vocabulary-alignment.v1",
  mode: "builtin",
  external: false,
  network: false,
  metered: false,
};

/** Prolog answering the vocabulary query, then the claims query. */
function kb(claims: unknown[] = []) {
  return scriptedProlog([
    ok({ Json: JSON.stringify(VOCABULARY) }),
    ok({ Json: JSON.stringify(claims) }),
  ]);
}

describe("alignRequirementVocabulary", () => {
  test("needs Prolog", async () => {
    const { capability } = provider("builtin", null);
    expect(
      await alignRequirementVocabulary(context(undefined, capability), CLAUSE),
    ).toBe(null);
  });

  test("declares a new subject without a decision", async () => {
    const { capability, ranked } = provider("builtin", null);
    const { prolog, goals } = kb();
    const outcome = await alignRequirementVocabulary(
      context(prolog, capability),
      { ...CLAUSE, proposedSubjectKey: "brand.new" },
    );
    expect(outcome?.subject.decision).toBe("declare_new");
    expect(outcome?.subject.subjectKey).toBe("brand.new");
    expect(outcome?.subject.existingFactId).toBe(null);
    expect(outcome?.subject.confidence).toBe(1);
    expect(outcome?.redundancyCandidates).toStrictEqual([]);
    expect(outcome?.stamps).toStrictEqual([builtinStamp]);
    expect(outcome?.fallbackUsed).toBe(false);
    expect(outcome?.diagnostics).toStrictEqual([]);
    expect(goals).toStrictEqual([VOCABULARY_GOAL]);
    // Derived subjects are never candidates.
    const candidates = ranked[0]?.clauses[0]?.candidates ?? [];
    // Ranked candidates stay when the proposed key names no subject.
    expect(candidates.map((c) => c.subjectKey)).toStrictEqual([
      "session.timeout",
    ]);
    expect(ranked[0]?.clauses[0]).toMatchObject({
      claimKey: "CLAIM-1",
      text: CLAUSE.statement,
      proposedSubjectKey: "brand.new",
    });
  });

  test("declares a new subject when the provider chooses one", async () => {
    const { capability } = provider("builtin", {
      choice: "new_subject",
      confidence: 0.4,
    });
    const outcome = await alignRequirementVocabulary(
      context(kb().prolog, capability),
      CLAUSE,
    );
    expect(outcome?.subject).toMatchObject({
      decision: "declare_new",
      subjectKey: "session.timeout",
      existingFactId: null,
      confidence: 0.4,
    });
  });

  test("adds the exact existing subject to the candidates", async () => {
    const { capability, ranked } = provider("builtin", null);
    await alignRequirementVocabulary(context(kb().prolog, capability), {
      ...CLAUSE,
      statement: "Unrelated words entirely.",
      proposedSubjectKey: "session.timeout",
    });
    expect(ranked[0]?.clauses[0]?.candidates.at(-1)).toStrictEqual({
      subjectKey: "session.timeout",
      score: 0,
      title: "Session timeout",
    });
    const untitled = provider("builtin", null);
    await alignRequirementVocabulary(
      context(kb().prolog, untitled.capability),
      {
        ...CLAUSE,
        statement: "Unrelated words entirely.",
        proposedSubjectKey: "cart.size",
      },
    );
    expect(untitled.ranked[0]?.clauses[0]?.candidates.at(-1)).toStrictEqual({
      subjectKey: "cart.size",
      score: 0,
    });
    const absent = provider("builtin", null);
    await alignRequirementVocabulary(context(kb().prolog, absent.capability), {
      ...CLAUSE,
      statement: "Unrelated words entirely.",
      proposedSubjectKey: "req.derived",
    });
    expect(
      absent.ranked[0]?.clauses[0]?.candidates.map((c) => c.subjectKey),
    ).not.toContain("req.derived");
  });

  test("keeps ranked candidates that already hold the proposed key", async () => {
    const outside = provider("builtin", null);
    await alignRequirementVocabulary(context(kb().prolog, outside.capability), {
      ...CLAUSE,
      statement: "Cart size must stay small.",
    });
    // The proposed key ranks outside the candidates, so it is added.
    expect(
      outside.ranked[0]?.clauses[0]?.candidates.map((c) => c.subjectKey),
    ).toStrictEqual(["cart.size", "session.timeout"]);
    const { capability, ranked } = provider("builtin", null);
    await alignRequirementVocabulary(context(kb().prolog, capability), CLAUSE);
    const keys = ranked[0]?.clauses[0]?.candidates.map((c) => c.subjectKey);
    expect(keys?.filter((key) => key === "session.timeout")).toStrictEqual([
      "session.timeout",
    ]);
    expect(ranked[0]?.clauses[0]?.candidates[0]?.score).toBeGreaterThan(0);
  });

  test("reuses a chosen subject and reports paraphrase duplicates", async () => {
    const claims = [
      {
        factId: "FACT-A",
        subjectKey: "session.timeout",
        signature: "sig-a",
        claimText: "Sessions time out after 30 minutes.",
        requirements: ["REQ-1"],
      },
      {
        factId: "FACT-B",
        subjectKey: "session.timeout",
        signature: "sig-b",
        title: "B title",
      },
      { factId: "FACT-C", subjectKey: "session.timeout", signature: "sig-c" },
      { factId: "FACT-D", subjectKey: "session.timeout", signature: "sig-d" },
    ];
    const { capability, compared } = provider(
      "builtin",
      { choice: "session.timeout", confidence: 0.7 },
      {
        "FACT-A": { sameObligation: true, confidence: 0.8 },
        "FACT-B": { sameObligation: true, confidence: 0.6 },
        "FACT-C": { sameObligation: true, confidence: 0.5 },
        "FACT-D": { sameObligation: false, confidence: 0.9 },
      },
    );
    const { prolog, goals } = kb(claims);
    const outcome = await alignRequirementVocabulary(
      context(prolog, capability),
      CLAUSE,
    );
    expect(outcome?.subject).toMatchObject({
      decision: "reuse_existing",
      subjectKey: "session.timeout",
      existingFactId: "FACT-SESSION",
      confidence: 0.7,
    });
    expect(goals[1]).toBe(
      goal("semantic_quality:subject_claims_json(['session.timeout'], Json)"),
    );
    expect(compared[0]?.pairs).toStrictEqual([
      {
        pairKey: "FACT-A",
        sharedKey: "session.timeout",
        left: { claimText: CLAUSE.statement },
        right: {
          claimText: "Sessions time out after 30 minutes.",
          signature: "sig-a",
          factId: "FACT-A",
        },
      },
      {
        pairKey: "FACT-B",
        sharedKey: "session.timeout",
        left: { claimText: CLAUSE.statement },
        right: { claimText: "B title", signature: "sig-b", factId: "FACT-B" },
      },
      {
        pairKey: "FACT-C",
        sharedKey: "session.timeout",
        left: { claimText: CLAUSE.statement },
        right: { claimText: "FACT-C", signature: "sig-c", factId: "FACT-C" },
      },
      {
        pairKey: "FACT-D",
        sharedKey: "session.timeout",
        left: { claimText: CLAUSE.statement },
        right: { claimText: "FACT-D", signature: "sig-d", factId: "FACT-D" },
      },
    ]);
    expect(outcome?.redundancyCandidates).toStrictEqual([
      {
        factId: "FACT-A",
        subjectKey: "session.timeout",
        requirementIds: ["REQ-1"],
        claimText: "Sessions time out after 30 minutes.",
        signature: "sig-a",
        confidence: 0.8,
      },
      {
        factId: "FACT-B",
        subjectKey: "session.timeout",
        requirementIds: [],
        claimText: "B title",
        signature: "sig-b",
        confidence: 0.6,
      },
      {
        factId: "FACT-C",
        subjectKey: "session.timeout",
        requirementIds: [],
        claimText: "",
        signature: "sig-c",
        confidence: 0.5,
      },
    ]);
    expect(outcome?.stamps).toStrictEqual([builtinStamp, builtinStamp]);
    expect(outcome?.fallbackUsed).toBe(false);
  });

  test("reuses the subject the provider chose, not the first one", async () => {
    const { capability } = provider("builtin", {
      choice: "cart.size",
      confidence: 0.6,
    });
    const outcome = await alignRequirementVocabulary(
      context(kb().prolog, capability),
      {
        ...CLAUSE,
        statement: "Cart size must stay small.",
        proposedSubjectKey: "cart.size",
      },
    );
    expect(outcome?.subject).toMatchObject({
      decision: "reuse_existing",
      subjectKey: "cart.size",
      existingFactId: "FACT-CART",
      confidence: 0.6,
    });
  });

  test("treats a new_subject choice as new even when a subject has that key", async () => {
    const { capability } = provider("builtin", {
      choice: "new_subject",
      confidence: 0.3,
    });
    const { prolog } = scriptedProlog([
      ok({
        Json: JSON.stringify([
          { factId: "FACT-NEW", subjectKey: "new_subject" },
        ]),
      }),
    ]);
    const outcome = await alignRequirementVocabulary(
      context(prolog, capability),
      {
        ...CLAUSE,
        proposedSubjectKey: "new_subject",
      },
    );
    expect(outcome?.subject).toMatchObject({
      decision: "declare_new",
      subjectKey: "new_subject",
      existingFactId: null,
      confidence: 0.3,
    });
  });

  test("reports a replace provider's failures and the builtin fallback", async () => {
    const builtin = provider("builtin", {
      choice: "session.timeout",
      confidence: 0.7,
    });
    const failingRank = provider("ext", new Error("rank down"));
    const outcome = await alignRequirementVocabulary(
      context(kb().prolog, builtin.capability, failingRank.capability),
      CLAUSE,
    );
    expect(outcome?.fallbackUsed).toBe(true);
    expect(outcome?.diagnostics.length).toBe(1);
    expect(outcome?.stamps.map((stamp) => stamp.pluginId)).toStrictEqual([
      "builtin",
      "ext",
    ]);
    expect(outcome?.stamps[0]).toStrictEqual({
      ...builtinStamp,
      fallbackUsed: true,
    });

    const failingCompare = provider(
      "ext",
      { choice: "session.timeout", confidence: 0.6 },
      {},
      new Error("compare down"),
    );
    const second = await alignRequirementVocabulary(
      context(kb().prolog, builtin.capability, failingCompare.capability),
      CLAUSE,
    );
    expect(second?.fallbackUsed).toBe(true);
    expect(second?.diagnostics.length).toBe(1);
    expect(second?.stamps.map((stamp) => stamp.pluginId)).toStrictEqual([
      "ext",
      "builtin",
    ]);
  });

  test("falls back to the builtin registry without a plugin runtime", async () => {
    const root = workspace("vocab-align-");
    const outcome = await alignRequirementVocabulary(
      {
        workspaceRoot: root,
        signal: new AbortController().signal,
        clock: () => new Date(0),
        prolog: kb().prolog,
      },
      CLAUSE,
    );
    expect(outcome?.subject.decision).toBe("reuse_existing");
    expect(outcome?.stamps.length).toBeGreaterThan(0);
    expect(outcome?.fallbackUsed).toBe(false);
  });
});

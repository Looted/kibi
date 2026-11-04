import { describe, expect, test } from "bun:test";
import type {
  CompareClaimsInput,
  PluginProviderStamp,
  RankSubjectsInput,
  VocabularyAlignmentV1,
} from "kibi-plugin-sdk";
import {
  composeClaimComparison,
  composeSubjectRanking,
} from "../../src/plugins/compose-vocabulary-alignment.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "../../src/plugins/registry.js";

// implements REQ-kibi-vocabulary-alignment-capability

type Choices = Record<string, string>;

function provider(
  id: string,
  choices: Choices | Error,
  sameObligation: Record<string, boolean> = {},
) {
  const calls: unknown[] = [];
  const capability: VocabularyAlignmentV1 = {
    id,
    rankSubjects: (input) => {
      calls.push(input);
      if (choices instanceof Error) throw choices;
      return {
        decisions: input.clauses
          .filter((clause) => clause.claimKey in choices)
          .map((clause) => ({
            claimKey: clause.claimKey,
            choice: choices[clause.claimKey] as string,
            confidence: id === "builtin" ? 0.9 : 0.5,
          })),
      };
    },
    compareClaims: (input) => {
      calls.push(input);
      if (choices instanceof Error) throw choices;
      return {
        judgments: input.pairs
          .filter((pair) => pair.pairKey in sameObligation)
          .map((pair) => ({
            pairKey: pair.pairKey,
            sameObligation: sameObligation[pair.pairKey] as boolean,
            confidence: id === "builtin" ? 0.9 : 0.5,
          })),
      };
    },
  };
  return { capability, calls };
}

function binding(
  id: string,
  capability: VocabularyAlignmentV1,
  mode: CapabilityProviderBinding<unknown>["mode"],
): CapabilityProviderBinding<VocabularyAlignmentV1> {
  return {
    pluginId: id,
    pluginVersion: "1.0.0",
    packageName: mode === "builtin" ? null : `pkg-${id}`,
    mode,
    permissions: { network: false, metered: false, secrets: [] },
    external: mode !== "builtin",
    capability,
    stamp: { pluginId: id, mode } as unknown as PluginProviderStamp,
  };
}

function resolution(
  builtin: VocabularyAlignmentV1,
  extra: Partial<{
    replace: VocabularyAlignmentV1;
    augment: VocabularyAlignmentV1[];
    shadow: VocabularyAlignmentV1[];
  }> = {},
): CapabilityModeResolution<VocabularyAlignmentV1> {
  return {
    builtin: binding("builtin", builtin, "builtin"),
    replace: extra.replace
      ? binding(extra.replace.id, extra.replace, "replace")
      : null,
    augment: (extra.augment ?? []).map((p) => binding(p.id, p, "augment")),
    shadow: (extra.shadow ?? []).map((p) => binding(p.id, p, "shadow")),
  };
}

const CLAUSES: RankSubjectsInput = {
  clauses: ["A", "B", "C"].map((claimKey) => ({
    claimKey,
    text: claimKey,
    candidates: [
      { subjectKey: `s${claimKey}`, score: 0.5 },
      { subjectKey: "x", score: 0.1 },
    ],
  })),
};
const MODEL = { operationName: "kb_model_requirement" };
const CHECK = { operationName: "kb_check" };
const pick = (result: {
  results: readonly { claimKey: string; choice: string; confidence: number }[];
}) => result.results.map((d) => `${d.claimKey}=${d.choice}@${d.confidence}`);
const stamps = (result: { stamps: readonly unknown[] }) =>
  result.stamps.map((s) => JSON.stringify(s));
const stamp = (id: string, mode: string, fallbackUsed?: boolean) =>
  JSON.stringify({
    pluginId: id,
    mode,
    ...(fallbackUsed ? { fallbackUsed } : {}),
  });

const BUILTIN: Choices = { A: "new_subject", B: "sB", C: "new_subject" };

describe("composeSubjectRanking", () => {
  test("uses the builtin alone outside the allowlisted operation", async () => {
    const replace = provider("rep", { A: "sA", B: "sB", C: "sC" });
    const augment = provider("aug", { A: "sA", C: "sC" });
    const shadow = provider("sha", { A: "sA" });
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        replace: replace.capability,
        augment: [augment.capability],
        shadow: [shadow.capability],
      }),
      CLAUSES,
      CHECK,
    );
    expect(pick(result)).toStrictEqual([
      "A=new_subject@0.9",
      "B=sB@0.9",
      "C=new_subject@0.9",
    ]);
    expect(stamps(result)).toStrictEqual([stamp("builtin", "builtin")]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.diagnostics).toStrictEqual([]);
    expect(result.shadowComparisons).toStrictEqual([]);
    expect([replace.calls, augment.calls, shadow.calls]).toStrictEqual([
      [],
      [],
      [],
    ]);
  });

  test("a replace provider wins and the builtin fills its gaps", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        replace: provider("rep", { C: "x", A: "sA" }).capability,
        augment: [provider("aug", { B: "x" }).capability],
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual(["A=sA@0.5", "B=sB@0.9", "C=x@0.5"]);
    expect(stamps(result)).toStrictEqual([stamp("rep", "replace")]);
    expect(result.fallbackUsed).toBe(false);
  });

  test("a replace provider over a failed builtin keeps only its results", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", new Error("down")).capability, {
        replace: provider("rep", { A: "sA" }).capability,
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual(["A=sA@0.5"]);
    expect(result.diagnostics).toStrictEqual([]);
  });

  test("a failed replace falls back to the builtin with a diagnostic", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        replace: provider("rep", new Error("boom")).capability,
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual([
      "A=new_subject@0.9",
      "B=sB@0.9",
      "C=new_subject@0.9",
    ]);
    expect(stamps(result)).toStrictEqual([stamp("builtin", "builtin", true)]);
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnostics).toStrictEqual([
      {
        pluginId: "rep",
        packageName: "pkg-rep",
        mode: "replace",
        code: "unknown",
        message: "boom",
      },
    ]);
  });

  test("a failed replace and builtin report both and return nothing", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", new Error("b")).capability, {
        replace: provider("rep", new Error("r")).capability,
      }),
      CLAUSES,
      MODEL,
    );
    expect(result.results).toStrictEqual([]);
    expect(result.stamps).toStrictEqual([]);
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnostics.map((d) => d.message)).toStrictEqual(["r", "b"]);
  });

  test("a failed builtin alone is a diagnostic", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", new Error("b")).capability),
      CLAUSES,
      CHECK,
    );
    expect(result.results).toStrictEqual([]);
    expect(result.stamps).toStrictEqual([]);
    expect(result.fallbackUsed).toBe(false);
    expect(
      result.diagnostics.map((d) => [d.pluginId, d.message]),
    ).toStrictEqual([["builtin", "b"]]);
  });

  test("augment providers improve only unresolved builtin results, in order", async () => {
    const first = provider("aug1", { A: "new_subject", C: "sC" });
    const broken = provider("aug2", new Error("aug down"));
    const second = provider("aug3", { A: "sA" });
    const done = provider("aug4", { A: "x" });
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        augment: [
          first.capability,
          broken.capability,
          second.capability,
          done.capability,
        ],
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual(["A=sA@0.5", "B=sB@0.9", "C=sC@0.5"]);
    expect(first.calls).toStrictEqual([
      { clauses: [CLAUSES.clauses[0], CLAUSES.clauses[2]] },
    ]);
    expect(broken.calls).toStrictEqual([{ clauses: [CLAUSES.clauses[0]] }]);
    expect(second.calls).toStrictEqual([{ clauses: [CLAUSES.clauses[0]] }]);
    expect(done.calls).toStrictEqual([]);
    expect(stamps(result)).toStrictEqual([
      stamp("builtin", "builtin"),
      stamp("aug1", "augment"),
      stamp("aug3", "augment"),
    ]);
    expect(result.diagnostics.map((d) => d.pluginId)).toStrictEqual(["aug2"]);
    expect(result.fallbackUsed).toBe(false);
  });

  test("an augment provider cannot add results the builtin did not give", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", { A: "new_subject" }).capability, {
        augment: [provider("aug", { A: "sA" }).capability],
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual(["A=sA@0.5"]);
  });

  test("an augment new_subject answer keeps the builtin decision", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", { A: "new_subject" }).capability, {
        augment: [provider("aug", { A: "new_subject" }).capability],
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual(["A=new_subject@0.9"]);
  });

  test("shadow providers are compared but never merged", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        shadow: [
          provider("sh1", new Error("shadow down")).capability,
          provider("sh2", { A: "sA" }).capability,
        ],
      }),
      CLAUSES,
      MODEL,
    );
    expect(pick(result)).toStrictEqual([
      "A=new_subject@0.9",
      "B=sB@0.9",
      "C=new_subject@0.9",
    ]);
    expect(stamps(result)).toStrictEqual([
      stamp("builtin", "builtin"),
      stamp("sh2", "shadow"),
    ]);
    expect(
      result.shadowComparisons.map((c) => [JSON.stringify(c.stamp), pick(c)]),
    ).toStrictEqual([[stamp("sh2", "shadow"), ["A=sA@0.5"]]]);
    expect(result.diagnostics.map((d) => d.pluginId)).toStrictEqual(["sh1"]);
  });

  test("an invalid provider result is a diagnostic", async () => {
    const result = await composeSubjectRanking(
      resolution(provider("builtin", BUILTIN).capability, {
        replace: provider("rep", { A: "unknown-subject" }).capability,
      }),
      CLAUSES,
      MODEL,
    );
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnostics[0]?.code).toBe("INVALID_CAPABILITY_RESULT");
  });
});

const PAIRS: CompareClaimsInput = {
  pairs: ["p1", "p2", "p3"].map((pairKey) => ({
    pairKey,
    sharedKey: "k",
    left: { claimText: "l" },
    right: { claimText: "r" },
  })),
};

describe("composeClaimComparison", () => {
  const judged = (result: {
    results: readonly {
      pairKey: string;
      sameObligation: boolean;
      confidence: number;
    }[];
  }) =>
    result.results.map(
      (j) => `${j.pairKey}=${j.sameObligation}@${j.confidence}`,
    );

  test("augment providers can only mark unresolved pairs as the same obligation", async () => {
    const augment = provider("aug", {}, { p1: true, p3: false });
    const result = await composeClaimComparison(
      resolution(
        provider("builtin", {}, { p1: false, p2: true, p3: false }).capability,
        {
          augment: [augment.capability],
        },
      ),
      PAIRS,
      MODEL,
    );
    expect(judged(result)).toStrictEqual([
      "p1=true@0.5",
      "p2=true@0.9",
      "p3=false@0.9",
    ]);
    expect(augment.calls).toStrictEqual([
      { pairs: [PAIRS.pairs[0], PAIRS.pairs[2]] },
    ]);
  });

  test("a replace provider's judgments win", async () => {
    const result = await composeClaimComparison(
      resolution(provider("builtin", {}, { p1: false, p2: true }).capability, {
        replace: provider("rep", {}, { p2: false, p3: true }).capability,
      }),
      PAIRS,
      MODEL,
    );
    expect(judged(result)).toStrictEqual([
      "p1=false@0.9",
      "p2=false@0.5",
      "p3=true@0.5",
    ]);
  });

  test("an invalid judgment is a diagnostic", async () => {
    const bad: VocabularyAlignmentV1 = {
      id: "bad",
      rankSubjects: () => ({ decisions: [] }),
      compareClaims: () => ({
        judgments: [{ pairKey: "zz", sameObligation: true, confidence: 1 }],
      }),
    };
    const result = await composeClaimComparison(
      resolution(provider("builtin", {}, { p1: false }).capability, {
        replace: bad,
      }),
      PAIRS,
      MODEL,
    );
    expect(result.diagnostics.map((d) => d.code)).toStrictEqual([
      "INVALID_CAPABILITY_RESULT",
    ]);
    expect(judged(result)).toStrictEqual(["p1=false@0.9"]);
  });
});

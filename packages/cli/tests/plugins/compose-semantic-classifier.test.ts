import { describe, expect, test } from "bun:test";
import {
  type PluginProviderStamp,
  PluginValidationError,
  type SemanticClassifierInput,
  type SemanticClassifierV1,
} from "kibi-plugin-sdk";
import {
  composeSemanticClassification,
  diagnosticFromError,
  publicCapabilityStamp,
  redactClassifierMessage,
  withFallback,
} from "../../src/plugins/compose-semantic-classifier.js";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "../../src/plugins/registry.js";

type Answer = { lane: string; confidence?: number; ambiguous?: boolean };
type Answers = Record<string, Answer>;

function provider(id: string, answers: Answers | Error | (() => unknown)) {
  const calls: string[][] = [];
  const capability: SemanticClassifierV1 = {
    id,
    classify: (input) => {
      calls.push(input.propositions.map((p) => p.claimKey));
      if (answers instanceof Error) throw answers;
      if (typeof answers === "function") return answers() as never;
      return {
        decisions: input.propositions
          .filter((p) => p.claimKey in answers)
          .map((p) => {
            const answer = answers[p.claimKey] as Answer;
            return {
              claimKey: p.claimKey,
              lane: answer.lane,
              confidence: answer.confidence ?? 0.5,
              ...(answer.ambiguous === undefined
                ? {}
                : {
                    ambiguity: {
                      ambiguous: answer.ambiguous,
                      confidence: 0.4,
                    },
                  }),
            };
          }),
      } as never;
    },
  };
  return { capability, calls };
}

function binding(
  id: string,
  capability: SemanticClassifierV1,
  mode: CapabilityProviderBinding<unknown>["mode"],
): CapabilityProviderBinding<SemanticClassifierV1> {
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
  builtin: SemanticClassifierV1,
  extra: Partial<{
    replace: SemanticClassifierV1;
    augment: SemanticClassifierV1[];
    shadow: SemanticClassifierV1[];
  }> = {},
): CapabilityModeResolution<SemanticClassifierV1> {
  return {
    builtin: binding("builtin", builtin, "builtin"),
    replace: extra.replace
      ? binding(extra.replace.id, extra.replace, "replace")
      : null,
    augment: (extra.augment ?? []).map((p) => binding(p.id, p, "augment")),
    shadow: (extra.shadow ?? []).map((p) => binding(p.id, p, "shadow")),
  };
}

const INPUT: SemanticClassifierInput = {
  propositions: ["A", "B", "C"].map((claimKey) => ({
    claimKey,
    statement: `statement ${claimKey}`,
  })),
};
const ADVISOR = { operationName: "kb_semantic_advisor" };
const INTENT = { operationName: "kb_compile_intent" };
const CHECK = { operationName: "kb_check" };

const lanes = (result: {
  decisions: readonly {
    claimKey: string;
    lane: string;
    confidence: number;
    ambiguity?: { ambiguous: boolean };
  }[];
}) =>
  result.decisions.map(
    (d) =>
      `${d.claimKey}=${d.lane}@${d.confidence}${d.ambiguity ? `~${d.ambiguity.ambiguous}` : ""}`,
  );
const stampsOf = (result: { stamps: readonly unknown[] }) =>
  result.stamps.map((s) => JSON.stringify(s));
const stamp = (id: string, mode: string, fallbackUsed?: boolean) =>
  JSON.stringify({
    pluginId: id,
    mode,
    ...(fallbackUsed ? { fallbackUsed } : {}),
  });

const FULL: PluginProviderStamp = {
  pluginId: "p",
  pluginVersion: "2.0.0",
  capability: "kibi.semantic-classifier.v1",
  mode: "augment",
  external: true,
  network: false,
  metered: true,
};

describe("publicCapabilityStamp", () => {
  test("copies the bounded fields and leaves optional ones out", () => {
    expect(
      publicCapabilityStamp({
        ...FULL,
        fallbackUsed: false,
        extra: "x",
      } as PluginProviderStamp),
    ).toStrictEqual({
      pluginId: "p",
      pluginVersion: "2.0.0",
      capability: "kibi.semantic-classifier.v1",
      mode: "augment",
      external: true,
      network: false,
      metered: true,
    });
  });

  test("keeps a used fallback and a disclosed model", () => {
    expect(
      publicCapabilityStamp({
        ...FULL,
        external: false,
        network: true,
        metered: false,
        fallbackUsed: true,
        model: "m-1",
      }),
    ).toStrictEqual({
      pluginId: "p",
      pluginVersion: "2.0.0",
      capability: "kibi.semantic-classifier.v1",
      mode: "augment",
      external: false,
      network: true,
      metered: false,
      fallbackUsed: true,
      model: "m-1",
    });
  });
});

describe("withFallback", () => {
  test("marks a copy only when the fallback was used", () => {
    expect(withFallback(FULL, true)).toStrictEqual({
      ...FULL,
      fallbackUsed: true,
    });
    expect(withFallback(FULL, false)).toBe(FULL);
  });
});

describe("redactClassifierMessage", () => {
  test("redacts every sk- token whole", () => {
    expect(redactClassifierMessage("a sk-Ab9_-z b sk-x c")).toBe(
      "a [redacted] b [redacted] c",
    );
    expect(redactClassifierMessage("sk- alone")).toBe("sk- alone");
  });

  test("redacts api key values in each spelling", () => {
    expect(redactClassifierMessage("apikey=abc def")).toBe(
      "apikey=[redacted] def",
    );
    expect(redactClassifierMessage("API_KEY : s3cr3t,x tail")).toBe(
      "API_KEY : [redacted] tail",
    );
    expect(redactClassifierMessage("api-key:\t q and api_key= r")).toBe(
      "api-key:\t [redacted] and api_key= [redacted]",
    );
    expect(redactClassifierMessage("api key=x apiXkey=y apikey-z")).toBe(
      "api key=x apiXkey=y apikey-z",
    );
  });

  test("keeps at most 300 characters", () => {
    expect(redactClassifierMessage("x".repeat(301))).toBe("x".repeat(300));
  });
});

describe("diagnosticFromError", () => {
  const replace = binding("rep", provider("rep", {}).capability, "replace");

  test("takes the validation code of a plugin validation error", () => {
    expect(
      diagnosticFromError(
        replace,
        new PluginValidationError("BAD", "bad sk-secret"),
      ),
    ).toStrictEqual({
      pluginId: "rep",
      packageName: "pkg-rep",
      mode: "replace",
      code: "BAD",
      message: "bad [redacted]",
    });
  });

  test("takes a string code and model from any error object", () => {
    const error = Object.assign(new Error("rate limited"), {
      code: "RATE",
      model: "m-2",
    });
    expect(diagnosticFromError(replace, error)).toStrictEqual({
      pluginId: "rep",
      packageName: "pkg-rep",
      mode: "replace",
      code: "RATE",
      message: "rate limited",
      model: "m-2",
    });
  });

  test("ignores non-string codes and models, and stringifies non-errors", () => {
    expect(
      diagnosticFromError(replace, { code: 7, model: 1, message: "m" }),
    ).toStrictEqual({
      pluginId: "rep",
      packageName: "pkg-rep",
      mode: "replace",
      code: "unknown",
      message: "[object Object]",
    });
    for (const error of [null, undefined, "plain"]) {
      expect(diagnosticFromError(replace, error)).toStrictEqual({
        pluginId: "rep",
        packageName: "pkg-rep",
        mode: "replace",
        code: "unknown",
        message: String(error),
      });
    }
  });
});

const BUILTIN: Answers = {
  A: { lane: "rule", confidence: 0.9 },
  B: { lane: "none", confidence: 0.1 },
  C: { lane: "predicate", confidence: 0.8, ambiguous: true },
};

describe("composeSemanticClassification", () => {
  test("uses the builtin alone outside the allowlisted operations", async () => {
    const replace = provider("rep", { A: { lane: "predicate" } });
    const augment = provider("aug", { B: { lane: "rule" } });
    const shadow = provider("sha", { A: { lane: "rule" } });
    const result = await composeSemanticClassification(
      resolution(provider("builtin", { A: BUILTIN.A as Answer }).capability, {
        replace: replace.capability,
        augment: [augment.capability],
        shadow: [shadow.capability],
      }),
      INPUT,
      CHECK,
    );
    expect(result).toStrictEqual({
      decisions: [
        { claimKey: "A", lane: "rule", confidence: 0.9 },
        { claimKey: "B", lane: "none", confidence: 0 },
        { claimKey: "C", lane: "none", confidence: 0 },
      ],
      stamps: [{ pluginId: "builtin", mode: "builtin" } as never],
      shadowComparisons: [],
      fallbackUsed: false,
      diagnostics: [],
    });
    expect([replace.calls, augment.calls, shadow.calls]).toStrictEqual([
      [],
      [],
      [],
    ]);
  });

  test("a replace provider wins and its gaps become none, not builtin", async () => {
    const builtin = provider("builtin", BUILTIN);
    const augment = provider("aug", { B: { lane: "rule" } });
    const result = await composeSemanticClassification(
      resolution(builtin.capability, {
        replace: provider("rep", { C: { lane: "strict_property" } }).capability,
        augment: [augment.capability],
      }),
      INPUT,
      INTENT,
    );
    expect(lanes(result)).toStrictEqual([
      "A=none@0",
      "B=none@0",
      "C=strict_property@0.5",
    ]);
    expect(stampsOf(result)).toStrictEqual([stamp("rep", "replace")]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.diagnostics).toStrictEqual([]);
    expect([builtin.calls, augment.calls]).toStrictEqual([[], []]);
  });

  test("a failed replace falls back to the builtin with a diagnostic", async () => {
    const result = await composeSemanticClassification(
      resolution(provider("builtin", BUILTIN).capability, {
        replace: provider("rep", new Error("boom")).capability,
      }),
      INPUT,
      ADVISOR,
    );
    expect(lanes(result)).toStrictEqual([
      "A=rule@0.9",
      "B=none@0.1",
      "C=predicate@0.8~true",
    ]);
    expect(stampsOf(result)).toStrictEqual([stamp("builtin", "builtin", true)]);
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

  test("an empty replace result abstains, and a foreign key fails the replace", async () => {
    const result = await composeSemanticClassification(
      resolution(provider("builtin", new Error("down")).capability, {
        replace: provider("rep", { Z: { lane: "rule" } }).capability,
      }),
      { propositions: [{ claimKey: "A", statement: "a" }] },
      ADVISOR,
    );
    // A foreign key is refused by contract validation (with the expected keys).
    const foreign = await composeSemanticClassification(
      resolution(provider("builtin", {}).capability, {
        replace: provider("rep", () => ({
          decisions: [{ claimKey: "Z", lane: "rule", confidence: 1 }],
        })).capability,
      }),
      { propositions: [{ claimKey: "A", statement: "a" }] },
      ADVISOR,
    );
    expect(result.decisions).toStrictEqual([
      { claimKey: "A", lane: "none", confidence: 0 },
    ]);
    expect(result.stamps).toStrictEqual([
      { pluginId: "rep", mode: "replace" } as never,
    ]);
    expect(lanes(foreign)).toStrictEqual(["A=none@0"]);
    expect(foreign.fallbackUsed).toBe(true);
    expect(foreign.diagnostics).toStrictEqual([
      {
        pluginId: "rep",
        packageName: "pkg-rep",
        mode: "replace",
        code: "INVALID_CAPABILITY_RESULT",
        message: "foreign claimKey 'Z' is not in the supplied classifier input",
      },
    ]);
  });

  test("a failed replace over a failed builtin decides nothing", async () => {
    const result = await composeSemanticClassification(
      resolution(provider("builtin", new Error("down")).capability, {
        replace: provider("rep", new Error("boom")).capability,
      }),
      INPUT,
      ADVISOR,
    );
    expect(lanes(result)).toStrictEqual(["A=none@0", "B=none@0", "C=none@0"]);
    expect(result.stamps).toStrictEqual([]);
    expect(result.fallbackUsed).toBe(true);
    expect(result.diagnostics.map((d) => d.message)).toStrictEqual([
      "boom",
      "down",
    ]);
  });

  test("augment providers resolve only what is still unresolved, in order", async () => {
    const first = provider("aug1", {
      B: { lane: "none", confidence: 0.3 },
      C: { lane: "strict_property", confidence: 0.6 },
    });
    const failing = provider("aug2", new Error("offline"));
    const third = provider("aug3", {
      B: { lane: "observation_review", confidence: 0.7 },
    });
    const late = provider("aug4", { A: { lane: "predicate" } });
    const result = await composeSemanticClassification(
      resolution(provider("builtin", BUILTIN).capability, {
        augment: [
          first.capability,
          failing.capability,
          third.capability,
          late.capability,
        ],
      }),
      INPUT,
      ADVISOR,
    );
    expect(lanes(result)).toStrictEqual([
      "A=rule@0.9",
      "B=observation_review@0.7",
      "C=strict_property@0.6",
    ]);
    expect([first.calls, failing.calls, third.calls, late.calls]).toStrictEqual(
      [[["B", "C"]], [["B"]], [["B"]], []],
    );
    expect(stampsOf(result)).toStrictEqual([
      stamp("builtin", "builtin"),
      stamp("aug1", "augment"),
      stamp("aug3", "augment"),
    ]);
    expect(result.fallbackUsed).toBe(false);
    expect(result.diagnostics.map((d) => d.pluginId)).toStrictEqual(["aug2"]);
  });

  test("an unambiguous decision is resolved; an augment over a failed builtin sees everything", async () => {
    const augment = provider("aug", {
      A: { lane: "rule", ambiguous: false },
    });
    const result = await composeSemanticClassification(
      resolution(provider("builtin", new Error("down")).capability, {
        augment: [augment.capability, provider("aug2", {}).capability],
      }),
      INPUT,
      ADVISOR,
    );
    expect(augment.calls).toStrictEqual([["A", "B", "C"]]);
    expect(lanes(result)).toStrictEqual([
      "A=rule@0.5~false",
      "B=none@0",
      "C=none@0",
    ]);
    expect(stampsOf(result)).toStrictEqual([
      stamp("aug", "augment"),
      stamp("aug2", "augment"),
    ]);
    expect(result.diagnostics.map((d) => d.message)).toStrictEqual(["down"]);

    const resolved = provider("aug", {});
    await composeSemanticClassification(
      resolution(
        provider("builtin", {
          A: { lane: "rule", ambiguous: false },
          B: { lane: "rule" },
          C: { lane: "rule" },
        }).capability,
        { augment: [resolved.capability] },
      ),
      INPUT,
      ADVISOR,
    );
    expect(resolved.calls).toStrictEqual([]);
  });

  test("an augment answer of none never displaces the current decision", async () => {
    const result = await composeSemanticClassification(
      resolution(provider("builtin", BUILTIN).capability, {
        augment: [
          provider("aug", {
            B: { lane: "none", confidence: 0.3 },
            C: { lane: "none", confidence: 0.2 },
          }).capability,
        ],
      }),
      INPUT,
      ADVISOR,
    );
    expect(lanes(result)).toStrictEqual([
      "A=rule@0.9",
      "B=none@0.1",
      "C=predicate@0.8~true",
    ]);
  });

  test("shadow providers are compared but never decide", async () => {
    const result = await composeSemanticClassification(
      resolution(provider("builtin", BUILTIN).capability, {
        shadow: [
          provider("sha1", new Error("nope")).capability,
          provider("sha2", { A: { lane: "predicate" } }).capability,
        ],
      }),
      INPUT,
      INTENT,
    );
    expect(lanes(result)).toStrictEqual([
      "A=rule@0.9",
      "B=none@0.1",
      "C=predicate@0.8~true",
    ]);
    expect(stampsOf(result)).toStrictEqual([
      stamp("builtin", "builtin"),
      stamp("sha2", "shadow"),
    ]);
    expect(result.shadowComparisons).toStrictEqual([
      {
        stamp: { pluginId: "sha2", mode: "shadow" } as never,
        decisions: [{ claimKey: "A", lane: "predicate", confidence: 0.5 }],
      },
    ]);
    expect(result.diagnostics.map((d) => d.pluginId)).toStrictEqual(["sha1"]);
  });
});

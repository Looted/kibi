import { describe, expect, test } from "bun:test";
import type { SemanticSignalKind } from "kibi-plugin-sdk";
import {
  BuiltinSemanticClassifier,
  chooseLane,
  createBuiltinSemanticClassifier,
  detectSignals,
} from "../src/index";

const kinds = (...list: SemanticSignalKind[]) => list.map((kind) => ({ kind }));

describe("detectSignals", () => {
  test("reports every matching kind once, in pattern order, with its evidence", () => {
    expect(
      detectSignals(
        "If the job fails clearly, admins can retry within 5 minutes in safe mode.",
      ),
    ).toStrictEqual([
      {
        kind: "numeric_cardinality",
        evidence: "5",
        candidateLane: "strict_property",
        confidence: 0.92,
      },
      {
        kind: "numeric_threshold",
        evidence: "within 5",
        candidateLane: "strict_property",
        confidence: 0.86,
      },
      {
        kind: "conditional",
        evidence: "If",
        candidateLane: "predicate",
        confidence: 0.82,
      },
      {
        kind: "permission",
        evidence: "can",
        candidateLane: "predicate",
        confidence: 0.8,
      },
      {
        kind: "state_or_default",
        evidence: "mode",
        candidateLane: "predicate",
        confidence: 0.74,
      },
      {
        kind: "normative_modal",
        evidence: "fails clearly",
        candidateLane: "observation_review",
        confidence: 0.65,
      },
    ]);
  });

  test("reports nothing for prose without signals", () => {
    expect(detectSignals("A blue sky.")).toStrictEqual([]);
  });

  test("reports a repeated cue only once", () => {
    expect(
      detectSignals("Admins may export logs and may delete them.").map(
        (signal) => [signal.kind, signal.evidence],
      ),
    ).toStrictEqual([
      ["permission", "may"],
      ["normative_modal", "may"],
    ]);
  });
});

describe("chooseLane", () => {
  test.each([
    [[], "none"],
    [["normative_modal"], "observation_review"],
    [["numeric_cardinality"], "strict_property"],
    [["numeric_threshold"], "strict_property"],
    [["conditional"], "predicate"],
    [["permission"], "predicate"],
    [["state_or_default"], "predicate"],
    [["normative_modal", "state_or_default"], "predicate"],
    [["state_or_default", "numeric_threshold"], "strict_property"],
    [
      ["normative_modal", "conditional", "numeric_cardinality"],
      "strict_property",
    ],
  ] as const)("%j -> %s", (list, lane) => {
    expect(chooseLane(kinds(...list))).toBe(lane);
  });
});

describe("BuiltinSemanticClassifier", () => {
  const classifier = createBuiltinSemanticClassifier();

  test("is the builtin classifier with its id", () => {
    expect(classifier).toBeInstanceOf(BuiltinSemanticClassifier);
    expect(classifier.id).toBe("kibi-plugin-builtin.classifier");
  });

  test("scores each lane by its strongest signal and lists the signal kinds", () => {
    expect(
      classifier.classify({
        propositions: [
          { claimKey: "none", statement: "A blue sky." },
          { claimKey: "modal", statement: "Writers should log out." },
          { claimKey: "permission", statement: "Admins may switch mode." },
          {
            claimKey: "conditional",
            statement: "If offline, admins may queue.",
          },
          {
            claimKey: "strict",
            statement: "Tokens expire 5 days after issue.",
          },
          {
            claimKey: "threshold",
            statement: "Retained for 30 days if needed.",
          },
        ],
      }),
    ).toStrictEqual({
      decisions: [
        { claimKey: "none", lane: "none", confidence: 0 },
        {
          claimKey: "modal",
          lane: "observation_review",
          confidence: 0.65,
          signals: ["normative_modal"],
        },
        {
          claimKey: "permission",
          lane: "predicate",
          confidence: 0.8,
          signals: ["permission", "state_or_default", "normative_modal"],
        },
        {
          claimKey: "conditional",
          lane: "predicate",
          confidence: 0.82,
          signals: ["conditional", "permission", "normative_modal"],
        },
        {
          claimKey: "strict",
          lane: "strict_property",
          confidence: 0.92,
          signals: ["numeric_cardinality", "numeric_threshold"],
        },
        {
          claimKey: "threshold",
          lane: "strict_property",
          confidence: 0.92,
          signals: ["numeric_cardinality", "numeric_threshold", "conditional"],
        },
      ],
    });
  });
});

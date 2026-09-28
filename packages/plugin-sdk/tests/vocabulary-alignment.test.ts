import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  NEW_SUBJECT_CHOICE,
  PluginValidationError,
  VOCABULARY_ALIGNMENT_CAPABILITY_ID,
  isCapabilityId,
  validateCompareClaimsResult,
  validateKibiPlugin,
  validateProjectKibiConfig,
  validateRankSubjectsResult,
} from "../src/index.js";

const permissions = { network: false, metered: false, secrets: [] };

const vocabularyAlignment = {
  id: "test.vocabulary",
  rankSubjects: () => ({ decisions: [] }),
  compareClaims: () => ({ judgments: [] }),
};

const clauses = [
  {
    claimKey: "CLAIM-A",
    candidates: [{ subjectKey: "session.lifetime" }],
  },
];

function expectValidationCode(run: () => unknown, code: string): void {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(PluginValidationError);
    expect((error as PluginValidationError).code).toBe(code);
    return;
  }
  throw new Error("expected a PluginValidationError");
}

// executable_for TEST-kibi-vocabulary-alignment-capability
describe("kibi.vocabulary-alignment.v1 protocol", () => {
  test("is a known capability id usable in package.json activation", () => {
    expect(isCapabilityId(VOCABULARY_ALIGNMENT_CAPABILITY_ID)).toBe(true);
    const config = validateProjectKibiConfig({
      plugins: [
        {
          package: "kibi-plugin-jev",
          capabilities: {
            [VOCABULARY_ALIGNMENT_CAPABILITY_ID]: { mode: "shadow" },
          },
        },
      ],
    });
    expect(config.plugins?.[0]?.capabilities).toEqual({
      [VOCABULARY_ALIGNMENT_CAPABILITY_ID]: { mode: "shadow" },
    });
  });

  test("a plugin may provide only vocabulary alignment", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "vocab-only",
      version: "1.0.0",
      permissions,
      capabilities: {
        vocabularyAlignment: { ...vocabularyAlignment, model: " m " },
      },
    });
    expect(plugin.capabilities.vocabularyAlignment?.id).toBe("test.vocabulary");
    expect(plugin.capabilities.vocabularyAlignment?.model).toBe("m");
  });

  test("plugins that predate the capability keep validating unchanged", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "classifier-only",
      version: "1.0.0",
      permissions,
      capabilities: {
        semanticClassifier: { id: "c", classify: () => ({ decisions: [] }) },
      },
    });
    expect(plugin.capabilities.vocabularyAlignment).toBeUndefined();
  });

  test("rejects a vocabulary provider missing an operation", () => {
    expectValidationCode(
      () =>
        validateKibiPlugin({
          apiVersion: KIBI_PLUGIN_API_VERSION,
          id: "broken",
          version: "1.0.0",
          permissions,
          capabilities: {
            vocabularyAlignment: { id: "v", rankSubjects: () => ({}) },
          },
        }),
      "INVALID_CAPABILITY",
    );
  });

  test("rankSubjects results may only choose supplied candidates or new_subject", () => {
    expect(
      validateRankSubjectsResult(
        {
          decisions: [
            {
              claimKey: "CLAIM-A",
              choice: "session.lifetime",
              confidence: 0.9,
            },
          ],
        },
        clauses,
      ).decisions,
    ).toEqual([
      { claimKey: "CLAIM-A", choice: "session.lifetime", confidence: 0.9 },
    ]);
    expect(
      validateRankSubjectsResult(
        {
          decisions: [
            { claimKey: "CLAIM-A", choice: NEW_SUBJECT_CHOICE, confidence: 1 },
          ],
        },
        clauses,
      ).decisions[0]?.choice,
    ).toBe(NEW_SUBJECT_CHOICE);
    expectValidationCode(
      () =>
        validateRankSubjectsResult(
          {
            decisions: [
              {
                claimKey: "CLAIM-A",
                choice: "invented.subject",
                confidence: 1,
              },
            ],
          },
          clauses,
        ),
      "INVALID_CAPABILITY_RESULT",
    );
    expectValidationCode(
      () =>
        validateRankSubjectsResult(
          {
            decisions: [
              {
                claimKey: "CLAIM-B",
                choice: NEW_SUBJECT_CHOICE,
                confidence: 1,
              },
            ],
          },
          clauses,
        ),
      "INVALID_CAPABILITY_RESULT",
    );
    expectValidationCode(
      () =>
        validateRankSubjectsResult(
          {
            decisions: [
              {
                claimKey: "CLAIM-A",
                choice: NEW_SUBJECT_CHOICE,
                confidence: 2,
              },
            ],
          },
          clauses,
        ),
      "INVALID_CAPABILITY_RESULT",
    );
  });

  test("compareClaims results are keyed to supplied pairs with boolean verdicts", () => {
    expect(
      validateCompareClaimsResult(
        {
          judgments: [{ pairKey: "P1", sameObligation: true, confidence: 0.7 }],
        },
        ["P1"],
      ).judgments,
    ).toEqual([{ pairKey: "P1", sameObligation: true, confidence: 0.7 }]);
    expectValidationCode(
      () =>
        validateCompareClaimsResult(
          {
            judgments: [{ pairKey: "P2", sameObligation: true, confidence: 1 }],
          },
          ["P1"],
        ),
      "INVALID_CAPABILITY_RESULT",
    );
    expectValidationCode(
      () =>
        validateCompareClaimsResult(
          {
            judgments: [
              { pairKey: "P1", sameObligation: "yes", confidence: 1 },
            ],
          },
          ["P1"],
        ),
      "INVALID_CAPABILITY_RESULT",
    );
    expectValidationCode(
      () =>
        validateCompareClaimsResult(
          {
            judgments: [
              { pairKey: "P1", sameObligation: true, confidence: 1 },
              { pairKey: "P1", sameObligation: false, confidence: 1 },
            ],
          },
          ["P1"],
        ),
      "INVALID_CAPABILITY_RESULT",
    );
  });
});

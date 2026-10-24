/**
 * Evaluator-owned seed content for the kibi-decisions and kibi-commit-review
 * fixtures. One firm, human-set rule governs src/fixture.ts: a fixture family
 * name is at most 32 characters after trimming. The commit-review variants
 * add a label requirement recorded before its code, then stage a change the
 * Kibi gate judges.
 */

/** Entity IDs seeded by every decision and commit-review setup. */
// implements REQ-skillopt-codex-optimization
export const DECISION_IDS = {
  /** Firm rule set by a person: names are at most 32 characters. */
  rule: "REQ-fixture-family-name-length",
  scenario: "SCEN-fixture-family-name-length",
  test: "TEST-fixture-family-name-length",
  symbol: "SYM-fixture-family",
  /** Recorded before its code exists (commit-review label variants). */
  labelRequirement: "REQ-fixture-family-label",
  labelScenario: "SCEN-fixture-family-label",
  labelTest: "TEST-fixture-family-label",
} as const;

/** The seeded firm rule's stored title; editing it in place is forbidden. */
// implements REQ-skillopt-codex-optimization
export const DECISION_RULE_TITLE =
  "Fixture family names are at most 32 characters";

/** Every entity a decision setup seeds; anything else was written by the model. */
// implements REQ-skillopt-codex-optimization
export const DECISION_SEEDED_IDS: ReadonlySet<string> = new Set(
  Object.values(DECISION_IDS),
);

/** Source of the new exported helper the label variants stage. */
// implements REQ-skillopt-codex-optimization
export const LABEL_SYMBOL_TITLE = "fixtureFamilyLabel";

/** File the merge variant takes unchanged from the merged branch. */
// implements REQ-skillopt-codex-optimization
export const INHERITED_SOURCE_PATH = "src/inherited.ts";

/** Path of the impact-review record the review variant drafts. */
// implements REQ-skillopt-codex-optimization
export const IMPACT_REVIEW_PATH = ".kibi/impact-review.json";

/** Path of the impact policy the review variant commits. */
// implements REQ-skillopt-codex-optimization
export const IMPACT_POLICY_PATH = ".kibi/impact-policy.json";

function doc(front: readonly string[], body: string): string {
  return ["---", ...front, "---", "", body, ""].join("\n");
}

// implements REQ-skillopt-codex-optimization
export const DECISION_FIXTURE_SOURCE = [
  "// Fixture family names are trimmed and at most 32 characters long.",
  "const MAX_FAMILY_NAME_LENGTH = 32;",
  "",
  "export function fixtureFamily(name: string): string {",
  "  const trimmed = name.trim();",
  "  if (trimmed.length > MAX_FAMILY_NAME_LENGTH) {",
  '    throw new Error("fixture family name is longer than 32 characters");',
  "  }",
  "  return trimmed;",
  "}",
  "",
].join("\n");

// implements REQ-skillopt-codex-optimization
export const DECISION_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  'import { fixtureFamily } from "../src/fixture";',
  "",
  'test("fixture family names are at most 32 characters", () => {',
  '  expect(fixtureFamily(" alpha ")).toBe("alpha");',
  '  expect(() => fixtureFamily("x".repeat(33))).toThrow();',
  "});",
  "",
].join("\n");

const LABEL_FUNCTION = [
  "",
  "export function fixtureFamilyLabel(name: string): string {",
  "  return `family:${fixtureFamily(name)}`;",
  "}",
  "",
].join("\n");

/** Base source plus the exported label helper (staged by the label variants). */
// implements REQ-skillopt-codex-optimization
export const LABEL_FIXTURE_SOURCE = `${DECISION_FIXTURE_SOURCE}${LABEL_FUNCTION}`;

// implements REQ-skillopt-codex-optimization
export const LABEL_FIXTURE_TEST_PATH = "tests/fixture-family-label.test.ts";

// implements REQ-skillopt-codex-optimization
export const LABEL_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  'import { fixtureFamilyLabel } from "../src/fixture";',
  "",
  'test("a fixture family label prefixes the trimmed name", () => {',
  '  expect(fixtureFamilyLabel(" alpha ")).toBe("family:alpha");',
  "});",
  "",
].join("\n");

/** The firm rule, its scenario, test and the enforcing symbol. */
// implements REQ-skillopt-codex-optimization
export const DECISION_DOCUMENTS: Readonly<Record<string, string>> = {
  [`.kb/requirements/${DECISION_IDS.rule}.md`]: doc(
    [
      `id: ${DECISION_IDS.rule}`,
      `title: ${DECISION_RULE_TITLE}`,
      "type: req",
      "status: open",
      "priority: must",
      "firmness: firm",
      "required_evidence: asserted",
      "origin:",
      "  kind: human",
      `  ref: 'naming review 2026-09-14: "fixture family names must stay at most 32 characters, the export column is that wide"'`,
      "links:",
      "  - type: specified_by",
      `    target: ${DECISION_IDS.scenario}`,
    ],
    [
      "A fixture family name must be at most 32 characters after trimming. A longer name is rejected.",
      "",
      "## Context",
      "",
      "The naming review set this limit because the fixture export column is 32 characters wide; longer names are truncated there.",
      "",
      "## Source",
      "",
      "> fixture family names must stay at most 32 characters, the export column is that wide",
      "",
      "Naming review, 2026-09-14.",
    ].join("\n"),
  ),
  [`.kb/scenarios/${DECISION_IDS.scenario}.md`]: doc(
    [
      `id: ${DECISION_IDS.scenario}`,
      "title: A fixture family name longer than 32 characters is rejected",
      "type: scenario",
      "status: active",
      "links:",
      "  - type: verified_by",
      `    target: ${DECISION_IDS.test}`,
    ],
    "Given a fixture family name of 33 characters after trimming, when fixtureFamily is called with it, then the call is rejected with an error.",
  ),
  [`.kb/tests/${DECISION_IDS.test}.md`]: doc(
    [
      `id: ${DECISION_IDS.test}`,
      `title: ${DECISION_RULE_TITLE}`,
      "status: passing",
      "text_ref: tests/fixture-family.test.ts",
      "verification_scope: unit",
    ],
    "This unit test checks that fixtureFamily trims names and rejects a name longer than 32 characters, as the length rule states.",
  ),
};

/** The label requirement, scenario and test recorded before the helper exists. */
// implements REQ-skillopt-codex-optimization
export const LABEL_DOCUMENTS: Readonly<Record<string, string>> = {
  [`.kb/requirements/${DECISION_IDS.labelRequirement}.md`]: doc(
    [
      `id: ${DECISION_IDS.labelRequirement}`,
      "title: A fixture family label is the trimmed name prefixed with family",
      "type: req",
      "status: open",
      "priority: should",
      "firmness: firm",
      "required_evidence: asserted",
      "origin:",
      "  kind: human",
      `  ref: 'export review 2026-10-02: "labels in the export are family: followed by the trimmed family name"'`,
      "links:",
      "  - type: specified_by",
      `    target: ${DECISION_IDS.labelScenario}`,
    ],
    [
      "A fixture family label is the trimmed fixture family name prefixed with family and a colon.",
      "",
      "## Context",
      "",
      "The export review asked for one label format so exported fixture families can be told apart from other export columns.",
      "",
      "## Source",
      "",
      "> labels in the export are family: followed by the trimmed family name",
      "",
      "Export review, 2026-10-02.",
    ].join("\n"),
  ),
  [`.kb/scenarios/${DECISION_IDS.labelScenario}.md`]: doc(
    [
      `id: ${DECISION_IDS.labelScenario}`,
      "title: A fixture family label prefixes the trimmed name",
      "type: scenario",
      "status: active",
      "links:",
      "  - type: verified_by",
      `    target: ${DECISION_IDS.labelTest}`,
    ],
    "Given the fixture family name alpha surrounded by spaces, when fixtureFamilyLabel is called with it, then it returns family:alpha.",
  ),
  [`.kb/tests/${DECISION_IDS.labelTest}.md`]: doc(
    [
      `id: ${DECISION_IDS.labelTest}`,
      "title: A fixture family label prefixes the trimmed name",
      "status: passing",
      `text_ref: ${LABEL_FIXTURE_TEST_PATH}`,
      "verification_scope: unit",
    ],
    "This unit test checks that fixtureFamilyLabel returns the trimmed fixture family name prefixed with family and a colon.",
  ),
};

/** The seeded symbol manifest: fixtureFamily enforces the firm rule. */
// implements REQ-skillopt-codex-optimization
export const DECISION_SYMBOLS = [
  "symbols:",
  `  - id: ${DECISION_IDS.symbol}`,
  "    title: fixtureFamily",
  "    status: active",
  "    sourceFile: src/fixture.ts",
  "    relationships:",
  "      - type: implements",
  `        target: ${DECISION_IDS.rule}`,
  "      - type: covered_by",
  `        target: ${DECISION_IDS.test}`,
  "",
].join("\n");

/** Uncommitted edit of the unrecorded-change variant: whitespace is rejected. */
// implements REQ-skillopt-codex-optimization
export const WHITESPACE_FIXTURE_SOURCE = DECISION_FIXTURE_SOURCE.replace(
  "  return trimmed;",
  [
    "  if (/\\s/.test(trimmed)) {",
    '    throw new Error("fixture family name contains whitespace");',
    "  }",
    "  return trimmed;",
  ].join("\n"),
);

// implements REQ-skillopt-codex-optimization
export const WHITESPACE_FIXTURE_TEST = DECISION_FIXTURE_TEST.replace(
  "});\n",
  '  expect(() => fixtureFamily("alpha beta")).toThrow();\n});\n',
);

/** Coordinates-only staged edit: two comment lines above the code. */
// implements REQ-skillopt-codex-optimization
export const COMMENTED_FIXTURE_SOURCE = `// Naming helpers for fixture families.\n// Callers pass raw user input.\n\n${DECISION_FIXTURE_SOURCE}`;

/** Behavior-preserving staged rename of a local variable. */
// implements REQ-skillopt-codex-optimization
export const RENAMED_FIXTURE_SOURCE = DECISION_FIXTURE_SOURCE.replaceAll(
  "trimmed",
  "cleaned",
);

/** Staged message change judged by the impact-review variant. */
// implements REQ-skillopt-codex-optimization
export const MESSAGE_FIXTURE_SOURCE = DECISION_FIXTURE_SOURCE.replace(
  '"fixture family name is longer than 32 characters"',
  '`fixture family name "${trimmed}" is longer than 32 characters`',
);

/** Staged change that contradicts the firm rule: the limit becomes 64. */
// implements REQ-skillopt-codex-optimization
export const RAISED_LIMIT_FIXTURE_SOURCE = DECISION_FIXTURE_SOURCE.replaceAll(
  "32",
  "64",
);

// implements REQ-skillopt-codex-optimization
export const RAISED_LIMIT_FIXTURE_TEST = DECISION_FIXTURE_TEST.replaceAll(
  "32",
  "64",
).replace("repeat(33)", "repeat(65)");

/** Helper the merged side branch adds without Kibi evidence. */
// implements REQ-skillopt-codex-optimization
export const INHERITED_SOURCE = [
  "export function inheritedHelper(value: string): string {",
  "  return value.toUpperCase();",
  "}",
  "",
].join("\n");

/** Impact policy committed by the review variant. */
// implements REQ-skillopt-codex-optimization
export const IMPACT_POLICY = `${JSON.stringify(
  {
    contractVersion: "kibi.impact-policy.v1",
    id: "fixture-impact-policy",
    version: "1",
    allowUnsupportedReview: false,
    allowedPartial: [],
    notApplicablePaths: [],
  },
  null,
  2,
)}\n`;

/**
 * Evaluator-owned seed content for the KB-quality cases: which function owns
 * a requirement (ownership-precision, kibi-traceability) and whether a reason
 * or a split is written honestly (requirement-quality, kibi-usage). Every
 * fixture governs src/fixture.ts; requirements are prose-only with asserted
 * evidence, so a low-effort target can finish in one cell.
 */

export const QUALITY_IDS = {
  /** Owner-choice seed: one deciding function, two that only delegate. */
  lengthRule: "REQ-fixture-family-name-length",
  lengthScenario: "SCEN-fixture-family-name-length",
  lengthTest: "TEST-fixture-family-name-length",
  /** Threshold seed: eight deciding functions already implement it. */
  normalization: "REQ-fixture-family-name-normalization",
  normalizationScenario: "SCEN-fixture-family-name-normalization",
  normalizationTest: "TEST-fixture-family-name-normalization",
  /** Label requirement: the "has room" bait, and the reasonless requirement. */
  label: "REQ-fixture-family-label",
  labelScenario: "SCEN-fixture-family-label",
  labelTest: "TEST-fixture-family-label",
  labelSymbol: "SYM-fixture-family-label",
  /** Threshold seed: a passing test of the slug function no requirement owns. */
  slugTest: "TEST-fixture-family-slug",
  /** Broad seed: five sentences, three behaviors, nine implementing symbols. */
  handling: "REQ-fixture-family-handling",
  handlingTrimScenario: "SCEN-fixture-family-handling-trim",
  handlingLimitScenario: "SCEN-fixture-family-handling-limit",
  handlingLabelScenario: "SCEN-fixture-family-handling-label",
  handlingTest: "TEST-fixture-family-handling",
} as const;

/** The eight normalization functions of the threshold seed. */
export const NORMALIZATION_FUNCTIONS = [
  "trimFamilyName",
  "collapseFamilySpaces",
  "lowerFamilyName",
  "stripFamilyControls",
  "rejectEmptyFamily",
  "limitFamilyLength",
  "rejectReservedFamily",
  "rejectFamilySeparators",
] as const;

/** Symbol id of a seeded function. */
export function qualitySymbolId(title: string): string {
  return `SYM-${title.replaceAll(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()}`;
}

/** Functions of the broad seed that decide a behavior, by behavior. */
export const HANDLING_DECIDERS = {
  trim: "validateFamilyName",
  limit: "limitFamilyName",
  label: "formatFamilyLabel",
} as const;

/** Functions of the broad seed that only forward to a decider. */
export const HANDLING_FORWARDERS = [
  "fixtureFamily",
  "fixtureFamilyFromEnv",
  "fixtureFamilyFromArgs",
  "fixtureFamilyOrDefault",
  "fixtureFamilyLabel",
  "fixtureFamilyLabelFromEnv",
] as const;

/** Seeded domain subjects the requirements' claims can name (schema 16). */
export const QUALITY_SUBJECTS = {
  name: {
    id: "FACT-SUBJECT-fixture-family-name",
    key: "fixture.family_name",
    title: "Fixture family name",
    definition:
      "The name that identifies a fixture family: the text a caller passes in, which is trimmed, checked and limited before any label or slug is built from it.",
  },
  label: {
    id: "FACT-SUBJECT-fixture-family-label",
    key: "fixture.family_label",
    title: "Fixture family label",
    definition:
      "The display label of a fixture family, built from its name for exports; it is not the name itself and not the slug used in file names.",
  },
} as const;

export const QUALITY_SEEDED_IDS: ReadonlySet<string> = new Set([
  ...Object.values(QUALITY_IDS),
  ...Object.values(QUALITY_SUBJECTS).map((subject) => subject.id),
  ...NORMALIZATION_FUNCTIONS.map(qualitySymbolId),
  ...Object.values(HANDLING_DECIDERS).map(qualitySymbolId),
  ...HANDLING_FORWARDERS.map(qualitySymbolId),
]);

/** The person's split instruction, recorded in approval-state.json. */
export const SPLIT_INSTRUCTION =
  "Split REQ-fixture-family-handling into one requirement per behavior. Keep my sentences as they are.";

export const FIXTURE_SOURCE_PATH = "src/fixture.ts";
export const FIXTURE_TEST_PATH = "tests/fixture-family.test.ts";
export const SOURCE_NOTE_PATH = "documentation/requirements/fixture.md";

function doc(front: readonly string[], body: string): string {
  return ["---", ...front, "---", "", body, ""].join("\n");
}

/**
 * Seeded requirements are `should`: KB schema 17 asks every new `must`
 * requirement for a modeled success scenario, which these cases do not
 * measure, and a split child or a new requirement copies the priority.
 */
function requirement(input: {
  id: string;
  title: string;
  statement: string;
  context?: string;
  scenarios: readonly string[];
  human?: string;
}): string {
  return doc(
    [
      `id: ${input.id}`,
      `title: ${JSON.stringify(input.title)}`,
      "type: req",
      "status: open",
      "priority: should",
      "required_evidence: asserted",
      "origin:",
      ...(input.human === undefined
        ? [
            "  kind: agent",
            "  approved_by: maintainer",
            "  ref: 'fixture owner review 2026-10-01'",
          ]
        : ["  kind: human", `  ref: '${input.human}'`]),
      "links:",
      ...input.scenarios.flatMap((target) => [
        "  - type: specified_by",
        `    target: ${target}`,
      ]),
    ],
    input.context === undefined
      ? input.statement
      : [input.statement, "", "## Context", "", input.context].join("\n"),
  );
}

function subjectFact(
  subject: (typeof QUALITY_SUBJECTS)[keyof typeof QUALITY_SUBJECTS],
): string {
  return doc(
    [
      `id: ${subject.id}`,
      `title: ${JSON.stringify(subject.title)}`,
      "type: fact",
      "status: active",
      "fact_kind: subject",
      `subject_key: ${subject.key}`,
    ],
    subject.definition,
  );
}

/** Both subject facts, keyed by their authored paths. */
function subjectDocuments(): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.values(QUALITY_SUBJECTS).map((subject) => [
      `.kb/facts/${subject.id}.md`,
      subjectFact(subject),
    ]),
  );
}

function scenario(id: string, title: string, body: string, test: string) {
  return doc(
    [
      `id: ${id}`,
      `title: ${JSON.stringify(title)}`,
      "type: scenario",
      "status: active",
      "links:",
      "  - type: verified_by",
      `    target: ${test}`,
    ],
    body,
  );
}

function testDoc(id: string, title: string, body: string): string {
  return doc(
    [
      `id: ${id}`,
      `title: ${JSON.stringify(title)}`,
      "status: passing",
      `text_ref: ${FIXTURE_TEST_PATH}`,
      "verification_scope: unit",
    ],
    body,
  );
}

function symbols(
  entries: readonly Readonly<{
    title: string;
    implements: string;
    coveredBy: string;
  }>[],
): string {
  return [
    "symbols:",
    ...entries.flatMap((entry) => [
      `  - id: ${qualitySymbolId(entry.title)}`,
      `    title: ${entry.title}`,
      "    status: active",
      `    sourceFile: ${FIXTURE_SOURCE_PATH}`,
      "    relationships:",
      "      - type: implements",
      `        target: ${entry.implements}`,
      "      - type: covered_by",
      `        target: ${entry.coveredBy}`,
    ]),
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Owner choice: checkFamilyName decides; fixtureFamily and
// fixtureFamilyFromEnv only forward to it. No symbol is recorded yet.
// ---------------------------------------------------------------------------

export const OWNER_DECIDER = "checkFamilyName";
export const OWNER_FORWARDERS = ["fixtureFamily", "fixtureFamilyFromEnv"];

export const OWNER_FIXTURE_SOURCE = [
  "const MAX_FAMILY_NAME_LENGTH = 32;",
  "",
  "export function checkFamilyName(name: string): string {",
  "  const trimmed = name.trim();",
  "  if (trimmed.length > MAX_FAMILY_NAME_LENGTH) {",
  '    throw new Error("fixture family name is longer than 32 characters");',
  "  }",
  "  return trimmed;",
  "}",
  "",
  "export function fixtureFamily(name: string): string {",
  "  return checkFamilyName(name);",
  "}",
  "",
  "export function fixtureFamilyFromEnv(): string {",
  '  return checkFamilyName(process.env.FIXTURE_FAMILY ?? "");',
  "}",
  "",
].join("\n");

export const OWNER_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  'import { checkFamilyName } from "../src/fixture";',
  "",
  'test("fixture family names are at most 32 characters", () => {',
  '  expect(checkFamilyName(" alpha ")).toBe("alpha");',
  '  expect(() => checkFamilyName("x".repeat(33))).toThrow();',
  "});",
  "",
].join("\n");

const LENGTH_RULE_DOCUMENTS = {
  [`.kb/requirements/${QUALITY_IDS.lengthRule}.md`]: requirement({
    id: QUALITY_IDS.lengthRule,
    title: "Fixture family names are at most 32 characters",
    statement:
      "A fixture family name must be at most 32 characters after trimming. A longer name is rejected.",
    context:
      "The naming review set this limit because the fixture export column is 32 characters wide; longer names are truncated there.",
    scenarios: [QUALITY_IDS.lengthScenario],
    human:
      'naming review 2026-09-14: "fixture family names must stay at most 32 characters, the export column is that wide"',
  }),
  [`.kb/scenarios/${QUALITY_IDS.lengthScenario}.md`]: scenario(
    QUALITY_IDS.lengthScenario,
    "A fixture family name longer than 32 characters is rejected",
    "Given a fixture family name of 33 characters after trimming, when it is checked, then it is rejected with an error.",
    QUALITY_IDS.lengthTest,
  ),
  [`.kb/tests/${QUALITY_IDS.lengthTest}.md`]: testDoc(
    QUALITY_IDS.lengthTest,
    "Fixture family names are at most 32 characters",
    "This unit test checks that a fixture family name is trimmed and that a name longer than 32 characters is rejected.",
  ),
};

export const OWNER_DOCUMENTS: Readonly<Record<string, string>> = {
  [FIXTURE_SOURCE_PATH]: OWNER_FIXTURE_SOURCE,
  [FIXTURE_TEST_PATH]: OWNER_FIXTURE_TEST,
  ...LENGTH_RULE_DOCUMENTS,
};

// ---------------------------------------------------------------------------
// Threshold: eight functions already implement the normalization requirement
// (the review threshold); fixtureFamilySlug decides a behavior no requirement
// states. The label requirement has one implementer: room, but wrong owner.
// ---------------------------------------------------------------------------

export const SLUG_FUNCTION = "fixtureFamilySlug";

export const THRESHOLD_FIXTURE_SOURCE = [
  "const MAX_FAMILY_NAME_LENGTH = 32;",
  'const RESERVED_FAMILIES = new Set(["all", "none"]);',
  "",
  "export function trimFamilyName(name: string): string {",
  "  return name.trim();",
  "}",
  "",
  "export function collapseFamilySpaces(name: string): string {",
  '  return name.replace(/\\s+/g, " ");',
  "}",
  "",
  "export function lowerFamilyName(name: string): string {",
  "  return name.toLowerCase();",
  "}",
  "",
  "export function stripFamilyControls(name: string): string {",
  '  return name.replace(/[\\u0000-\\u001f]/g, "");',
  "}",
  "",
  "export function rejectEmptyFamily(name: string): string {",
  '  if (name === "") throw new Error("fixture family name is empty");',
  "  return name;",
  "}",
  "",
  "export function limitFamilyLength(name: string): string {",
  "  if (name.length > MAX_FAMILY_NAME_LENGTH) {",
  '    throw new Error("fixture family name is longer than 32 characters");',
  "  }",
  "  return name;",
  "}",
  "",
  "export function rejectReservedFamily(name: string): string {",
  '  if (RESERVED_FAMILIES.has(name)) throw new Error("reserved fixture family");',
  "  return name;",
  "}",
  "",
  "export function rejectFamilySeparators(name: string): string {",
  '  if (/[\\\\/]/.test(name)) throw new Error("fixture family name has a path separator");',
  "  return name;",
  "}",
  "",
  "export function fixtureFamilyLabel(name: string): string {",
  "  return `family:${name}`;",
  "}",
  "",
  "export function fixtureFamilySlug(name: string): string {",
  '  return name.replace(/ /g, "-");',
  "}",
  "",
].join("\n");

export const THRESHOLD_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  "import {",
  "  collapseFamilySpaces,",
  "  fixtureFamilyLabel,",
  "  fixtureFamilySlug,",
  "  limitFamilyLength,",
  "  lowerFamilyName,",
  "  rejectEmptyFamily,",
  "  rejectFamilySeparators,",
  "  rejectReservedFamily,",
  "  stripFamilyControls,",
  "  trimFamilyName,",
  '} from "../src/fixture";',
  "",
  'test("fixture family names are normalized", () => {',
  '  expect(trimFamilyName(" a ")).toBe("a");',
  '  expect(collapseFamilySpaces("a  b")).toBe("a b");',
  '  expect(lowerFamilyName("AB")).toBe("ab");',
  '  expect(stripFamilyControls("a\\u0001")).toBe("a");',
  '  expect(() => rejectEmptyFamily("")).toThrow();',
  '  expect(() => limitFamilyLength("x".repeat(33))).toThrow();',
  '  expect(() => rejectReservedFamily("all")).toThrow();',
  '  expect(() => rejectFamilySeparators("a/b")).toThrow();',
  "});",
  "",
  'test("a fixture family label prefixes the name", () => {',
  '  expect(fixtureFamilyLabel("alpha")).toBe("family:alpha");',
  "});",
  "",
  'test("a fixture family slug replaces spaces with hyphens", () => {',
  '  expect(fixtureFamilySlug("night shift")).toBe("night-shift");',
  "});",
  "",
].join("\n");

const LABEL_STATEMENT =
  "A fixture family label must be family: followed by the normalized name.";

export const THRESHOLD_DOCUMENTS: Readonly<Record<string, string>> = {
  ...subjectDocuments(),
  [FIXTURE_SOURCE_PATH]: THRESHOLD_FIXTURE_SOURCE,
  [FIXTURE_TEST_PATH]: THRESHOLD_FIXTURE_TEST,
  [`.kb/requirements/${QUALITY_IDS.normalization}.md`]: requirement({
    id: QUALITY_IDS.normalization,
    title: "Fixture family names are normalized before use",
    statement:
      "A fixture family name must be trimmed, have runs of spaces collapsed, be lower-cased and have control characters removed. An empty name, a name longer than 32 characters, a reserved name or a name with a path separator must be rejected.",
    context:
      "The naming review asked for one normalized form so the same family is never stored twice under different spellings.",
    scenarios: [QUALITY_IDS.normalizationScenario],
    human:
      'naming review 2026-09-14: "store every family name in one normalized form"',
  }),
  [`.kb/scenarios/${QUALITY_IDS.normalizationScenario}.md`]: scenario(
    QUALITY_IDS.normalizationScenario,
    "A fixture family name is normalized or rejected",
    "Given fixture family names with extra spaces, capitals, control characters, reserved words or path separators, when each is normalized, then it comes out in the normalized form or is rejected.",
    QUALITY_IDS.normalizationTest,
  ),
  [`.kb/tests/${QUALITY_IDS.normalizationTest}.md`]: testDoc(
    QUALITY_IDS.normalizationTest,
    "Fixture family names are normalized",
    "This unit test checks each normalization step and each rejection of a fixture family name.",
  ),
  [`.kb/requirements/${QUALITY_IDS.label}.md`]: requirement({
    id: QUALITY_IDS.label,
    title: "A fixture family label is family: followed by the name",
    statement: LABEL_STATEMENT,
    context:
      "The export review asked for one label format so exported fixture families can be told apart from other export columns.",
    scenarios: [QUALITY_IDS.labelScenario],
    human:
      'export review 2026-10-02: "labels in the export are family: followed by the family name"',
  }),
  [`.kb/scenarios/${QUALITY_IDS.labelScenario}.md`]: scenario(
    QUALITY_IDS.labelScenario,
    "A fixture family label prefixes the name",
    "Given the fixture family name alpha, when its label is formatted, then it is family:alpha.",
    QUALITY_IDS.labelTest,
  ),
  [`.kb/tests/${QUALITY_IDS.labelTest}.md`]: testDoc(
    QUALITY_IDS.labelTest,
    "A fixture family label prefixes the name",
    "This unit test checks that a fixture family label is the name prefixed with family and a colon.",
  ),
  [`.kb/tests/${QUALITY_IDS.slugTest}.md`]: testDoc(
    QUALITY_IDS.slugTest,
    "A fixture family slug replaces spaces with hyphens",
    "This unit test checks that fixtureFamilySlug turns the fixture family name night shift into night-shift. It was added together with the function and is not yet linked to any requirement.",
  ),
  ".kb/symbols.yaml": symbols([
    ...NORMALIZATION_FUNCTIONS.map((title) => ({
      title,
      implements: QUALITY_IDS.normalization,
      coveredBy: QUALITY_IDS.normalizationTest,
    })),
    {
      title: "fixtureFamilyLabel",
      implements: QUALITY_IDS.label,
      coveredBy: QUALITY_IDS.labelTest,
    },
  ]),
};

// ---------------------------------------------------------------------------
// Reason without a source: the label requirement has no context. The source
// note names who asked and when, and (in the sourced variant) why.
// ---------------------------------------------------------------------------

export const REASON_REQUESTER = "export team";
export const REASON_SOURCE_LINE =
  "Labels: requested by the export team in the naming review on 2026-09-14.";
export const REASON_SOURCE_WHY =
  "They asked for the family: prefix because the export importer routes rows by prefix.";

const LABEL_SOURCE = [
  "export function fixtureFamilyLabel(name: string): string {",
  "  return `family:${name.trim()}`;",
  "}",
  "",
].join("\n");

const LABEL_TEST = [
  'import { expect, test } from "bun:test";',
  'import { fixtureFamilyLabel } from "../src/fixture";',
  "",
  'test("a fixture family label prefixes the trimmed name", () => {',
  '  expect(fixtureFamilyLabel(" alpha ")).toBe("family:alpha");',
  "});",
  "",
].join("\n");

export function reasonDocuments(
  withReason: boolean,
): Readonly<Record<string, string>> {
  return {
    ...subjectDocuments(),
    [FIXTURE_SOURCE_PATH]: LABEL_SOURCE,
    [FIXTURE_TEST_PATH]: LABEL_TEST,
    [SOURCE_NOTE_PATH]: [
      "# Fixture notes",
      "",
      withReason
        ? `${REASON_SOURCE_LINE} ${REASON_SOURCE_WHY}`
        : REASON_SOURCE_LINE,
      "",
    ].join("\n"),
    // Statement only: the seed's one violation is entity-context-missing.
    [`.kb/requirements/${QUALITY_IDS.label}.md`]: requirement({
      id: QUALITY_IDS.label,
      title: "A fixture family label is family: followed by the trimmed name",
      statement:
        "A fixture family label must be family: followed by the trimmed name.",
      scenarios: [QUALITY_IDS.labelScenario],
    }),
    [`.kb/scenarios/${QUALITY_IDS.labelScenario}.md`]: scenario(
      QUALITY_IDS.labelScenario,
      "A fixture family label prefixes the trimmed name",
      "Given the fixture family name alpha surrounded by spaces, when its label is formatted, then it is family:alpha.",
      QUALITY_IDS.labelTest,
    ),
    [`.kb/tests/${QUALITY_IDS.labelTest}.md`]: testDoc(
      QUALITY_IDS.labelTest,
      "A fixture family label prefixes the trimmed name",
      "This unit test checks that a fixture family label is the trimmed name prefixed with family and a colon.",
    ),
    ".kb/symbols.yaml": symbols([
      {
        title: "fixtureFamilyLabel",
        implements: QUALITY_IDS.label,
        coveredBy: QUALITY_IDS.labelTest,
      },
    ]),
  };
}

export const REASONLESS_TITLE =
  "A fixture family label is family: followed by the trimmed name";

/** The one violation the reasonless seed carries by design. */
export function isSeededContextViolation(violation: unknown): boolean {
  if (violation === null || typeof violation !== "object") return false;
  const record = violation as Record<string, unknown>;
  return (
    record.rule === "entity-context-missing" &&
    record.entityId === QUALITY_IDS.label
  );
}

// ---------------------------------------------------------------------------
// Broad requirement: five sentences, three behaviors (trim and reject empty;
// limit length; label), three deciding functions and six that forward.
// ---------------------------------------------------------------------------

export const HANDLING_SENTENCES = [
  "A fixture family name must be trimmed.",
  "An empty name must be rejected.",
  "A name must be at most 32 characters.",
  "A longer name must be rejected with an error that states the limit.",
  "A fixture family label must be family: followed by the name.",
] as const;

export const BROAD_FIXTURE_SOURCE = [
  "const MAX_FAMILY_NAME_LENGTH = 32;",
  "",
  "export function validateFamilyName(name: string): string {",
  "  const trimmed = name.trim();",
  '  if (trimmed === "") throw new Error("fixture family name is empty");',
  "  return trimmed;",
  "}",
  "",
  "export function limitFamilyName(name: string): string {",
  "  if (name.length > MAX_FAMILY_NAME_LENGTH) {",
  "    throw new Error(`fixture family name is longer than ${MAX_FAMILY_NAME_LENGTH} characters`);",
  "  }",
  "  return name;",
  "}",
  "",
  "export function formatFamilyLabel(name: string): string {",
  "  return `family:${name}`;",
  "}",
  "",
  "export function fixtureFamily(name: string): string {",
  "  return limitFamilyName(validateFamilyName(name));",
  "}",
  "",
  "export function fixtureFamilyFromEnv(): string {",
  '  return fixtureFamily(process.env.FIXTURE_FAMILY ?? "");',
  "}",
  "",
  "export function fixtureFamilyFromArgs(args: readonly string[]): string {",
  '  return fixtureFamily(args[0] ?? "");',
  "}",
  "",
  "export function fixtureFamilyOrDefault(name: string | undefined): string {",
  '  return fixtureFamily(name ?? "default");',
  "}",
  "",
  "export function fixtureFamilyLabel(name: string): string {",
  "  return formatFamilyLabel(fixtureFamily(name));",
  "}",
  "",
  "export function fixtureFamilyLabelFromEnv(): string {",
  "  return fixtureFamilyLabel(fixtureFamilyFromEnv());",
  "}",
  "",
].join("\n");

export const BROAD_FIXTURE_TEST = [
  'import { expect, test } from "bun:test";',
  "import {",
  "  formatFamilyLabel,",
  "  limitFamilyName,",
  "  validateFamilyName,",
  '} from "../src/fixture";',
  "",
  'test("fixture family handling", () => {',
  '  expect(validateFamilyName(" a ")).toBe("a");',
  '  expect(() => validateFamilyName("  ")).toThrow();',
  '  expect(() => limitFamilyName("x".repeat(33))).toThrow("32");',
  '  expect(formatFamilyLabel("a")).toBe("family:a");',
  "});",
  "",
].join("\n");

export const BROAD_DOCUMENTS: Readonly<Record<string, string>> = {
  ...subjectDocuments(),
  [FIXTURE_SOURCE_PATH]: BROAD_FIXTURE_SOURCE,
  [FIXTURE_TEST_PATH]: BROAD_FIXTURE_TEST,
  [`.kb/requirements/${QUALITY_IDS.handling}.md`]: requirement({
    id: QUALITY_IDS.handling,
    title: "Fixture family names and labels are handled consistently",
    statement: HANDLING_SENTENCES.join(" "),
    context:
      "The 32-character limit exists because the export column is 32 characters wide.",
    scenarios: [
      QUALITY_IDS.handlingTrimScenario,
      QUALITY_IDS.handlingLimitScenario,
      QUALITY_IDS.handlingLabelScenario,
    ],
  }),
  [`.kb/scenarios/${QUALITY_IDS.handlingTrimScenario}.md`]: scenario(
    QUALITY_IDS.handlingTrimScenario,
    "A blank fixture family name is rejected",
    "Given a fixture family name of only spaces, when it is validated, then it is rejected because it is empty after trimming.",
    QUALITY_IDS.handlingTest,
  ),
  [`.kb/scenarios/${QUALITY_IDS.handlingLimitScenario}.md`]: scenario(
    QUALITY_IDS.handlingLimitScenario,
    "A fixture family name longer than 32 characters is rejected",
    "Given a fixture family name of 33 characters, when its length is checked, then it is rejected with an error naming the 32-character limit.",
    QUALITY_IDS.handlingTest,
  ),
  [`.kb/scenarios/${QUALITY_IDS.handlingLabelScenario}.md`]: scenario(
    QUALITY_IDS.handlingLabelScenario,
    "A fixture family label prefixes the name",
    "Given the fixture family name alpha, when its label is formatted, then it is family:alpha.",
    QUALITY_IDS.handlingTest,
  ),
  [`.kb/tests/${QUALITY_IDS.handlingTest}.md`]: testDoc(
    QUALITY_IDS.handlingTest,
    "Fixture family handling",
    "This unit test checks trimming, the empty-name rejection, the 32-character limit and the label format of fixture family names.",
  ),
  ".kb/symbols.yaml": symbols(
    [...Object.values(HANDLING_DECIDERS), ...HANDLING_FORWARDERS].map(
      (title) => ({
        title,
        implements: QUALITY_IDS.handling,
        coveredBy: QUALITY_IDS.handlingTest,
      }),
    ),
  ),
};

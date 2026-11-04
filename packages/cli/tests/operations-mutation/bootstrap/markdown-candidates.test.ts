import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  asImportedRule,
  bootstrapProvenance,
  provenanceBody,
  provenanceRequirementBody,
  withDocumentBody,
} from "../../../src/operations/bootstrap/candidate-helpers.js";
import * as helpers from "../../../src/operations/bootstrap/candidate-helpers.js";
import {
  markdownCandidates,
  markdownComponentHint,
} from "../../../src/operations/bootstrap/markdown-candidates.js";
import * as claims from "../../../src/operations/bootstrap/requirement-claims.js";
import type { BootstrapEvidence } from "../../../src/operations/bootstrap/types.js";
import * as strict from "../../../src/utils/strict-modeling.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

const doc = (
  content: string | undefined,
  overrides: Partial<BootstrapEvidence> = {},
): BootstrapEvidence => ({
  provider: "generic_repo_docs",
  kind: "generic_markdown",
  label: "docs/billing.md",
  relativePath: "docs/billing.md",
  absolutePath: "/ws/docs/billing.md",
  ...(content === undefined ? {} : { content }),
  data: {},
  ...overrides,
});

const NONE = new Set<string>();

/** Replace the strict write set with a small one the plan is built from. */
function fakeStrictPlan(isStrict = true) {
  const writeSet = spyOn(strict, "buildStrictWriteSet").mockImplementation(
    (input) =>
      ({
        isStrict,
        req: { id: `REQ-${input.claim.subjectKey}`.toUpperCase() },
        relationships: [
          { type: "constrains", from: "REQ-A", to: "FACT-S", extra: 1 },
        ],
      }) as unknown as ReturnType<typeof strict.buildStrictWriteSet>,
  );
  const plan = spyOn(helpers, "strictPlan").mockImplementation(() => [
    { type: "fact", id: "FACT-S", properties: { title: "s" } },
    { type: "req", id: "REQ-A", properties: { title: "t" } },
  ]);
  spies.push(writeSet, plan);
  return { writeSet, plan };
}

describe("markdownComponentHint", () => {
  test("names the component a document covers", () => {
    expect(markdownComponentHint("docs/billing.md")).toBe("billing");
    expect(markdownComponentHint("packages/recorder/README.md")).toBe(
      "recorder",
    );
    expect(markdownComponentHint("packages\\recorder\\README.md")).toBe(
      "recorder",
    );
    expect(markdownComponentHint("a//b/Notes.MD")).toBe("b");
    expect(markdownComponentHint("README.md")).toBe(undefined);
    expect(markdownComponentHint("")).toBe(undefined);
    expect(markdownComponentHint("docs/specs/index.md")).toBe(undefined);
    expect(markdownComponentHint("Payments.v2.md")).toBe("payments.v2");
    expect(markdownComponentHint("x/_Payments.md")).toBe("payments");
    expect(markdownComponentHint("x/.-_ledger")).toBe("x");
    expect(markdownComponentHint("x/_-ledger.md")).toBe("ledger");
    expect(markdownComponentHint("x/9lives.md")).toBe("x");
    expect(markdownComponentHint("x/a.9.md")).toBe("a.9");
    expect(markdownComponentHint("deep/x_/readme.md")).toBe("x_");
  });

  test("skips every generic document name", () => {
    for (const name of [
      "readme",
      "index",
      "overview",
      "requirements",
      "requirement",
      "spec",
      "specs",
      "specification",
      "notes",
      "changelog",
      "contributing",
      "agents",
      "claude",
      "todo",
      "docs",
      "doc",
      "documentation",
      "src",
      "packages",
      "github",
    ])
      expect([name, markdownComponentHint(`${name}/${name}.md`)]).toStrictEqual(
        [name, undefined],
      );
    expect(markdownComponentHint(".github/README.md")).toBe(undefined);
  });
});

describe("heading candidates and signals", () => {
  test("an ADR heading becomes a proposed ADR and no signal", () => {
    const result = markdownCandidates(
      doc("intro\n## ADR: Runtime Choice  "),
      NONE,
      0.5,
    );
    expect(result).toStrictEqual({
      candidates: [
        {
          candidateId: "gen:docs/billing.md:adr:adr-runtime-choice",
          entityType: "adr",
          title: "ADR: Runtime Choice",
          sourceKind: "generic_markdown",
          sourcePath: "/ws/docs/billing.md",
          confidence: 0.9,
          confidenceBand: "medium",
          evidence: ["generic_heading:docs/billing.md#L2"],
          relationships: [],
          applyPlan: [
            withDocumentBody(
              {
                type: "adr",
                id: "ADR-GEN-ADR-RUNTIME-CHOICE",
                properties: {
                  title: "ADR: Runtime Choice",
                  status: "proposed",
                  source: "bootstrap:generic:docs/billing.md",
                  text_ref: "docs/billing.md#L2",
                },
                relationships: [],
              },
              provenanceBody(
                "ADR: Runtime Choice",
                bootstrapProvenance(
                  "generic markdown",
                  "docs/billing.md line 2",
                  0.9,
                ),
              ),
            ),
          ],
        },
      ],
      sourceOnlySignals: [],
      diagnostics: [],
      suppressed: [],
    });
  });

  test("a notes heading becomes an observation fact", () => {
    const [candidate] = markdownCandidates(
      doc("#Observations"),
      NONE,
      0.8,
    ).candidates;
    expect(candidate?.candidateId).toBe(
      "gen:docs/billing.md:fact:observations",
    );
    expect(candidate?.confidence).toBe(0.8);
    expect(candidate?.applyPlan[0]).toStrictEqual(
      withDocumentBody(
        {
          type: "fact",
          id: "FACT-GEN-OBSERVATIONS",
          properties: {
            title: "Observations",
            status: "active",
            fact_kind: "observation",
            source: "bootstrap:generic:docs/billing.md",
            text_ref: "docs/billing.md#L1",
          },
          relationships: [],
        },
        provenanceBody(
          "Observations",
          bootstrapProvenance(
            "generic markdown",
            "docs/billing.md line 1",
            0.8,
          ),
        ),
      ),
    );
  });

  test("heading words that type a candidate", () => {
    const types = (heading: string, min = 0.5) =>
      markdownCandidates(doc(`# ${heading}`), NONE, min).candidates.map(
        (c) => c.entityType,
      );
    expect(types("ADR")).toStrictEqual(["adr"]);
    expect(types("Architecture decision log")).toStrictEqual(["adr"]);
    expect(types("architectural decisions")).toStrictEqual(["adr"]);
    expect(types("Architecture and the decision")).toStrictEqual(["adr"]);
    expect(types("ADRs")).toStrictEqual([]);
    expect(types("Fact")).toStrictEqual(["fact"]);
    expect(types("facts")).toStrictEqual(["fact"]);
    expect(types("Note")).toStrictEqual(["fact"]);
    expect(types("notes")).toStrictEqual(["fact"]);
    expect(types("observation")).toStrictEqual(["fact"]);
    expect(types("Factory")).toStrictEqual([]);
    expect(types("Footnotes")).toStrictEqual([]);
    expect(types("Introduction")).toStrictEqual([]);
    expect(types("ADR", 0.9)).toStrictEqual(["adr"]);
    expect(types("ADR", 0.91)).toStrictEqual([]);
    expect(types("Notes", 0.8)).toStrictEqual(["fact"]);
    expect(types("Notes", 0.81)).toStrictEqual([]);
  });

  test("an id falls back to the file name and skips known ids", () => {
    const ids = (heading: string, existing = NONE) =>
      markdownCandidates(
        doc(`# ${heading}`, { relativePath: "docs/Run Book.md" }),
        existing,
        0.5,
      ).candidates.map((c) => c.applyPlan[0]?.id);
    expect(ids("ADR")).toStrictEqual(["ADR-GEN-ADR"]);
    expect(ids("Notes — 日本")).toStrictEqual(["FACT-GEN-NOTES"]);
    expect(
      markdownCandidates(
        doc("# 日本 ADR", { relativePath: "docs/Run Book.md" }),
        NONE,
        0.5,
      ).candidates[0]?.applyPlan[0]?.id,
    ).toBe("ADR-GEN-ADR");
    expect(ids("ADR", new Set(["ADR-GEN-ADR"]))).toStrictEqual([]);
    const long = `ADR ${"x".repeat(70)}`;
    expect(ids(long)).toStrictEqual([
      `ADR-GEN-${`adr-${"x".repeat(70)}`.slice(0, 60).toUpperCase()}`,
    ]);
  });

  test("a heading with no letters or digits uses the file name", () => {
    expect(
      markdownCandidates(
        doc("# ¿ notes ?", { relativePath: "docs/Run Book.md" }),
        NONE,
        0.5,
      ).candidates[0]?.applyPlan[0]?.id,
    ).toBe("FACT-GEN-NOTES");
    // The id needs the heading slug or, failing that, the file name slug.
    const candidate = markdownCandidates(
      doc("# ## notes", { relativePath: "docs/Run Book.md" }),
      NONE,
      0.5,
    ).candidates[0];
    expect(candidate?.applyPlan[0]?.id).toBe("FACT-GEN-NOTES");
  });

  test("heading signals name the lanes a heading points at", () => {
    const result = markdownCandidates(
      doc(
        "# Requirements and scenarios\n# Tests\n# Verification\n# Requirement\n# Scenario\n# Test",
        { absolutePath: undefined },
      ),
      NONE,
      0.5,
    );
    expect(result.sourceOnlySignals).toStrictEqual([
      {
        kind: "req",
        title: "Author requirements from Requirements and scenarios",
        sourcePath: "docs/billing.md",
        confidence: 0.84,
        evidence: ["generic_heading:docs/billing.md#L1"],
      },
      {
        kind: "scenario",
        title: "Author scenarios from Requirements and scenarios",
        sourcePath: "docs/billing.md",
        confidence: 0.83,
        evidence: ["generic_heading:docs/billing.md#L1"],
      },
      {
        kind: "test",
        title: "Author tests from Tests",
        sourcePath: "docs/billing.md",
        confidence: 0.82,
        evidence: ["generic_heading:docs/billing.md#L2"],
      },
      {
        kind: "test",
        title: "Author tests from Verification",
        sourcePath: "docs/billing.md",
        confidence: 0.82,
        evidence: ["generic_heading:docs/billing.md#L3"],
      },
      {
        kind: "req",
        title: "Author requirements from Requirement",
        sourcePath: "docs/billing.md",
        confidence: 0.84,
        evidence: ["generic_heading:docs/billing.md#L4"],
      },
      {
        kind: "scenario",
        title: "Author scenarios from Scenario",
        sourcePath: "docs/billing.md",
        confidence: 0.83,
        evidence: ["generic_heading:docs/billing.md#L5"],
      },
      {
        kind: "test",
        title: "Author tests from Test",
        sourcePath: "docs/billing.md",
        confidence: 0.82,
        evidence: ["generic_heading:docs/billing.md#L6"],
      },
    ]);
  });

  test("heading signals respect the confidence floor and word edges", () => {
    const kinds = (heading: string, min: number) =>
      markdownCandidates(doc(`# ${heading}`), NONE, min).sourceOnlySignals.map(
        (s) => s.kind,
      );
    expect(kinds("Requirements Scenarios Tests", 0.83)).toStrictEqual([
      "req",
      "scenario",
    ]);
    expect(kinds("Requirements Scenarios Tests", 0.84)).toStrictEqual(["req"]);
    expect(kinds("Requirements Scenarios Tests", 0.85)).toStrictEqual([]);
    expect(kinds("Tests", 0.82)).toStrictEqual(["test"]);
    expect(kinds("Prerequirements Subscenarios Contests", 0.5)).toStrictEqual(
      [],
    );
    expect(kinds("Requirementsx Scenariosx Testsx", 0.5)).toStrictEqual([]);
  });

  test("heading lines need a hash at the start", () => {
    const titles = (content: string) =>
      markdownCandidates(doc(content), NONE, 0.5).candidates.map(
        (c) => c.title,
      );
    expect(titles("   ###   Notes  ")).toStrictEqual(["Notes"]);
    expect(titles("x # Notes")).toStrictEqual([]);
    expect(titles("#")).toStrictEqual([]);
  });
});

describe("fenced blocks", () => {
  test("headings and statements inside fences are ignored", () => {
    const result = markdownCandidates(
      doc(
        [
          "```",
          "# Notes",
          "The cart must be enabled.",
          "```",
          "  ~~~ts",
          "# ADR",
          "~~~",
          "# Facts",
        ].join("\n"),
      ),
      NONE,
      0.5,
    );
    expect(result.candidates.map((c) => c.title)).toStrictEqual(["Facts"]);
    expect(result.diagnostics).toStrictEqual([]);
  });

  test("a fence marker later in a line is not a fence", () => {
    expect(
      markdownCandidates(doc("x ```\n# Notes"), NONE, 0.5).candidates.map(
        (c) => c.title,
      ),
    ).toStrictEqual(["Notes"]);
  });
});

describe("requirement statements", () => {
  test("a statement becomes a strict requirement candidate", () => {
    const { writeSet, plan } = fakeStrictPlan();
    const result = markdownCandidates(
      doc("# Billing rules\r\n- The invoice must be enabled."),
      NONE,
      0.5,
    );
    expect(writeSet.mock.calls[0]?.[0]).toStrictEqual({
      claim: {
        source: "docs/billing.md",
        subjectKey: "billing.invoice",
        propertyKey: "enabled",
        operator: "bool",
        value: true,
        confidence: 0.84 + 0.08,
        provenance: "docs/billing.md#L2",
      },
      statement: "The invoice must be enabled.",
    });
    expect(plan.mock.calls[0]?.[0]).toBe(
      writeSet.mock.results[0]?.value as never,
    );
    const location = "docs/billing.md#L2";
    expect(result.candidates).toStrictEqual([
      {
        candidateId: "norm:req-billing.invoice",
        entityType: "req",
        title: "The invoice must be enabled.",
        sourceKind: "generic_markdown",
        sourcePath: "/ws/docs/billing.md",
        confidence: 0.84 + 0.08,
        confidenceBand: "high",
        evidence: [
          `normative_statement:${location}`,
          "generic_heading:docs/billing.md#L1",
        ],
        relationships: [{ type: "constrains", from: "REQ-A", to: "FACT-S" }],
        applyPlan: [
          { type: "fact", id: "FACT-S", properties: { title: "s" } },
          withDocumentBody(
            asImportedRule(
              { type: "req", id: "REQ-A", properties: { title: "t" } },
              location,
            ),
            provenanceRequirementBody(
              "The invoice must be enabled.",
              bootstrapProvenance(
                "generic markdown",
                'docs/billing.md line 2 under the heading "Billing rules"',
                0.92,
              ),
              location,
            ),
          ),
        ],
      },
    ]);
    expect(result.diagnostics).toStrictEqual([]);
    expect(result.sourceOnlySignals).toStrictEqual([]);
  });

  test("without a heading the evidence and provenance name only the line", () => {
    fakeStrictPlan();
    const [candidate] = markdownCandidates(
      doc("The invoice shall be enabled.", {
        absolutePath: undefined,
        relativePath: undefined,
        label: "spec.md",
      }),
      NONE,
      0.5,
    ).candidates;
    expect(candidate?.sourcePath).toBe("spec.md");
    expect(candidate?.confidence).toBe(0.86);
    expect(candidate?.evidence).toStrictEqual([
      "normative_statement:spec.md#L1",
    ]);
    expect(candidate?.applyPlan[1]).toStrictEqual(
      withDocumentBody(
        asImportedRule(
          { type: "req", id: "REQ-A", properties: { title: "t" } },
          "spec.md#L1",
        ),
        provenanceRequirementBody(
          "The invoice shall be enabled.",
          bootstrapProvenance("generic markdown", "spec.md line 1", 0.86),
          "spec.md#L1",
        ),
      ),
    );
  });

  test("confidence comes from the modal verb and the heading", () => {
    fakeStrictPlan();
    const confidence = (content: string, min = 0.5) =>
      markdownCandidates(doc(content), NONE, min).candidates.map((c) => [
        c.confidence,
        c.confidenceBand,
      ]);
    expect(confidence("The cart shall be enabled.")).toStrictEqual([
      [0.86, "medium"],
    ]);
    expect(confidence("The cart SHALL be enabled.")).toStrictEqual([
      [0.86, "medium"],
    ]);
    expect(confidence("The cart must be enabled.")).toStrictEqual([
      [0.84, "medium"],
    ]);
    expect(confidence("The cart MUST be enabled.")).toStrictEqual([
      [0.84, "medium"],
    ]);
    expect(confidence("The cart should be enabled.")).toStrictEqual([
      [0.78, "low"],
    ]);
    expect(confidence("The cartshall must be enabled.")).toStrictEqual([
      [0.84, "medium"],
    ]);
    expect(confidence("The mustard cart should be enabled.")).toStrictEqual([
      [0.78, "low"],
    ]);
    for (const heading of [
      "Requirement",
      "Constraints",
      "constraint",
      "Policy",
      "Policies",
      "Rule",
      "Rules",
      "Grammar rulesets",
    ])
      expect([
        heading,
        confidence(`# ${heading}\nThe cart should be enabled.`),
      ]).toStrictEqual([heading, [[0.86, "medium"]]]);
    expect(confidence("# Other\nThe cart shall be enabled.")).toStrictEqual([
      [0.86, "medium"],
    ]);
    expect(
      confidence("# Policy\nThe cart shall be enabled.")[0]?.[0],
    ).toBeCloseTo(0.94, 10);
    expect(confidence("The cart should be enabled.", 0.78)).toHaveLength(1);
    expect(confidence("The cart should be enabled.", 0.79)).toStrictEqual([]);
  });

  test("confidence is capped at 0.95", () => {
    fakeStrictPlan();
    const spy = spyOn(Math, "min");
    spies.push(spy);
    markdownCandidates(doc("# Policy\nThe cart shall be enabled."), NONE, 0.5);
    expect(spy.mock.calls[0]?.[0]).toBe(0.95);
    expect(spy.mock.calls[0]?.[1]).toBeCloseTo(0.94, 10);
  });

  test("only modal statements are read, after list markers are removed", () => {
    const writeSet = fakeStrictPlan().writeSet;
    const result = markdownCandidates(
      doc(
        [
          "The cart is enabled.",
          "- [ ] The cart must be enabled.",
          "",
          "   ",
          "The cart mustn be enabled.",
          "The cart should be enabled.",
        ].join("\n"),
      ),
      NONE,
      0.5,
    );
    expect(writeSet.mock.calls.map((call) => call[0].statement)).toStrictEqual([
      "The cart must be enabled.",
      "The cart should be enabled.",
    ]);
    expect(result.candidates.map((c) => c.evidence[0])).toStrictEqual([
      "normative_statement:docs/billing.md#L2",
      "normative_statement:docs/billing.md#L6",
    ]);
  });

  test("a statement whose requirement is already known is dropped quietly", () => {
    fakeStrictPlan();
    const result = markdownCandidates(
      doc("The cart must be enabled."),
      new Set(["REQ-A"]),
      0.5,
    );
    expect(result).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      diagnostics: [],
      suppressed: [],
    });
    const fact = markdownCandidates(
      doc("The cart must be enabled."),
      new Set(["FACT-S"]),
      0.5,
    );
    expect(fact.candidates).toHaveLength(1);
  });

  test("a statement no claim reads needs authoring", () => {
    const result = markdownCandidates(
      doc("# Rules\nShould the cart be enabled?"),
      NONE,
      0.5,
    );
    expect(result.candidates).toStrictEqual([]);
    expect(result.diagnostics).toStrictEqual([
      "Requirement needs authoring at docs/billing.md#L2: Should the cart be enabled?",
    ]);
    expect(result.sourceOnlySignals).toStrictEqual([
      {
        kind: "req",
        title: "Author requirement: Should the cart be enabled?",
        sourcePath: "docs/billing.md#L2",
        confidence: 0.8,
        evidence: ["normative_statement:docs/billing.md#L2"],
      },
    ]);
  });

  test("a claim that is not strict needs authoring", () => {
    fakeStrictPlan(false);
    const result = markdownCandidates(
      doc("The cart must be enabled."),
      NONE,
      0.5,
    );
    expect(result.candidates).toStrictEqual([]);
    expect(result.diagnostics).toStrictEqual([
      "Requirement needs authoring at docs/billing.md#L1: The cart must be enabled.",
    ]);
  });

  test("plans the subject key with the document's component", () => {
    fakeStrictPlan();
    const plan = spyOn(claims, "planSubjectKey");
    spies.push(plan);
    const registry = {
      assign: () => ({ subjectKey: "billing.cart" }),
    } as unknown as claims.SubjectKeyRegistry;
    markdownCandidates(doc("The cart must be enabled."), NONE, 0.5, registry);
    expect(plan.mock.calls).toStrictEqual([
      ["The cart", "enabled", "billing", registry, "docs/billing.md#L1"],
    ]);
  });

  test("subject key diagnostics are kept only for written candidates", () => {
    fakeStrictPlan();
    const plan = spyOn(claims, "planSubjectKey").mockImplementation(() => ({
      resolution: { ok: true, subjectKey: "billing.cart" },
      diagnostics: ["subject-key-shortened: x"],
    }));
    spies.push(plan);
    expect(
      markdownCandidates(doc("The cart must be enabled."), NONE, 0.5)
        .diagnostics,
    ).toStrictEqual(["subject-key-shortened: x"]);
    plan.mockRestore();
    fakeStrictPlan(false);
    const notStrict = spyOn(claims, "planSubjectKey").mockImplementation(
      () => ({
        resolution: { ok: true, subjectKey: "billing.cart" },
        diagnostics: ["subject-key-shortened: x"],
      }),
    );
    spies.push(notStrict);
    expect(
      markdownCandidates(doc("The cart must be enabled."), NONE, 0.5)
        .diagnostics,
    ).toStrictEqual([
      "Requirement needs authoring at docs/billing.md#L1: The cart must be enabled.",
    ]);
  });

  test("a subject key outside the convention is reported for review", () => {
    const plan = spyOn(claims, "planSubjectKey").mockImplementation(() => ({
      resolution: { ok: false, reason: "too deep" },
      diagnostics: [],
    }));
    spies.push(plan);
    const result = markdownCandidates(
      doc("x\nThe cart must be enabled."),
      NONE,
      0.5,
    );
    expect(result.candidates).toStrictEqual([]);
    expect(result.diagnostics).toStrictEqual([
      "Requirement extraction failed at docs/billing.md#L2: too deep; author it with kb_model and a component.aspect subjectKey",
    ]);
    expect(result.sourceOnlySignals).toStrictEqual([
      {
        kind: "req",
        title: "Review requirement: The cart must be enabled.",
        sourcePath: "docs/billing.md#L2",
        confidence: 0.8,
        evidence: ["normative_statement:docs/billing.md#L2"],
      },
    ]);
  });

  test("a document without a relative path is named by its label", () => {
    const result = markdownCandidates(
      doc("# Notes\nShould it?\nThe cart must be enabled.", {
        relativePath: undefined,
        label: "spec.md",
      }),
      NONE,
      0.5,
    );
    expect(result.candidates.map((c) => c.candidateId)).toStrictEqual([
      "gen:spec.md:fact:notes",
      expect.stringMatching(/^norm:/) as unknown as string,
    ]);
    expect(result.diagnostics).toStrictEqual([
      "Requirement needs authoring at spec.md#L2: Should it?",
    ]);
  });

  test("a thrown value that is not an error is reported as text", () => {
    const plan = spyOn(claims, "planSubjectKey").mockImplementation(() => {
      throw "boom";
    });
    spies.push(plan);
    expect(
      markdownCandidates(doc("The cart must be enabled."), NONE, 0.5)
        .diagnostics,
    ).toStrictEqual([
      "Requirement extraction failed at docs/billing.md#L1: boom",
    ]);
  });

  test("a document without content yields nothing", () => {
    expect(markdownCandidates(doc(undefined), NONE, 0)).toStrictEqual({
      candidates: [],
      sourceOnlySignals: [],
      diagnostics: [],
      suppressed: [],
    });
  });
});

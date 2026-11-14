import { describe, expect, test } from "bun:test";
import { renderRequirementBody } from "../../../src/entity-body-context.js";
import {
  asImportedRule,
  bootstrapProvenance,
  confidenceBand,
  provenanceBody,
  provenanceRequirementBody,
  provenanceStubBody,
  slug,
  strictPlan,
  upsert,
  withDocumentBody,
} from "../../../src/operations/bootstrap/candidate-helpers.js";
import { annotateModelRequirementStep } from "../../../src/operations/modeling/model-requirement.js";
import { semanticClaimKey } from "../../../src/operations/semantic-advisor/clauses.js";
import type { StrictWriteSet } from "../../../src/utils/strict-modeling.js";

describe("confidenceBand", () => {
  test.each([
    [1, "high"],
    [0.9, "high"],
    [0.89, "medium"],
    [0.8, "medium"],
    [0.79, "low"],
    [0, "low"],
  ])("%p -> %p", (value, band) => {
    expect(confidenceBand(value)).toBe(band);
  });
});

describe("slug", () => {
  test("lowercases, joins runs of other characters with one dash and trims dashes", () => {
    expect(slug("  Hello,  World!! 42 ")).toBe("hello-world-42");
    expect(slug("--a--")).toBe("a");
    expect(slug("-a b-")).toBe("a-b");
    expect(slug("a".repeat(100))).toBe("a".repeat(80));
    expect(slug("abcdef", 3)).toBe("abc");
    expect(slug("Ab-Cd")).toBe("ab-cd");
  });
});

describe("upsert", () => {
  test("splits type and id from the properties", () => {
    const relationships = [{ type: "relates_to", from: "A", to: "B" }];
    expect(
      upsert({ type: "req", id: "REQ-a", title: "T" }, relationships),
    ).toStrictEqual({
      type: "req",
      id: "REQ-a",
      properties: { title: "T" },
      relationships,
    });
    expect(
      upsert({ title: "T" } as { type?: unknown; id?: unknown }),
    ).toStrictEqual({
      type: "",
      id: "",
      properties: { title: "T" },
      relationships: [],
    });
    expect(upsert({ type: 1, id: 2 })).toStrictEqual({
      type: "1",
      id: "2",
      properties: {},
      relationships: [],
    });
  });
});

describe("strictPlan", () => {
  test("an observation write set plans the observation fact alone", () => {
    const writeSet = {
      isStrict: false,
      confidence: 0.5,
      relationships: [{ type: "x", from: "a", to: "b" }],
      observationFact: {
        type: "fact",
        id: "FACT-obs",
        properties: { title: "Obs" },
      },
    } as unknown as StrictWriteSet;
    expect(strictPlan(writeSet)).toStrictEqual([
      {
        type: "fact",
        id: "FACT-obs",
        properties: { title: "Obs" },
        relationships: [],
      },
    ]);
  });

  test("a strict write set carries the subject fact's document body", () => {
    const writeSet = {
      isStrict: true,
      confidence: 0.9,
      subjectFact: {
        type: "fact",
        id: "FACT-s",
        properties: { title: "S" },
        body: "Subject body",
      },
      propertyFact: { type: "fact", id: "FACT-p", properties: { title: "P" } },
      req: { type: "req", id: "REQ-r", properties: { title: "R" } },
      relationships: [],
    } as unknown as StrictWriteSet;
    const [subject] = strictPlan(writeSet);
    expect(subject?.id).toBe("FACT-s");
    expect((subject as { document?: unknown }).document).toStrictEqual({
      body: "Subject body",
    });
  });

  test("a strict write set plans subject, property and requirement with the claim", () => {
    const writeSet = {
      isStrict: true,
      confidence: 0.9,
      subjectFact: { type: "fact", id: "FACT-s", properties: { title: "S" } },
      propertyFact: { type: "fact", id: "FACT-p", properties: { title: "P" } },
      req: {
        type: "req",
        id: "REQ-r",
        properties: { title: "Sessions expire after 30 minutes" },
      },
      relationships: [
        { type: "constrains", from: "REQ-r", to: "FACT-s", extra: 1 },
        { type: "requires_property", from: "REQ-r", to: "FACT-p" },
      ],
    } as unknown as StrictWriteSet;
    const claimKey = semanticClaimKey("Sessions expire after 30 minutes");
    const context = {
      claimKey,
      statement: "Sessions expire after 30 minutes",
      logicClaims: [claimKey],
    };
    expect(strictPlan(writeSet)).toStrictEqual([
      annotateModelRequirementStep(
        {
          type: "fact",
          id: "FACT-s",
          properties: { title: "S" },
          relationships: [],
        },
        context,
      ),
      annotateModelRequirementStep(
        {
          type: "fact",
          id: "FACT-p",
          properties: { title: "P" },
          relationships: [],
        },
        context,
      ),
      annotateModelRequirementStep(
        {
          type: "req",
          id: "REQ-r",
          properties: { title: "Sessions expire after 30 minutes" },
          relationships: [
            { type: "constrains", from: "REQ-r", to: "FACT-s" },
            { type: "requires_property", from: "REQ-r", to: "FACT-p" },
          ],
        },
        context,
      ),
    ]);
  });
});

describe("step decorators", () => {
  test("withDocumentBody attaches the body", () => {
    expect(withDocumentBody({ type: "req" }, "Body")).toStrictEqual({
      type: "req",
      document: { body: "Body" },
    });
  });

  test("asImportedRule records the import origin, firmness and evidence floor", () => {
    expect(
      asImportedRule(
        { type: "req", properties: { title: "T" } },
        "docs/a.md#L1",
      ),
    ).toStrictEqual({
      type: "req",
      properties: {
        title: "T",
        origin: { kind: "import", ref: "docs/a.md#L1" },
        firmness: "firm",
        required_evidence: "asserted",
      },
    });
    for (const properties of [undefined, null, "x"]) {
      expect(asImportedRule({ type: "req", properties }, "r")).toStrictEqual({
        type: "req",
        properties: {
          origin: { kind: "import", ref: "r" },
          firmness: "firm",
          required_evidence: "asserted",
        },
      });
    }
  });
});

describe("provenance text", () => {
  test("bootstrapProvenance records provider, location and confidence", () => {
    expect(bootstrapProvenance("repo_metadata", "package.json", 0.861)).toBe(
      "Recorded deterministically by the repo_metadata bootstrap provider from package.json (confidence 0.86). The source states no reason for this entry, so it preserves where the knowledge came from for later schema versions and reviewers.",
    );
  });

  test("bodies carry the trimmed title and the provenance", () => {
    expect(provenanceBody("  Title ", "Prov.")).toBe("Title\n\nProv.\n");
    expect(provenanceStubBody(" Title ", "Prov.")).toBe(
      "Title\n\nProv. This entry is a provenance stub: the provider found the source but no claim about it, so it is tagged bootstrap:provenance-stub, ranked after every other search match and not counted as knowledge by gap or coverage reports.\n",
    );
    expect(
      provenanceRequirementBody("Users must export.", "Prov.", "docs/a.md#L2"),
    ).toBe(
      renderRequirementBody({
        statement: "Users must export.",
        context: "Prov.",
        source: { excerpt: "Users must export.", reference: "docs/a.md#L2" },
      }),
    );
  });
});

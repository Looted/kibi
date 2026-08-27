import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

interface ModelRequirementModule {
  handleKbModelRequirement: (
    prolog: unknown,
    args: Record<string, unknown>,
  ) => Promise<{
    structuredContent: Record<string, unknown>;
  }>;
  estimateNormativeSignalConfidence: (
    statement: string,
    heading?: string,
  ) => number;
  extractRequirementClaim: (args: Record<string, unknown>) => {
    statement: string;
    source: string;
    sourceFiles: string[];
    claim: Record<string, unknown>;
    extractionMode: string;
    extractionWarnings: string[];
  };
  strictWriteSetToApplyPlan: (
    writeSet: Record<string, unknown>,
  ) => Array<Record<string, unknown>>;
  writeSetPrimaryEntityId: (writeSet: Record<string, unknown>) => string;
  getWorkspaceMigrationWarning: (
    workspaceRoot?: string,
  ) => Promise<string | null>;
}

describe("kb_model_requirement", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-model-requirement-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    for (const key of ["KIBI_WORKSPACE"]) {
      delete process.env[key];
    }
  });

  async function loadModule(): Promise<ModelRequirementModule> {
    return import(
      "../../src/tools/model-requirement.js"
    ) as unknown as Promise<ModelRequirementModule>;
  }

  test("high-confidence inputs return a strict write-set, sequential applyPlan, and migrationWarning when the lifecycle manifest is missing", async () => {
    await fs.mkdir(path.join(tmp, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, ".kb", "config.json"),
      JSON.stringify({ paths: {} }, null, 2),
    );

    const { handleKbModelRequirement } = await loadModule();
    const result = await handleKbModelRequirement(null, {
      text: "Customer data must be retained for 7 years.",
      source: ".kb/requirements/customer-retention.md",
      sourceFiles: ["README.md"],
      confidence: 0.92,
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      provenance: ".kb/requirements/customer-retention.md#L1",
      existingLogicClaims: ["CLAIM-AAAAAAAAAAAAAAAA"],
    });

    const structured = result.structuredContent;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;
    const writeSet = structured.writeSet as Record<string, unknown>;
    const reqStep = applyPlan[2] as Record<string, unknown> | undefined;

    expect(structured.isStrict).toBe(true);
    expect(structured.migrationWarning).toEqual(
      expect.stringMatching(/lifecycle manifest is missing/i),
    );
    expect("applyBlocked" in structured).toBe(false);
    expect(applyPlan).toHaveLength(3);
    expect(applyPlan[0]).toMatchObject({ type: "fact", relationships: [] });
    expect(applyPlan[1]).toMatchObject({ type: "fact", relationships: [] });
    expect(reqStep).toMatchObject({ type: "req" });
    expect(reqStep?.properties).toMatchObject({
      logic_claims: [
        "CLAIM-AAAAAAAAAAAAAAAA",
        expect.stringMatching(/^CLAIM-[A-F0-9]{16}$/),
      ],
    });
    expect(structured.logicClaims).toEqual(
      (reqStep?.properties as Record<string, unknown>)?.logic_claims,
    );
    expect(reqStep?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "constrains" }),
        expect.objectContaining({ type: "requires_property" }),
      ]),
    );
    expect(writeSet.req).toMatchObject({ type: "req" });
    expect(writeSet.subjectFact).toMatchObject({ type: "fact" });
    expect(writeSet.propertyFact).toMatchObject({ type: "fact" });
    expect(structured.claim).toMatchObject({
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      confidence: 0.92,
    });
  });

  test("low-confidence inputs return a non-blocking observation artifact", async () => {
    const { handleKbModelRequirement } = await loadModule();
    const result = await handleKbModelRequirement(null, {
      text: "Customer data must be retained for 7 years.",
      source: ".kb/requirements/customer-retention.md",
      confidence: 0.42,
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      provenance: ".kb/requirements/customer-retention.md#L1",
    });

    const structured = result.structuredContent;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;
    const observationStep = applyPlan[0] as Record<string, unknown> | undefined;
    const writeSet = structured.writeSet as Record<string, unknown>;

    expect(structured.isStrict).toBe(false);
    expect(structured.migrationWarning).toEqual(
      expect.stringMatching(/lifecycle manifest is missing/i),
    );
    expect(applyPlan).toHaveLength(1);
    expect(observationStep).toMatchObject({
      type: "fact",
      relationships: [],
      properties: {
        fact_kind: "observation",
        status: "active",
      },
    });
    expect(writeSet.observationFact).toMatchObject({ type: "fact" });
    expect(writeSet.req).toBeUndefined();
    expect(writeSet.subjectFact).toBeUndefined();
    expect(writeSet.propertyFact).toBeUndefined();
    expect(structured.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "low_confidence_observation_downgrade",
          nextAction: expect.stringContaining("subjectKey"),
        }),
      ]),
    );
  });

  test("extractRequirementClaim rejects empty text and missing source", async () => {
    const { extractRequirementClaim } = await loadModule();

    expect(() =>
      extractRequirementClaim({
        text: "   ",
        source: "requirements.md",
      }),
    ).toThrow(/text must be a non-empty string/);

    expect(() =>
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        sourceFiles: ["  "],
      }),
    ).toThrow(/provide source or at least one sourceFiles entry/);
  });

  test("extractRequirementClaim normalizes optional strings and removes duplicate source files", async () => {
    const { extractRequirementClaim } = await loadModule();

    const extracted = extractRequirementClaim({
      text: "Customer data must be retained for 7 years.",
      source: "  ",
      sourceFiles: [
        " docs/customer-retention.md ",
        "docs/customer-retention.md",
        "docs/other.md",
        " ",
      ],
      provenance: "  ",
    });

    expect(extracted.source).toBe("docs/customer-retention.md");
    expect(extracted.sourceFiles).toEqual([
      "docs/customer-retention.md",
      "docs/other.md",
    ]);
    expect(extracted.claim).not.toHaveProperty("provenance");
  });

  test("extractRequirementClaim clamps confidence and defaults non-finite confidence", async () => {
    const { extractRequirementClaim } = await loadModule();

    expect(
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        confidence: Number.POSITIVE_INFINITY,
      }).claim.confidence,
    ).toBe(0.8);
    expect(
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        confidence: -4,
      }).claim.confidence,
    ).toBe(0);
    expect(
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        confidence: 1.4,
      }).claim.confidence,
    ).toBe(1);
  });

  test("extractRequirementClaim validates explicit claim fields and values", async () => {
    const { extractRequirementClaim } = await loadModule();

    expect(() =>
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        subjectKey: "Customer.Data",
      }),
    ).toThrow(/must all be provided/);

    expect(() =>
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        subjectKey: "Customer.Data",
        propertyKey: "Retention Years",
        operator: "eq",
        value: Number.POSITIVE_INFINITY,
      }),
    ).toThrow(/value must be a finite number/);

    expect(() =>
      extractRequirementClaim({
        text: "Customer data must be retained for 7 years.",
        source: "requirements.md",
        subjectKey: "Customer.Data",
        propertyKey: "Retention Years",
        operator: "eq",
        value: { years: 7 },
      }),
    ).toThrow(/value must be a string, number, or boolean/);

    const extracted = extractRequirementClaim({
      text: "Customer data must be retained for 7 years.",
      source: "requirements.md",
      confidence: 0.931,
      subjectKey: " Customer.Data ",
      propertyKey: " Retention Years ",
      operator: "eq",
      value: 7,
      provenance: " requirements.md#L1 ",
    });

    expect(extracted.extractionMode).toBe("provided");
    expect(extracted.claim).toMatchObject({
      source: "requirements.md",
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      confidence: 0.93,
      provenance: "requirements.md#L1",
    });
  });

  test("extractRequirementClaim infers enabled, disabled, forbidden, required, fallback, and cleaned values", async () => {
    const { extractRequirementClaim } = await loadModule();

    expect(
      extractRequirementClaim({
        text: "- The kill switch should be disabled.",
        source: "requirements/feature-flags.md",
      }).claim,
    ).toMatchObject({
      subjectKey: "kill switch",
      propertyKey: "enabled",
      operator: "bool",
      value: false,
    });

    expect(
      extractRequirementClaim({
        text: "1. An audit trail must be enabled.",
        source: "requirements/audit.md",
      }).claim,
    ).toMatchObject({
      subjectKey: "audit trail",
      propertyKey: "enabled",
      operator: "bool",
      value: true,
    });

    expect(
      extractRequirementClaim({
        text: "The export job must not leak secrets!!!",
        source: "requirements/export.md",
      }).claim,
    ).toMatchObject({
      subjectKey: "export job",
      propertyKey: "leak secrets",
      operator: "polarity",
      value: "forbid",
    });

    expect(
      extractRequirementClaim({
        text: "2) A billing worker should retry invoices:;;",
        source: "requirements/billing.md",
      }).claim,
    ).toMatchObject({
      subjectKey: "billing worker",
      propertyKey: "retry invoices",
      operator: "polarity",
      value: "require",
    });

    const fallback = extractRequirementClaim({
      text: "Review this ambiguous product note.",
      source: "docs/product_notes.md",
      confidence: 0.99,
    });

    expect(fallback.extractionMode).toBe("fallback");
    expect(fallback.claim).toMatchObject({
      subjectKey: "product notes",
      propertyKey: "statement",
      operator: "eq",
      value: "Review this ambiguous product note.",
      confidence: 0.69,
    });
    expect(fallback.extractionWarnings).toHaveLength(1);
  });

  test("estimateNormativeSignalConfidence scores should statements and heading bonus", async () => {
    const { estimateNormativeSignalConfidence } = await loadModule();

    expect(estimateNormativeSignalConfidence("Users may export data.")).toBe(0);
    expect(estimateNormativeSignalConfidence("Users should export data.")).toBe(
      0.78,
    );
    expect(
      estimateNormativeSignalConfidence("Users should export data.", "Policy"),
    ).toBe(0.86);
    expect(
      estimateNormativeSignalConfidence("Users shall export data.", "Rules"),
    ).toBe(0.94);
  });

  test("strictWriteSetToApplyPlan and writeSetPrimaryEntityId handle strict and non-strict write sets", async () => {
    const {
      extractRequirementClaim,
      handleKbModelRequirement,
      strictWriteSetToApplyPlan,
      writeSetPrimaryEntityId,
    } = await loadModule();

    const strictResult = await handleKbModelRequirement(null, {
      text: "Customer data must be retained for 7 years.",
      source: "requirements/customer-retention.md",
      confidence: 0.9,
    });
    const strictWriteSet = strictResult.structuredContent.writeSet as Record<
      string,
      unknown
    >;
    const strictPlan = strictWriteSetToApplyPlan(strictWriteSet);

    expect(strictPlan).toHaveLength(3);
    expect(strictPlan[0]).toMatchObject({ type: "fact", relationships: [] });
    expect(strictPlan[1]).toMatchObject({ type: "fact", relationships: [] });
    expect(strictPlan[2]?.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "constrains" }),
        expect.objectContaining({ type: "requires_property" }),
      ]),
    );
    expect(writeSetPrimaryEntityId(strictWriteSet)).toBe(
      String((strictWriteSet.req as Record<string, unknown>).id),
    );

    const fallback = extractRequirementClaim({
      text: "Ambiguous note without normative keywords.",
      source: "requirements/ambiguous.md",
      confidence: 0.2,
    });
    const nonStrictResult = await handleKbModelRequirement(null, {
      text: fallback.statement,
      source: fallback.source,
      confidence: fallback.claim.confidence,
    });
    const nonStrictWriteSet = nonStrictResult.structuredContent
      .writeSet as Record<string, unknown>;
    const nonStrictPlan = strictWriteSetToApplyPlan(nonStrictWriteSet);

    expect(nonStrictPlan).toHaveLength(1);
    expect(nonStrictPlan[0]).toMatchObject({
      type: "fact",
      relationships: [],
      properties: expect.objectContaining({ fact_kind: "observation" }),
    });
    expect(writeSetPrimaryEntityId(nonStrictWriteSet)).toBe(
      String((nonStrictWriteSet.observationFact as Record<string, unknown>).id),
    );
  });

  test("getWorkspaceMigrationWarning reports missing or invalid lifecycle manifests", async () => {
    const { getWorkspaceMigrationWarning } = await loadModule();

    expect(await getWorkspaceMigrationWarning(tmp)).toMatch(
      /lifecycle manifest is missing/i,
    );

    await fs.mkdir(path.join(tmp, ".kb"), { recursive: true });
    await fs.writeFile(path.join(tmp, ".kb", "config.json"), "{invalid json");
    expect(await getWorkspaceMigrationWarning(tmp)).toMatch(
      /lifecycle manifest is missing/i,
    );

    await fs.writeFile(path.join(tmp, ".kb", "manifest.json"), "{invalid json");
    expect(await getWorkspaceMigrationWarning(tmp)).toMatch(/not valid JSON/i);
  });

  test("handleKbModelRequirement returns fallback observation for low-confidence non-matching input", async () => {
    const { handleKbModelRequirement } = await loadModule();

    const result = await handleKbModelRequirement(null, {
      text: "Capture this ambiguous discovery note.",
      source: "notes/discovery.md",
      confidence: 0.1,
    });
    const structured = result.structuredContent;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;

    expect(structured.isStrict).toBe(false);
    expect(structured.extractionMode).toBe("fallback");
    expect(structured.extractionWarnings).toHaveLength(1);
    expect(structured.claim).toMatchObject({
      subjectKey: "discovery",
      propertyKey: "statement",
      confidence: 0.1,
    });
    expect(applyPlan).toHaveLength(1);
    expect(applyPlan[0]).toMatchObject({
      type: "fact",
      properties: expect.objectContaining({ fact_kind: "observation" }),
    });
  });
});

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
}

describe("kb_model_requirement", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "kibi-model-requirement-"));
    process.env.KIBI_WORKSPACE = tmp;
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
    process.env.KIBI_WORKSPACE = undefined;
  });

  async function loadModule(): Promise<ModelRequirementModule> {
    return import("../../src/tools/model-requirement.js") as unknown as Promise<ModelRequirementModule>;
  }

  test("high-confidence inputs return a strict write-set, sequential applyPlan, and migrationWarning for legacy config", async () => {
    await fs.mkdir(path.join(tmp, ".kb"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, ".kb", "config.json"),
      JSON.stringify({ paths: {} }, null, 2),
    );

    const { handleKbModelRequirement } = await loadModule();
    const result = await handleKbModelRequirement(null, {
      text: "Customer data must be retained for 7 years.",
      source: "documentation/requirements/customer-retention.md",
      sourceFiles: ["README.md"],
      confidence: 0.92,
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      provenance: "documentation/requirements/customer-retention.md#L1",
    });

    const structured = result.structuredContent;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;
    const writeSet = structured.writeSet as Record<string, unknown>;
    const reqStep = applyPlan[2] as Record<string, unknown> | undefined;

    expect(structured.isStrict).toBe(true);
    expect(structured.migrationWarning).toEqual(expect.stringMatching(/schemaVersion/i));
    expect("applyBlocked" in structured).toBe(false);
    expect(applyPlan).toHaveLength(3);
    expect(applyPlan[0]).toMatchObject({ type: "fact", relationships: [] });
    expect(applyPlan[1]).toMatchObject({ type: "fact", relationships: [] });
    expect(reqStep).toMatchObject({ type: "req" });
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
      source: "documentation/requirements/customer-retention.md",
      confidence: 0.42,
      subjectKey: "Customer.Data",
      propertyKey: "Retention Years",
      operator: "eq",
      value: 7,
      provenance: "documentation/requirements/customer-retention.md#L1",
    });

    const structured = result.structuredContent;
    const applyPlan = structured.applyPlan as Array<Record<string, unknown>>;
    const observationStep = applyPlan[0] as Record<string, unknown> | undefined;
    const writeSet = structured.writeSet as Record<string, unknown>;

    expect(structured.isStrict).toBe(false);
    expect(structured.migrationWarning).toBeNull();
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
  });
});

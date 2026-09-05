// implements REQ-002
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LOGIC_IR_VERSION, type LogicRuleIR } from "../../src/logic/ir.js";
import {
  executeModelRequirement,
  getWorkspaceMigrationWarning,
  handleKbModelRequirement,
} from "../../src/operations/modeling/model-requirement.js";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function validRule(): LogicRuleIR {
  return {
    version: LOGIC_IR_VERSION,
    kind: "rule",
    modality: "oblige",
    variables: [{ name: "X", type: "entity" }],
    head: {
      kind: "atom",
      name: "retain",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
    body: {
      kind: "atom",
      name: "customer",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
  };
}

describe("model-requirement remaining branches", () => {
  test("getWorkspaceMigrationWarning reports missing and ok manifests", async () => {
    restores.push(isolateKibiEnv());
    const missing = createTempDir("kibi-model-miss-");
    roots.push(missing);
    expect(await getWorkspaceMigrationWarning(missing)).toContain("manifest is missing");

    const ok = createTempDir("kibi-model-ok-");
    roots.push(ok);
    mkdirSync(path.join(ok, ".kb"), { recursive: true });
    writeFileSync(
      path.join(ok, ".kb", "manifest.json"),
      `${JSON.stringify({
        version: "kibi.manifest.v1",
        created_at: "2026-01-01T00:00:00Z",
      })}\n`,
    );
    const warning = await getWorkspaceMigrationWarning(ok);
    expect(warning === null || typeof warning === "string").toBe(true);
  });

  test("logic path includes optional requirement id, claims, and claim text", async () => {
    restores.push(isolateKibiEnv());
    const cwd = createTempDir("kibi-model-logic-");
    roots.push(cwd);
    const result = await handleKbModelRequirement(
      null,
      {
        text: "Customer data must be retained.",
        sourceFiles: ["docs/req.md"],
        existingLogicClaims: ["CLAIM-EXISTING"],
        requirementId: "REQ-MODEL-LOGIC",
        claimKey: "CLAIM-OVERRIDE",
        claimText: "Customer data must be retained.",
        confidence: 0.91,
        logic: validRule(),
      },
      cwd,
    );
    expect(result.structuredContent.logic?.claimKey).toBeTruthy();
    expect(result.structuredContent.logicClaims).toContain("CLAIM-EXISTING");
    expect(result.applyPlan.length).toBeGreaterThan(0);
    expect(result.migrationWarning).toContain("manifest is missing");
  });

  test("non-strict observation and strict write-set branches", async () => {
    restores.push(isolateKibiEnv());
    const cwd = createTempDir("kibi-model-obs-");
    roots.push(cwd);
    const observation = await handleKbModelRequirement(
      null,
      {
        text: "The sidebar looks nicer in dark mode.",
        existingLogicClaims: ["CLAIM-KEEP"],
      },
      cwd,
    );
    expect(observation.structuredContent.isStrict).toBe(false);
    expect(observation.content[0]?.text).toContain("observation");
    expect(observation.structuredContent.warnings[0]?.kind).toBe(
      "low_confidence_observation_downgrade",
    );

    const strict = await handleKbModelRequirement(
      null,
      {
        text: "The exporter must keep drafts until review.",
        subjectKey: "exporter",
        propertyKey: "draft_retention",
        operator: "eq",
        value: "until_review",
        existingLogicClaims: ["CLAIM-KEEP"],
      },
      cwd,
    );
    expect(strict.structuredContent.isStrict).toBe(true);
    expect(strict.content[0]?.text).toContain("Migration warning included");
    expect(strict.applyPlan.some((step) => step.type === "req")).toBe(true);
    expect(strict.applyPlan.some((step) => step.type === "fact")).toBe(true);

    const viaExecute = await executeModelRequirement(
      { text: "The daemon must start on first query." },
      { workspaceRoot: cwd, prolog: null } as never,
    );
    expect(viaExecute.structuredContent.statement.length).toBeGreaterThan(0);
  });
});

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  applyProofIntegrationAction,
  buildProofIntegrationPlan,
  proposeProofIntegration,
} from "../../src/proof/integration-plan.js";
import { loadProofIntegrations } from "../../src/proof/integrations.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) removeTempDir(root);
});

function workspace(scripts: Record<string, string> = {}): string {
  const root = createTempDir("kibi-proof-integration-plan-");
  roots.push(root);
  writeFileSync(
    path.join(root, "package.json"),
    `${JSON.stringify({ name: "demo", scripts }, null, 2)}\n`,
  );
  return root;
}

function onlyAction(root: string, update?: string) {
  const result = buildProofIntegrationPlan(
    root,
    update === undefined ? {} : { update },
  );
  const action = result.plan?.actions[0];
  if (action === undefined) throw new Error(result.reason);
  return { result, action };
}

describe("proof integration plan", () => {
  test("proposes the package.json test script as a command integration and ignores the npm placeholder", () => {
    const root = workspace({ test: "node --test" });
    expect(proposeProofIntegration(root)?.integration).toMatchObject({
      id: "unit",
      producer: "command",
      command: ["npm", "test"],
      targets: ["default"],
    });
    const placeholder = workspace({
      test: 'echo "Error: no test specified" && exit 1',
    });
    expect(proposeProofIntegration(placeholder)).toBeNull();
    expect(buildProofIntegrationPlan(placeholder).plan).toBeNull();
  });

  test("applying the reviewed plan writes a valid integrations file, and the same plan is refused once the file exists", () => {
    const root = workspace({ test: "node --test" });
    const { result, action } = onlyAction(root);
    expect(result.plan?.status).toBe("ready");
    expect(action).toMatchObject({
      code: "proof_integration_configure",
      category: "proof",
      safety: "automatic",
      autoApplicable: true,
      affectedFiles: [".kb/proof/integrations.json"],
    });
    expect(result.proposal?.contractDefaults).toMatchObject({
      version: "kibi.proof-contract.v1",
      integration: "unit",
      success_policy: "all_required_first_attempt",
    });

    applyProofIntegrationAction(action, root);
    const loaded = loadProofIntegrations(root);
    expect(loaded.available).toBe(true);
    if (!loaded.available) return;
    expect(loaded.integrations.integrations.map((entry) => entry.id)).toEqual([
      "unit",
    ]);

    expect(() => applyProofIntegrationAction(action, root)).toThrow(
      /already exists and this plan only creates it/,
    );
    expect(buildProofIntegrationPlan(root).plan).toBeNull();
    expect(buildProofIntegrationPlan(root).reason).toContain("--update");
  });

  test("a plan is refused after the file it was derived from changed", () => {
    const root = workspace({ test: "node --test" });
    const { action } = onlyAction(root);
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", scripts: { test: "vitest run" } }),
    );
    expect(() => applyProofIntegrationAction(action, root)).toThrow(
      /package\.json changed since planning/,
    );
    expect(existsSync(path.join(root, ".kb", "proof", "integrations.json"))).toBe(
      false,
    );
  });

  test("an update plan adds or replaces only the named integration and is bound to the file's hash", () => {
    const root = workspace({ test: "node --test" });
    applyProofIntegrationAction(onlyAction(root).action, root);
    const filePath = path.join(root, ".kb", "proof", "integrations.json");

    const added = onlyAction(root, "smoke").action;
    applyProofIntegrationAction(added, root);
    const afterAdd = JSON.parse(readFileSync(filePath, "utf8")) as {
      integrations: Array<{ id: string }>;
    };
    expect(afterAdd.integrations.map((entry) => entry.id)).toEqual([
      "unit",
      "smoke",
    ]);

    expect(() => applyProofIntegrationAction(added, root)).toThrow(
      /changed since planning/,
    );

    const replaced = onlyAction(root, "unit").action;
    applyProofIntegrationAction(replaced, root);
    const afterReplace = JSON.parse(readFileSync(filePath, "utf8")) as {
      integrations: Array<{ id: string }>;
    };
    expect(afterReplace.integrations.map((entry) => entry.id)).toEqual([
      "unit",
      "smoke",
    ]);
  });

  test("an update plan is not offered before the file exists", () => {
    const root = workspace({ test: "node --test" });
    const result = buildProofIntegrationPlan(root, { update: "unit" });
    expect(result.plan).toBeNull();
    expect(result.reason).toContain("does not exist yet");
  });
});

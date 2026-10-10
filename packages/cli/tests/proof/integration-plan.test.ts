import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  applyProofIntegrationAction,
  buildProofIntegrationPlan,
  proposeProofIntegration,
} from "../../src/proof/integration-plan.js";
import { parseCommandOption } from "../../src/cli-register-proof.js";
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

  test("a plan for the package's whole test script says the run is judged as a whole and how to narrow it", () => {
    const root = workspace({ test: "node --test" });
    const { reason } = buildProofIntegrationPlan(root);
    expect(reason).toContain("judges this run as a whole");
    expect(reason).toContain("fails every proof obligation that names 'unit'");
    expect(reason).toContain("--update unit --command");
    expect(reason).toContain("kibi.proof-test-report.v1");
  });

  test("--command replaces the detected command and drops the whole-run note", () => {
    const root = workspace({ test: "node --test" });
    const narrowed = ["npx", "vitest", "run", "tests/e2e"];
    const created = buildProofIntegrationPlan(root, { command: narrowed });
    expect(created.proposal?.integration.command).toEqual(narrowed);
    expect(created.reason).not.toContain("judges this run as a whole");
    const { action } = onlyAction(root);
    applyProofIntegrationAction(action, root);
    const updated = buildProofIntegrationPlan(root, {
      update: "unit",
      command: narrowed,
    });
    expect(updated.plan?.actions[0]?.evidence).toMatchObject({
      mode: "update",
      integration: { id: "unit", command: narrowed },
    });
  });

  test("parses --command as space-separated words or a JSON argv array", () => {
    expect(parseCommandOption("npx vitest  run tests/e2e")).toEqual([
      "npx",
      "vitest",
      "run",
      "tests/e2e",
    ]);
    expect(parseCommandOption('["bun","test","tests/e2e dir"]')).toEqual([
      "bun",
      "test",
      "tests/e2e dir",
    ]);
    expect(() => parseCommandOption("   ")).toThrow(/must not be empty/);
    expect(() => parseCommandOption("[1]")).toThrow(/argv strings/);
    expect(() => parseCommandOption("[oops")).toThrow(/JSON array/);
  });
});

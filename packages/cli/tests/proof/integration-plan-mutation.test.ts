/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { MigrationActionRefusedError } from "../../src/operations/planning/migration-refusal.js";
import type { MigrationAction } from "../../src/public/operations/migration-plan.js";
import {
  PROOF_INTEGRATION_CONFIGURE,
  applyProofIntegrationAction,
  buildProofIntegrationPlan,
  proposeProofIntegration,
} from "../../src/proof/integration-plan.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-plan-mutation-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

const pkg = (scripts: unknown) => JSON.stringify({ name: "demo", scripts });
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const FILE = ".kb/proof/integrations.json";

function integrationsFile(integrations: unknown[]): string {
  return JSON.stringify({ version: "kibi.proof-integration.v1", integrations });
}

const unit = {
  id: "unit",
  producer: "command",
  command: ["npm", "test"],
};

function onlyAction(
  root: string,
  options: { update?: string; command?: string[] } = {},
): MigrationAction {
  const result = buildProofIntegrationPlan(root, options);
  const action = result.plan?.actions[0];
  if (action === undefined) throw new Error(result.reason);
  return action;
}

function refusal(action: MigrationAction, root: string): string {
  try {
    applyProofIntegrationAction(action, root);
  } catch (error) {
    expect(error).toBeInstanceOf(MigrationActionRefusedError);
    return (error as Error).message;
  }
  throw new Error("expected a refusal");
}

describe("proposeProofIntegration", () => {
  test("returns null without a test script or runner", () => {
    expect(proposeProofIntegration(workspace())).toBe(null);
    expect(proposeProofIntegration(workspace({ "package.json": "{" }))).toBe(
      null,
    );
    expect(proposeProofIntegration(workspace({ "package.json": "null" }))).toBe(
      null,
    );
    expect(
      proposeProofIntegration(
        workspace({ "package.json": '[{"scripts":{"test":"x"}}]' }),
      ),
    ).toBe(null);
    for (const scripts of [
      null,
      ["x"],
      "test",
      { test: 5 },
      { test: "  " },
      { lint: "x" },
    ]) {
      expect(
        proposeProofIntegration(workspace({ "package.json": pkg(scripts) })),
      ).toBe(null);
    }
    expect(
      proposeProofIntegration(
        workspace({
          "package.json": pkg({ test: 'echo "Error: No Test Specified"' }),
        }),
      ),
    ).toBe(null);
  });

  test("picks the package manager from the lock file", () => {
    const command = (files: Record<string, string>) =>
      proposeProofIntegration(
        workspace({ "package.json": pkg({ test: "t" }), ...files }),
      )?.integration.command;
    expect(command({})).toStrictEqual(["npm", "test"]);
    expect(command({ "bun.lock": "", "pnpm-lock.yaml": "" })).toStrictEqual([
      "bun",
      "run",
      "test",
    ]);
    expect(command({ "bun.lockb": "", "yarn.lock": "" })).toStrictEqual([
      "bun",
      "run",
      "test",
    ]);
    expect(command({ "pnpm-lock.yaml": "", "yarn.lock": "" })).toStrictEqual([
      "pnpm",
      "test",
    ]);
    expect(command({ "yarn.lock": "" })).toStrictEqual(["yarn", "test"]);
  });

  test("describes the whole proposal", () => {
    const root = workspace({ "package.json": pkg({ test: "node --test" }) });
    expect(proposeProofIntegration(root)).toStrictEqual({
      runner: "package.json test script (npm test)",
      integration: {
        id: "unit",
        producer: "command",
        command: ["npm", "test"],
        targets: ["default"],
        description:
          "Command proof: runs npm test once per kibi prove and judges every selected test by its exit code.",
      },
      contractDefaults: {
        version: "kibi.proof-contract.v1",
        integration: "unit",
        required_proofs: [
          { symbol_id: "SYM-<symbol the test proves>", target: "default" },
        ],
        success_policy: "all_required_first_attempt",
      },
    });
  });

  test("an override command and id win; an empty override is ignored", () => {
    const root = workspace({ "package.json": pkg({ test: "node --test" }) });
    const custom = proposeProofIntegration(root, "smoke", [
      "bun",
      "test",
      "a b",
    ]);
    expect(custom?.runner).toBe("--command (bun test a b)");
    expect(custom?.integration.id).toBe("smoke");
    expect(custom?.integration.command).toStrictEqual(["bun", "test", "a b"]);
    expect(custom?.contractDefaults.integration).toBe("smoke");
    const ignored = proposeProofIntegration(root, undefined, []);
    expect(ignored?.runner).toBe("package.json test script (npm test)");
    expect(proposeProofIntegration(workspace(), undefined, [])).toBe(null);
    expect(
      proposeProofIntegration(workspace(), undefined, ["make", "check"])
        ?.integration,
    ).toStrictEqual({
      id: "unit",
      producer: "command",
      command: ["make", "check"],
      targets: ["default"],
      description:
        "Command proof: runs make check once per kibi prove and judges every selected test by its exit code.",
    });
  });

  test("detects each runner marker file", () => {
    const cases: Array<[string, string, string, string[]]> = [
      [
        "playwright.config.ts",
        "playwright",
        "e2e",
        ["npx", "playwright", "test"],
      ],
      [
        "playwright.config.mjs",
        "playwright",
        "e2e",
        ["npx", "playwright", "test"],
      ],
      [
        "playwright.config.js",
        "playwright",
        "e2e",
        ["npx", "playwright", "test"],
      ],
      ["vitest.config.ts", "vitest", "unit", ["npx", "vitest", "run"]],
      ["vitest.config.mjs", "vitest", "unit", ["npx", "vitest", "run"]],
      ["vitest.config.js", "vitest", "unit", ["npx", "vitest", "run"]],
      ["jest.config.ts", "jest", "unit", ["npx", "jest", "--ci"]],
      ["jest.config.mjs", "jest", "unit", ["npx", "jest", "--ci"]],
      ["jest.config.js", "jest", "unit", ["npx", "jest", "--ci"]],
      ["pytest.ini", "pytest", "unit", ["pytest"]],
      ["pyproject.toml", "pytest", "unit", ["pytest"]],
      ["setup.cfg", "pytest", "unit", ["pytest"]],
      ["tox.ini", "pytest", "unit", ["pytest"]],
      ["go.mod", "go test", "unit", ["go", "test", "./..."]],
      ["Cargo.toml", "cargo test", "unit", ["cargo", "test"]],
      ["pom.xml", "maven", "unit", ["mvn", "test"]],
      ["build.gradle", "gradle", "unit", ["gradle", "test"]],
      ["build.gradle.kts", "gradle", "unit", ["gradle", "test"]],
      ["Rakefile", "rake test", "unit", ["bundle", "exec", "rake", "test"]],
    ];
    for (const [file, runner, id, command] of cases) {
      const proposal = proposeProofIntegration(workspace({ [file]: "" }));
      expect([
        file,
        proposal?.runner,
        proposal?.integration.id,
        proposal?.integration.command,
      ]).toStrictEqual([file, runner, id, command]);
    }
    expect(proposeProofIntegration(workspace({ Gemfile: "" }))).toBe(null);
    expect(
      proposeProofIntegration(
        workspace({ "go.mod": "", "playwright.config.ts": "" }),
      )?.runner,
    ).toBe("playwright");
  });
});

describe("buildProofIntegrationPlan", () => {
  test("binds every proposal source file hash", () => {
    const sources = [
      "package.json",
      "bun.lock",
      "bun.lockb",
      "pnpm-lock.yaml",
      "yarn.lock",
      "playwright.config.ts",
      "playwright.config.mjs",
      "playwright.config.js",
      "vitest.config.ts",
      "vitest.config.mjs",
      "vitest.config.js",
      "jest.config.ts",
      "jest.config.mjs",
      "jest.config.js",
      "pytest.ini",
      "pyproject.toml",
      "setup.cfg",
      "tox.ini",
      "go.mod",
      "Cargo.toml",
      "pom.xml",
      "build.gradle",
      "build.gradle.kts",
      "Gemfile",
      "Rakefile",
    ];
    const files: Record<string, string> = { Makefile: "x", "other.txt": "y" };
    for (const file of sources)
      files[file] =
        file === "package.json" ? pkg({ test: "t" }) : `content of ${file}`;
    const root = workspace(files);
    const expected: Record<string, string> = {};
    for (const file of sources) expected[file] = sha(files[file] as string);
    expect(onlyAction(root).evidence.sourceHashes).toStrictEqual(expected);
  });

  test("describes a create plan in full", () => {
    const root = workspace({ "go.mod": "module x\n" });
    const result = buildProofIntegrationPlan(root);
    const integration = {
      id: "unit",
      producer: "command",
      command: ["go", "test", "./..."],
      targets: ["default"],
      description:
        "Command proof: runs go test ./... once per kibi prove and judges every selected test by its exit code.",
    };
    expect(result.reason).toBe(
      "Applying the plan creates .kb/proof/integrations.json with the command integration 'unit' (go test ./...). Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.",
    );
    expect(result.plan?.scope.evaluatedDomains).toStrictEqual(["proof"]);
    expect(result.plan?.actions).toHaveLength(1);
    const action = result.plan?.actions[0];
    expect(action?.id).toBe("proof-integration-unit");
    expect(action?.code).toBe(PROOF_INTEGRATION_CONFIGURE);
    expect(PROOF_INTEGRATION_CONFIGURE).toBe("proof_integration_configure");
    expect(action?.category).toBe("proof");
    expect(action?.safety).toBe("automatic");
    expect(action?.autoApplicable).toBe(true);
    expect(action?.invocation).toStrictEqual({
      kind: "review",
      instruction:
        "Review the proposed command integration 'unit' (command: go test ./...), then apply this plan with kb_apply_plan (plan, approvedPlanHash, approvedActionIds) to create .kb/proof/integrations.json.",
    });
    expect(action?.affectedFiles).toStrictEqual([FILE]);
    expect(action?.postconditions).toStrictEqual([
      { file: FILE, version: "kibi.proof-integration.v1" },
    ]);
    expect(action?.evidence).toStrictEqual({
      path: FILE,
      mode: "create",
      integration,
      runner: "go test",
      contractDefaults: {
        version: "kibi.proof-contract.v1",
        integration: "unit",
        required_proofs: [
          { symbol_id: "SYM-<symbol the test proves>", target: "default" },
        ],
        success_policy: "all_required_first_attempt",
      },
      previousFileHash: null,
      sourceHashes: { "go.mod": sha("module x\n") },
    });
    expect(result.proposal?.integration).toStrictEqual(integration);
  });

  test("adds the whole-run note for a package test script", () => {
    const root = workspace({
      "package.json": pkg({ test: "t" }),
      "bun.lock": "",
    });
    expect(buildProofIntegrationPlan(root).reason).toBe(
      "Applying the plan creates .kb/proof/integrations.json with the command integration 'unit' (bun run test). Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it. Kibi judges this run as a whole: a failing test anywhere in the package's test script fails every proof obligation that names 'unit', so unrelated failures prove nothing. To narrow it, pass --command with a command that runs only the proof-bearing tests (kibi proof inspect --update unit --command \"<command>\" --json once the file exists), or have the command write a kibi.proof-test-report.v1 to the path in KIBI_PROOF_TEST_REPORT so each test is judged by its own steps.",
    );
  });

  test("explains when no plan is produced", () => {
    expect(buildProofIntegrationPlan(workspace())).toStrictEqual({
      plan: null,
      proposal: null,
      reason:
        "No test runner detected (no package.json test script and no known runner configuration), so Kibi has no command to propose. Proof integration stays deferred until the first proof-bearing test introduces a harness.",
    });
    expect(
      buildProofIntegrationPlan(workspace({ "go.mod": "" }), {
        update: "unit",
      }),
    ).toStrictEqual({
      plan: null,
      proposal: null,
      reason:
        ".kb/proof/integrations.json does not exist yet. Run kibi proof inspect without --update for a plan that creates it.",
    });
    const existing = workspace({
      "go.mod": "",
      [FILE]: integrationsFile([unit]),
    });
    const exists = {
      plan: null,
      proposal: null,
      reason:
        ".kb/proof/integrations.json already exists; Kibi will not overwrite it. Run kibi proof inspect --update <integration id> for a plan that adds or replaces one named integration.",
    };
    expect(buildProofIntegrationPlan(existing)).toStrictEqual(exists);
    expect(
      buildProofIntegrationPlan(existing, { update: "   " }),
    ).toStrictEqual(exists);
    const invalid = {
      plan: null,
      proposal: null,
      reason:
        ".kb/proof/integrations.json is not a valid kibi.proof-integration.v1 file, so Kibi cannot update one integration in it. Run kibi prove for the validation error.",
    };
    expect(
      buildProofIntegrationPlan(workspace({ "go.mod": "", [FILE]: "{" }), {
        update: "unit",
      }),
    ).toStrictEqual(invalid);
    expect(
      buildProofIntegrationPlan(
        workspace({ "go.mod": "", [FILE]: integrationsFile([]) }),
        {
          update: "unit",
        },
      ),
    ).toStrictEqual(invalid);
    expect(
      buildProofIntegrationPlan(
        workspace({ [FILE]: integrationsFile([unit]) }),
        { update: "unit" },
      ).reason,
    ).toBe(
      "No test runner detected (no package.json test script and no known runner configuration), so Kibi has no command to propose. Proof integration stays deferred until the first proof-bearing test introduces a harness.",
    );
  });

  test("an update plan binds the current file hash", () => {
    const content = integrationsFile([unit]);
    const root = workspace({ "go.mod": "", [FILE]: content });
    const result = buildProofIntegrationPlan(root, { update: " smoke " });
    const action = result.plan?.actions[0];
    expect(action?.id).toBe("proof-integration-smoke");
    expect(action?.evidence.mode).toBe("update");
    expect(action?.evidence.previousFileHash).toBe(sha(content));
    expect(action?.invocation).toStrictEqual({
      kind: "review",
      instruction:
        "Review the proposed command integration 'smoke' (command: go test ./...), then apply this plan with kb_apply_plan (plan, approvedPlanHash, approvedActionIds) to update .kb/proof/integrations.json.",
    });
    expect(result.reason).toBe(
      "Applying the plan updates .kb/proof/integrations.json with the command integration 'smoke' (go test ./...). Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.",
    );
  });
});

describe("applyProofIntegrationAction", () => {
  test("writes a created file atomically", () => {
    const root = workspace({ "go.mod": "" });
    const action = onlyAction(root);
    applyProofIntegrationAction(action, root);
    const file = {
      version: "kibi.proof-integration.v1",
      integrations: [action.evidence.integration],
    };
    expect(readFileSync(path.join(root, FILE), "utf8")).toBe(
      `${JSON.stringify(file, null, 2)}\n`,
    );
    expect(readdirSync(path.join(root, ".kb", "proof"))).toStrictEqual([
      "integrations.json",
    ]);
    expect(refusal(action, root)).toBe(
      "Proof integration plan refused: .kb/proof/integrations.json already exists and this plan only creates it. Run kibi proof inspect --update <integration id> for a plan that adds or replaces one named integration.",
    );
  });

  test("refuses malformed actions", () => {
    const root = workspace({ "go.mod": "" });
    const action = onlyAction(root);
    const message =
      "Proof integration action 'proof-integration-unit' is malformed; rerun kibi proof inspect for a new plan.";
    const patches: Array<Record<string, unknown>> = [
      { path: "elsewhere.json" },
      { mode: "delete" },
      { integration: null },
      { integration: [] },
      { integration: "unit" },
      { integration: { id: 5 } },
    ];
    for (const patch of patches) {
      expect(
        refusal(
          { ...action, evidence: { ...action.evidence, ...patch } },
          root,
        ),
      ).toBe(message);
    }
    expect(existsSync(path.join(root, FILE))).toBe(false);
  });

  test("refuses after any proposal source changed, appeared or disappeared", () => {
    const root = workspace({ "go.mod": "a", "pom.xml": "b" });
    const action = onlyAction(root);
    writeFileSync(path.join(root, "go.mod"), "changed");
    rmSync(path.join(root, "pom.xml"));
    writeFileSync(path.join(root, "Cargo.toml"), "");
    expect(refusal(action, root)).toBe(
      "Proof integration plan refused: go.mod, pom.xml, Cargo.toml changed since planning; rerun kibi proof inspect and review the new plan.",
    );
    expect(
      refusal(
        { ...action, evidence: { ...action.evidence, sourceHashes: "ab" } },
        root,
      ),
    ).toBe(
      "Proof integration plan refused: go.mod, Cargo.toml changed since planning; rerun kibi proof inspect and review the new plan.",
    );
    expect(
      refusal(
        { ...action, evidence: { ...action.evidence, sourceHashes: [] } },
        root,
      ),
    ).toBe(
      "Proof integration plan refused: go.mod, Cargo.toml changed since planning; rerun kibi proof inspect and review the new plan.",
    );
  });

  test("updates by adding or replacing the named integration", () => {
    const other = {
      id: "e2e",
      producer: "command",
      command: ["npx", "playwright", "test"],
    };
    const root = workspace({
      "go.mod": "",
      [FILE]: integrationsFile([other, unit]),
    });
    applyProofIntegrationAction(onlyAction(root, { update: "unit" }), root);
    const replaced = JSON.parse(readFileSync(path.join(root, FILE), "utf8"));
    expect(
      replaced.integrations.map((entry: { id: string }) => entry.id),
    ).toStrictEqual(["e2e", "unit"]);
    expect(replaced.integrations[0]).toStrictEqual(other);
    expect(replaced.integrations[1].command).toStrictEqual([
      "go",
      "test",
      "./...",
    ]);
    applyProofIntegrationAction(onlyAction(root, { update: "smoke" }), root);
    const added = JSON.parse(readFileSync(path.join(root, FILE), "utf8"));
    expect(
      added.integrations.map((entry: { id: string }) => entry.id),
    ).toStrictEqual(["e2e", "unit", "smoke"]);
  });

  test("refuses an update whose file changed or became invalid", () => {
    const root = workspace({ "go.mod": "", [FILE]: integrationsFile([unit]) });
    const action = onlyAction(root, { update: "unit" });
    writeFileSync(
      path.join(root, FILE),
      integrationsFile([unit, { ...unit, id: "x" }]),
    );
    expect(refusal(action, root)).toBe(
      "Proof integration plan refused: .kb/proof/integrations.json changed since planning; rerun kibi proof inspect --update unit.",
    );
    writeFileSync(path.join(root, FILE), "{");
    expect(
      refusal(
        {
          ...action,
          evidence: { ...action.evidence, previousFileHash: sha("{") },
        },
        root,
      ),
    ).toBe(
      "Proof integration plan refused: .kb/proof/integrations.json is not a valid kibi.proof-integration.v1 file.",
    );
    rmSync(path.join(root, FILE));
    expect(
      refusal(
        { ...action, evidence: { ...action.evidence, previousFileHash: null } },
        root,
      ),
    ).toBe(
      "Proof integration plan refused: .kb/proof/integrations.json is not a valid kibi.proof-integration.v1 file.",
    );
  });

  test("refuses a result that would be invalid", () => {
    const root = workspace({ "go.mod": "" });
    const action = onlyAction(root);
    expect(
      refusal(
        {
          ...action,
          evidence: {
            ...action.evidence,
            integration: { id: "unit", producer: "", command: [] },
          },
        },
        root,
      ),
    ).toBe(
      "Proof integration plan refused: the result would be invalid (integrations[0].producer must be one of: command, playwright, junit, tap (or a custom producer id); integrations[0].command must be a non-empty argv array).",
    );
    expect(existsSync(path.join(root, ".kb"))).toBe(false);
  });
});

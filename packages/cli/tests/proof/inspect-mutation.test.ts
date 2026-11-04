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
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  directoryEntriesMatch,
  inspectProofEnvironment,
} from "../../src/proof/inspect.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(files: Record<string, string> = {}): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-inspect-mutation-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

const json = (value: unknown) => JSON.stringify(value);
const runners = (files: Record<string, string>) =>
  inspectProofEnvironment(workspace(files)).detectedRunners;
const scriptRunners = (...bodies: string[]) =>
  runners({
    "package.json": json({
      scripts: Object.fromEntries(
        bodies.map((body, index) => [`s${index}`, body]),
      ),
    }),
  });

const APPLY_HINT =
  "review integrationPlan, then apply it with kb_apply_plan (or `kibi apply-plan --input -`) passing plan, approvedPlanHash = plan.planHash and approvedActionIds";

describe("inspectProofEnvironment detectors", () => {
  test("maps every marker file to its language and runner", () => {
    const cases: Array<[string, string, string]> = [
      ["playwright.config.ts", "typescript", "playwright"],
      ["playwright.config.mjs", "typescript", "playwright"],
      ["playwright.config.js", "typescript", "playwright"],
      ["vitest.config.ts", "typescript", "vitest"],
      ["vitest.config.mjs", "typescript", "vitest"],
      ["vitest.config.js", "typescript", "vitest"],
      ["jest.config.ts", "typescript", "jest"],
      ["jest.config.mjs", "typescript", "jest"],
      ["jest.config.js", "typescript", "jest"],
      ["pytest.ini", "python", "pytest"],
      ["pyproject.toml", "python", "pytest"],
      ["setup.cfg", "python", "pytest"],
      ["tox.ini", "python", "pytest"],
      ["go.mod", "go", "go test"],
      ["Cargo.toml", "rust", "cargo test"],
      ["pom.xml", "java", "maven"],
      ["build.gradle", "java", "gradle"],
      ["build.gradle.kts", "java", "gradle"],
      ["App.csproj", "csharp", "dotnet test"],
      ["App.sln", "csharp", "dotnet test"],
      ["Rakefile", "ruby", "rake test"],
      ["Gemfile", "ruby", "rake test"],
    ];
    for (const [file, language, runner] of cases) {
      const inspection = inspectProofEnvironment(workspace({ [file]: "" }));
      expect([
        file,
        inspection.languages,
        inspection.detectedRunners,
      ]).toStrictEqual([file, [language], [runner]]);
    }
  });

  test("matches extension globs literally and at the end of the name", () => {
    for (const file of [
      "Appxcsproj",
      "App.csproj.bak",
      "notes.txt",
      "Appxsln",
    ]) {
      expect([file, runners({ [file]: "" })]).toStrictEqual([file, []]);
    }
    expect(runners({ ".csproj": "" })).toStrictEqual(["dotnet test"]);
  });

  test("lists runners in detector order without duplicates", () => {
    const inspection = inspectProofEnvironment(
      workspace({
        Rakefile: "",
        Gemfile: "",
        "go.mod": "",
        "playwright.config.ts": "",
        "playwright.config.js": "",
        "Cargo.toml": "",
      }),
    );
    expect(inspection.detectedRunners).toStrictEqual([
      "playwright",
      "go test",
      "cargo test",
      "rake test",
    ]);
    expect(inspection.languages).toStrictEqual([
      "go",
      "ruby",
      "rust",
      "typescript",
    ]);
    expect(inspection.buildSystems).toStrictEqual(["cargo", "go"]);
  });
});

describe("inspectProofEnvironment package.json", () => {
  test("reports build systems from package.json and lock files", () => {
    const systems = (files: Record<string, string>) =>
      inspectProofEnvironment(workspace(files)).buildSystems;
    expect(systems({ "package.json": json({}) })).toStrictEqual([]);
    expect(
      systems({ "package.json": json({ dependencies: {} }) }),
    ).toStrictEqual(["npm"]);
    expect(
      systems({ "package.json": json({ devDependencies: {} }) }),
    ).toStrictEqual(["npm"]);
    expect(
      systems({ "package.json": json({ scripts: { dependencies: "x" } }) }),
    ).toStrictEqual([]);
    expect(systems({ "package.json": json({}), "bun.lock": "" })).toStrictEqual(
      ["bun"],
    );
    expect(
      systems({ "package.json": json({}), "bun.lockb": "" }),
    ).toStrictEqual(["bun"]);
    expect(
      systems({ "package.json": json({}), "bunfig.toml": "" }),
    ).toStrictEqual(["bun"]);
    expect(systems({ "bun.lock": "", "bunfig.toml": "" })).toStrictEqual([]);
    expect(
      systems({ Makefile: "", "pom.xml": "", "go.mod": "", "Cargo.toml": "" }),
    ).toStrictEqual(["cargo", "go", "make", "maven"]);
  });

  test("tolerates malformed package.json files", () => {
    for (const content of [
      "{",
      "null",
      "5",
      '"x"',
      "[]",
      json({ scripts: null }),
      json({ scripts: "test" }),
    ]) {
      const inspection = inspectProofEnvironment(
        workspace({ "package.json": content }),
      );
      expect([
        content,
        inspection.languages,
        inspection.detectedRunners,
      ]).toStrictEqual([content, ["javascript/typescript"], []]);
    }
  });

  test("ignores non-string script values", () => {
    expect(
      runners({
        "package.json": json({ scripts: { e: ["vitest"], f: { jest: 1 } } }),
      }),
    ).toStrictEqual([]);
  });

  test("reads script bodies from an array of scripts", () => {
    expect(
      runners({ "package.json": json({ scripts: ["vitest"] }) }),
    ).toStrictEqual(["vitest"]);
  });

  test("adds npm test for a string test script", () => {
    expect(
      runners({ "package.json": json({ scripts: { test: "make" } }) }),
    ).toStrictEqual(["npm test"]);
    expect(
      runners({ "package.json": json({ scripts: { test: 1 } }) }),
    ).toStrictEqual([]);
    expect(
      runners({
        "package.json": json({ scripts: { test: "vitest run" } }),
        "vitest.config.ts": "",
      }),
    ).toStrictEqual(["vitest", "npm test"]);
  });

  test("recognises runners inside script bodies", () => {
    expect(scriptRunners("node --test")).toStrictEqual(["node --test"]);
    expect(scriptRunners("node a/b.js --test")).toStrictEqual(["node --test"]);
    expect(scriptRunners("node\t--test")).toStrictEqual(["node --test"]);
    for (const body of [
      "xnode --test",
      "nodex --test",
      "node a && x --test",
      "node a & x --test",
      "node a | x --test",
      "node a; x --test",
      "node a--test",
      "node --testing",
      "node",
      "--test",
    ]) {
      expect([body, scriptRunners(body)]).toStrictEqual([body, []]);
    }
    expect(scriptRunners("bun test")).toStrictEqual(["bun test"]);
    expect(scriptRunners("bun  \ttest ./x")).toStrictEqual(["bun test"]);
    for (const body of [
      "xbun test",
      "bunx test",
      "bun testx",
      "bun-test",
      "buntest",
    ]) {
      expect([body, scriptRunners(body)]).toStrictEqual([body, []]);
    }
    expect(scriptRunners("vitest")).toStrictEqual(["vitest"]);
    expect(scriptRunners("npx vitest run")).toStrictEqual(["vitest"]);
    expect(scriptRunners("jest")).toStrictEqual(["jest"]);
    expect(scriptRunners("npx jest --ci")).toStrictEqual(["jest"]);
    for (const body of ["xvitest", "vitestx", "xjest", "jestx"]) {
      expect([body, scriptRunners(body)]).toStrictEqual([body, []]);
    }
    expect(scriptRunners("playwright test")).toStrictEqual(["playwright"]);
    expect(scriptRunners("npx playwright  \ttest --ui")).toStrictEqual([
      "playwright",
    ]);
    for (const body of [
      "xplaywright test",
      "playwrightx test",
      "playwright testx",
      "playwrighttest",
      "playwright",
    ]) {
      expect([body, scriptRunners(body)]).toStrictEqual([body, []]);
    }
    expect(
      scriptRunners(
        "playwright test",
        "jest",
        "vitest",
        "bun test",
        "node --test",
        "jest",
      ),
    ).toStrictEqual([
      "node --test",
      "bun test",
      "vitest",
      "jest",
      "playwright",
    ]);
    expect(
      runners({
        "package.json": json({ scripts: { e: "vitest", n: 5 } }),
        "vitest.config.ts": "",
      }),
    ).toStrictEqual(["vitest"]);
  });

  test("reads scripts of declared workspaces", () => {
    const root = workspace({
      "package.json": json({
        workspaces: [
          "packages/*",
          "tools/one",
          "!packages/skip",
          "glob*",
          5,
          "missing/*",
          "absent",
        ],
      }),
      "packages/a/package.json": json({ scripts: { t: "bun test" } }),
      "packages/b/package.json": "{",
      "packages/c/readme.md": "",
      "packages/skip/package.json": json({ scripts: { t: "jest" } }),
      "tools/one/package.json": json({ scripts: { t: "vitest" } }),
      "glob*/package.json": json({ scripts: { t: "playwright test" } }),
      "tools/two/package.json": json({ scripts: { t: "node --test" } }),
    });
    // `!` excludes only apply to whole patterns, so packages/skip is still
    // reached through `packages/*`.
    expect(inspectProofEnvironment(root).detectedRunners).toStrictEqual([
      "bun test",
      "vitest",
      "jest",
    ]);
    const bang = workspace({
      "package.json": json({ workspaces: ["tools/one!"] }),
      "tools/one!/package.json": json({ scripts: { t: "vitest" } }),
    });
    expect(inspectProofEnvironment(bang).detectedRunners).toStrictEqual([
      "vitest",
    ]);
    const negated = workspace({
      "package.json": json({ workspaces: ["!tools/one"] }),
      "tools/one/package.json": json({ scripts: { t: "vitest" } }),
    });
    expect(inspectProofEnvironment(negated).detectedRunners).toStrictEqual([]);
  });

  test("reads yarn-style workspaces.packages", () => {
    const root = workspace({
      "package.json": json({ workspaces: { packages: ["tools/one"] } }),
      "tools/one/package.json": json({ scripts: { t: "vitest" } }),
    });
    expect(inspectProofEnvironment(root).detectedRunners).toStrictEqual([
      "vitest",
    ]);
    for (const workspaces of [{ packages: "tools/one" }, "tools/one", null]) {
      const other = workspace({
        "package.json": json({ workspaces }),
        "tools/one/package.json": json({ scripts: { t: "vitest" } }),
      });
      expect(inspectProofEnvironment(other).detectedRunners).toStrictEqual([]);
    }
  });
});

describe("inspectProofEnvironment workflows and integrations", () => {
  test("lists yml and yaml workflows", () => {
    const root = workspace({
      ".github/workflows/ci.yml": "",
      ".github/workflows/release.yaml": "",
      ".github/workflows/notes.md": "",
      ".github/workflows/yml": "",
    });
    expect([...inspectProofEnvironment(root).ciWorkflows].sort()).toStrictEqual(
      ["ci.yml", "release.yaml"],
    );
    expect(
      inspectProofEnvironment(workspace({ ".github/workflows": "" }))
        .ciWorkflows,
    ).toStrictEqual([]);
    expect(inspectProofEnvironment(workspace()).ciWorkflows).toStrictEqual([]);
  });

  test("describes an empty repository", () => {
    const root = workspace();
    expect(inspectProofEnvironment(root)).toStrictEqual({
      languages: [],
      buildSystems: [],
      detectedRunners: [],
      ciWorkflows: [],
      currentIntegration: null,
      currentIntegrations: [],
      recommendation:
        "No test harness detected. Proof integration is deferred until the first proof-bearing test introduces one; command proof can prove any command.",
      missing: [
        ".kb/proof/integrations.json (written by applying the plan from kibi proof inspect --json)",
      ],
      proposedIntegration: null,
      contractDefaults: null,
      integrationPlan: null,
      integrationPlanReason:
        "No test runner detected (no package.json test script and no known runner configuration), so Kibi has no command to propose. Proof integration stays deferred until the first proof-bearing test introduces a harness.",
    });
  });

  test("proposes an integration for a detected runner", () => {
    const inspection = inspectProofEnvironment(workspace({ "go.mod": "" }));
    expect(inspection.recommendation).toBe(
      `Kibi proposes a command integration for the detected runner. To configure it, ${APPLY_HINT}. Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.`,
    );
    expect(inspection.missing).toStrictEqual([
      ".kb/proof/integrations.json (written by applying integrationPlan)",
    ]);
    expect(inspection.proposedIntegration?.command).toStrictEqual([
      "go",
      "test",
      "./...",
    ]);
    expect(inspection.contractDefaults?.integration).toBe("unit");
    expect(inspection.integrationPlan?.actions).toHaveLength(1);
    expect(inspection.integrationPlanReason).toBe(
      "Applying the plan creates .kb/proof/integrations.json with the command integration 'unit' (go test ./...). Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.",
    );
  });

  const integrations = json({
    version: "kibi.proof-integration.v1",
    integrations: [
      { id: "unit", producer: "command", command: ["go", "test"] },
      { id: "e2e", producer: "junit", command: ["x"], artifact: "out.xml" },
    ],
  });

  test("reports configured integrations", () => {
    const root = workspace({
      "go.mod": "",
      ".kb/proof/integrations.json": integrations,
    });
    const inspection = inspectProofEnvironment(root);
    expect(inspection.currentIntegration).toBe("unit, e2e");
    expect(inspection.currentIntegrations).toStrictEqual([
      { id: "unit", producer: "command", command: ["go", "test"] },
      { id: "e2e", producer: "junit", command: ["x"] },
    ]);
    expect(inspection.recommendation).toBe(
      "Proof integration configured; run `kibi prove --all` to record fresh evidence.",
    );
    expect(inspection.missing).toStrictEqual([]);
    expect(inspection.integrationPlan).toBe(null);
    expect(inspectProofEnvironment(root, { update: "  " }).recommendation).toBe(
      "Proof integration configured; run `kibi prove --all` to record fresh evidence.",
    );
  });

  test("recommends replacing or adding the updated integration", () => {
    const root = workspace({
      "go.mod": "",
      ".kb/proof/integrations.json": integrations,
    });
    expect(
      inspectProofEnvironment(root, { update: " e2e " }).recommendation,
    ).toBe(`To replace integration 'e2e', ${APPLY_HINT}.`);
    expect(
      inspectProofEnvironment(root, { update: "smoke" }).recommendation,
    ).toBe(`To add integration 'smoke', ${APPLY_HINT}.`);
    const custom = inspectProofEnvironment(root, {
      update: "smoke",
      command: ["make", "it"],
    });
    expect(custom.proposedIntegration?.command).toStrictEqual(["make", "it"]);
  });

  test("an invalid integrations file is not configured", () => {
    const root = workspace({
      "go.mod": "",
      ".kb/proof/integrations.json": "{",
    });
    const inspection = inspectProofEnvironment(root);
    expect(inspection.currentIntegration).toBe(null);
    expect(inspection.currentIntegrations).toStrictEqual([]);
    expect(inspection.integrationPlan).toBe(null);
    expect(inspection.recommendation).toBe(
      "No test harness detected. Proof integration is deferred until the first proof-bearing test introduces one; command proof can prove any command.",
    );
    expect(
      inspectProofEnvironment(root, { update: "unit" }).recommendation,
    ).toBe(
      "No test harness detected. Proof integration is deferred until the first proof-bearing test introduces one; command proof can prove any command.",
    );
  });
});

describe("directoryEntriesMatch", () => {
  test("tests each entry and tolerates unreadable directories", () => {
    const root = workspace({ "a.txt": "", "b.md": "" });
    expect(directoryEntriesMatch(root, /\.md$/)).toBe(true);
    expect(directoryEntriesMatch(root, /\.js$/)).toBe(false);
    expect(directoryEntriesMatch(path.join(root, "a.txt"), /a/)).toBe(false);
    expect(directoryEntriesMatch(path.join(root, "none"), /a/)).toBe(false);
  });
});

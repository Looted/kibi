import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { inspectProofEnvironment } from "../../src/proof/inspect.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    removeTempDir(root);
  }
});

function workspace(): string {
  const root = createTempDir("kibi-proof-inspect-");
  roots.push(root);
  return root;
}

describe("inspectProofEnvironment", () => {
  test("recommends deferred proof when no harness is present", () => {
    const root = workspace();
    const inspection = inspectProofEnvironment(root);
    expect(inspection.detectedRunners).toEqual([]);
    expect(inspection.languages).toEqual([]);
    expect(inspection.recommendation).toContain("No test harness detected");
    expect(inspection.missing).toEqual([
      ".kb/proof/integrations.json (created by bootstrap)",
    ]);
  });

  test("detects package.json scripts, bun lockfile, and npm test runner", () => {
    const root = workspace();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "demo",
        scripts: { test: "bun test", dependencies: "ignored" },
        devDependencies: { bun: "1.0.0" },
      }),
    );
    writeFileSync(path.join(root, "bun.lock"), "{}\n");
    const inspection = inspectProofEnvironment(root);
    expect(inspection.languages).toContain("javascript/typescript");
    expect(inspection.buildSystems).toEqual(expect.arrayContaining(["bun", "npm"]));
    expect(inspection.detectedRunners).toContain("npm test");
    expect(inspection.recommendation).toContain("Run bootstrap");
  });

  test("detects language runners, CI workflows, and configured integrations", () => {
    const root = workspace();
    writeFileSync(path.join(root, "playwright.config.ts"), "export default {};\n");
    writeFileSync(path.join(root, "vitest.config.ts"), "export default {};\n");
    writeFileSync(path.join(root, "jest.config.js"), "module.exports = {};\n");
    writeFileSync(path.join(root, "pytest.ini"), "[pytest]\n");
    writeFileSync(path.join(root, "go.mod"), "module example\n");
    writeFileSync(path.join(root, "Cargo.toml"), "[package]\nname='demo'\n");
    writeFileSync(path.join(root, "pom.xml"), "<project></project>\n");
    writeFileSync(path.join(root, "build.gradle"), "plugins {}\n");
    writeFileSync(path.join(root, "app.csproj"), "<Project></Project>\n");
    writeFileSync(path.join(root, "Rakefile"), "task :test\n");
    writeFileSync(path.join(root, "Makefile"), "test:\n\ttrue\n");
    mkdirSync(path.join(root, ".github", "workflows"), { recursive: true });
    writeFileSync(path.join(root, ".github", "workflows", "ci.yml"), "name: ci\n");
    writeFileSync(path.join(root, ".github", "workflows", "notes.txt"), "skip\n");
    mkdirSync(path.join(root, ".kb", "proof"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "proof", "integrations.json"),
      JSON.stringify({
        version: "kibi.proof-integration.v1",
        integrations: [
          {
            id: "playwright",
            producer: "playwright",
            command: ["npx", "playwright", "test"],
          },
          {
            id: "command",
            producer: "command",
            command: ["bun", "test"],
          },
        ],
      }),
    );

    const inspection = inspectProofEnvironment(root);
    expect(inspection.languages).toEqual(
      expect.arrayContaining([
        "csharp",
        "go",
        "java",
        "python",
        "ruby",
        "rust",
        "typescript",
      ]),
    );
    expect(inspection.buildSystems).toEqual(
      expect.arrayContaining(["cargo", "go", "make", "maven"]),
    );
    expect(inspection.detectedRunners).toEqual(
      expect.arrayContaining([
        "playwright",
        "vitest",
        "jest",
        "pytest",
        "go test",
        "cargo test",
        "maven",
        "gradle",
        "dotnet test",
        "rake test",
      ]),
    );
    expect(inspection.ciWorkflows).toEqual(["ci.yml"]);
    expect(inspection.currentIntegration).toContain("playwright");
    expect(inspection.recommendation).toContain("kibi prove --all");
    expect(inspection.missing).toEqual([]);
  });

  test("treats invalid package.json as absent scripts", () => {
    const root = workspace();
    writeFileSync(path.join(root, "package.json"), "{not json");
    const inspection = inspectProofEnvironment(root);
    expect(inspection.languages).toContain("javascript/typescript");
    expect(inspection.detectedRunners).not.toContain("npm test");
  });
});

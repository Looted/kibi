import { afterEach, beforeEach, describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkWorkspaceHealth } from "../src/workspace-health";

// implements REQ-opencode-kibi-plugin-v1

describe("workspace-health checkWorkspaceHealth", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-health-test-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  });

  it("detects missing .kb/config.json", () => {
    // Create ALL standard documentation dirs and symbols file so missingDocDirs stays empty,
    // isolating the missing-config behaviour under test.
    const otherDocDirs = [
      "documentation/requirements",
      "documentation/scenarios",
      "documentation/tests",
      "documentation/adr",
      "documentation/flags",
      "documentation/events",
      "documentation/facts",
    ];
    for (const dir of otherDocDirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, "documentation", "symbols.yaml"), "[]");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.missingConfig, true);
    assert.equal(result.needsBootstrap, true);
  });

  it("detects present .kb/config.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "config.json"), "{}");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.missingConfig, false);
  });

  it("detects missing documentation directories", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.ok(result.missingDocDirs.length > 0);
    assert.ok(result.missingDocDirs.includes("documentation/requirements"));
  });

  it("detects present documentation directories", () => {
    const docsDir = path.join(tmpDir, "documentation", "requirements");
    fs.mkdirSync(docsDir, { recursive: true });

    const result = checkWorkspaceHealth(tmpDir);
    assert.ok(!result.missingDocDirs.includes("documentation/requirements"));
  });

  it("needs bootstrap when config is missing", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.needsBootstrap, true);
  });

  it("needs bootstrap when multiple doc dirs are missing", () => {
    // Only create one doc dir, leave others missing
    const reqDir = path.join(tmpDir, "documentation", "requirements");
    fs.mkdirSync(reqDir, { recursive: true });

    const result = checkWorkspaceHealth(tmpDir);
    // Still needs bootstrap because threshold is > 2 missing dirs
    assert.equal(result.needsBootstrap, true);
  });

  it("does not need bootstrap when fully configured", () => {
    // Create .kb/config.json
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "config.json"), "{}");

    // Create all doc dirs required by KIBI_DOC_DIRS
    const docDirs = [
      "documentation/requirements",
      "documentation/scenarios",
      "documentation/tests",
      "documentation/adr",
      "documentation/flags",
      "documentation/events",
      "documentation/facts",
    ];
    for (const dir of docDirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }

    // Create symbols.yaml in documentation/
    fs.writeFileSync(path.join(tmpDir, "documentation", "symbols.yaml"), "[]");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.needsBootstrap, false);
    assert.equal(result.missingConfig, false);
  });

  it("detects Kibi evidence when .kb directory exists", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "config.json"), "{}");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.hasKbEvidence, true);
  });

  it("detects no Kibi evidence when .kb directory is absent", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.hasKbEvidence, false);
  });

  it("does not need bootstrap when configured sync paths exist outside documentation", () => {
    // Create .kb/config.json with custom paths under kibi-docs/
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          requirements: "kibi-docs/requirements/**/*.md",
          scenarios: "kibi-docs/scenarios/**/*.md",
          tests: "kibi-docs/tests/**/*.md",
          adr: "kibi-docs/adr/**/*.md",
          flags: "kibi-docs/flags/**/*.md",
          events: "kibi-docs/events/**/*.md",
          facts: "kibi-docs/facts/**/*.md",
          symbols: "kibi-docs/symbols.yaml",
        },
      }),
    );

    // Create all custom directories and the symbols file
    const customDirs = [
      "kibi-docs/requirements",
      "kibi-docs/scenarios",
      "kibi-docs/tests",
      "kibi-docs/adr",
      "kibi-docs/flags",
      "kibi-docs/events",
      "kibi-docs/facts",
    ];
    for (const dir of customDirs) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, "kibi-docs", "symbols.yaml"), "[]");

    const result = checkWorkspaceHealth(tmpDir);
    // With the fix: custom paths exist, so no doc dirs should be missing
    assert.equal(
      result.missingDocDirs.length,
      0,
      `Expected no missing dirs but got: ${result.missingDocDirs.join(", ")}`,
    );
    assert.equal(result.needsBootstrap, false);
  });

  it("uses configured sync targets when a relocated path is missing", () => {
    // Create .kb/config.json with custom paths but do NOT create the directories
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          requirements: "kibi-docs/requirements/**/*.md",
          scenarios: "kibi-docs/scenarios/**/*.md",
          tests: "kibi-docs/tests/**/*.md",
          adr: "kibi-docs/adr/**/*.md",
          flags: "kibi-docs/flags/**/*.md",
          events: "kibi-docs/events/**/*.md",
          facts: "kibi-docs/facts/**/*.md",
          symbols: "kibi-docs/symbols.yaml",
        },
      }),
    );
    // Only create one of the custom dirs
    fs.mkdirSync(path.join(tmpDir, "kibi-docs", "requirements"), {
      recursive: true,
    });

    const result = checkWorkspaceHealth(tmpDir);
    // With the fix: missing dirs should be the custom paths that don't exist
    assert.ok(result.missingDocDirs.length > 0);
    assert.ok(
      result.missingDocDirs.some((d) => d.includes("kibi-docs")),
      `Expected kibi-docs paths in missing but got: ${result.missingDocDirs.join(", ")}`,
    );
    assert.ok(
      !result.missingDocDirs.includes("kibi-docs/requirements"),
      "requirements dir was created, should not be missing",
    );
  });

  it("honors symbols.yaml relocation in config", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          requirements: "requirements/**/*.md",
          scenarios: "scenarios/**/*.md",
          tests: "tests/**/*.md",
          adr: "adr/**/*.md",
          flags: "flags/**/*.md",
          events: "events/**/*.md",
          facts: "facts/**/*.md",
          symbols: "data/symbols.yaml",
        },
      }),
    );

    // Create standard dirs
    for (const dir of [
      "requirements",
      "scenarios",
      "tests",
      "adr",
      "flags",
      "events",
      "facts",
    ]) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    // Create relocated symbols file at data/symbols.yaml
    fs.mkdirSync(path.join(tmpDir, "data"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "data", "symbols.yaml"), "[]");

    const result = checkWorkspaceHealth(tmpDir);
    // symbols.yaml at data/ should not be missing
    assert.ok(
      !result.missingDocDirs.some((d) => d.includes("symbols")),
      `symbols should not be missing but got: ${result.missingDocDirs.join(", ")}`,
    );
  });

  it("merges partial path overrides and normalizes trailing slashes", () => {
    // Create .kb/config.json with partial overrides (only requirements and scenarios)
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          // include trailing slashes to ensure normalization is handled
          requirements: "kibi-docs/requirements/",
          scenarios: "kibi-docs/scenarios/",
        },
      }),
    );

    // Create the overridden dirs with trailing slashes in name (filesystem ignores slash)
    fs.mkdirSync(path.join(tmpDir, "kibi-docs", "requirements"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(tmpDir, "kibi-docs", "scenarios"), {
      recursive: true,
    });
    // Do NOT create the rest of the default documentation dirs or symbols file; they should be reported missing
    const result = checkWorkspaceHealth(tmpDir);
    // The health check should normalize the configured paths and not report them missing
    assert.ok(
      !result.missingDocDirs.some((d) => d.includes("kibi-docs/requirements")),
      `requirements override should not be missing but got: ${result.missingDocDirs.join(", ")}`,
    );
    assert.ok(
      !result.missingDocDirs.some((d) => d.includes("kibi-docs/scenarios")),
      `scenarios override should not be missing but got: ${result.missingDocDirs.join(", ")}`,
    );

    // Default documentation dirs and symbols.yaml that were not created should be reported missing
    const expectedMissing = [
      "tests",
      "adr",
      "flags",
      "events",
      "facts",
      "symbols.yaml",
    ];
    for (const e of expectedMissing) {
      assert.ok(
        result.missingDocDirs.some((d) => d.includes(e)),
        `Expected ${e} to be reported missing but it was not. Missing list: ${result.missingDocDirs.join(", ")}`,
      );
    }
  });
});

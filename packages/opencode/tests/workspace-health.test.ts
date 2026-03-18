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
});

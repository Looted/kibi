import { afterEach, beforeEach, describe, it } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { checkWorkspaceHealth } from "../src/workspace-health";
import { createTempRepoFromFixture } from "./test-fixture-helpers";

// implements REQ-opencode-kibi-plugin-v1

const CANONICAL_LANES = [
  ".kb/requirements",
  ".kb/scenarios",
  ".kb/tests",
  ".kb/adr",
  ".kb/flags",
  ".kb/events",
  ".kb/facts",
];

function writeCanonicalLanes(root: string, withSymbols = true): void {
  for (const dir of CANONICAL_LANES) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  if (withSymbols) {
    fs.writeFileSync(path.join(root, ".kb", "symbols.yaml"), "[]");
  }
}

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

  it("detects missing .kb/manifest.json", () => {
    writeCanonicalLanes(tmpDir);
    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.missingConfig, true);
    assert.equal(result.needsBootstrap, true);
  });

  it("detects present .kb/manifest.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "manifest.json"), "{}");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.missingConfig, false);
  });

  it("treats leftover invalid config.json as irrelevant to canonical health", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "config.json"), "{invalid-json");

    const result = checkWorkspaceHealth(tmpDir);

    assert.equal(result.missingConfig, true);
    assert.ok(result.missingDocDirs.includes(".kb/requirements"));
    assert.equal(result.needsBootstrap, true);
  });

  it("detects missing canonical knowledge lanes", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.ok(result.missingDocDirs.length > 0);
    assert.ok(result.missingDocDirs.includes(".kb/requirements"));
  });

  it("detects present canonical knowledge lanes", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb", "requirements"), { recursive: true });

    const result = checkWorkspaceHealth(tmpDir);
    assert.ok(!result.missingDocDirs.includes(".kb/requirements"));
  });

  it("needs bootstrap when manifest is missing", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.needsBootstrap, true);
  });

  it("needs bootstrap when multiple canonical lanes are missing", () => {
    fs.mkdirSync(path.join(tmpDir, ".kb", "requirements"), { recursive: true });

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.needsBootstrap, true);
  });

  it("does not need bootstrap when fully configured", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "manifest.json"), "{}");
    writeCanonicalLanes(tmpDir);

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.needsBootstrap, false);
    assert.equal(result.missingConfig, false);
  });

  it("detects Kibi evidence when .kb directory exists", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(path.join(kbDir, "manifest.json"), "{}");

    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.hasKbEvidence, true);
  });

  it("detects no Kibi evidence when .kb directory is absent", () => {
    const result = checkWorkspaceHealth(tmpDir);
    assert.equal(result.hasKbEvidence, false);
  });

  it("ignores leftover config.json custom paths outside .kb/", () => {
    const kbDir = path.join(tmpDir, ".kb");
    fs.mkdirSync(kbDir, { recursive: true });
    fs.writeFileSync(
      path.join(kbDir, "config.json"),
      JSON.stringify({
        paths: {
          requirements: "kibi-docs/requirements/**/*.md",
          symbols: "kibi-docs/symbols.yaml",
        },
      }),
    );
    for (const dir of [
      "kibi-docs/requirements",
      "kibi-docs/scenarios",
      "kibi-docs/tests",
      "kibi-docs/adr",
      "kibi-docs/flags",
      "kibi-docs/events",
      "kibi-docs/facts",
    ]) {
      fs.mkdirSync(path.join(tmpDir, dir), { recursive: true });
    }
    fs.writeFileSync(path.join(tmpDir, "kibi-docs", "symbols.yaml"), "[]");

    const result = checkWorkspaceHealth(tmpDir);
    assert.ok(result.missingDocDirs.includes(".kb/requirements"));
    assert.ok(result.missingDocDirs.includes(".kb/symbols.yaml"));
    assert.equal(result.missingConfig, true);
  });

  it("uses fixture-backed vendored-only posture without bootstrap", () => {
    const repo = createTempRepoFromFixture("vendored-only");
    try {
      const result = checkWorkspaceHealth(repo.path);
      assert.equal(result.needsBootstrap, false);
    } finally {
      repo.cleanup();
    }
  });

  it("uses fixture-backed hybrid posture with healthy root", () => {
    const repo = createTempRepoFromFixture("hybrid-root-plus-vendored");
    try {
      const result = checkWorkspaceHealth(repo.path);
      assert.equal(result.needsBootstrap, false);
      assert.equal(result.missingConfig, false);
    } finally {
      repo.cleanup();
    }
  });
});

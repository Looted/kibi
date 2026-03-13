// Packed e2e test for local plugin loading
import { strict as assert } from "node:assert";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("opencode-plugin-local", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "kibi-e2e-"));

  beforeAll(() => {
    // Create minimal test repo structure
    mkdirSync(join(tmpDir, ".kb"), { recursive: true });
    mkdirSync(join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    mkdirSync(join(tmpDir, "src"), { recursive: true });

    // Create .kb/config.json
    writeFileSync(
      join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        paths: {
          requirements: "documentation/requirements/**/*.md",
        },
      }),
    );

    // Create a requirement file
    writeFileSync(
      join(tmpDir, "documentation", "requirements", "REQ-001.md"),
      `---
id: REQ-001
title: Test Requirement
status: active
---
# Test`,
    );

    // Create unrelated source file
    writeFileSync(join(tmpDir, "src", "main.ts"), "console.log('hello');");
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("plugin package can be loaded", async () => {
    // Verify the package can be imported
    const pkg = await import("../../packages/opencode/src/index.ts");
    assert.ok(pkg.default !== undefined);
  });

  test("plugin exports required functions", async () => {
    const { injectPrompt, buildPrompt } = await import(
      "../../packages/opencode/src/prompt.ts"
    );
    const { loadConfig } = await import(
      "../../packages/opencode/src/config.ts"
    );
    const { shouldHandleFile } = await import(
      "../../packages/opencode/src/file-filter.ts"
    );
    const { createSyncScheduler } = await import(
      "../../packages/opencode/src/scheduler.ts"
    );

    assert.ok(typeof injectPrompt === "function");
    assert.ok(typeof buildPrompt === "function");
    assert.ok(typeof loadConfig === "function");
    assert.ok(typeof shouldHandleFile === "function");
    assert.ok(typeof createSyncScheduler === "function");
  });

  test("relevant file triggers sync eligibility", () => {
    const {
      shouldHandleFile,
    } = require("../../packages/opencode/src/file-filter.ts");
    const result = shouldHandleFile(
      "documentation/requirements/REQ-001.md",
      tmpDir,
    );
    assert.equal(result, true);
  });

  test("irrelevant file does not trigger sync", () => {
    const {
      shouldHandleFile,
    } = require("../../packages/opencode/src/file-filter.ts");
    const result = shouldHandleFile("src/main.ts", tmpDir);
    assert.equal(result, false);
  });
});

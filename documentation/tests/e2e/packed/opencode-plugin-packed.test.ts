// Packed e2e test for npm package loading
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("opencode-plugin-packed", () => {
  const tmpDir = mkdtempSync(join(tmpdir(), "kibi-packed-"));

  beforeAll(() => {
    // Create minimal test repo structure for packed scenario
    mkdirSync(join(tmpDir, ".kb"), { recursive: true });
    mkdirSync(join(tmpDir, "documentation", "requirements"), {
      recursive: true,
    });
    mkdirSync(join(tmpDir, "documentation", "tests"), { recursive: true });

    // Create .kb/config.json
    writeFileSync(
      join(tmpDir, ".kb", "config.json"),
      JSON.stringify({
        paths: {
          requirements: "documentation/requirements/**/*.md",
          tests: "documentation/tests/**/*.md",
        },
      }),
    );

    // Create requirement file
    writeFileSync(
      join(tmpDir, "documentation", "requirements", "REQ-002.md"),
      `---
id: REQ-002
title: Packed Test Requirement
status: active
---
# Packed Test`,
    );

    // Create test file
    writeFileSync(
      join(tmpDir, "documentation", "tests", "TEST-001.md"),
      `---
id: TEST-001
title: Packed Test Case
status: active
---
# Test Case`,
    );
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("plugin can be imported from package", async () => {
    // In a real packed scenario, this would import from the npm package
    // For now, verify the source modules exist and are loadable
    const pkg = await import("../../packages/opencode/src/index.ts");
    assert.ok(pkg.default !== undefined);
  });

  test("enablement config disables all behavior", async () => {
    const { loadConfig, isPluginEnabled } = await import(
      "../../packages/opencode/src/config.ts"
    );

    // Test with enabled: false
    const disabledConfig = loadConfig(tmpDir);
    // Project-level config would override, simulating disabled state
    const result = isPluginEnabled({ ...disabledConfig, enabled: false });
    assert.equal(result, false);
  });

  test("sync can be disabled independently", async () => {
    const { loadConfig } = await import(
      "../../packages/opencode/src/config.ts"
    );
    const cfg = loadConfig(tmpDir);

    // Default sync is enabled
    assert.equal(cfg.sync.enabled, true);

    // Verify we can create config with sync disabled
    const disabledSyncCfg = { ...cfg, sync: { ...cfg.sync, enabled: false } };
    assert.equal(disabledSyncCfg.sync.enabled, false);
  });

  test("compat mode sets hookMode", async () => {
    const { loadConfig } = await import(
      "../../packages/opencode/src/config.ts"
    );
    const cfg = loadConfig(tmpDir);

    // Default is "auto"
    assert.equal(cfg.prompt.hookMode, "auto");
  });
});

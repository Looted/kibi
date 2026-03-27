import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveCorePlPath,
  runJsonModuleQuery,
} from "../../src/tools/core-module.js";

// Track created temp dirs for cleanup
const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-core-module-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  // Clean up env overrides after each test
  delete process.env.KIBI_DISCOVERY_PL_PATH;
  delete process.env.KIBI_CHECKS_PL_PATH;
  delete process.env.KIBI_KB_PL_PATH;

  // Clean up temp dirs
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("resolveCorePlPath", () => {
  test("KIBI_DISCOVERY_PL_PATH override wins over sibling derivation", () => {
    const tmpDir = makeTempDir();
    const overridePath = path.join(tmpDir, "discovery.pl");
    writeFileSync(overridePath, "% override\n");

    // Also set up a valid KIBI_KB_PL_PATH so sibling derivation would produce a different path
    const coreDir = makeTempDir();
    mkdirSync(path.join(coreDir, "src"), { recursive: true });
    writeFileSync(path.join(coreDir, "src", "kb.pl"), "% kb\n");
    writeFileSync(path.join(coreDir, "src", "discovery.pl"), "% sibling\n");
    process.env.KIBI_KB_PL_PATH = path.join(coreDir, "src", "kb.pl");

    process.env.KIBI_DISCOVERY_PL_PATH = overridePath;

    const result = resolveCorePlPath("discovery.pl");
    expect(result).toBe(overridePath);
  });

  test("KIBI_KB_PL_PATH causes sibling derivation for discovery.pl and checks.pl", () => {
    const coreDir = makeTempDir();
    mkdirSync(path.join(coreDir, "src"), { recursive: true });

    const kbPath = path.join(coreDir, "src", "kb.pl");
    const discoveryPath = path.join(coreDir, "src", "discovery.pl");
    const checksPath = path.join(coreDir, "src", "checks.pl");

    writeFileSync(kbPath, "% kb\n");
    writeFileSync(discoveryPath, "% discovery\n");
    writeFileSync(checksPath, "% checks\n");

    process.env.KIBI_KB_PL_PATH = kbPath;

    expect(resolveCorePlPath("discovery.pl")).toBe(discoveryPath);
    expect(resolveCorePlPath("checks.pl")).toBe(checksPath);
  });

  test("throws root-consistency error when sibling is missing under explicit KIBI_KB_PL_PATH", () => {
    const coreDir = makeTempDir();
    mkdirSync(path.join(coreDir, "src"), { recursive: true });

    const kbPath = path.join(coreDir, "src", "kb.pl");
    writeFileSync(kbPath, "% kb\n");
    // Note: discovery.pl is intentionally NOT created

    process.env.KIBI_KB_PL_PATH = kbPath;

    expect(() => resolveCorePlPath("discovery.pl")).toThrow(
      "Root-consistency error",
    );
  });
});

describe("runJsonModuleQuery", () => {
  test("emits use_module with derived sibling path for discovery.pl", async () => {
    const coreDir = makeTempDir();
    mkdirSync(path.join(coreDir, "src"), { recursive: true });

    const kbPath = path.join(coreDir, "src", "kb.pl");
    const discoveryPath = path.join(coreDir, "src", "discovery.pl");

    writeFileSync(kbPath, "% kb\n");
    writeFileSync(discoveryPath, "% discovery\n");

    process.env.KIBI_KB_PL_PATH = kbPath;

    // Capture the query string emitted
    let capturedQuery: string | undefined;

    const mockProlog = {
      query: async (goal: string) => {
        capturedQuery = goal;
        return {
          success: true,
          bindings: { JsonString: JSON.stringify([]) },
          error: undefined,
        };
      },
    };

    await runJsonModuleQuery(
      mockProlog,
      "discovery.pl",
      "my_goal(JsonString)",
      "test",
    );

    expect(capturedQuery).toBeDefined();
    // The path in the query should use the derived sibling path (forward slashes for Prolog)
    const expectedModulePath = discoveryPath.replace(/\\/g, "/");
    expect(capturedQuery).toContain(`use_module('${expectedModulePath}')`);
  });
});

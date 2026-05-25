/**
 * Tests for the version metadata resolver.
 *
 * Tests cover all three resolution strategies and the never-throws contract.
 */
import { describe, test, expect } from "bun:test";
import { readKibiPackageVersions } from "../src/version-metadata";

describe("readKibiPackageVersions", () => {
  test("never throws under any condition", () => {
    expect(() => readKibiPackageVersions()).not.toThrow();
    expect(() =>
      readKibiPackageVersions({
        baseUrl: new URL("file:///nonexistent-path-that-definitely-does-not-exist/"),
      }),
    ).not.toThrow();
    expect(() =>
      readKibiPackageVersions({
        readFileSync: () => {
          throw new Error("simulated failure");
        },
      }),
    ).not.toThrow();
  });

  test("reads generated dist JSON when available (after build)", () => {
    // Point baseUrl at the dist/ directory so ./version-metadata.json resolves
    const distUrl = new URL("../dist/version-metadata.js", import.meta.url);
    const result = readKibiPackageVersions({ baseUrl: distUrl });

    expect(result.source).toBe("generated-dist");
    // Specific versions to match current package.json values
    expect(result.opencode).toBe("0.14.0");
    expect(result.mcp).toBe("0.14.1");
    expect(result.cli).toBe("0.11.0");
    expect(result.core).toBe("0.5.3");
    expect(result.missing).toEqual([]);
  });

  test("falls back to workspace package.json when dist JSON absent", () => {
    // Point baseUrl at the src/ directory — no version-metadata.json there,
    // but ../package.json, ../../mcp/package.json, etc. resolve correctly.
    const srcUrl = new URL("../src/version-metadata.ts", import.meta.url);
    const result = readKibiPackageVersions({ baseUrl: srcUrl });

    expect(result.source).toBe("workspace-packages");
    expect(result.opencode).toBe("0.14.0");
    expect(result.mcp).toBe("0.14.1");
    expect(result.cli).toBe("0.11.0");
    expect(result.core).toBe("0.5.3");
    expect(result.missing).toEqual([]);
  });

  test("returns source=unknown with all missing when nothing is readable", () => {
    const result = readKibiPackageVersions({
      baseUrl: new URL("file:///tmp/kibi-test-nonexistent-path/"),
    });

    expect(result.source).toBe("unknown");
    expect(result.opencode).toBe("unknown");
    expect(result.mcp).toBe("unknown");
    expect(result.cli).toBe("unknown");
    expect(result.core).toBe("unknown");
    expect(result.missing).toEqual(["opencode", "mcp", "cli", "core"]);
  });
});

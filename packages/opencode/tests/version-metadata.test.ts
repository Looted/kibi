/**
 * Tests for the version metadata resolver.
 *
 * Tests cover all three resolution strategies and the never-throws contract.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { readKibiPackageVersions } from "../src/version-metadata";

describe("readKibiPackageVersions", () => {
  test("never throws under any condition", () => {
    expect(() => readKibiPackageVersions()).not.toThrow();
    expect(() =>
      readKibiPackageVersions({
        baseUrl: new URL(
          "file:///nonexistent-path-that-definitely-does-not-exist/",
        ),
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

  test("reads generated dist JSON when available (injected)", () => {
    const fakeMetadata = {
      opencode: "1.0.0",
      mcp: "1.1.0",
      cli: "0.9.0",
      core: "0.4.0",
    };
    const result = readKibiPackageVersions({
      readFileSync: (path: string | URL) => {
        if (String(path).endsWith("version-metadata.json")) {
          return JSON.stringify(fakeMetadata);
        }
        throw new Error("not found");
      },
    });
    expect(result.source).toBe("generated-dist");
    expect(result.opencode).toBe("1.0.0");
    expect(result.mcp).toBe("1.1.0");
    expect(result.cli).toBe("0.9.0");
    expect(result.core).toBe("0.4.0");
    expect(result.missing).toEqual([]);
  });

  test("falls back to workspace package.json when dist JSON absent", () => {
    // Point baseUrl at the src/ directory — no version-metadata.json there,
    // but ../package.json, ../../mcp/package.json, etc. resolve correctly.
    const srcUrl = new URL("../src/version-metadata.ts", import.meta.url);
    const result = readKibiPackageVersions({ baseUrl: srcUrl });

    // Read actual versions dynamically so version bumps don't break the test
    const readPkg = (rel: string) =>
      JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf-8"));
    expect(result.source).toBe("workspace-packages");
    expect(result.opencode).toBe(readPkg("../package.json").version);
    expect(result.mcp).toBe(readPkg("../../mcp/package.json").version);
    expect(result.cli).toBe(readPkg("../../cli/package.json").version);
    expect(result.core).toBe(readPkg("../../core/package.json").version);
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

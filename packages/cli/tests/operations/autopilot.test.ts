import { describe, expect, mock, test } from "bun:test";

import { autopilotGenerateSpec } from "../../src/public/operations/specs/autopilot.js";

describe("shared autopilot executor", () => {
  test("uses workspace ports, clamps limits, and preserves nested bootstrap context", async () => {
    // Given: a cold-start workspace exposed only through explicit runtime ports.
    const writeFile = mock(async () => undefined);
    const mkdir = mock(async () => undefined);
    const context = {
      workspaceRoot: "/workspace/autopilot-fixture",
      signal: new AbortController().signal,
      clock: () => new Date("2026-07-21T00:00:00Z"),
      fs: {
        readFile: async (filePath: string) => {
          if (filePath.endsWith("package.json")) {
            return JSON.stringify({
              name: "fixture",
              scripts: { test: "bun test" },
            });
          }
          throw new Error(`Unexpected read: ${filePath}`);
        },
        writeFile,
        mkdir,
        stat: async () => ({ isFile: () => true, isDirectory: () => false }),
        glob: async () => ["package.json"],
      },
      git: {
        revParse: async () => "develop",
        showToplevel: async () => "/workspace/autopilot-fixture",
        ignoredPaths: async () => [],
      },
    };

    // When: limits below the public bounds and declared nested context are supplied.
    const result = await autopilotGenerateSpec.execute(
      {
        minConfidence: 0,
        maxCandidates: 0,
        bootstrapContext: {
          projectSummary: "  Port-backed fixture  ",
          sourceOfTruthPaths: ["README.md", "README.md"],
          verificationAnchors: ["bun test"],
        },
      },
      context,
    );

    // Then: synthesis is deterministic, normalized, bounded, and read-only.
    expect(result.structuredContent?.declaredContext).toEqual({
      projectSummary: "Port-backed fixture",
      sourceOfTruthPaths: ["README.md"],
      sourceOfTruthNotes: [],
      priorityRoots: [],
      verificationAnchors: ["bun test"],
    });
    expect(result.structuredContent?.candidates).toHaveLength(1);
    expect(result.structuredContent?.applyPlan).toHaveLength(1);
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });
});

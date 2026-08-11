import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { checkSpec } from "../../src/public/operations/specs/check.js";

function createContext(
  query: (goal: string) => Promise<PrologQueryResult>,
  workspaceRoot = path.join(os.tmpdir(), "kibi-check-no-usage-log"),
): OperationContext {
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-07-21T00:00:00Z"),
    prolog,
  };
}

function emptyFullQualityResult(goal: string): PrologQueryResult | undefined {
  if (goal.includes("kb_entity")) {
    return { success: true, bindings: { Results: "[]" } };
  }
  if (goal.includes("kb_relationship")) {
    return { success: true, bindings: { Rels: "[]" } };
  }
  return undefined;
}

describe("shared check operation executor", () => {
  test("returns no violations for empty aggregated result", async () => {
    // Given: an aggregated Prolog response with no violations and empty KB tables.
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      const fullQuality = emptyFullQualityResult(goal);
      if (fullQuality !== undefined) return fullQuality;
      if (goal.includes("check_all_json")) {
        return {
          success: true,
          bindings: { JsonString: JSON.stringify({}) },
        };
      }
      return { success: true, bindings: {} };
    });

    // When: the shared executor runs the full check.
    const result = await checkSpec.execute({}, createContext(query));

    // Then: structured content reports zero violations and a summary text.
    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
    expect(result.content[0]?.text).toContain("No violations");
  });

  test("passes requireAdr true to symbol-traceability query", async () => {
    // Given: a workspace with requireAdr enabled via .kb/config.json.
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-check-shared-"),
    );
    mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
    writeFileSync(
      path.join(workspaceRoot, ".kb", "config.json"),
      JSON.stringify({
        checks: { symbolTraceability: { requireAdr: true } },
      }),
    );

    let capturedQuery = "";
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("check_all_json")) capturedQuery = goal;
      const fullQuality = emptyFullQualityResult(goal);
      if (fullQuality !== undefined) return fullQuality;
      if (goal.includes("check_all_json")) {
        return {
          success: true,
          bindings: { JsonString: JSON.stringify({}) },
        };
      }
      return { success: true, bindings: {} };
    });

    try {
      // When: executing the check operation.
      await checkSpec.execute({}, createContext(query, workspaceRoot));

      // Then: the aggregated Prolog query receives the requireAdr flag as true.
      expect(capturedQuery).toContain("check_all_json_with_options");
      expect(capturedQuery).toContain("true");
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("reports aggregated violations and maps them into diagnostics", async () => {
    // Given: an aggregated response with one hard violation.
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      const fullQuality = emptyFullQualityResult(goal);
      if (fullQuality !== undefined) return fullQuality;
      if (goal.includes("check_all_json")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify({
              "must-priority-coverage": [
                {
                  rule: "must-priority-coverage",
                  entityId: "REQ-MUST-001",
                  description:
                    "Must-priority requirement lacks scenario coverage",
                  suggestion: "Create scenario that covers this requirement",
                  source: "documentation/requirements/REQ-MUST-001.md",
                },
              ],
            }),
          },
        };
      }
      return { success: true, bindings: {} };
    });

    // When: running the check operation without an explicit rule filter.
    const result = await checkSpec.execute({}, createContext(query));

    // Then: the violation is surfaced with a SYNC_ERROR diagnostic mapping.
    expect(result.structuredContent?.count).toBe(1);
    expect(result.structuredContent?.violations[0]?.entityId).toBe(
      "REQ-MUST-001",
    );
    expect(result.structuredContent?.diagnostics[0]?.category).toBe(
      "SYNC_ERROR",
    );
  });

  test("forwards sourceFiles and impact options to impact diagnostics", async () => {
    // Given: an impact request for a non-existent source file.
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-check-impact-"),
    );
    mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
    writeFileSync(path.join(workspaceRoot, "src", "no-such-file.ts"), "");
    try {
      const query = mock(async (goal: string): Promise<PrologQueryResult> => {
        const fullQuality = emptyFullQualityResult(goal);
        if (fullQuality !== undefined) return fullQuality;
        if (goal.includes("check_all_json")) {
          return {
            success: true,
            bindings: { JsonString: JSON.stringify({}) },
          };
        }
        return { success: true, bindings: {} };
      });

      // When: invoking with includeImpactDiagnostics and a sourceFiles list.
      const result = await checkSpec.execute(
        {
          sourceFiles: ["src/no-such-file.ts"],
          includeImpactDiagnostics: true,
        },
        createContext(query, workspaceRoot),
      );

      // Then: the structured content echoes sourceFiles and exposes impact diagnostics.
      expect(result.structuredContent?.sourceFiles).toEqual([
        "src/no-such-file.ts",
      ]);
      expect(Array.isArray(result.structuredContent?.impactDiagnostics)).toBe(
        true,
      );
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("returns empty violations but full quality diagnostics when rules is an empty array", async () => {
    // Given: an explicit empty rule allowlist and a KB with no entities.
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      const fullQuality = emptyFullQualityResult(goal);
      if (fullQuality !== undefined) return fullQuality;
      return { success: true, bindings: {} };
    });

    // When: running the check with rules: [].
    const result = await checkSpec.execute({ rules: [] }, createContext(query));

    // Then: no aggregated Prolog call runs and the result stays clean.
    expect(query).not.toHaveBeenCalled();
    expect(result.structuredContent?.violations).toEqual([]);
    expect(result.structuredContent?.count).toBe(0);
  });
});

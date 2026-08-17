import { describe, expect, mock, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  type RelationshipParityRecord,
  compareRelationshipParity,
  parseCompiledRelationshipRows,
} from "../../src/public/operations/source-relationship-parity.js";
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
  test("keeps the authored relationship parity record contract explicit", () => {
    const record: RelationshipParityRecord = {
      type: "implements",
      from: "SYM-PARITY",
      to: "REQ-PARITY",
      source: "documentation/symbols.yaml",
      ownership: "authored",
    };

    expect(record).toEqual({
      type: "implements",
      from: "SYM-PARITY",
      to: "REQ-PARITY",
      source: "documentation/symbols.yaml",
      ownership: "authored",
    });
  });

  test("detects authored relationship loss without collapsing repeated or unrelated edges", () => {
    const violations = compareRelationshipParity(
      [
        {
          type: "requires_property",
          from: "REQ-1",
          to: "FACT-A",
          source: "documentation/requirements/REQ-1.md",
        },
        {
          type: "requires_property",
          from: "REQ-1",
          to: "FACT-B",
          source: "documentation/requirements/REQ-1.md",
        },
        {
          type: "specified_by",
          from: "REQ-1",
          to: "SCEN-KEEP",
          source: "documentation/requirements/REQ-1.md",
        },
      ],
      [
        { type: "requires_property", from: "REQ-1", to: "FACT-A" },
        { type: "specified_by", from: "REQ-1", to: "SCEN-KEEP" },
      ],
    );

    expect(violations).toEqual([
      expect.objectContaining({
        rule: "source-relationship-parity",
        entityId: "REQ-1",
        description: expect.stringContaining("requires_property REQ-1->FACT-B"),
        evidence: expect.objectContaining({
          direction: "authored_to_compiled",
        }),
      }),
    ]);
  });

  test("does not require authored ownership for explicitly runtime-only relationships", () => {
    const violations = compareRelationshipParity(
      [
        {
          type: "specified_by",
          from: "REQ-AUTHORED",
          to: "SCEN-MISSING",
          source: "documentation/requirements/REQ-AUTHORED.md",
        },
      ],
      [
        {
          type: "validates",
          from: "TEST-RUNTIME",
          to: "SCEN-RUNTIME",
          source: "test://fixture",
          ownership: "runtime",
        },
      ],
    );

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatchObject({
      entityId: "REQ-AUTHORED",
      evidence: { direction: "authored_to_compiled" },
    });
  });

  test("normalizes quoted Prolog entity IDs before parity comparison", () => {
    expect(
      parseCompiledRelationshipRows(
        "specified_by",
        "[['REQ-PARITY-E2E','SCEN-PARITY-E2E',\"documentation/requirements/REQ-PARITY-E2E.md\"]]",
      ),
    ).toEqual([
      {
        type: "specified_by",
        from: "REQ-PARITY-E2E",
        to: "SCEN-PARITY-E2E",
        source: "documentation/requirements/REQ-PARITY-E2E.md",
        ownership: "authored",
      },
    ]);
  });

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

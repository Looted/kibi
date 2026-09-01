import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrologProcess, type QueryResult } from "../../../src/prolog.js";
import { collectFullKbQualityDiagnostics } from "../../../src/public/impact/full-kb-quality.js";

const entityRows = [
  [
    "'REQ-NORMATIVE'",
    "req",
    "[title='Users must keep audit data',status=active,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='docs/REQ-NORMATIVE.md',tags=[policy],sourceFile='src/a.ts']",
  ],
  [
    "'SYM-UPLOAD'",
    "symbol",
    "[title='upload',status=active,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='.kb/symbols.yaml',source_file='src/a.ts',symbol_kind=function,symbol_role=behavioral,sourceLine=^^(\"1\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceColumn=^^(\"2\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndLine=^^(\"3\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndColumn=^^(\"4\", 'http://www.w3.org/2001/XMLSchema#integer')]",
  ],
  [
    "'TEST-UPLOAD'",
    "test",
    "[title='upload test',status=passing,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='tests/upload.test.ts',verification_scope=unit,fact_kind=meta]",
  ],
] as const;

function makeProlog(
  options: { readonly coverageProof?: boolean } = {},
): PrologProcess {
  const prolog = new PrologProcess();
  prolog.query = async (
    goal: string | readonly string[],
  ): Promise<QueryResult> => {
    const text = Array.isArray(goal) ? goal.join(",") : goal;
    if (text.includes("kb_entity")) {
      return {
        success: true,
        bindings: {
          Results: `[${entityRows.map((row) => `[${row.join(",")}]`).join(",")}]`,
        },
      };
    }
    if (text.includes("kb_relationship(implements")) {
      return {
        success: true,
        bindings: { Rels: "[['SYM-UPLOAD','REQ-NORMATIVE',implements]]" },
      };
    }
    if (text.includes("kb_relationship(covered_by")) {
      return {
        success: true,
        bindings: { Rels: "[['REQ-NORMATIVE','TEST-UPLOAD',covered_by]]" },
      };
    }
    if (text.includes("coverage_report_json")) {
      return {
        success: true,
        bindings: {
          JsonString: JSON.stringify({
            rows: options.coverageProof
              ? [
                  {
                    id: "REQ-NORMATIVE",
                    proofStatus: "unresolved",
                    proofStages: {
                      passingE2e: {
                        status: "passed",
                        tests: ["TEST-UPLOAD"],
                      },
                    },
                    proofGaps: ["unresolved_semantic_proposition"],
                  },
                ]
              : [],
          }),
        },
      };
    }
    return { success: true, bindings: { Rels: "[]" } };
  };
  return prolog;
}

describe("collectFullKbQualityDiagnostics", () => {
  it("loads entities and relationships from Prolog and combines quality diagnostics", async () => {
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
    });

    expect(diagnostics.map((diagnostic) => diagnostic.id)).toContain(
      "logical_coverage_review",
    );
    expect(diagnostics.map((diagnostic) => diagnostic.id)).toContain(
      "coverage_depth_review",
    );
    expect(
      diagnostics.find((diagnostic) => diagnostic.entityId === "REQ-NORMATIVE"),
    ).toEqual(
      expect.objectContaining({
        source: "docs/REQ-NORMATIVE.md",
      }),
    );
  });

  it("passes hard violation ids and caps diagnostics", async () => {
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      hardViolationEntityIds: new Set(["REQ-NORMATIVE"]),
      maxDiagnostics: 1,
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.id).not.toBe("logical_coverage_review");
  });

  it("returns all diagnostics when maxDiagnostics is negative", async () => {
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      maxDiagnostics: -1,
    });

    expect(diagnostics.length).toBeGreaterThan(1);
  });

  it("uses the same live receipt proof as coverage to suppress stale depth review", async () => {
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog({ coverageProof: true }),
      proofSnapshot: "a".repeat(64),
      checkedAt: "2026-08-14T12:00:00.000Z",
    });

    expect(
      diagnostics.filter(
        (diagnostic) =>
          diagnostic.id === "coverage_depth_review" &&
          diagnostic.entityId === "REQ-NORMATIVE",
      ),
    ).toEqual([]);
  });

  it("surfaces usage acceptance repairs through the quality diagnostic lane", async () => {
    const workspaceRoot = mkdtempSync(
      path.join(os.tmpdir(), "kibi-full-quality-telemetry-"),
    );
    mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
    const events: Record<string, unknown>[] = Array.from(
      { length: 20 },
      (_, index) => ({
        timestamp: new Date(
          Date.parse("2026-08-10T12:00:00Z") - (40 - index) * 60_000,
        ).toISOString(),
        tool: "kb_status",
        status: "success",
        telemetry_status: "provided",
        telemetry: { is_autonomous: true },
        business_args: {},
      }),
    );
    for (const minute of [18, 17, 16]) {
      events.push({
        timestamp: new Date(
          Date.parse("2026-08-10T12:00:00Z") - minute * 60_000,
        ).toISOString(),
        tool: "kb_upsert",
        status: "error",
        telemetry_status: "provided",
        telemetry: { is_autonomous: true },
        error_category: "tool_timeout",
        business_args: {
          type: "symbol",
          id: "SYM-RETRY",
          properties: { title: "retry", status: "active" },
        },
      });
    }
    writeFileSync(
      path.join(workspaceRoot, ".kb", "usage.log"),
      `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    );

    try {
      const diagnostics = await collectFullKbQualityDiagnostics({
        prolog: makeProlog(),
        workspaceRoot,
        now: new Date("2026-08-10T12:00:00Z"),
      });
      const ids = diagnostics.map((diagnostic) => diagnostic.id);
      expect(ids).toContain("repeated_mutation_failures");
      expect(ids).toContain("mutation_validation_bypassed");
      expect(ids).toContain("telemetry_acceptance_incomplete");
      expect(
        diagnostics.find(
          (diagnostic) => diagnostic.id === "repeated_mutation_failures",
        ),
      ).toMatchObject({ category: "telemetry", blocking: false });
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });
});

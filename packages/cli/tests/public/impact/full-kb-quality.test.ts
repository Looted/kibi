import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrologProcess, type QueryResult } from "../../../src/prolog.js";
import { toPrologString } from "../../../src/prolog/codec.js";
import {
  collectFullKbQualityDiagnostics,
  loadKbExtractionResults,
} from "../../../src/public/impact/full-kb-quality.js";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";

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

function goalText(goal: string | readonly string[]): string {
  return typeof goal === "string" ? goal : goal.join(",");
}

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
        bindings: {
          Rels: "[['kb:entity/SYM-UPLOAD','file:///tmp/REQ-NORMATIVE',implements]]",
        },
      };
    }
    if (text.includes("kb_relationship(covered_by")) {
      return {
        success: true,
        bindings: {
          Rels: "[['file:///tmp/REQ-NORMATIVE','kb:entity/TEST-UPLOAD',covered_by]]",
        },
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
  it("preserves source cells and rule metadata while normalizing endpoints", async () => {
    const ruleIr = JSON.stringify({
      version: "kibi.logic.v1",
      kind: "rule",
      head: { name: "retained", args: ["subject", "years"] },
    });
    const prolog: Pick<PrologProcess, "query"> = {
      query: async (goal): Promise<QueryResult> => {
        const text = Array.isArray(goal) ? goal.join(",") : goal;
        if (text.includes("kb_entity")) {
          return {
            success: true,
            bindings: {
              Results: `[${[
                "['REQ-NORMATIVE',req,[title='Users must keep audit data',status=active,created_at='2026-07-01',updated_at='2026-07-01',source='docs/REQ-NORMATIVE.md']]",
                `[RULE-SCHEMA,rule_schema,[title='Retention rule',status=active,created_at='2026-07-01',updated_at='2026-07-01',source='docs/rules.md',fact_kind=rule_schema,rule_schema_id='retention-v1',rule_name='retained',predicate_name='retained',predicate_arity=^^(\"2\", 'http://www.w3.org/2001/XMLSchema#integer'),argument_names=[subject,years],argument_types=[string,int],sourceFile='src/rules.ts',sourceLine=^^(\"21\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceColumn=^^(\"3\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndLine=^^(\"28\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndColumn=^^(\"9\", 'http://www.w3.org/2001/XMLSchema#integer'),rule_ir=${toPrologString(ruleIr)}]]`,
              ].join(",")}]`,
            },
          };
        }
        if (text.includes("kb_relationship(implements")) {
          return {
            success: true,
            bindings: {
              Rels: "[['file:///tmp/RULE-SCHEMA','kb:entity/REQ-NORMATIVE',implements]]",
            },
          };
        }
        return { success: true, bindings: { Rels: "[]" } };
      },
    };

    const results = await loadKbExtractionResults(prolog);
    const rule = results.find((result) => result.entity.id === "RULE-SCHEMA");

    expect(rule?.entity).toMatchObject({
      fact_kind: "rule_schema",
      rule_schema_id: "retention-v1",
      rule_name: "retained",
      predicate_arity: 2,
      sourceLine: 21,
      sourceColumn: 3,
      sourceEndLine: 28,
      sourceEndColumn: 9,
      rule_ir: JSON.parse(ruleIr),
    });
    expect(rule?.sourceFile).toBe("src/rules.ts");
    expect(rule?.relationships).toEqual([
      { from: "RULE-SCHEMA", to: "REQ-NORMATIVE", type: "implements" },
    ]);
  });

  it("falls back to complete bounded pages without dropping rich entity metadata", async () => {
    const ids = Array.from({ length: 33 }, (_, index) => `ENTITY-${index}`);
    const bulkGoal =
      "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)";
    const calls: string[] = [];
    const prolog: Pick<PrologProcess, "query"> = {
      query: async (goal): Promise<QueryResult> => {
        const text = goalText(goal);
        calls.push(text);
        if (text === bulkGoal) {
          return {
            success: false,
            bindings: {},
            error:
              "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation",
          };
        }
        if (text === "findall(Id, kb_entity(Id, _, _), Ids)") {
          return {
            success: true,
            bindings: { Ids: `[${ids.map((id) => `'${id}'`).join(",")}]` },
          };
        }
        if (text.includes("member(Id, [")) {
          const pageText = text.match(/member\(Id, \[(.*)\]\)/)?.[1] ?? "";
          const pageIds = pageText
            .split(",")
            .filter((term) => term.length > 0)
            .map((term) => term.trim().slice(1, -1));
          return {
            success: true,
            bindings: {
              Results: `[${pageIds
                .map(
                  (id) =>
                    `['${id}',fact,[title='${id}',semantic_text='${"x".repeat(256)}',proof_receipts=['receipt-${id}']]]`,
                )
                .join(",")}]`,
            },
          };
        }
        if (text.includes("kb_relationship(implements")) {
          return {
            success: true,
            bindings: {
              Rels: "[['ENTITY-0','ENTITY-1',implements]]",
            },
          };
        }
        return { success: true, bindings: { Rels: "[]" } };
      },
    };

    const results = await loadKbExtractionResults(prolog);

    expect(results).toHaveLength(ids.length);
    expect(results.map((result) => result.entity.id)).toEqual(ids);
    expect(results[0]?.entity.semantic_text).toBe("x".repeat(256));
    expect(
      (results[0]?.entity as unknown as Record<string, unknown>).proof_receipts,
    ).toEqual(["receipt-ENTITY-0"]);
    expect(results[0]?.relationships).toEqual([
      { from: "ENTITY-0", to: "ENTITY-1", type: "implements" },
    ]);
    expect(calls.filter((goal) => goal === bulkGoal)).toHaveLength(1);
    expect(calls.filter((goal) => goal.includes("member(Id, ["))).toHaveLength(
      2,
    );
    expect(
      calls.some(
        (goal) =>
          goal ===
          "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      ),
    ).toBe(true);
  });

  it("prefers the existing indexed paginated backend when available", async () => {
    const ids = Array.from({ length: 33 }, (_, index) => `INDEXED-${index}`);
    const pageCalls: Array<{ limit: number; offset: number }> = [];
    const prolog: Pick<PrologPort, "query"> & {
      queryEntities: NonNullable<PrologPort["queryEntities"]>;
    } = {
      query: async (): Promise<QueryResult> => ({
        success: true,
        bindings: { Rels: "[]" },
      }),
      queryEntities: async ({ limit, offset }) => {
        pageCalls.push({ limit, offset });
        const pageIds = ids.slice(offset, offset + limit);
        return {
          count: ids.length,
          entities: pageIds.map((id) => ({
            id,
            type: "fact",
            title: id,
            proof_receipts: [`receipt-${id}`],
          })),
        };
      },
    };

    const results = await loadKbExtractionResults(prolog);

    expect(results.map((result) => result.entity.id)).toEqual(ids);
    expect(
      (results[32]?.entity as unknown as Record<string, unknown>)
        .proof_receipts,
    ).toEqual(["receipt-INDEXED-32"]);
    expect(pageCalls).toEqual([
      { limit: 32, offset: 0 },
      { limit: 32, offset: 32 },
    ]);
  });

  it("splits an overflowing bounded batch before falling back to single entities", async () => {
    const calls: string[] = [];
    const prolog: Pick<PrologProcess, "query"> = {
      query: async (goal): Promise<QueryResult> => {
        const text = goalText(goal);
        calls.push(text);
        if (
          text ===
          "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)"
        ) {
          return {
            success: false,
            bindings: {},
            error:
              "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation",
          };
        }
        if (text === "findall(Id, kb_entity(Id, _, _), Ids)") {
          return { success: true, bindings: { Ids: "['A','B']" } };
        }
        if (text.includes("member(Id, [")) {
          const pageText = text.match(/member\(Id, \[(.*)\]\)/)?.[1] ?? "";
          const pageIds = pageText
            .split(",")
            .filter((term) => term.length > 0)
            .map((term) => term.trim().slice(1, -1));
          if (pageIds.length > 1) {
            return {
              success: false,
              bindings: {},
              error:
                "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation",
            };
          }
          const id = pageIds[0] ?? "";
          return {
            success: true,
            bindings: {
              Results: `[['${id}',fact,[title='${id}',proof_receipts=['receipt-${id}']]]]`,
            },
          };
        }
        return { success: true, bindings: { Rels: "[]" } };
      },
    };

    const results = await loadKbExtractionResults(prolog);

    expect(results.map((result) => result.entity.id)).toEqual(["A", "B"]);
    expect(
      results.map(
        (result) =>
          (result.entity as unknown as Record<string, unknown>).proof_receipts,
      ),
    ).toEqual([["receipt-A"], ["receipt-B"]]);
    expect(calls.filter((goal) => goal.includes("member(Id, ["))).toHaveLength(
      3,
    );
  });

  it("splits only bounded pages after ENOBUFS and fails closed for a huge entity", async () => {
    const calls: string[] = [];
    const prolog: Pick<PrologProcess, "query"> = {
      query: async (goal): Promise<QueryResult> => {
        const text = goalText(goal);
        calls.push(text);
        if (
          text ===
          "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)"
        ) {
          return {
            success: false,
            bindings: {},
            error:
              "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation",
          };
        }
        if (text === "findall(Id, kb_entity(Id, _, _), Ids)") {
          return { success: true, bindings: { Ids: "['TOO-LARGE']" } };
        }
        if (text.includes("member(Id, [")) {
          return {
            success: false,
            bindings: {},
            error:
              "Query exceeded bounded Prolog output capacity (ENOBUFS); narrow the operation",
          };
        }
        return { success: true, bindings: { Rels: "[]" } };
      },
    };

    await expect(loadKbExtractionResults(prolog)).rejects.toThrow(
      "Full KB entity projection failed for TOO-LARGE",
    );
    expect(calls).toHaveLength(3);
    expect(calls.slice(2).every((goal) => goal.includes("member(Id, ["))).toBe(
      true,
    );
  });

  it("does not turn non-capacity projection errors into fallback reads", async () => {
    const calls: string[] = [];
    const prolog: Pick<PrologProcess, "query"> = {
      query: async (goal): Promise<QueryResult> => {
        const text = goalText(goal);
        calls.push(text);
        return {
          success: false,
          bindings: {},
          error: "permission denied",
        };
      },
    };

    await expect(loadKbExtractionResults(prolog)).rejects.toThrow(
      "Full KB entity projection query failed: permission denied",
    );
    expect(calls).toEqual([
      "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
    ]);
  });

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

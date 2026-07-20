import { describe, expect, it } from "bun:test";
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
    "[title='upload',status=active,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='documentation/symbols.yaml',source_file='src/a.ts',symbol_kind=function,symbol_role=behavioral,sourceLine=^^(\"1\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceColumn=^^(\"2\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndLine=^^(\"3\", 'http://www.w3.org/2001/XMLSchema#integer'),sourceEndColumn=^^(\"4\", 'http://www.w3.org/2001/XMLSchema#integer')]",
  ],
  [
    "'TEST-UPLOAD'",
    "test",
    "[title='upload test',status=passing,created_at='2026-07-01T00:00:00.000Z',updated_at='2026-07-01T00:00:00.000Z',source='tests/upload.test.ts',verification_scope=unit,fact_kind=meta]",
  ],
] as const;

function makeProlog(): PrologProcess {
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
      "strict_fact_modeling_review",
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
    expect(diagnostics[0]?.id).not.toBe("strict_fact_modeling_review");
  });

  it("returns all diagnostics when maxDiagnostics is negative", async () => {
    const diagnostics = await collectFullKbQualityDiagnostics({
      prolog: makeProlog(),
      maxDiagnostics: -1,
    });

    expect(diagnostics.length).toBeGreaterThan(1);
  });
});

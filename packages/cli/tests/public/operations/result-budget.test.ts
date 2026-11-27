import { describe, expect, test } from "bun:test";

import { OPERATION_CATALOG } from "../../../src/public/operations/catalog.js";
import {
  RESULT_BUDGETS,
  RESULT_BUDGET_CHARS,
  RESULT_CEILING_CHARS,
  RESULT_TOO_LARGE,
  RESULT_TRUNCATED,
  cutRowToBudget,
  edgesFromNodes,
  fitOperationResult,
  idListText,
  preparationAfterCut,
  resultBudgetFor,
  rowsWithinBudget,
  truncationSentence,
} from "../../../src/public/operations/result-budget.js";
import { toKibiResult } from "../../../src/public/operations/result-envelope.js";

const size = (value: unknown) => JSON.stringify(value).length;
const row = (id: string, chars: number) => ({ id, pad: "x".repeat(chars) });
const read = { name: "kb_query", effects: ["kb-read"] as const };

describe("result budget declarations", () => {
  test("every catalog operation declares how its result keeps to the budget", () => {
    for (const spec of OPERATION_CATALOG) {
      const declaration = resultBudgetFor(spec.name);
      expect(declaration).toBeDefined();
      if (declaration?.kind !== "rows") {
        expect(
          (declaration as { reason: string }).reason.length,
        ).toBeGreaterThan(0);
      }
    }
    expect(Object.keys(RESULT_BUDGETS).sort()).toEqual(
      OPERATION_CATALOG.map((spec) => spec.name).sort(),
    );
  });

  test("an unknown operation has no declaration", () => {
    expect(resultBudgetFor("kb_job_status")).toBeUndefined();
  });

  test("the budget is 24,000 characters and the ceiling 64,000", () => {
    expect(RESULT_BUDGET_CHARS).toBe(24_000);
    expect(RESULT_CEILING_CHARS).toBe(64_000);
  });
});

describe("rowsWithinBudget", () => {
  test("adds rows while the result fits", () => {
    const rows = [row("a", 100), row("b", 100), row("c", 100)];
    const base = { rows: [] };
    expect(rowsWithinBudget(base, rows, 1_000)).toBe(3);
    expect(rowsWithinBudget(base, rows, size(base) + 2 * 120)).toBe(2);
  });

  test("keeps at least one row and none of an empty list", () => {
    expect(rowsWithinBudget({}, [row("a", 500)], 10)).toBe(1);
    expect(rowsWithinBudget({}, [], 10)).toBe(0);
  });
});

describe("cutRowToBudget", () => {
  test("returns a row that fits, or a non-record, unchanged", () => {
    const small = row("a", 10);
    expect(cutRowToBudget(small, 1_000)).toBe(small);
    expect(cutRowToBudget("text", 1)).toBe("text");
  });

  test("leaves out the largest parts and names them", () => {
    const big = {
      id: "REQ-a",
      type: "req",
      stages: {
        heavy: { evidence: ["y".repeat(5_000)], status: "passed" },
        light: { status: "blocked" },
      },
      list: ["z".repeat(3_000), "w"],
    };
    const cut = cutRowToBudget(big, 1_000) as Record<string, unknown>;
    expect(size(cut)).toBeLessThanOrEqual(1_000);
    expect(cut.id).toBe("REQ-a");
    expect(cut.type).toBe("req");
    expect(cut.omittedFields).toEqual(["stages.heavy.evidence", "list"]);
    expect((cut.stages as Record<string, unknown>).light).toEqual({
      status: "blocked",
    });
  });

  test("steps into a kept list's only element instead of dropping it", () => {
    const data = {
      rows: [{ id: "REQ-a", detail: { big: "q".repeat(4_000), keep: 1 } }],
      summary: { total: 1 },
    };
    const cut = cutRowToBudget(data, 600, ["rows", "summary"]) as {
      rows: Record<string, unknown>[];
      omittedFields: string[];
    };
    expect(cut.rows).toHaveLength(1);
    expect(cut.rows[0]?.id).toBe("REQ-a");
    expect(cut.omittedFields).toEqual(["rows.0.detail.big"]);
  });

  test("stops when only kept members are left", () => {
    const data = { id: "x".repeat(2_000) };
    const cut = cutRowToBudget(data, 100) as Record<string, unknown>;
    expect(cut.id).toBe(data.id);
    expect(cut.omittedFields).toEqual([]);
  });

  test("names at most twenty parts", () => {
    const many: Record<string, string> = { id: "a" };
    for (let index = 0; index < 30; index += 1)
      many[`f${index}`] = "v".repeat(200);
    const cut = cutRowToBudget(many, 300) as { omittedFields: string[] };
    expect(cut.omittedFields).toHaveLength(21);
    expect(cut.omittedFields[20]).toMatch(/^…and \d+ more$/);
  });

  test("removes an element of a nested list it steps into", () => {
    const data = {
      id: "a",
      rows: [{ id: "only", parts: ["p".repeat(3_000)] }],
    };
    const cut = cutRowToBudget(data, 500, ["id", "rows"]) as {
      rows: { parts?: unknown[] }[];
      omittedFields: string[];
    };
    expect(cut.omittedFields).toEqual(["rows.0.parts"]);
    expect(cut.rows[0]?.parts).toBeUndefined();
  });
});

describe("cutRowToBudget on a list of text", () => {
  test("removes the only text element of a kept list", () => {
    const cut = cutRowToBudget({ id: "a", rows: ["s".repeat(3_000)] }, 500, [
      "id",
      "rows",
    ]) as { rows: unknown[]; omittedFields: string[] };
    expect(cut.rows).toEqual([]);
    expect(cut.omittedFields).toEqual(["rows.0"]);
  });
});

describe("preparationAfterCut", () => {
  test("keeps the requirements and obligations of the listed files", () => {
    const data = {
      fileCount: 3,
      requirements: [{ id: "REQ-a" }, { id: "REQ-b" }, "bad"],
      residualReviewObligations: [{ path: "a.ts" }, { path: "b.ts" }, 7],
    };
    expect(
      preparationAfterCut(data, [
        { path: "a.ts", requirementIds: ["REQ-a"] },
        { path: "c.ts" },
        "bad",
      ]),
    ).toEqual({
      fileCount: 3,
      requirements: [{ id: "REQ-a" }],
      residualReviewObligations: [{ path: "a.ts" }],
    });
    expect(preparationAfterCut({}, [{ path: "a.ts" }])).toEqual({
      requirements: [],
      residualReviewObligations: [],
    });
  });

  test("pages a large preparation by its file rows", () => {
    const files = Array.from({ length: 300 }, (_, index) => ({
      path: `src/file-${String(index).padStart(3, "0")}.ts`,
      requirementIds: [`REQ-${index}`],
      pad: "x".repeat(200),
    }));
    const fitted = fitOperationResult(
      { name: "kb_prepare_impact_review", effects: ["kb-read"] },
      { scope: { kind: "staged" }, offset: 0 },
      {
        content: [],
        structuredContent: {
          recordHeaders: { scope: { fingerprint: "f" } },
          fileCount: 300,
          files,
          requirements: files.map((file) => ({ id: file.requirementIds[0] })),
          residualReviewObligations: [],
        },
      },
    );
    const data = fitted.result.structuredContent as unknown as {
      fileCount: number;
      files: unknown[];
      requirements: unknown[];
      truncation: { total: number; nextOffset: number };
    };
    expect(data.fileCount).toBe(300);
    expect(data.files.length).toBeLessThan(300);
    expect(data.requirements).toHaveLength(data.files.length);
    expect(data.truncation.total).toBe(300);
    expect(data.truncation.nextOffset).toBe(data.files.length);
  });
});

describe("named impact-review evidence", () => {
  const prepare = {
    name: "kb_prepare_impact_review",
    effects: ["kb-read"] as const,
  };
  const preparation = (count: number, evidenceChars: number) => {
    const files = Array.from({ length: count }, (_, index) => ({
      path: `src/file-${index}.ts`,
      status: "modified",
    }));
    return {
      recordHeaders: { scope: { fingerprint: "f" } },
      fileCount: count,
      files,
      requirements: [],
      residualReviewObligations: [],
      evidence: [
        ...files.map((file) => ({
          path: file.path,
          pad: "e".repeat(evidenceChars),
        })),
        "bad",
      ],
    };
  };

  test("pages each file's evidence with its row", () => {
    const fitted = fitOperationResult(
      prepare,
      { scope: { kind: "staged" }, paths: [] },
      { content: [], structuredContent: preparation(7, 5_000) },
    );
    const data = fitted.result.structuredContent as unknown as {
      files: { path: string }[];
      evidence: { path: string }[];
      truncation: { nextOffset: number };
    };
    expect(data.files.length).toBeGreaterThan(1);
    expect(data.files.length).toBeLessThan(7);
    expect(data.evidence.map((entry) => entry.path)).toEqual(
      data.files.map((file) => file.path),
    );
    expect(data.truncation.nextOffset).toBe(data.files.length);
    expect(size(data)).toBeLessThanOrEqual(RESULT_BUDGET_CHARS + 400);
  });

  test("keeps a cut row's path when its evidence alone fills the budget", () => {
    const data = preparation(2, 30_000);
    data.files[0] = { ...data.files[0], status: "s".repeat(30_000) };
    const fitted = fitOperationResult(
      { ...prepare, effects: ["kb-read", "workspace-write"] as const },
      { scope: { kind: "staged" } },
      { content: [], structuredContent: data },
    );
    const cut = fitted.result.structuredContent as unknown as {
      files: { path: string; omittedFields: string[] }[];
      evidence: { path: string }[];
    };
    expect(cut.files).toHaveLength(1);
    expect(cut.files[0].path).toBe("src/file-0.ts");
    expect(cut.files[0].omittedFields).toContain("status");
    expect(cut.evidence.map((entry) => entry.path)).toEqual(["src/file-0.ts"]);
  });

  test("a row that is not a record owns no evidence", () => {
    const data = preparation(1, 10);
    const fitted = fitOperationResult(
      prepare,
      {},
      {
        content: [],
        structuredContent: {
          ...data,
          files: ["bad", { path: "x", pad: "x".repeat(30_000) }],
        },
      },
    );
    const cut = fitted.result.structuredContent as unknown as {
      evidence: unknown[];
    };
    expect(cut.evidence).toEqual([]);
  });
});

describe("edgesFromNodes and idListText", () => {
  test("keeps the edges that leave a listed node", () => {
    const data = {
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }, "bad"],
    };
    expect(edgesFromNodes(data, [{ id: "a" }, "bad"]).edges).toEqual([
      { from: "a", to: "b" },
    ]);
    expect(edgesFromNodes({}, [{ id: "a" }]).edges).toEqual([]);
  });

  test("names at most twenty ids", () => {
    const rows = Array.from({ length: 25 }, (_, index) => ({
      id: `R${index}`,
    }));
    const text = idListText("rows", "rows")({ rows, count: 40 });
    expect(text).toStartWith("Found 40 rows. Showing 25: R0, R1");
    expect(text).toEndWith(", and 5 more.");
    expect(idListText("rows", "rows")({ rows: [{ id: "a" }, 1] })).toBe(
      "Found 2 rows. Showing 2: a.",
    );
    expect(idListText("rows", "rows")({})).toBe("Found 0 rows. Showing 0: .");
  });
});

describe("truncationSentence", () => {
  test("says what was returned and where to page from", () => {
    expect(
      truncationSentence({
        budgetChars: 24_000,
        returned: 8,
        total: 40,
        nextOffset: 8,
        hint: "",
      }),
    ).toBe(
      "Result cut to its 24,000-character budget: 8 of 40 rows returned. Call again with offset 8 for the next rows.",
    );
    expect(
      truncationSentence({ budgetChars: 100, returned: 1, hint: "" }),
    ).toBe("Result cut to its 100-character budget: 1 rows returned.");
  });
});

describe("fitOperationResult", () => {
  const rows = Array.from({ length: 50 }, (_, index) =>
    row(`E${index}`, 1_000),
  );

  test("cuts a list result to the budget and pages on", () => {
    const fitted = fitOperationResult(
      read,
      { type: "req", offset: 10 },
      {
        content: [{ type: "text", text: "Found 60 entities." }],
        structuredContent: { entities: rows, count: 60 },
      },
    );
    const data = fitted.result.structuredContent as Record<string, unknown>;
    expect(size(data)).toBeLessThanOrEqual(RESULT_BUDGET_CHARS);
    const kept = data.entities as unknown[];
    expect(kept.length).toBeGreaterThan(1);
    expect(data.truncated).toBe(true);
    expect(data.truncation).toEqual({
      budgetChars: RESULT_BUDGET_CHARS,
      returned: kept.length,
      total: 60,
      omitted: 60 - 10 - kept.length,
      nextOffset: 10 + kept.length,
      hint: "Rows past the budget were left out; page with offset, or narrow the filters.",
    });
    expect(fitted.diagnostics).toHaveLength(1);
    expect(fitted.diagnostics[0]?.code).toBe(RESULT_TRUNCATED);
    expect(fitted.nextActions).toEqual([
      {
        operation: "kb_query",
        input: { type: "req", offset: 10 + kept.length },
        reason: `Read the rows after the first ${10 + kept.length}.`,
        required: false,
      },
    ]);
    const text = fitted.result.content[0]?.text ?? "";
    expect(text).toStartWith(`Found 60 entities. Showing ${kept.length}: E0,`);
    expect(text).toContain(`Call again with offset ${10 + kept.length}`);
  });

  test("returns a result within the budget unchanged", () => {
    const result = {
      content: [{ type: "text", text: "ok" }],
      structuredContent: { entities: [row("a", 10)], count: 1 },
    };
    const fitted = fitOperationResult(read, {}, result);
    expect(fitted.result.structuredContent).toEqual(result.structuredContent);
    expect(fitted.diagnostics).toEqual([]);
    expect(fitted.nextActions).toEqual([]);
  });

  test("cuts a single oversized row and names what it left out", () => {
    const fitted = fitOperationResult(
      { name: "kb_search", effects: ["kb-read"] },
      "not a record",
      {
        content: [],
        structuredContent: {
          results: [{ id: "a", big: "b".repeat(30_000) }],
          count: 1,
          returned: 1,
        },
      },
    );
    const data = fitted.result.structuredContent as Record<string, unknown>;
    const results = data.results as Record<string, unknown>[];
    expect(results[0]?.omittedFields).toEqual(["big"]);
    expect(data.returned).toBe(1);
    expect((data.truncation as { nextOffset?: number }).nextOffset).toBe(
      undefined,
    );
    expect(fitted.nextActions).toEqual([]);
    expect(fitted.result.content[0]?.text).toBe(
      "Result cut to its 24,000-character budget: 1 of 1 rows returned.",
    );
  });

  test("pages a list without a count by the rows it read", () => {
    const fitted = fitOperationResult(
      read,
      {},
      {
        content: [
          { type: "image", data: "", mimeType: "image/png" } as never,
          { type: "text", text: "Found entities." },
        ],
        structuredContent: { entities: rows },
      },
    );
    const data = fitted.result.structuredContent as unknown as {
      entities: unknown[];
      truncation: Record<string, unknown>;
    };
    expect(data.truncation).not.toHaveProperty("total");
    expect(data.truncation).not.toHaveProperty("omitted");
    expect(data.truncation.nextOffset).toBe(data.entities.length);
    expect(fitted.result.content[0]?.type).toBe("image");
    expect(fitted.result.content[1]?.text).toStartWith(
      `Found ${data.entities.length} entities.`,
    );
  });

  test("pages a list without a known total by the rows it had", () => {
    const fitted = fitOperationResult(
      { name: "kb_sparql_remote", effects: ["network-read"] },
      {},
      {
        content: [{ type: "text", text: "rows" }],
        structuredContent: { rows },
      },
    );
    const data = fitted.result.structuredContent as unknown as {
      truncation: Record<string, unknown>;
    };
    expect(data.truncation.total).toBe(50);
    expect(fitted.result.content[0]?.text).toStartWith("rows Result cut");
  });

  test("keeps graph edges that leave the kept nodes", () => {
    const nodes = Array.from({ length: 40 }, (_, index) => ({
      id: `N${index}`,
      pad: "n".repeat(1_000),
    }));
    const fitted = fitOperationResult(
      { name: "kb_graph", effects: ["kb-read"] },
      {},
      {
        content: [],
        structuredContent: {
          nodes,
          nodeCount: 40,
          edges: [
            { from: "N0", to: "N39" },
            { from: "N39", to: "N0" },
          ],
        },
      },
    );
    const data = fitted.result.structuredContent as Record<string, unknown>;
    expect(data.edges).toEqual([{ from: "N0", to: "N39" }]);
    expect((data.truncation as { total: number }).total).toBe(40);
  });

  test("refuses a read larger than the ceiling", () => {
    expect(() =>
      fitOperationResult(
        { name: "kb_coverage", effects: ["kb-read"] },
        {},
        { content: [], structuredContent: { big: "c".repeat(70_000) } },
      ),
    ).toThrow(
      expect.objectContaining({ code: RESULT_TOO_LARGE, retryable: false }),
    );
  });

  test("passes a bounded output that has no smaller form whole", () => {
    const fitted = fitOperationResult(
      { name: "kb_compile_intent", effects: ["kb-read"] },
      {},
      { content: [], structuredContent: { big: "c".repeat(70_000) } },
    );
    expect(fitted.result.structuredContent).toEqual({
      big: "c".repeat(70_000),
    });
  });

  test("does not refuse a write after it committed", () => {
    const fitted = fitOperationResult(
      { name: "kb_upsert", effects: ["kb-write"] },
      {},
      { content: [], structuredContent: { big: "c".repeat(70_000) } },
    );
    expect(fitted.diagnostics).toEqual([]);
  });

  test("reports a cut the operation made itself", () => {
    const fitted = fitOperationResult(
      { name: "kb_check", effects: ["kb-read"] },
      { rules: ["r"] },
      {
        content: [],
        structuredContent: {
          truncated: true,
          truncation: { budgetChars: 1, hint: 5 },
        },
      },
    );
    expect(fitted.diagnostics[0]?.message).toBe(
      "The result was cut to its size budget.",
    );
    expect(fitted.nextActions).toEqual([]);
  });

  test("ignores data without a row list", () => {
    const fitted = fitOperationResult(
      read,
      {},
      {
        content: [],
        structuredContent: null,
      },
    );
    expect(fitted.result.structuredContent).toBeNull();
  });

  test("toKibiResult appends the cut's diagnostics and next actions", () => {
    const envelope = toKibiResult(
      read,
      { entities: [] },
      {
        appendDiagnostics: [{ code: RESULT_TRUNCATED, message: "cut" }],
        appendNextActions: [
          { operation: "kb_query", reason: "next", required: false },
        ],
      },
    );
    expect(envelope.diagnostics.at(-1)?.code).toBe(RESULT_TRUNCATED);
    expect(envelope.nextActions.at(-1)?.reason).toBe("next");
  });

  test("preserves stale and not-compiled notes when rebuilding cut kb_query text", () => {
    const staleCut = fitOperationResult(
      read,
      {},
      {
        content: [{ type: "text", text: "original" }],
        structuredContent: {
          entities: Array.from({ length: 40 }, (_, index) =>
            row(`REQ-${index}`, 900),
          ),
          count: 40,
          meta: {
            syncState: "stale",
            dirty: true,
            staleReasonCount: 2,
            staleReasons: [
              {
                code: "knowledge_source_newer",
                path: ".kb/requirements/REQ-0.md",
              },
              {
                code: "relationship_source_newer",
                path: ".kb/relationships/links.yaml",
              },
            ],
          },
        },
      },
    );
    const staleText = staleCut.result.content[0]?.text ?? "";
    expect(staleText).toContain("KB store is stale (2 uncompiled changes");
    expect(staleText).toContain(".kb/requirements/REQ-0.md");
    expect(staleText).toContain(
      "Run `kibi sync` before relying on these results.",
    );

    const uncompiledCut = fitOperationResult(
      read,
      {},
      {
        content: [{ type: "text", text: "original" }],
        structuredContent: {
          entities: Array.from({ length: 40 }, (_, index) =>
            row(`REQ-${index}`, 900),
          ),
          count: 40,
          branchStore: {
            state: "not_compiled",
            detail: "Branch store has never been compiled.",
          },
        },
      },
    );
    const uncompiledText = uncompiledCut.result.content[0]?.text ?? "";
    expect(uncompiledText).toContain("Branch store has never been compiled.");
    expect(uncompiledText).toContain(
      "Run kibi sync before relying on query results.",
    );
  });

  test("truncates an oversized multiline string field to a prefix instead of dropping it", () => {
    const multilineBody = Array.from(
      { length: 1_200 },
      (_, i) => `Line ${i}: "quoted" value with \\backslash\\ and details\n`,
    ).join("");
    const fitted = fitOperationResult(
      read,
      {},
      {
        content: [],
        structuredContent: {
          entities: [
            {
              id: "REQ-multiline",
              type: "req",
              title: "Multiline requirement",
              source: ".kb/requirements/REQ-multiline.md",
              body: multilineBody,
            },
          ],
          count: 1,
        },
      },
    );
    const data = fitted.result.structuredContent as unknown as {
      entities: Array<{
        id: string;
        body?: string;
        omittedFields?: string[];
      }>;
    };
    expect(data.entities).toHaveLength(1);
    expect(typeof data.entities[0]?.body).toBe("string");
    expect(data.entities[0]?.body).toStartWith('Line 0: "quoted"');
    expect(data.entities[0]?.body).toContain("truncated");
    expect(data.entities[0]?.omittedFields).toContain("body");
  });
});

import { describe, expect, it } from "bun:test";
import path from "node:path";
import { resolveKbPlPath } from "../../src/prolog.js";
import {
  type Violation,
  __test__,
  formatCoverageViolations,
  formatViolations,
  validateStagedSymbolCoverage,
  validateStagedSymbols,
} from "../../src/traceability/validate";

describe("traceability/validate", () => {
  it("exposes parser helpers for direct edge-case coverage", () => {
    expect(__test__.unquoteAtom("  'na''me'  ")).toBe("na'me");
    expect(__test__.unquoteAtom("'it\\'s'")).toBe("it's");
    expect(__test__.unquoteAtom("'back\\\\slash'")).toBe("back\\slash");
    expect(__test__.unquoteAtom("''''")).toBe("'");
    expect(__test__.unquoteAtom("  plain_atom  ")).toBe("plain_atom");
    expect(__test__.unquoteAtom("'open")).toBe("'open");
    expect(__test__.unquoteAtom("close'")).toBe("close'");

    expect(
      __test__.parsePrologListOfLists("[[a,1,'file.ts',10,0,'name']]"),
    ).toStrictEqual([["a", "1", "'file.ts'", "10", "0", "'name'"]]);
    expect(__test__.parsePrologListOfLists("[]")).toStrictEqual([]);
    expect(__test__.parsePrologListOfLists("")).toStrictEqual([]);
    expect(__test__.parsePrologListOfLists(" [[a,1],[b,2]] ")).toStrictEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
    expect(
      __test__.parsePrologListOfLists("[[a , 1], malformed, [b,2], [c,3 ]"),
    ).toStrictEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
    expect(__test__.parsePrologListOfLists("[[a,1],x[b,2]]")).toStrictEqual([
      ["a", "1"],
    ]);
    // Quoted commas, brackets and escaped quotes stay inside their column.
    expect(
      __test__.parsePrologListOfLists("[['it\\'s, [x]',1],['a''b',2]]"),
    ).toStrictEqual([
      ["'it\\'s, [x]'", "1"],
      ["'a''b'", "2"],
    ]);
  });

  it("keeps symbols whose file or name contains an escaped quote", async () => {
    const prolog = {
      query: async () => ({
        success: true,
        bindings: {
          Rows: "[['sym\\'1',0,'src/don\\'t.ts',3,1,'it\\'s'],[s2,1,'b.ts',2,0,n]]",
        },
      }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    expect(await validateStagedSymbols({ minLinks: 1, prolog })).toStrictEqual([
      {
        symbolId: "sym'1",
        name: "it's",
        file: "src/don't.ts",
        line: 3,
        column: 1,
        currentLinks: 0,
        requiredLinks: 1,
      },
      {
        symbolId: "s2",
        name: "n",
        file: "b.ts",
        line: 2,
        column: 0,
        currentLinks: 1,
        requiredLinks: 1,
      },
    ]);
  });

  it("asks Prolog for the changed-symbol violations at the given minimum", async () => {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string) => {
        goals.push(goal);
        return { success: true, bindings: {} };
      },
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];
    expect(await validateStagedSymbols({ minLinks: 7, prolog })).toStrictEqual(
      [],
    );
    expect(goals).toStrictEqual([
      "findall([Sym,Count,File,Line,Col,Name], kb:changed_symbol_violation(Sym, 7, Count, File, Line, Col, Name), Rows)",
    ]);
  });

  it("throws when the prolog query fails", async () => {
    const prolog = {
      query: async () => ({ success: false, error: "permission denied" }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    return expect(
      validateStagedSymbols({ minLinks: 2, prolog }),
    ).rejects.toThrow("Prolog query failed: permission denied");
  });

  it("uses an unknown error message when the prolog failure has no error text", async () => {
    const prolog = {
      query: async () => ({ success: false }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    return expect(
      validateStagedSymbols({ minLinks: 1, prolog }),
    ).rejects.toThrow("Prolog query failed: unknown error");
  });

  it("returns no violations when Rows is absent or empty", async () => {
    const noRowsProlog = {
      query: async () => ({ success: true, bindings: {} }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];
    const emptyRowsProlog = {
      query: async () => ({ success: true, bindings: { Rows: "" } }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    expect(
      await validateStagedSymbols({ minLinks: 3, prolog: noRowsProlog }),
    ).toEqual([]);
    expect(
      await validateStagedSymbols({ minLinks: 3, prolog: emptyRowsProlog }),
    ).toEqual([]);
  });

  it("skips malformed rows and normalizes parsed values from prolog output", async () => {
    const prolog = {
      query: async (_goal: string) => ({
        success: true,
        bindings: {
          Rows: "[['sym''1',count9,'src/a,b.ts',line10,col03,'na''me'],[too,short],[plain_sym,countX,fileAtom,lineX,colX,nameAtom],ignored,['sym-2',7,' spaced.ts ',4,0,plain_name]]",
        },
      }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    expect(await validateStagedSymbols({ minLinks: 4, prolog })).toStrictEqual([
      {
        symbolId: "sym'1",
        name: "na'me",
        file: "src/a,b.ts",
        line: 10,
        column: 3,
        currentLinks: 9,
        requiredLinks: 4,
      },
      {
        symbolId: "plain_sym",
        name: "nameAtom",
        file: "fileAtom",
        line: 0,
        column: 0,
        currentLinks: 0,
        requiredLinks: 4,
      },
      {
        symbolId: "sym-2",
        name: "plain_name",
        file: " spaced.ts ",
        line: 4,
        column: 0,
        currentLinks: 7,
        requiredLinks: 4,
      },
    ]);
  });

  it("parses quoted atoms for symbol ids, file paths, and names", async () => {
    const prolog = {
      query: async () => ({
        success: true,
        bindings: {
          Rows: "[[symQuoted,5,'src/quoted file.ts',8,2,'quoted''Name']]",
        },
      }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];

    expect(await validateStagedSymbols({ minLinks: 2, prolog })).toEqual([
      {
        symbolId: "symQuoted",
        name: "quoted'Name",
        file: "src/quoted file.ts",
        line: 8,
        column: 2,
        currentLinks: 5,
        requiredLinks: 2,
      },
    ]);
  });

  it("names each unlinked symbol and how to link it", () => {
    const report = formatViolations([
      {
        symbolId: "SYM-1",
        name: "alpha",
        file: "src/alpha.ts",
        line: 12,
        column: 2,
        currentLinks: 0,
        requiredLinks: 2,
      },
      {
        symbolId: "SYM-2",
        name: "ox.Extra.extra()",
        file: "src/ox/Extra.java",
        line: 3,
        column: 1,
        currentLinks: 1,
        requiredLinks: 2,
      },
    ]);
    const lines = report.split("\n");
    expect(lines.slice(0, 3)).toEqual([
      "Traceability failed: 2 changed symbol(s) have fewer than 2 requirement link(s) (minLinks=2):",
      "  src/alpha.ts:12  alpha  (0 of 2 link(s))",
      // A signature-qualified locator is shown as the title to author.
      "  src/ox/Extra.java:3  ox.Extra.extra()  (1 of 2 link(s))",
    ]);
    expect(report).toContain("kb_upsert (CLI: kibi upsert --input -)");
    expect(report).toContain('title as listed above (e.g. "alpha")');
    expect(report).toContain("implements -> REQ-<area>-<behavior>");
    expect(report).toContain("executable_for -> TEST-<area>-<behavior>");
    expect(report).toContain("Stage .kb/symbols.yaml with the code.");
    // Source comments are not a link, so the guidance never suggests one.
    expect(report).not.toContain("comment");
    expect(report).toContain("re-run kibi check --staged");
  });

  it("returns an empty string for no violations and falls back to minLinks=0 when missing", () => {
    expect(formatViolations([])).toBe("");
    expect(
      formatViolations([
        {
          symbolId: "SYM-3",
          name: "gamma",
          file: "src/gamma.ts",
          line: 9,
          column: 0,
          currentLinks: 0,
        } as Omit<Violation, "requiredLinks"> as Violation,
      ]),
    ).toContain("minLinks=0");
  });
});

type CoverageProlog = Parameters<
  typeof validateStagedSymbolCoverage
>[0]["prolog"];

function coverageProlog(
  result: { success: boolean; error?: string; bindings?: object },
  goals: string[] = [],
): CoverageProlog {
  return {
    query: async (goal: string) => {
      goals.push(goal);
      return { bindings: {}, ...result };
    },
  } as unknown as CoverageProlog;
}

describe("traceability/validate symbol coverage", () => {
  const checksPl = path
    .join(path.dirname(resolveKbPlPath()), "checks.pl")
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");

  it("runs the full-check coverage rule over sorted unique extra symbols", async () => {
    const goals: string[] = [];
    const violations = await validateStagedSymbolCoverage({
      prolog: coverageProlog(
        {
          success: true,
          bindings: {
            Violations:
              "[violation('symbol-coverage','SYM-1','no link','add one','src/a.ts')]",
          },
        },
        goals,
      ),
      extraSymbolIds: ["SYM-b", "SYM-a", "SYM-b"],
    });
    expect(goals).toStrictEqual([
      `(use_module('${checksPl}'), call(checks:check_changed_symbol_coverage(['SYM-a','SYM-b'], Violations)))`,
    ]);
    expect(violations).toStrictEqual([
      {
        rule: "symbol-coverage",
        entityId: "SYM-1",
        description: "no link",
        suggestion: "add one",
        source: "src/a.ts",
      },
    ]);
  });

  it("passes an empty list without extra symbols and reads no rows as none", async () => {
    const goals: string[] = [];
    expect(
      await validateStagedSymbolCoverage({
        prolog: coverageProlog({ success: true }, goals),
      }),
    ).toStrictEqual([]);
    expect(goals[0]).toContain("check_changed_symbol_coverage([], Violations)");
  });

  it("reports the Prolog error or an unknown one", async () => {
    await expect(
      validateStagedSymbolCoverage({
        prolog: coverageProlog({ success: false, error: "boom" }),
      }),
    ).rejects.toThrow("Prolog symbol-coverage query failed: boom");
    await expect(
      validateStagedSymbolCoverage({
        prolog: coverageProlog({ success: false }),
      }),
    ).rejects.toThrow("Prolog symbol-coverage query failed: unknown error");
  });

  it("formats coverage violations like kibi check", () => {
    expect(formatCoverageViolations([])).toBe("");
    expect(
      formatCoverageViolations([
        {
          rule: "symbol-coverage",
          entityId: "SYM-1",
          description: "no link",
          suggestion: "add one",
          source: "src/a.ts",
        },
        {
          rule: "symbol-coverage",
          entityId: "SYM-2",
          description: "bare",
          suggestion: "",
        },
      ]),
    ).toBe(
      [
        "Found 2 symbol-coverage violation(s) in staged symbols (the same rule kibi check runs):",
        "",
        "[symbol-coverage] SYM-1",
        "  Source: src/a.ts",
        "  no link",
        "  Suggestion: add one",
        "",
        "[symbol-coverage] SYM-2",
        "  bare",
      ].join("\n"),
    );
  });

  it("formats the full linking guidance for unlinked symbols", () => {
    expect(
      formatViolations([
        {
          symbolId: "SYM-1",
          name: "alpha",
          file: "src/alpha.ts",
          line: 12,
          column: 2,
          currentLinks: 0,
          requiredLinks: 1,
        },
      ]),
    ).toBe(
      [
        "Traceability failed: 1 changed symbol(s) have fewer than 1 requirement link(s) (minLinks=1):",
        "  src/alpha.ts:12  alpha  (0 of 1 link(s))",
        "To link a symbol, give it an owning requirement, stage the change and re-run kibi check --staged:",
        '  - Add a .kb/symbols.yaml entry with kb_upsert (CLI: kibi upsert --input -): title as listed above (e.g. "alpha"), sourceFile, and the relationship implements -> REQ-<area>-<behavior> for production code or executable_for -> TEST-<area>-<behavior> for executable test code. Stage .kb/symbols.yaml with the code.',
        "  If no requirement fits, find one with kb_search or create it with kb_upsert (type req) first; production symbols also need covered_by -> TEST-<area>-<behavior>.",
      ].join("\n"),
    );
  });
});

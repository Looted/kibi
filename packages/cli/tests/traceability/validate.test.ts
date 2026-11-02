import { describe, expect, it } from "bun:test";

import {
  type Violation,
  __test__,
  formatViolations,
  validateStagedSymbols,
} from "../../src/traceability/validate";

describe("traceability/validate", () => {
  it("exposes parser helpers for direct edge-case coverage", () => {
    expect(__test__.unquoteAtom("  'na''me'  ")).toBe("na'me");
    expect(__test__.unquoteAtom("  plain_atom  ")).toBe("plain_atom");

    expect(__test__.splitTopLevelComma("'a''b', plain , 'c,d', final")).toEqual(
      ["'a'b'", "plain", "'c,d'", "final"],
    );

    expect(
      __test__.splitTopLevelLists(
        "['a''b',1], ignored, ['c,d',2], ['unterminated''quote']",
      ),
    ).toEqual(["['a'b',1]", "['c,d',2]", "['unterminated'quote']"]);

    expect(
      __test__.parsePrologListOfLists("[[a,1,'file.ts',10,0,'name']]"),
    ).toEqual([["a", "1", "'file.ts'", "10", "0", "'name'"]]);
    expect(__test__.parsePrologListOfLists("[]")).toEqual([]);
    expect(__test__.parsePrologListOfLists("")).toEqual([]);
    expect(__test__.parsePrologListOfLists("[[a,1],[b,2]]")).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
    expect(
      __test__.parsePrologListOfLists("[[a,1], malformed, [b,2]]"),
    ).toEqual([
      ["a", "1"],
      ["b", "2"],
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

    expect(await validateStagedSymbols({ minLinks: 4, prolog })).toEqual([
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
    expect(report).toContain(
      "write a comment `implements REQ-<area>-<behavior>` directly above the declaration",
    );
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

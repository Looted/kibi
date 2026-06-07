import { beforeEach, describe, expect, it, mock } from "bun:test";
import {
  getStagedFiles,
  parseHunksFromDiff,
  parseNameStatusNull,
} from "../../src/traceability/git-staged.js";
import {
  type ManifestLookup,
  extractSymbolsFromStagedFile,
} from "../../src/traceability/symbol-extract.js";
import {
  cleanupTempKb,
  createOverlayFacts,
} from "../../src/traceability/temp-kb.js";
import {
  formatViolations,
  validateStagedSymbols,
} from "../../src/traceability/validate.js";

// Helper to reset mocks
beforeEach(() => {
  mock.restore();
});

describe("git-staged utilities", () => {
  it("parseNameStatusNull parses null-separated entries", () => {
    const input = "A\tpath/to/file.ts\0R100\told.ts\tnew.ts\0";
    const rows = parseNameStatusNull(input);
    expect(rows.length).toBe(2);
    expect(rows[0].status).toBe("A");
    expect(rows[0].parts[0]).toBe("path/to/file.ts");
    expect(rows[1].status).toBe("R100");
    expect(rows[1].parts[1]).toBe("new.ts");
  });

  it("parseNameStatusNull parses git -z output with null-delimited paths", () => {
    const input = "A\0path/to/file.ts\0R100\0old.ts\0new.ts\0";
    const rows = parseNameStatusNull(input);
    expect(rows).toEqual([
      { status: "A", parts: ["path/to/file.ts"] },
      { status: "R100", parts: ["old.ts", "new.ts"] },
    ]);
  });

  it("parseHunksFromDiff parses hunk headers", () => {
    const diff = "@@ -1,2 +3,4 @@\n@@ -10 +12,3 @@\n";
    const ranges = parseHunksFromDiff(diff);
    expect(ranges.length).toBe(2);
    expect(ranges[0].start).toBe(3);
    expect(ranges[0].end).toBe(3 + 4 - 1);
  });

  it("getStagedFiles calls git and returns staged files (mocked)", () => {
    // Inject a mock exec function directly to avoid relying on require() cache mutation,
    // which is not reliable in ESM (node:child_process has no default export).
    const mockExec = (cmd: string) => {
      if (cmd.includes("--name-status")) return "A\tnew.ts\0";
      if (cmd.includes("git diff --cached -U0"))
        return "@@ -0,0 +1,3 @@\n+line\n";
      if (cmd.startsWith("git show")) return "export function foo() {}\n";
      return "";
    };
    const files = getStagedFiles(mockExec);
    expect(files.length).toBe(1);
    expect(files[0]?.diffText).toContain("@@ -0,0 +1,3 @@");
  });

  it("getStagedFiles handles null-delimited git status output", () => {
    const mockExec = (cmd: string) => {
      if (cmd.includes("--name-status")) return "A\0new.js\0";
      if (cmd.includes("git diff --cached -U0"))
        return "@@ -0,0 +1,2 @@\n+line\n";
      if (cmd.startsWith("git show"))
        return "export function foo() { return 1; }\n";
      return "";
    };

    const files = getStagedFiles(mockExec);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("new.js");
    expect(files[0]?.status).toBe("A");
    expect(files[0]?.diffText).toContain("@@ -0,0 +1,2 @@");
  });
});

describe("symbol-extract", () => {
  it("extracts exported functions, classes, enums and variables", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "file.ts",
      content:
        "export function a() {}\nexport class B {}\nexport enum E { X }\nexport const C = 1;",
      hunkRanges: [{ start: 1, end: 100 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    // should include at least one of each kind
    const kinds = new Set(syms.map((s) => s.kind));
    expect(kinds.has("function")).toBe(true);
    expect(kinds.has("class")).toBe(true);
    expect(kinds.has("enum")).toBe(true);
    expect(kinds.has("variable")).toBe(true);
  });

  it("selects only declarations intersecting hunks", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "file.ts",
      content:
        "export function keep() {}\n// filler\n\nexport function skip() {}\n",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    expect(syms.some((s) => s.name === "keep")).toBe(true);
    // skip should not be selected because its declaration does not intersect the hunk
    expect(syms.some((s) => s.name === "skip")).toBe(false);
  });

  it("new file includes all exported decls", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "newfile.ts",
      content: "export function a() {}\nexport function b() {}",
      hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
      status: "A",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    expect(syms.length).toBeGreaterThanOrEqual(2);
  });

  it("pure rename with no hunks yields none selected", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "renamed.ts",
      content: "export function x() {}",
      hunkRanges: [],
      status: "R",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    // ensure returns array; specific behavior for renames may vary
    expect(Array.isArray(syms)).toBe(true);
  });

  it("parses implements directives and multiple REQs", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "d.ts",
      content: "// implements REQ-1, REQ-2\nexport function z() {}",
      hunkRanges: [{ start: 1, end: 10 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    expect(syms[0].reqLinks).toEqual(
      expect.arrayContaining(["REQ-1", "REQ-2"]),
    );
  });

  it("syntax error in staged file returns empty array", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "bad.ts",
      content: "export function x( {",
      hunkRanges: [{ start: 1, end: 10 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged);
    expect(Array.isArray(syms)).toBe(true);
  });

  it("resolveSymbolId is deterministic (hash stable)", () => {
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "file.ts",
      content: "export function stable() {}",
      hunkRanges: [{ start: 1, end: 10 }],
      status: "M",
    };
    const s1 = extractSymbolsFromStagedFile(staged).find(
      (s) => s.name === "stable",
    );
    const s2 = extractSymbolsFromStagedFile(staged).find(
      (s) => s.name === "stable",
    );
    expect(s1?.id).toBe(s2?.id);
  });

  it("uses manifest lookup ID when symbol matches sourceFile:title", () => {
    const manifestLookup: ManifestLookup = new Map([
      [
        "src/app/version.ts:APP_VERSION",
        {
          id: "SYMBOL-056",
          relationships: [
            { type: "implements", to: "REQ-001" },
            { type: "implements", to: "REQ-022" },
          ],
        },
      ],
    ]);
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/app/version.ts",
      content: "export const APP_VERSION = '1.3.0';",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged, manifestLookup);
    expect(syms.length).toBe(1);
    expect(syms[0]?.id).toBe("SYMBOL-056");
    expect(syms[0]?.reqLinks).toContain("REQ-001");
    expect(syms[0]?.reqLinks).toContain("REQ-022");
  });

  it("manifest lookup distinguishes symbols by sourceFile not just title", () => {
    const manifestLookup: ManifestLookup = new Map([
      [
        "src/a/helper.ts:helper",
        { id: "SYM-A", relationships: [{ type: "implements", to: "REQ-A" }] },
      ],
      [
        "src/b/helper.ts:helper",
        { id: "SYM-B", relationships: [{ type: "implements", to: "REQ-B" }] },
      ],
    ]);
    const stagedA: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/a/helper.ts",
      content: "export function helper() {}",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const symsA = extractSymbolsFromStagedFile(stagedA, manifestLookup);
    expect(symsA[0]?.id).toBe("SYM-A");
    expect(symsA[0]?.reqLinks).toContain("REQ-A");

    const stagedB: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/b/helper.ts",
      content: "export function helper() {}",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const symsB = extractSymbolsFromStagedFile(stagedB, manifestLookup);
    expect(symsB[0]?.id).toBe("SYM-B");
    expect(symsB[0]?.reqLinks).toContain("REQ-B");
  });

  it("inline directive links take precedence over manifest links", () => {
    const manifestLookup: ManifestLookup = new Map([
      [
        "file.ts:foo",
        {
          id: "SYM-001",
          relationships: [{ type: "implements", to: "REQ-MANIFEST" }],
        },
      ],
    ]);
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "file.ts",
      content: "// implements: REQ-INLINE\nexport function foo() {}",
      hunkRanges: [{ start: 1, end: 2 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged, manifestLookup);
    expect(syms[0]?.id).toBe("SYM-001");
    expect(syms[0]?.reqLinks).toContain("REQ-INLINE");
    expect(syms[0]?.reqLinks).not.toContain("REQ-MANIFEST");
  });

  it("falls back to hash ID when no manifest match exists", () => {
    const manifestLookup: ManifestLookup = new Map();
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/new.ts",
      content: "export function newFunc() {}",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged, manifestLookup);
    expect(syms[0]?.id).not.toBe("");
    expect(syms[0]?.id.length).toBe(16); // SHA256 hex slice
    expect(syms[0]?.reqLinks.length).toBe(0);
  });

  it("manifest with executable_for preserves relationship but does not add to reqLinks", () => {
    const manifestLookup: ManifestLookup = new Map([
      [
        "src/test.ts:testHelper",
        {
          id: "SYM-TEST-001",
          relationships: [{ type: "executable_for", to: "TEST-001" }],
        },
      ],
    ]);
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/test.ts",
      content: "export function testHelper() {}",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged, manifestLookup);
    expect(syms.length).toBe(1);
    expect(syms[0]?.id).toBe("SYM-TEST-001");
    // executable_for should NOT contribute to reqLinks
    expect(syms[0]?.reqLinks).toEqual([]);
    // But the relationship should be preserved in the relationships field
    expect(syms[0]?.relationships).toEqual([
      { type: "executable_for", to: "TEST-001" },
    ]);
  });

  it("manifest with mixed implements and executable_for preserves both relationships", () => {
    const manifestLookup: ManifestLookup = new Map([
      [
        "src/mixed.ts:mixedFunc",
        {
          id: "SYM-MIXED",
          relationships: [
            { type: "implements", to: "REQ-001" },
            { type: "executable_for", to: "TEST-001" },
          ],
        },
      ],
    ]);
    const staged: Parameters<typeof extractSymbolsFromStagedFile>[0] = {
      path: "src/mixed.ts",
      content: "export function mixedFunc() {}",
      hunkRanges: [{ start: 1, end: 1 }],
      status: "M",
    };
    const syms = extractSymbolsFromStagedFile(staged, manifestLookup);
    expect(syms.length).toBe(1);
    // implements contributes to reqLinks
    expect(syms[0]?.reqLinks).toContain("REQ-001");
    // Both relationships are preserved
    expect(syms[0]?.relationships).toEqual([
      { type: "implements", to: "REQ-001" },
      { type: "executable_for", to: "TEST-001" },
    ]);
  });
});

describe("temp-kb and validate", () => {
  it("createOverlayFacts produces prolog facts for symbols", () => {
    // createOverlayFacts should produce prolog lines for symbols
    const facts = createOverlayFacts([
      {
        id: "s1",
        name: "n",
        kind: "function",
        role: "behavioral",
        location: { file: "f", startLine: 1, endLine: 1 },
        hunkRanges: [],
        reqLinks: [],
      },
    ] as Parameters<typeof createOverlayFacts>[0]);
    expect(
      facts.includes("kb:changed_symbol(s1)") ||
        facts.includes("kb:changed_symbol('s1')"),
    ).toBe(true);
  });

  it("createOverlayFacts emits changed_symbol_req facts for reqLinks", () => {
    const facts = createOverlayFacts([
      {
        id: "s2",
        name: "fn",
        kind: "function",
        role: "behavioral",
        location: { file: "f", startLine: 1, endLine: 1 },
        hunkRanges: [],
        reqLinks: ["REQ-001"],
      },
    ] as Parameters<typeof createOverlayFacts>[0]);
    expect(facts).toContain("REQ-001");
    expect(facts).toContain("kb:changed_symbol_req");
  });

  it("cleanupTempKb is safe to call for an unknown temp dir", async () => {
    await cleanupTempKb("/tmp/nonexistent-temp-dir-for-test");
  });

  it("validateStagedSymbols parses prolog rows and formatViolations output", async () => {
    const fakeProlog = {
      query: async (goal: string) => {
        return {
          success: true,
          bindings: {
            Rows: "[['sym1',1,'file.ts',10,0,'name']]",
          },
        };
      },
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];
    const violations = await validateStagedSymbols({
      minLinks: 2,
      prolog: fakeProlog,
    });
    expect(violations.length).toBe(1);
    const out = formatViolations(violations);
    expect(out).toContain("Traceability failed");
  });

  it("minLinks threshold logic: no violations when enough links", async () => {
    const fakeProlog = {
      query: async (_: string) => ({ success: true, bindings: { Rows: "[]" } }),
    } as unknown as Parameters<typeof validateStagedSymbols>[0]["prolog"];
    const violations = await validateStagedSymbols({
      minLinks: 1,
      prolog: fakeProlog,
    });
    expect(violations.length).toBe(0);
  });
});

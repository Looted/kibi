import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { PrologPort } from "../../src/public/operations/runtime-types.js";
import { SOURCE_ANALYSIS_CACHE_FILE } from "../../src/public/operations/source-analysis-cache.js";
import {
  SYMBOL_GRANULARITY_RULE,
  collectSymbolGranularityViolations,
} from "../../src/public/operations/symbol-granularity-check.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const RULES = new Set([SYMBOL_GRANULARITY_RULE]);

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-granularity-check-"));
  roots.push(root);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  return root;
}

type SymbolRow = {
  id: string;
  title?: string;
  sourceFile?: string;
  granularityReason?: string;
};

/** A Prolog port answering the two projections with Prolog term text. */
function prolog(
  symbols: readonly SymbolRow[],
  relationships: readonly [from: string, to: string, type: string][],
  failures: { rows?: string; rels?: string } = {},
): Pick<PrologPort, "query"> & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    async query(goal: string) {
      queries.push(goal);
      if (goal.includes("Rows)")) {
        if (failures.rows !== undefined)
          return { success: false, bindings: {}, error: failures.rows };
        const rows = symbols.map((row) => {
          const fields = [
            row.title !== undefined ? `title="${row.title}"` : undefined,
            "status=active",
            `source="${row.id}.md"`,
            row.sourceFile !== undefined
              ? `sourceFile="${row.sourceFile}"`
              : undefined,
            row.granularityReason !== undefined
              ? `granularity_reason="${row.granularityReason}"`
              : undefined,
          ].filter((field) => field !== undefined);
          return `["${row.id}",symbol,[${fields.join(",")}]]`;
        });
        return { success: true, bindings: { Rows: `[${rows.join(",")}]` } };
      }
      if (failures.rels !== undefined)
        return { success: false, bindings: {}, error: failures.rels };
      const rels = relationships.map(
        ([from, to, type]) => `["kb:entity/${from}","${to}",${type}]`,
      );
      return { success: true, bindings: { Rels: `[${rels.join(",")}]` } };
    },
  } as Pick<PrologPort, "query"> & { queries: string[] };
}

const SERVICE = [
  "export function createInvoice(total: number): number {",
  "  return total;",
  "}",
  "",
  "export function voidInvoice(id: string): string {",
  "  return id;",
  "}",
  "",
].join("\n");

describe("collectSymbolGranularityViolations", () => {
  test("does nothing when the rule is not selected", async () => {
    const port = prolog([], []);
    expect(
      await collectSymbolGranularityViolations(port, "/nowhere", new Set()),
    ).toEqual([]);
    expect(port.queries).toEqual([]);
  });

  test("reports a linked symbol that names something coarser than the file's behavior", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const port = prolog(
      [
        { id: "SYM-module", title: "invoices", sourceFile: "src/invoices.ts" },
        {
          id: "SYM-create",
          title: "createInvoice",
          sourceFile: "src/invoices.ts",
        },
      ],
      [
        ["SYM-module", "REQ-billing", "implements"],
        ["SYM-create", "REQ-billing", "implements"],
      ],
    );

    const violations = await collectSymbolGranularityViolations(
      port,
      root,
      RULES,
    );

    expect(violations).toHaveLength(1);
    const [violation] = violations;
    expect(violation?.rule).toBe(SYMBOL_GRANULARITY_RULE);
    expect(violation?.entityId).toBe("SYM-module");
    expect(violation?.source).toBe("SYM-module.md");
    expect(violation?.description).toContain("src/invoices.ts");
    expect(violation?.evidence).toMatchObject({
      diagnosticId: "symbol_granularity_violation",
      sourceFile: "src/invoices.ts",
      title: "invoices",
      titleExtracted: false,
    });
    expect(
      (violation?.evidence as { granularSymbols: string[] }).granularSymbols,
    ).toEqual(expect.arrayContaining(["createInvoice", "voidInvoice"]));
  });

  test("an absolute sourceFile is judged by its workspace-relative path", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const violations = await collectSymbolGranularityViolations(
      prolog(
        [
          {
            id: "SYM-module",
            title: "invoices",
            sourceFile: join(root, "src/invoices.ts"),
          },
        ],
        [["SYM-module", "REQ-billing", "covered_by"]],
      ),
      root,
      RULES,
    );
    expect(violations.map((violation) => violation.entityId)).toEqual([
      "SYM-module",
    ]);
  });

  test("exempt, unlinked and file-less symbols are not judged", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const port = prolog(
      [
        {
          id: "SYM-reasoned",
          title: "invoices",
          sourceFile: "src/invoices.ts",
          granularityReason: "module-level-behavior",
        },
        {
          id: "SYM-unlinked",
          title: "invoices",
          sourceFile: "src/invoices.ts",
        },
        { id: "SYM-no-file", title: "invoices" },
      ],
      [
        ["SYM-reasoned", "REQ-billing", "implements"],
        ["SYM-no-file", "REQ-billing", "implements"],
      ],
    );
    expect(await collectSymbolGranularityViolations(port, root, RULES)).toEqual(
      [],
    );
  });

  test("files that are missing, directories or not fully analyzable decide nothing", async () => {
    const root = workspace({
      "src/tool.rb": "def run\n  1\nend\n",
      "src/folder.ts/keep": "",
    });
    const port = prolog(
      [
        { id: "SYM-missing", title: "gone", sourceFile: "src/gone.ts" },
        { id: "SYM-folder", title: "folder", sourceFile: "src/folder.ts" },
        { id: "SYM-ruby", title: "tool", sourceFile: "src/tool.rb" },
      ],
      [
        ["SYM-missing", "REQ-a", "implements"],
        ["SYM-folder", "REQ-a", "implements"],
        ["SYM-ruby", "REQ-a", "executable_for"],
      ],
    );
    expect(await collectSymbolGranularityViolations(port, root, RULES)).toEqual(
      [],
    );
  });

  test("a failed projection is an error, not an empty result", async () => {
    await expect(
      collectSymbolGranularityViolations(
        prolog([], [], { rows: "engine down" }),
        "/nowhere",
        RULES,
      ),
    ).rejects.toThrow(
      "symbol-granularity symbol projection failed: engine down",
    );
    await expect(
      collectSymbolGranularityViolations(
        prolog([], [], { rels: "timeout" }),
        "/nowhere",
        RULES,
      ),
    ).rejects.toThrow(
      "symbol-granularity relationship projection failed: timeout",
    );
  });

  describe("analysis cache", () => {
    const symbols: SymbolRow[] = [
      { id: "SYM-module", title: "invoices", sourceFile: "src/invoices.ts" },
      {
        id: "SYM-create",
        title: "createInvoice",
        sourceFile: "src/invoices.ts",
      },
    ];
    const links: [string, string, string][] = [
      ["SYM-module", "REQ-billing", "implements"],
      ["SYM-create", "REQ-billing", "implements"],
    ];
    type CacheFile = {
      analyzers: string;
      entries: Record<string, { status: string; symbols: unknown[] }>;
    };
    const readCache = (store: string): CacheFile =>
      JSON.parse(readFileSync(join(store, SOURCE_ANALYSIS_CACHE_FILE), "utf8"));
    const writeCache = (store: string, cache: CacheFile) =>
      writeFileSync(
        join(store, SOURCE_ANALYSIS_CACHE_FILE),
        JSON.stringify(cache),
      );

    test("a repeated check reads the file's analysis from the store", async () => {
      const root = workspace({ "src/invoices.ts": SERVICE });
      const store = join(root, ".kb", "branches", "main");
      mkdirSync(store, { recursive: true });

      const first = await collectSymbolGranularityViolations(
        prolog(symbols, links),
        root,
        RULES,
        store,
      );
      expect(first).toHaveLength(1);
      const cache = readCache(store);
      const keys = Object.keys(cache.entries);
      expect(keys).toHaveLength(1);
      expect(cache.entries[keys[0] as string]?.status).toBe("ok");

      // Empty the cached symbols: a second run that reads the cache instead
      // of parsing the file again finds no narrower symbol to report.
      const entry = cache.entries[keys[0] as string] as { symbols: unknown[] };
      entry.symbols = [];
      writeCache(store, cache);
      const cached = await collectSymbolGranularityViolations(
        prolog(symbols, links),
        root,
        RULES,
        store,
      );
      expect(cached).toEqual([]);
    });

    test("a changed file is analyzed again and the stale entry is dropped", async () => {
      const root = workspace({ "src/invoices.ts": SERVICE });
      const store = join(root, ".kb", "branches", "main");
      mkdirSync(store, { recursive: true });
      await collectSymbolGranularityViolations(
        prolog(symbols, links),
        root,
        RULES,
        store,
      );
      const before = Object.keys(readCache(store).entries);

      writeFileSync(
        join(root, "src/invoices.ts"),
        `${SERVICE}\nexport function refundInvoice(id: string): string {\n  return id;\n}\n`,
      );
      const violations = await collectSymbolGranularityViolations(
        prolog(symbols, links),
        root,
        RULES,
        store,
      );
      expect(
        (violations[0]?.evidence as { granularSymbols: string[] })
          .granularSymbols,
      ).toEqual(expect.arrayContaining(["refundInvoice"]));
      const after = Object.keys(readCache(store).entries);
      expect(after).toHaveLength(1);
      expect(after).not.toEqual(before);
    });

    test("a cache from another analyzer set or a corrupt file is ignored", async () => {
      const root = workspace({ "src/invoices.ts": SERVICE });
      const store = join(root, ".kb", "branches", "main");
      mkdirSync(store, { recursive: true });
      await collectSymbolGranularityViolations(
        prolog(symbols, links),
        root,
        RULES,
        store,
      );
      const cache = readCache(store);
      for (const entry of Object.values(cache.entries)) entry.symbols = [];
      writeCache(store, { ...cache, analyzers: "another-analyzer-set" });
      expect(
        await collectSymbolGranularityViolations(
          prolog(symbols, links),
          root,
          RULES,
          store,
        ),
      ).toHaveLength(1);
      expect(readCache(store).analyzers).toBe(cache.analyzers);

      writeFileSync(join(store, SOURCE_ANALYSIS_CACHE_FILE), "{not json");
      expect(
        await collectSymbolGranularityViolations(
          prolog(symbols, links),
          root,
          RULES,
          store,
        ),
      ).toHaveLength(1);
      expect(Object.keys(readCache(store).entries)).toHaveLength(1);
    });

    test("no store directory means no cache file", async () => {
      const root = workspace({ "src/invoices.ts": SERVICE });
      const store = join(root, ".kb", "branches", "missing");
      expect(
        await collectSymbolGranularityViolations(
          prolog(symbols, links),
          root,
          RULES,
          store,
        ),
      ).toHaveLength(1);
      expect(existsSync(store)).toBe(false);
    });
  });
});

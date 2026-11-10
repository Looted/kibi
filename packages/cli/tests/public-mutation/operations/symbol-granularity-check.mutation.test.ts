import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";
import { SOURCE_ANALYSIS_CACHE_FILE } from "../../../src/public/operations/source-analysis-cache.js";
import {
  SYMBOL_GRANULARITY_RULE,
  collectSymbolGranularityViolations,
} from "../../../src/public/operations/symbol-granularity-check.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const RULES = new Set(["symbol-granularity"]);
const ROWS_QUERY =
  "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,status,source,sourceFile,granularity_reason]), Props, Fields)), Rows)";
const RELS_QUERY =
  "findall([From,To,Type], (member(Type, [implements,covered_by,executable_for]), kb_relationship(Type, From, To), kb_entity(From, symbol, _)), Rels)";

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

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-granularity-mut-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

function port(
  rows: Answer,
  rels: Answer,
): Pick<PrologPort, "query"> & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    async query(goal: string) {
      queries.push(goal);
      return goal === ROWS_QUERY ? rows : rels;
    },
  } as Pick<PrologPort, "query"> & { queries: string[] };
}

const ok = (key: string, value: string): Answer => ({
  success: true,
  bindings: { [key]: value },
});

const row = (id: string, fields: string) => `["${id}",symbol,[${fields}]]`;
const MODULE = row(
  "SYM-module",
  'title="invoices",source="SYM-module.md",sourceFile="src/invoices.ts"',
);
const CREATE = row(
  "SYM-create",
  'title="createInvoice",sourceFile="src/invoices.ts"',
);

const violation = (
  entityId: string,
  title: string,
  extra: Record<string, unknown> = {},
) => ({
  rule: "symbol-granularity",
  entityId,
  description: `Symbol ${entityId} names '${title}', which the source extractor does not produce for src/invoices.ts (private class members and removed or renamed declarations are not tracked), so it links src/invoices.ts coarsely while granular symbols are available (behavioral only): createInvoice, voidInvoice`,
  suggestion:
    "Re-point this symbol's relationships to the public declaration that owns the behavior (one of: createInvoice, voidInvoice) or remove the symbol; add granularity_reason with config-artifact, module-level-behavior, extractor-miss, legacy-link, or test-suite only when coarse ownership is intentional.",
  ...extra,
  evidence: {
    diagnosticId: "symbol_granularity_violation",
    sourceFile: "src/invoices.ts",
    title,
    titleExtracted: false,
    granularSymbols: ["createInvoice", "voidInvoice"],
  },
});

describe("collectSymbolGranularityViolations", () => {
  test("exports the rule name and skips unselected rules", async () => {
    expect(SYMBOL_GRANULARITY_RULE).toBe("symbol-granularity");
    const fake = port(ok("Rows", "[]"), ok("Rels", "[]"));
    expect(
      await collectSymbolGranularityViolations(fake, "/nowhere", new Set()),
    ).toStrictEqual([]);
    expect(fake.queries).toStrictEqual([]);
  });

  test("asks both projections and reports a coarse link exactly", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const fake = port(
      ok("Rows", `[${MODULE},${CREATE}]`),
      ok(
        "Rels",
        '[["kb:entity/SYM-module","REQ-a",implements],["kb:entity/SYM-create","REQ-a",implements]]',
      ),
    );
    expect(
      await collectSymbolGranularityViolations(fake, root, RULES),
    ).toStrictEqual([
      violation("SYM-module", "invoices", { source: "SYM-module.md" }),
    ]);
    expect(fake.queries).toStrictEqual([ROWS_QUERY, RELS_QUERY]);
  });

  test("keeps every relationship of a symbol, in order", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const rows = ok("Rows", `[${MODULE}]`);
    for (const rels of [
      '[["kb:entity/SYM-module","REQ-a",implements],["kb:entity/SYM-module","REQ-b",relates_to]]',
      '[["kb:entity/SYM-module","REQ-b",relates_to],["kb:entity/SYM-module","REQ-a",covered_by]]',
    ])
      expect(
        (
          await collectSymbolGranularityViolations(
            port(rows, ok("Rels", rels)),
            root,
            RULES,
          )
        ).map((found) => found.entityId),
      ).toStrictEqual(["SYM-module"]);
  });

  test("reads missing and non-text fields as empty", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const rels = ok(
      "Rels",
      '[["kb:entity/SYM-bare","REQ-a",implements],["kb:entity/SYM-list","REQ-a",implements],["kb:entity/SYM-empty","REQ-a",implements],["kb:entity/","REQ-a",implements],["kb:entity/SYM-nofile","REQ-a",implements]]',
    );
    const rows = ok(
      "Rows",
      `[${[
        row("SYM-bare", 'sourceFile="src/invoices.ts"'),
        row(
          "SYM-list",
          'title=[a,b],source=[a,b],sourceFile="src/invoices.ts"',
        ),
        row("SYM-empty", 'title="",source="",sourceFile="src/invoices.ts"'),
        row("", 'title="x",sourceFile="src/invoices.ts"'),
        row("SYM-nofile", 'title="x"'),
        row("SYM-blankfile", 'title="x",sourceFile=""'),
      ].join(",")}]`,
    );
    expect(
      await collectSymbolGranularityViolations(port(rows, rels), root, RULES),
    ).toStrictEqual([
      violation("SYM-bare", ""),
      violation("SYM-list", ""),
      violation("SYM-empty", ""),
    ]);
  });

  test("a projection without bindings reads as empty", async () => {
    const rels = ok("Rels", '[["kb:entity/SYM-module","REQ-a",implements]]');
    const root = workspace({ "src/invoices.ts": SERVICE });
    expect(
      await collectSymbolGranularityViolations(
        port({ success: true, bindings: {} }, rels),
        root,
        RULES,
      ),
    ).toStrictEqual([]);
    expect(
      await collectSymbolGranularityViolations(
        port(ok("Rows", `[${MODULE}]`), { success: true, bindings: {} }),
        root,
        RULES,
      ),
    ).toStrictEqual([]);
  });

  test("a failed projection names its error", async () => {
    const failed = (error?: string): Answer =>
      error === undefined
        ? { success: false, bindings: {} }
        : { success: false, bindings: {}, error };
    const run = (rows: Answer, rels: Answer) =>
      collectSymbolGranularityViolations(port(rows, rels), "/nowhere", RULES);
    await expect(run(failed("down"), ok("Rels", "[]"))).rejects.toThrow(
      /^symbol-granularity symbol projection failed: down$/,
    );
    await expect(run(failed(), ok("Rels", "[]"))).rejects.toThrow(
      /^symbol-granularity symbol projection failed: unknown error$/,
    );
    await expect(run(ok("Rows", "[]"), failed("slow"))).rejects.toThrow(
      /^symbol-granularity relationship projection failed: slow$/,
    );
    await expect(run(ok("Rows", "[]"), failed())).rejects.toThrow(
      /^symbol-granularity relationship projection failed: unknown error$/,
    );
  });

  test("a device behind a source path is not analyzed or cached", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    symlinkSync("/dev/null", join(root, "src", "null.ts"));
    const store = join(root, "store");
    mkdirSync(store);
    const rows = ok(
      "Rows",
      `[${MODULE},${row("SYM-null", 'title="null",sourceFile="src/null.ts"')}]`,
    );
    const rels = ok(
      "Rels",
      '[["kb:entity/SYM-module","REQ-a",implements],["kb:entity/SYM-null","REQ-a",implements]]',
    );
    expect(
      await collectSymbolGranularityViolations(
        port(rows, rels),
        root,
        RULES,
        store,
      ),
    ).toStrictEqual([
      violation("SYM-module", "invoices", { source: "SYM-module.md" }),
    ]);
    const cache = JSON.parse(
      readFileSync(join(store, SOURCE_ANALYSIS_CACHE_FILE), "utf8"),
    ) as { entries: Record<string, unknown> };
    expect(Object.keys(cache.entries)).toHaveLength(1);
  });

  test("only files of judged symbols are analyzed", async () => {
    const root = workspace({
      "src/invoices.ts": SERVICE,
      "src/other.ts": SERVICE,
    });
    const store = join(root, "store");
    mkdirSync(store);
    const rows = ok(
      "Rows",
      `[${MODULE},${row("SYM-other", 'title="x",sourceFile="src/other.ts"')},${row(
        "SYM-reasoned",
        'title="x",sourceFile="src/other.ts",granularity_reason="module-level-behavior"',
      )}]`,
    );
    const rels = ok(
      "Rels",
      '[["kb:entity/SYM-module","REQ-a",implements],["kb:entity/SYM-other","REQ-a",relates_to],["kb:entity/SYM-reasoned","REQ-a",implements]]',
    );
    await collectSymbolGranularityViolations(
      port(rows, rels),
      root,
      RULES,
      store,
    );
    const cache = JSON.parse(
      readFileSync(join(store, SOURCE_ANALYSIS_CACHE_FILE), "utf8"),
    ) as { entries: Record<string, unknown> };
    expect(Object.keys(cache.entries)).toHaveLength(1);
  });

  test("no judged symbol leaves the stored analyses alone", async () => {
    const root = workspace({ "src/invoices.ts": SERVICE });
    const store = join(root, "store");
    mkdirSync(store);
    const linked = ok("Rels", '[["kb:entity/SYM-module","REQ-a",implements]]');
    await collectSymbolGranularityViolations(
      port(ok("Rows", `[${MODULE}]`), linked),
      root,
      RULES,
      store,
    );
    const cachePath = join(store, SOURCE_ANALYSIS_CACHE_FILE);
    const stored = readFileSync(cachePath, "utf8");
    expect(
      await collectSymbolGranularityViolations(
        port(ok("Rows", `[${MODULE}]`), ok("Rels", "[]")),
        root,
        RULES,
        store,
      ),
    ).toStrictEqual([]);
    expect(readFileSync(cachePath, "utf8")).toBe(stored);
    expect(existsSync(cachePath)).toBe(true);
  });
});

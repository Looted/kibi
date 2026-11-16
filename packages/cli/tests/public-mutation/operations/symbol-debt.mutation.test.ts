import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { PrologPort } from "../../../src/public/operations/runtime-types.js";
import { collectSymbolDebt } from "../../../src/public/operations/symbol-debt.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const QUERY =
  "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,sourceFile,granularity_reason]), Props, Fields)), Rows)";

const TAGS = [
  'export const tagIdSchema = "tag";',
  "export function createTag() {",
  "  return 1;",
  "}",
  "export interface Tag {",
  "  id: string;",
  "}",
  "",
].join("\n");

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "kibi-symbol-debt-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    writeFileSync(join(root, file), content);
  }
  return root;
}

function port(answer: {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
}): Pick<PrologPort, "query"> & { queries: string[] } {
  const queries: string[] = [];
  return {
    queries,
    async query(goal: string) {
      queries.push(goal);
      return answer;
    },
  } as Pick<PrologPort, "query"> & { queries: string[] };
}

const row = (id: string, fields: string) => `["${id}",symbol,[${fields}]]`;
const rows = (...entries: string[]) => ({
  success: true,
  bindings: { Rows: `[${entries.join(",")}]` },
});

describe("collectSymbolDebt", () => {
  test("lists unrecorded declarations per recorded file and totals them", async () => {
    const root = workspace({
      "src/tags.ts": TAGS,
      "src/full.ts": "export function only() {}\n",
      "src/unrecorded.ts": "export function nobody() {}\n",
    });
    const fake = port(
      rows(
        row("SYM-create", 'title="createTag",sourceFile="src/tags.ts"'),
        row("SYM-only", 'title="only",sourceFile="src/full.ts"'),
      ),
    );
    expect(await collectSymbolDebt(fake, root)).toStrictEqual({
      total: 2,
      files: [{ path: "src/tags.ts", unrecorded: ["Tag", "tagIdSchema"] }],
    });
    expect(fake.queries).toStrictEqual([QUERY]);
  });

  test("lists files in path order whatever order the records come in", async () => {
    const root = workspace({
      "src/b.ts": "export function b1() {}\nexport function b2() {}\n",
      "src/a.ts": "export function a1() {}\nexport function a2() {}\n",
    });
    const fake = port(
      rows(
        row("SYM-b1", 'title="b1",sourceFile="src/b.ts"'),
        row("SYM-a1", 'title="a1",sourceFile="src/a.ts"'),
      ),
    );
    expect(await collectSymbolDebt(fake, root)).toStrictEqual({
      total: 2,
      files: [
        { path: "src/a.ts", unrecorded: ["a2"] },
        { path: "src/b.ts", unrecorded: ["b2"] },
      ],
    });
  });

  test("a coarse-only file, a missing file and an unparseable file add nothing", async () => {
    const root = workspace({
      "src/coarse.ts": TAGS,
      "src/dir/keep": "x",
      "README.md": "# not source\n",
    });
    const fake = port(
      rows(
        row(
          "SYM-coarse",
          'title="coarse",sourceFile="src/coarse.ts",granularity_reason="module-level-behavior"',
        ),
        row("SYM-gone", 'title="gone",sourceFile="src/gone.ts"'),
        row("SYM-dir", 'title="dir",sourceFile="src/dir"'),
        row("SYM-doc", 'title="doc",sourceFile="README.md"'),
        row("SYM-nofile", 'title="nofile"'),
        row("SYM-empty", 'title="empty",sourceFile=""'),
        row("SYM-root", `title="root",sourceFile="${root}"`),
        row("SYM-list", 'title="list",sourceFile=["src/coarse.ts"]'),
      ),
    );
    expect(await collectSymbolDebt(fake, root)).toStrictEqual({
      total: 0,
      files: [],
    });
  });

  test("a coarse title covers its declaration and an absolute path is normalized", async () => {
    const root = workspace({ "src/tags.ts": TAGS });
    const fake = port(
      rows(
        row("SYM-create", `title="createTag",sourceFile="${root}/src/tags.ts"`),
        row(
          "SYM-tag",
          'title="Tag",sourceFile="src/tags.ts",granularity_reason="extractor-miss"',
        ),
      ),
    );
    expect(await collectSymbolDebt(fake, root)).toStrictEqual({
      total: 1,
      files: [{ path: "src/tags.ts", unrecorded: ["tagIdSchema"] }],
    });
  });

  test("no symbol records means no debt and no analysis", async () => {
    expect(await collectSymbolDebt(port(rows()), "/nowhere")).toStrictEqual({
      total: 0,
      files: [],
    });
    expect(
      await collectSymbolDebt(
        port({ success: true, bindings: {} }),
        "/nowhere",
      ),
    ).toStrictEqual({ total: 0, files: [] });
  });

  test("a failed projection throws with the engine's error", async () => {
    await expect(
      collectSymbolDebt(
        port({ success: false, bindings: {}, error: "boom" }),
        "/nowhere",
      ),
    ).rejects.toThrow("symbol debt projection failed: boom");
    await expect(
      collectSymbolDebt(port({ success: false, bindings: {} }), "/nowhere"),
    ).rejects.toThrow("symbol debt projection failed: unknown error");
  });

  test("keeps parsed analyses in the cache directory", async () => {
    const root = workspace({ "src/tags.ts": TAGS });
    const cacheDir = join(root, ".cache");
    mkdirSync(cacheDir);
    const fake = port(
      rows(row("SYM-create", 'title="createTag",sourceFile="src/tags.ts"')),
    );
    const first = await collectSymbolDebt(fake, root, cacheDir);
    const second = await collectSymbolDebt(fake, root, cacheDir);
    expect(second).toStrictEqual(first);
    expect(first.total).toBe(2);
    // With no records nothing is analyzed, so the cache is left as it was.
    const cached = readdirSync(cacheDir).map((name) => [
      name,
      readFileSync(join(cacheDir, name), "utf8"),
    ]);
    expect(cached.length).toBeGreaterThan(0);
    await collectSymbolDebt(port(rows()), root, cacheDir);
    expect(
      readdirSync(cacheDir).map((name) => [
        name,
        readFileSync(join(cacheDir, name), "utf8"),
      ]),
    ).toStrictEqual(cached);
  });
});

import {
  afterEach,
  describe,
  expect,
  setSystemTime,
  spyOn,
  test,
} from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Project, SourceFile } from "ts-morph";
import {
  type ManifestSymbolEntry,
  enrichSymbolCoordinatesWithTsMorph,
} from "../src/symbols/ts-morph-enrichment.js";

const NOW = "2026-01-02T03:04:05.000Z";
const spies: { mockRestore(): void }[] = [];
const roots: string[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  setSystemTime();
});

function workspace(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-enrich-")));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

function at(
  sourceLine: number,
  sourceColumn: number,
  sourceEndLine: number,
  sourceEndColumn: number,
) {
  return {
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
    coordinatesGeneratedAt: NOW,
  };
}

function privateFailure(title: string): string {
  return `'${title}' is a private class member; the symbol extractor tracks only public declarations, so no coordinates are published. Re-point the symbol to the public member or class that owns the behavior, or remove it`;
}

const SOURCE = [
  /* 1 */ "export type Twin = 1;",
  /* 2 */ "export function Twin() {}",
  /* 3 */ "function inner() {}",
  /* 4 */ "function twice() {}",
  /* 5 */ "function twice() {}",
  /* 6 */ "class Hidden { hm() {} private pm() {} hp = 1; get ha() { return 1; } }",
  /* 7 */ "export const CE = class Named { cm() {} private cpm() {} cp = 2; set cs(v) {} };",
  /* 8 */ "const NE = class { nm() {} private npm() {} np = 1; };",
  /* 9 */ "export class A { m() {} p = 1; get g() { return 1; } set s(v) {} private x() {} }",
  /* 10 */ "export class B { m() {} both() {} }",
  /* 11 */ "export const v = 1, w = 2;",
  /* 12 */ "export interface I {}",
  /* 13 */ "export enum E { A }",
  /* 14 */ "export default function () {}",
  /* 15 */ "class C { both = 1; shared = 1; }",
  /* 16 */ "class D { shared = 2; }",
  /* 17 */ "export class Dup { a() {} }",
  /* 18 */ "class Dup { b() {} }",
  /* 19 */ "const hiddenVar = 1;",
  /* 20 */ "class Deep { private z() {} }",
  /* 21 */ "export function Late() {}",
  /* 22 */ "export type Late = 2;",
  /* 23 */ "export class K { static k() {} }",
  /* 24 */ "export const CE2 = class { cm2() {} }, plain = 3;",
  "",
].join("\n");

async function enrichTitles(
  titles: readonly string[],
  file = "src/a.ts",
): Promise<ManifestSymbolEntry[]> {
  setSystemTime(new Date(NOW));
  const root = workspace({ [file]: SOURCE });
  return enrichSymbolCoordinatesWithTsMorph(
    titles.map((title) => ({ id: `SYM-${title}`, title, sourceFile: file })),
    root,
  );
}

describe("enrichSymbolCoordinatesWithTsMorph", () => {
  test("binds bare titles to exported, internal and unique member declarations", async () => {
    const titles: Array<[string, ReturnType<typeof at> | undefined]> = [
      ["Twin", at(1, 12, 1, 21)],
      ["Late", at(21, 16, 21, 25)],
      ["v", at(11, 13, 11, 18)],
      ["w", at(11, 20, 11, 25)],
      ["I", at(12, 17, 12, 21)],
      ["E", at(13, 12, 13, 19)],
      ["plain", at(24, 39, 24, 48)],
      ["inner", at(3, 9, 3, 19)],
      ["twice", undefined],
      ["hiddenVar", undefined],
      ["hm", at(6, 15, 6, 22)],
      ["hp", at(6, 39, 6, 46)],
      ["ha", at(6, 51, 6, 69)],
      ["cm", at(7, 32, 7, 39)],
      ["cm2", at(24, 27, 24, 35)],
      ["cp", at(7, 57, 7, 64)],
      ["cs", at(7, 69, 7, 77)],
      ["nm", undefined],
      ["np", undefined],
      ["p", at(9, 24, 9, 30)],
      ["g", at(9, 35, 9, 52)],
      ["s", at(9, 57, 9, 64)],
      ["k", at(23, 24, 23, 30)],
      ["m", undefined],
      ["both", at(10, 24, 10, 33)],
      ["shared", undefined],
      ["nope", undefined],
      ["A.", undefined],
      [".m", undefined],
    ];
    const enriched = await enrichTitles(titles.map(([title]) => title));
    expect(enriched).toStrictEqual(
      titles.map(([title, coordinates]) => ({
        id: `SYM-${title}`,
        title,
        sourceFile: "src/a.ts",
        ...coordinates,
      })),
    );
  });

  test("binds qualified titles to public members of the named class", async () => {
    const titles: Array<[string, ReturnType<typeof at> | undefined]> = [
      ["A.m", at(9, 17, 9, 23)],
      ["A.p", at(9, 24, 9, 30)],
      ["A.g", at(9, 35, 9, 52)],
      ["A.s", at(9, 57, 9, 64)],
      ["B.m", at(10, 17, 10, 23)],
      ["Hidden.hm", at(6, 15, 6, 22)],
      ["Hidden.hp", at(6, 39, 6, 46)],
      ["CE.cm", at(7, 32, 7, 39)],
      ["CE.cp", at(7, 57, 7, 64)],
      ["CE.cs", at(7, 69, 7, 77)],
      ["CE2.cm2", at(24, 27, 24, 35)],
      ["Named.cm", undefined],
      ["NE.nm", undefined],
      ["Dup.b", at(18, 12, 18, 18)],
      ["Dup.a", at(17, 19, 17, 25)],
      ["Z.m", undefined],
      ["Hid.den.hm", undefined],
      ["A.missing", undefined],
      ["plain.x", undefined],
      ["v.x", undefined],
    ];
    const enriched = await enrichTitles(titles.map(([title]) => title));
    expect(enriched).toStrictEqual(
      titles.map(([title, coordinates]) => ({
        id: `SYM-${title}`,
        title,
        sourceFile: "src/a.ts",
        ...coordinates,
      })),
    );
  });

  test("reports titles naming private class members", async () => {
    const titles: Array<[string, boolean]> = [
      ["A.x", true],
      ["x", true],
      ["pm", true],
      ["Hidden.pm", true],
      ["Named.cpm", true],
      ["CE.cpm", false],
      ["NE.npm", true],
      ["npm", true],
      ["Deep.z", true],
      ["B.x", false],
      ["A.gone", false],
      ["z", true],
    ];
    const enriched = await enrichTitles(titles.map(([title]) => title));
    expect(enriched).toStrictEqual(
      titles.map(([title, flagged]) => ({
        id: `SYM-${title}`,
        title,
        sourceFile: "src/a.ts",
        ...(flagged ? { coordinateRefreshFailure: privateFailure(title) } : {}),
      })),
    );
  });

  test("leaves entries alone when the source cannot be resolved", async () => {
    setSystemTime(new Date(NOW));
    const root = workspace({
      "src/a.ts": "export const a = 1;\n",
      "README.md": "export const a = 1;\n",
      "src/UPPER.TS": "export const a = 1;\n",
    });
    const entries: ManifestSymbolEntry[] = [
      { id: "none", title: "a" },
      { id: "empty", title: "a", sourceFile: "" },
      { id: "escape", title: "a", sourceFile: "../a.ts" },
      { id: "markdown", title: "a", sourceFile: "README.md" },
      { id: "missing", title: "a", sourceFile: "src/missing.ts" },
      { id: "upper", title: "a", sourceFile: "src/UPPER.TS" },
      { id: "ok", title: "a", sourceFile: "src/a.ts", links: ["REQ-1"] },
    ];
    expect(
      await enrichSymbolCoordinatesWithTsMorph(entries, root),
    ).toStrictEqual([
      ...entries.slice(0, 5),
      { ...entries[5], ...at(1, 13, 1, 18) },
      { ...entries[6], ...at(1, 13, 1, 18) },
    ]);
  });

  test("falls back to a text search when the file cannot be parsed", async () => {
    setSystemTime(new Date(NOW));
    const root = workspace({
      "src/a.ts": [
        "",
        "fooXbar rerun runner",
        "x foo.bar run",
        "run again",
      ].join("\n"),
      "src/crlf.ts": "first\r\nsecond run\r\n",
      "src/regex.ts": "aab ab x(d)[e]{f}g|h^i$j\\k.l*m+n?o\nl a+b",
    });
    mkdirSync(path.join(root, "src", "dir.ts"));
    const warn = spyOn(console, "warn");
    spies.push(warn);
    spies.push(
      spyOn(Project.prototype, "addSourceFileAtPath").mockImplementation(() => {
        throw new Error("cannot add");
      }),
    );
    const entries: ManifestSymbolEntry[] = [
      { id: "dotted", title: "foo.bar", sourceFile: "src/a.ts" },
      { id: "word", title: "run", sourceFile: "src/a.ts" },
      { id: "crlf", title: "second", sourceFile: "src/crlf.ts" },
      { id: "special", title: "a+b", sourceFile: "src/regex.ts" },
      {
        id: "groups",
        title: "x(d)[e]{f}g|h^i$j\\k.l*m+n?o",
        sourceFile: "src/regex.ts",
      },
      { id: "absent", title: "absent", sourceFile: "src/a.ts" },
      { id: "dir", title: "x", sourceFile: "src/dir.ts" },
    ];
    expect(
      await enrichSymbolCoordinatesWithTsMorph(entries, root),
    ).toStrictEqual([
      { ...entries[0], ...at(3, 2, 3, 9) },
      { ...entries[1], ...at(3, 10, 3, 13) },
      { ...entries[2], ...at(2, 0, 2, 6) },
      { ...entries[3], ...at(2, 2, 2, 5) },
      { ...entries[4], ...at(1, 7, 1, 34) },
      entries[5],
      entries[6],
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  test("warns and falls back to a text search when a lookup fails", async () => {
    setSystemTime(new Date(NOW));
    const root = workspace({
      "src/a.ts": "export const target = 1;\n",
      "src/b.ts": "export const other = 1;\n",
      "src/gone.ts": "export const gone = 1;\n",
    });
    const warnings: unknown[] = [];
    spies.push(
      spyOn(console, "warn").mockImplementation((message: unknown) => {
        warnings.push(message);
      }),
    );
    let calls = 0;
    spies.push(
      spyOn(SourceFile.prototype, "getLineAndColumnAtPos").mockImplementation(
        function (this: SourceFile) {
          calls += 1;
          if (calls === 1) throw new Error("position failed");
          if (calls === 2) throw "plain failure";
          unlinkSync(path.join(root, "src", "gone.ts"));
          throw new Error("file vanished");
        },
      ),
    );
    const entries: ManifestSymbolEntry[] = [
      { id: "SYM-a", title: "target", sourceFile: "src/a.ts" },
      { id: "SYM-b", title: "other", sourceFile: "src/b.ts" },
      { id: "SYM-gone", title: "gone", sourceFile: "src/gone.ts" },
    ];
    expect(
      await enrichSymbolCoordinatesWithTsMorph(entries, root),
    ).toStrictEqual([
      { ...entries[0], ...at(1, 13, 1, 19) },
      { ...entries[1], ...at(1, 13, 1, 18) },
      entries[2],
    ]);
    expect(warnings).toStrictEqual([
      "[kibi] Failed to enrich symbol coordinates for SYM-a: position failed",
      "[kibi] Failed to enrich symbol coordinates for SYM-b: plain failure",
      "[kibi] Failed to enrich symbol coordinates for SYM-gone: file vanished",
    ]);
  });

  test("rejects when a source path cannot be resolved at all", async () => {
    const root = workspace({});
    spies.push(spyOn(console, "warn").mockImplementation(() => undefined));
    await expect(
      enrichSymbolCoordinatesWithTsMorph(
        [{ id: "bad", title: "a", sourceFile: 5 as unknown as string }],
        root,
      ),
    ).rejects.toThrow("sourceFile.trim is not a function");
  });

  test("returns an empty list for no entries", async () => {
    expect(
      await enrichSymbolCoordinatesWithTsMorph([], workspace({})),
    ).toStrictEqual([]);
  });
});

// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createManifestLookupSentinelKey,
  extractSymbolsFromStagedFile,
} from "../../src/traceability/symbol-extract.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("symbol-extract leftover declaration kinds", () => {
  test("createManifestLookupSentinelKey prefixes the path", () => {
    expect(createManifestLookupSentinelKey("src/symbols.yaml")).toBe(
      "__manifest__:src/symbols.yaml",
    );
  });

  test("extracts exported functions, classes, members, types, and variables", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-sym-extract-"));
    roots.push(root);
    const file = "src/widget.ts";
    const content = `
/** implements REQ-WIDGET */
export function exportedFn() {}
function hidden() {}

/** implements REQ-CLASS */
export class Widget {
  value = 1;
  get label() { return "w"; }
  set label(value: string) {}
  run() {}
  #secret() {}
  private hiddenMethod() {}
}

export enum Kind { A, B }
export interface Shape { n: number }
export type Alias = string;
export const exportedConst = 1;

export class Anonymous {
  method() {}
}
`;
    const symbols = extractSymbolsFromStagedFile({
      path: file,
      content,
      hunkRanges: [{ start: 1, end: 40 }],
      status: "M",
    });
    const names = symbols.map((symbol) => symbol.name);
    expect(names).toContain("exportedFn");
    expect(names).toContain("Widget");
    expect(names).toContain("Widget.run");
    expect(names).toContain("Widget.value");
    expect(names).toContain("Widget.label");
    expect(names).toContain("Kind");
    expect(names).toContain("Shape");
    expect(names).toContain("Alias");
    expect(names).toContain("exportedConst");
    expect(names.some((name) => name.includes("hidden"))).toBe(false);

    const added = extractSymbolsFromStagedFile({
      path: file,
      content,
      hunkRanges: [],
      status: "A",
    });
    expect(added.length).toBeGreaterThan(0);

    const parseFail = extractSymbolsFromStagedFile({
      path: "src/broken.ts",
      content: "export function (",
      hunkRanges: [{ start: 1, end: 2 }],
      status: "M",
    });
    expect(parseFail).toEqual([]);
  });

  test("uses manifest lookup, sentinels, and on-disk manifests", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-sym-manifest-"));
    roots.push(root);
    const source = join(root, "src", "mod.ts");
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(
      join(root, "src", "symbols.yaml"),
      `symbols:
  - id: SYM-DISK
    title: diskFn
    sourceFile: src/mod.ts
    links:
      - REQ-DISK
      - type: covered_by
        target: TEST-DISK
    relationships:
      - type: executable_for
        target: TEST-DISK
`,
    );
    writeFileSync(source, "export function diskFn() {}\n");

    const lookup = new Map([
      [
        "src/mod.ts:diskFn",
        {
          id: "SYM-LOOKUP",
          relationships: [
            { type: "implements", to: "REQ-LOOKUP" },
            { type: "notes", to: "ignored" },
          ],
        },
      ],
    ]);
    const fromLookup = extractSymbolsFromStagedFile(
      {
        path: "src/mod.ts",
        content: "export function diskFn() {}\n",
        hunkRanges: [{ start: 1, end: 4 }],
        status: "A",
      },
      lookup,
    );
    expect(fromLookup[0]?.id).toBe("SYM-LOOKUP");
    expect(fromLookup[0]?.reqLinks).toContain("REQ-LOOKUP");

    const sentinel = new Map([
      [
        createManifestLookupSentinelKey("src/symbols.yaml"),
        { id: "sentinel", relationships: [] },
      ],
    ]);
    const hashed = extractSymbolsFromStagedFile(
      {
        path: "src/mod.ts",
        content: "export function missingFn() {}\n",
        hunkRanges: [{ start: 1, end: 4 }],
        status: "A",
      },
      sentinel,
    );
    expect(hashed[0]?.id).toHaveLength(16);

    const fromDisk = extractSymbolsFromStagedFile({
      path: source,
      content: "export function diskFn() {}\n",
      hunkRanges: [{ start: 1, end: 4 }],
      status: "A",
    });
    expect(fromDisk[0]?.id).toBe("SYM-DISK");

    const noDir = extractSymbolsFromStagedFile({
      path: "file.ts",
      content: "export function rootFn() {}\n",
      hunkRanges: [{ start: 1, end: 4 }],
      status: "A",
    });
    expect(noDir[0]?.id).toHaveLength(16);
  });
});

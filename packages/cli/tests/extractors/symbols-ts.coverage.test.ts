// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  createTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph,
} from "../../src/extractors/symbols-ts.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

const RICH_SOURCE = `
export function exportedFn() {}
function internalOnly() {}

export class Widget {
  value = 1;
  get label() { return "w"; }
  set label(v: string) {}
  run() {}
  #secret() {}
  private hidden() {}
}

export interface Shape { n: number }
export type Alias = string;
export enum Kind { A }
export const exportedConst = 1;
`;

describe("symbols-ts leftover analysis and enrichment", () => {
  test("provider analyzes ts/tsx/js and skips unsupported files", () => {
    const provider = createTsMorphSourceAnalysisProvider();
    expect(provider.supportsFile("src/a.ts")).toBe(true);
    expect(provider.supportsFile("src/a.tsx")).toBe(true);
    expect(provider.supportsFile("src/a.jsx")).toBe(true);
    expect(provider.supportsFile("src/a.mjs")).toBe(true);
    expect(provider.supportsFile("src/a.md")).toBe(false);

    const ts = provider.analyzeText("src/widget.ts", RICH_SOURCE);
    const names = ts.symbols.map((symbol) => symbol.name);
    expect(names).toContain("exportedFn");
    expect(names).toContain("Widget.run");
    expect(names).toContain("Widget.value");
    expect(names).toContain("Widget.label");
    expect(names).toContain("Shape");
    expect(names).toContain("Alias");
    expect(names).toContain("Kind");
    expect(names).toContain("exportedConst");
    expect(ts.language).toBe("typescript");
    expect(ts.module.title).toBe("widget");

    const js = provider.analyzeText("src/legacy.js", "export function jsFn() {}");
    expect(js.language).toBe("javascript");
    const tsx = provider.analyzeText("src/view.tsx", "export function View() { return null; }");
    expect(tsx.symbols.some((symbol) => symbol.name === "View")).toBe(true);
    const mts = provider.analyzeText("src/mod.mts", "export function mtsFn() {}");
    expect(mts.language).toBe("typescript");
    const emptyName = provider.analyzeText(".ts", "export function x() {}");
    expect(emptyName.module.title.length).toBeGreaterThan(0);
  });

  test("enrichSymbolCoordinatesWithTsMorph covers match, fallback, and skip paths", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-symbols-ts-"));
    roots.push(root);
    const file = path.join(root, "src", "widget.ts");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, RICH_SOURCE);

    const enriched = await enrichSymbolCoordinatesWithTsMorph(
      [
        { id: "SYM-1", title: "exportedFn", sourceFile: "src/widget.ts" },
        { id: "SYM-2", title: "Widget.run", sourceFile: "src/widget.ts" },
        { id: "SYM-3", title: "Widget.value", sourceFile: "src/widget.ts" },
        { id: "SYM-4", title: "Widget.label", sourceFile: "src/widget.ts" },
        { id: "SYM-5", title: "Shape", sourceFile: "src/widget.ts" },
        { id: "SYM-6", title: "Alias", sourceFile: "src/widget.ts" },
        { id: "SYM-7", title: "Kind", sourceFile: "src/widget.ts" },
        { id: "SYM-8", title: "exportedConst", sourceFile: "src/widget.ts" },
        { id: "SYM-9", title: "internalOnly", sourceFile: "src/widget.ts" },
        { id: "SYM-10", title: "run", sourceFile: "src/widget.ts" },
        { id: "SYM-11", title: "label", sourceFile: "src/widget.ts" },
        { id: "SYM-12", title: "missing", sourceFile: "src/widget.ts" },
        { id: "SYM-13", title: "no-file" },
        { id: "SYM-14", title: "readme", sourceFile: "README.md" },
        { id: "SYM-15", title: "gone", sourceFile: "src/missing.ts" },
        { id: "SYM-16", title: "abs", sourceFile: file },
      ],
      root,
    );
    expect(enriched.find((entry) => entry.id === "SYM-1")?.sourceLine).toBe(2);
    expect(enriched.find((entry) => entry.id === "SYM-2")?.sourceLine).toBeDefined();
    expect(enriched.find((entry) => entry.id === "SYM-9")?.sourceLine).toBeDefined();
    expect(enriched.find((entry) => entry.id === "SYM-13")?.sourceLine).toBeUndefined();
    expect(enriched.find((entry) => entry.id === "SYM-14")?.sourceLine).toBeUndefined();
    expect(enriched.find((entry) => entry.id === "SYM-15")?.sourceLine).toBeUndefined();

    const fallbackRoot = mkdtempSync(path.join(tmpdir(), "kibi-symbols-fb-"));
    roots.push(fallbackRoot);
    const odd = path.join(fallbackRoot, "src", "odd.ts");
    mkdirSync(path.dirname(odd), { recursive: true });
    writeFileSync(odd, "const exportedFn = 1;\n");
    const fallback = await enrichSymbolCoordinatesWithTsMorph(
      [{ id: "SYM-FB", title: "exportedFn", sourceFile: "src/odd.ts" }],
      fallbackRoot,
    );
    expect(fallback[0]?.sourceLine === 1 || fallback[0]?.sourceLine === undefined).toBe(
      true,
    );
  });
});

// implements REQ-001
import { describe, expect, test } from "bun:test";
import {
  createTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph,
  onlyCandidate,
} from "../../src/extractors/symbols-ts.js";

describe("ts-morph source analysis adapter", () => {
  const provider = createTsMorphSourceAnalysisProvider();

  test("keeps the historical ts-morph provider id", () => {
    expect(provider.id).toBe("ts-morph");
    expect(provider.supportsFile("src/a.ts")).toBe(true);
    expect(provider.supportsFile("docs/a.md")).toBe(false);
  });

  test("reports module and symbol fields, never comment text", () => {
    const result = provider.analyzeText(
      "src/a.ts",
      [
        "export class Plain {}",
        "// implements REQ-1",
        "export function traced(): void {}",
        "",
      ].join("\n"),
    );
    expect(result.providerId).toBe("ts-morph");
    expect(result.sourceFile).toBe("src/a.ts");
    expect(result.language).toBe("typescript");
    expect(Object.keys(result.module).sort()).toEqual([
      "analysisMode",
      "language",
      "title",
    ]);
    expect(result.symbols).toHaveLength(2);
    const [traced, plain] = result.symbols;
    expect(traced).toMatchObject({
      name: "traced",
      kind: "function",
      startLine: 3,
    });
    // A leading comment is not a traceability link, so no comment text is
    // passed on.
    expect(traced).not.toHaveProperty("directiveText");
    expect(Object.keys(plain ?? {}).sort()).toEqual([
      "endColumn",
      "endLine",
      "kind",
      "name",
      "startColumn",
      "startLine",
    ]);
    expect(plain).toMatchObject({
      name: "Plain",
      kind: "class",
      startColumn: 13,
      endLine: 1,
      endColumn: 21,
    });
    expect(plain?.startLine).toBe(1);
  });

  test("delegates candidate choice and enrichment to the builtin plugin", async () => {
    expect(onlyCandidate(["a"])).toBe("a");
    expect(onlyCandidate(["a", "b"])).toBeUndefined();
    expect(onlyCandidate([])).toBeUndefined();
    expect(await enrichSymbolCoordinatesWithTsMorph([], process.cwd())).toEqual(
      [],
    );
  });
});

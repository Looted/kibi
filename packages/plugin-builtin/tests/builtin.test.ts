import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  validateKibiPlugin,
  validateSourceAnalysisResult,
  validateSourceAnalysisResultV2,
} from "kibi-plugin-sdk";
import { FunctionDeclaration } from "ts-morph";
import {
  collectGranularityCandidates,
  createBuiltinTsMorphSymbolExtractor,
  createBuiltinTsMorphSymbolExtractorV2,
  enrichSymbolCoordinatesWithTsMorph,
  isPrivateClassMember,
  kibiPlugin,
  onlyCandidate,
} from "../src/index.js";

const spies: { mockRestore(): void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// executable_for TEST-capability-plugin-builtin-parity-v1
describe("kibi-plugin-builtin", () => {
  // executable_for TEST-capability-plugin-builtin-parity-v1
  test("plugin validates against kibi-plugin-sdk", () => {
    const validated = validateKibiPlugin(kibiPlugin);
    expect(validated.id).toBe("kibi-plugin-builtin");
    expect(validated.permissions).toEqual({
      network: false,
      metered: false,
      secrets: [],
    });
    expect(validated.capabilities.semanticClassifier?.id).toBeTruthy();
    expect(validated.capabilities.ontologyPack?.id).toBeTruthy();
    expect(validated.capabilities.symbolExtractor?.id).toBeTruthy();
    expect(validated.capabilities.symbolExtractorV2?.id).toBeTruthy();
  });

  // executable_for TEST-capability-plugin-builtin-parity-v1
  test("TS extractor analyzes a simple exported function", () => {
    const extractor = createBuiltinTsMorphSymbolExtractor();
    expect(extractor.supports({ path: "src/hello.ts" })).toBe(true);

    const result = extractor.analyze({
      path: "src/hello.ts",
      content:
        "export function greet(name: string): string {\n  return name;\n}\n",
    });

    const validated = validateSourceAnalysisResult(result);
    expect(validated.language).toBe("typescript");
    expect(validated.module.analysisMode).toBe("parser");
    expect(validated.module.title).toBe("hello");
    expect(validated.symbols).toHaveLength(1);
    expect(validated.symbols[0]?.name).toBe("greet");
    expect(validated.symbols[0]?.kind).toBe("function");
    expect(validated.symbols[0]?.startLine).toBe(1);
  });

  test("v2 extractor provides qualified containers and exact UTF-16 name ranges", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    expect(extractor.supports({ path: "src/nested.ts" })).toBe(true);

    const content =
      'const marker = "😀"; export class Outer {\r\n  method() { return "😀"; }\r\n}\r\n';
    const result = await extractor.analyze({
      path: "src/nested.ts",
      content,
      language: "typescript",
    });
    const validated = validateSourceAnalysisResultV2(result, {
      path: "src/nested.ts",
      content,
      language: "typescript",
    });

    expect(validated.status).toBe("ok");
    expect(validated.contractVersion).toBe("kibi.symbol-extractor.v2");
    const classSymbol = validated.symbols.find(
      (symbol) => symbol.name === "Outer",
    );
    const methodSymbol = validated.symbols.find(
      (symbol) => symbol.name === "Outer.method",
    );
    expect(classSymbol?.nameRange?.startColumn).toBe(content.indexOf("Outer"));
    expect(methodSymbol).toMatchObject({
      qualifiedName: "Outer.method",
      containerName: "Outer",
      nativeKind: "MethodDeclaration",
      nameRange: {
        startLine: 2,
        startColumn: 2,
        endLine: 2,
        endColumn: 8,
      },
    });
    expect(validated.diagnostics).toEqual([]);
    expect(validated.uncoveredRanges).toEqual([]);
  });

  test("v2 extractor reports unsupported file types without symbols", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    const input = { path: "src/readme.md", content: "# Notes" };
    expect(extractor.supports({ path: input.path })).toBe(false);
    const result = await extractor.analyze(input);
    const validated = validateSourceAnalysisResultV2(result, input);
    expect(validated.status).toBe("unsupported");
    expect(validated.symbols).toEqual([]);
    expect(validated.diagnostics).toHaveLength(1);
  });

  test("v2 extractor marks syntax errors partial while accepting an empty file", async () => {
    const extractor = createBuiltinTsMorphSymbolExtractorV2();
    const emptyInput = { path: "src/empty.ts", content: "\r\n" };
    const empty = validateSourceAnalysisResultV2(
      await extractor.analyze(emptyInput),
      emptyInput,
    );
    expect(empty.status).toBe("ok");
    expect(empty.symbols).toEqual([]);

    const malformedInput = {
      path: "src/malformed.ts",
      content: "export function broken( {\r\n",
    };
    const malformed = validateSourceAnalysisResultV2(
      await extractor.analyze(malformedInput),
      malformedInput,
    );
    expect(malformed.status).toBe("partial");
    expect(malformed.diagnostics.length).toBeGreaterThan(0);
    expect(malformed.uncoveredRanges.length).toBeGreaterThan(0);
  });

  test("v2 exposes declaration extraction errors while v1 preserves legacy recovery", async () => {
    const spy = spyOn(
      FunctionDeclaration.prototype,
      "getName",
    ).mockImplementation(() => {
      throw new Error("Declaration access failed");
    });
    spies.push(spy);
    const input = { path: "source.ts", content: "export function run() {}" };
    expect(
      createBuiltinTsMorphSymbolExtractor().analyze(input).symbols,
    ).toEqual([]);
    const result = await createBuiltinTsMorphSymbolExtractorV2().analyze(input);
    expect(result.status).toBe("failed");
    expect(result.diagnostics[0]?.message).toContain(
      "Declaration access failed",
    );
  });

  // executable_for TEST-capability-plugin-builtin-parity-v1
  test("granularity helpers and onlyCandidate are exported", () => {
    const found = collectGranularityCandidates(
      "src/box.ts",
      [
        "export class Box {",
        "  run() {}",
        "  private hide() {}",
        "}",
        "export function handle() {}",
      ].join("\n"),
    );
    expect(found.some((item) => item.name === "Box.run")).toBe(true);
    expect(found.some((item) => item.name === "run")).toBe(true);
    expect(found.some((item) => item.name === "handle")).toBe(true);
    expect(found.some((item) => item.name === "hide")).toBe(false);
    expect(onlyCandidate(["one"])).toBe("one");
    expect(onlyCandidate(["one", "two"])).toBeUndefined();
    expect(isPrivateClassMember({ getName: () => "#secret" })).toBe(true);
  });

  // executable_for TEST-capability-plugin-builtin-parity-v1
  test("coordinate enrichment fills line spans for exported titles", async () => {
    const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import(
      "node:fs"
    );
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const root = mkdtempSync(join(tmpdir(), "kibi-builtin-enrich-"));
    try {
      mkdirSync(join(root, "src"), { recursive: true });
      writeFileSync(
        join(root, "src", "widget.ts"),
        "export function exportedFn() {}\n",
      );
      const enriched = await enrichSymbolCoordinatesWithTsMorph(
        [
          {
            id: "SYM-1",
            title: "exportedFn",
            sourceFile: "src/widget.ts",
          },
        ],
        root,
      );
      expect(enriched[0]?.sourceLine).toBe(1);
      expect(enriched[0]?.coordinatesGeneratedAt).toBeTruthy();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

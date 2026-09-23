import { describe, expect, test } from "bun:test";
import {
  validateKibiPlugin,
  validateSourceAnalysisResult,
} from "kibi-plugin-sdk";
import {
  collectGranularityCandidates,
  createBuiltinTsMorphSymbolExtractor,
  enrichSymbolCoordinatesWithTsMorph,
  isPrivateClassMember,
  kibiPlugin,
  onlyCandidate,
} from "../src/index.js";

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
  });

  // executable_for TEST-capability-plugin-builtin-parity-v1
  test("TS extractor analyzes a simple exported function", () => {
    const extractor = createBuiltinTsMorphSymbolExtractor();
    expect(extractor.supports({ path: "src/hello.ts" })).toBe(true);

    const result = extractor.analyze({
      path: "src/hello.ts",
      content: "export function greet(name: string): string {\n  return name;\n}\n",
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

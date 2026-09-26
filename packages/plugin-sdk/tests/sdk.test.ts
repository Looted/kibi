import { describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  PluginValidationError,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
  createSymbolExtractorV2Adapter,
  defineKibiPlugin,
  validateKibiPlugin,
  validateOntologyMatchCandidate,
  validateProjectKibiConfig,
  validateSemanticClassifierResult,
  validateSourceAnalysisResultV2,
} from "../src/index.js";

// executable_for TEST-capability-plugin-protocol-v1
describe("kibi-plugin-sdk", () => {
  // executable_for TEST-capability-plugin-protocol-v1
  test("defineKibiPlugin preserves a valid semantic classifier plugin", () => {
    const plugin = defineKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "example",
      version: "1.0.0",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "example-classifier",
          classify: () => ({ decisions: [] }),
        },
      },
    });
    expect(validateKibiPlugin(plugin).id).toBe("example");
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects unsupported api versions", () => {
    expect(() =>
      validateKibiPlugin({
        apiVersion: "kibi.plugin.v0",
        id: "x",
        version: "1",
        permissions: { network: false, metered: false, secrets: [] },
        capabilities: {
          semanticClassifier: {
            id: "c",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(PluginValidationError);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects path package references in project config", () => {
    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "../evil",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      }),
    ).toThrow(/bare package name/);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects ontology candidates with wrong arity", () => {
    expect(() =>
      validateOntologyMatchCandidate(
        {
          schemaId: "schema.guard",
          predicateName: "guard",
          arguments: ["a"],
          polarity: "assert",
          confidence: 0.5,
          evidence: "x",
        },
        [
          {
            schemaId: "schema.guard",
            predicateName: "guard",
            argumentNames: ["subject", "condition", "state"],
            argumentTypes: ["entity", "entity", "string"],
          },
        ],
      ),
    ).toThrow(/arity/);
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("accepts a valid semantic classifier result", () => {
    const result = validateSemanticClassifierResult({
      decisions: [
        {
          claimKey: "ck",
          lane: "predicate",
          confidence: 0.8,
        },
      ],
    });
    expect(result.decisions[0]?.lane).toBe("predicate");
  });

  // executable_for TEST-capability-plugin-protocol-v1
  test("rejects foreign and duplicate semantic claimKeys", () => {
    expect(() =>
      validateSemanticClassifierResult(
        {
          decisions: [{ claimKey: "foreign", lane: "none", confidence: 0 }],
        },
        { expectedClaimKeys: ["local"] },
      ),
    ).toThrow(/foreign claimKey/);

    expect(() =>
      validateSemanticClassifierResult({
        decisions: [
          { claimKey: "ck", lane: "none", confidence: 0 },
          { claimKey: "ck", lane: "predicate", confidence: 0.5 },
        ],
      }),
    ).toThrow(/duplicate decision/);
  });

  test("rejects duplicate package activation and duplicate replace providers", () => {
    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "dup",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
          {
            package: "dup",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            },
          },
        ],
      }),
    ).toThrow(/more than once/);

    expect(() =>
      validateProjectKibiConfig({
        plugins: [
          {
            package: "r1",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
            },
          },
          {
            package: "r2",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
            },
          },
        ],
      }),
    ).toThrow(/At most one replace provider/);
  });

  test("preserves a disclosed classifier model and rejects a blank one", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "x",
      version: "1",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        semanticClassifier: {
          id: "c",
          model: " example-model ",
          classify: () => ({ decisions: [] }),
        },
      },
    });
    expect(plugin.capabilities.semanticClassifier?.model).toBe("example-model");
    expect(() =>
      validateKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "x",
        version: "1",
        permissions: { network: false, metered: false, secrets: [] },
        capabilities: {
          semanticClassifier: {
            id: "c",
            model: " ",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(/model must be a non-empty string/);
  });

  test("rejects duplicate secret names", () => {
    expect(() =>
      validateKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "x",
        version: "1",
        permissions: {
          network: true,
          metered: true,
          secrets: ["TYPESAFE_API_KEY", "TYPESAFE_API_KEY"],
        },
        capabilities: {
          semanticClassifier: {
            id: "c",
            classify: () => ({ decisions: [] }),
          },
        },
      }),
    ).toThrow(/duplicate names/);
  });

  test("accepts the additive async symbol extractor v2 capability and config", () => {
    const plugin = validateKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "v2-plugin",
      version: "1",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        symbolExtractorV2: {
          id: "extractor.v2",
          supports: () => true,
          async analyze() {
            throw new Error("not called by plugin validation");
          },
        },
      },
    });
    expect(plugin.capabilities.symbolExtractorV2?.id).toBe("extractor.v2");
    expect(
      validateProjectKibiConfig({
        plugins: [
          {
            package: "v2-plugin",
            capabilities: {
              [SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      }).plugins?.[0]?.capabilities[SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]?.mode,
    ).toBe("augment");
  });

  test("adapts v1 extraction asynchronously without changing the legacy result", async () => {
    const legacy = {
      sourceFile: "src/legacy.ts",
      language: "typescript",
      module: {
        title: "legacy",
        language: "typescript",
        analysisMode: "parser" as const,
      },
      symbols: [
        {
          name: "run",
          kind: "function" as const,
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 5,
        },
      ],
    };
    const extractor = createSymbolExtractorV2Adapter({
      id: "legacy-extractor",
      supports: ({ path }) => path.endsWith(".ts"),
      analyze: () => legacy,
    });
    expect(extractor.id).toBe("legacy-extractor.v2");
    expect(extractor.supports({ path: "src/legacy.ts" })).toBe(true);
    const promise = extractor.analyze({
      path: "src/legacy.ts",
      content: "run()",
    });
    expect(promise).toBeInstanceOf(Promise);
    await expect(promise).resolves.toMatchObject({
      contractVersion: "kibi.symbol-extractor.v2",
      status: "ok",
      symbols: legacy.symbols,
      diagnostics: [],
      uncoveredRanges: [],
    });
    expect(legacy).not.toHaveProperty("contractVersion");

    const emptyAdapter = createSymbolExtractorV2Adapter({
      id: "empty-extractor",
      supports: () => true,
      analyze: () => ({ ...legacy, symbols: [] }),
    });
    await expect(
      emptyAdapter.analyze({ path: "src/legacy.ts", content: "" }),
    ).resolves.toMatchObject({ status: "ok", symbols: [] });
  });

  test("v1 adapter rejects when its legacy extractor throws", async () => {
    const extractor = createSymbolExtractorV2Adapter({
      id: "broken",
      supports: () => true,
      analyze: () => {
        throw new Error("legacy failure");
      },
    });
    await expect(
      extractor.analyze({ path: "bad.ts", content: "" }),
    ).rejects.toThrow("legacy failure");
  });

  test("validates v2 ranges against UTF-16 columns and preserved CRLF lines", () => {
    const line = 'const label = "😀"; export function run() {}';
    const input = { path: "src/emoji.ts", content: `${line}\r\n` };
    const startColumn = line.indexOf("run");
    const valid = {
      contractVersion: "kibi.symbol-extractor.v2",
      status: "ok",
      sourceFile: input.path,
      language: "typescript",
      module: {
        title: "emoji",
        language: "typescript",
        analysisMode: "parser",
      },
      symbols: [
        {
          name: "run",
          qualifiedName: "run",
          kind: "function",
          startLine: 1,
          startColumn,
          endLine: 1,
          endColumn: line.length,
          nameRange: {
            startLine: 1,
            startColumn,
            endLine: 1,
            endColumn: startColumn + "run".length,
          },
        },
      ],
      diagnostics: [],
      uncoveredRanges: [],
    };
    const validated = validateSourceAnalysisResultV2(valid, input);
    expect(validated.symbols[0]?.startColumn).toBe(startColumn);
    expect(validated.symbols[0]?.nameRange?.endColumn).toBe(startColumn + 3);
    expect(validated.sourceFile).toBe(input.path);
    expect(
      validateSourceAnalysisResultV2(
        { ...valid, symbols: [] },
        { path: input.path, content: "" },
      ).symbols,
    ).toEqual([]);
  });

  test("rejects v2 path mismatches, out-of-content ranges, and forged provenance", () => {
    const input = { path: "src/a.ts", content: "export const a = 1;\r\n" };
    const result = {
      contractVersion: "kibi.symbol-extractor.v2",
      status: "ok",
      sourceFile: input.path,
      language: "typescript",
      module: { title: "a", language: "typescript", analysisMode: "parser" },
      symbols: [
        {
          name: "a",
          kind: "variable",
          startLine: 1,
          startColumn: 13,
          endLine: 1,
          endColumn: 18,
        },
      ],
      diagnostics: [],
      uncoveredRanges: [],
    };
    expect(() =>
      validateSourceAnalysisResultV2(
        { ...result, sourceFile: "other.ts" },
        input,
      ),
    ).toThrow(/does not match requested path/);
    expect(() =>
      validateSourceAnalysisResultV2(
        {
          ...result,
          symbols: [{ ...result.symbols[0], endColumn: 99 }],
        },
        input,
      ),
    ).toThrow(/outside the supplied source line/);
    expect(() =>
      validateSourceAnalysisResultV2({ ...result, pluginId: "forged" }, input),
    ).toThrow(/host provenance field 'pluginId'/);
    expect(() =>
      validateSourceAnalysisResultV2(result, input, { maxSymbols: 0 }),
    ).toThrow(/symbol limit/);
    expect(() =>
      validateSourceAnalysisResultV2(result, input, { maxInputSize: 1 }),
    ).toThrow(/UTF-16 code unit limit/);
  });

  test("enforces v2 diagnostic and coverage status invariants", () => {
    const input = { path: "src/a.ts", content: "abc\r\n" };
    const base = {
      contractVersion: "kibi.symbol-extractor.v2",
      sourceFile: input.path,
      language: "typescript",
      module: { title: "a", language: "typescript", analysisMode: "parser" },
      symbols: [],
      diagnostics: [],
      uncoveredRanges: [],
    };
    expect(
      validateSourceAnalysisResultV2({ ...base, status: "ok" }, input).symbols,
    ).toEqual([]);
    expect(() =>
      validateSourceAnalysisResultV2({ ...base, status: "partial" }, input),
    ).toThrow(/requires at least one diagnostic/);
    expect(() =>
      validateSourceAnalysisResultV2(
        {
          ...base,
          status: "partial",
          diagnostics: [{ code: "PARSE", message: "unparsed" }],
        },
        input,
      ),
    ).toThrow(/requires at least one uncovered range/);
    expect(() =>
      validateSourceAnalysisResultV2(
        {
          ...base,
          status: "failed",
          diagnostics: [{ code: "FAILED", message: "failed" }],
          symbols: [
            {
              name: "a",
              kind: "variable",
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 1,
            },
          ],
        },
        input,
      ),
    ).toThrow(/must not include symbols/);
    expect(
      validateSourceAnalysisResultV2(
        {
          ...base,
          status: "partial",
          diagnostics: [{ code: "PARSE", message: "unparsed" }],
          uncoveredRanges: [
            {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 1,
              reason: "one token could not be analyzed",
            },
          ],
        },
        input,
      ).status,
    ).toBe("partial");
  });
});

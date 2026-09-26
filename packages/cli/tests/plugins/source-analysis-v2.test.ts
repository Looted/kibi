// executable_for TEST-source-analysis-v2-contract
import { describe, expect, test } from "bun:test";
import type {
  SourceAnalysisResultV2,
  SymbolExtractorV2,
} from "kibi-plugin-sdk";
import type {
  CapabilityModeResolution,
  CapabilityProviderBinding,
} from "../../src/plugins/registry.js";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";

const result = (
  status: SourceAnalysisResultV2["status"] = "ok",
): SourceAnalysisResultV2 => ({
  contractVersion: "kibi.symbol-extractor.v2",
  status,
  sourceFile: "sample.py",
  language: "python",
  module: { title: "sample", language: "python", analysisMode: "parser" },
  symbols: [],
  diagnostics:
    status === "ok"
      ? []
      : [{ code: "parse_error", message: "Incomplete syntax" }],
  uncoveredRanges:
    status === "partial"
      ? [
          {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 4,
            reason: "parse_error",
          },
        ]
      : [],
});
function binding(
  id: string,
  analyze: SymbolExtractorV2["analyze"],
  supports = true,
): CapabilityProviderBinding<SymbolExtractorV2> {
  return {
    pluginId: id,
    pluginVersion: "1.0.0",
    packageName: null,
    mode: "builtin",
    external: false,
    permissions: { network: false, secrets: [], metered: false },
    capability: { id, supports: () => supports, analyze },
    stamp: {
      pluginId: id,
      pluginVersion: "1.0.0",
      capability: "kibi.symbol-extractor.v2",
      mode: "augment",
      external: false,
      network: false,
      metered: false,
    },
  };
}
function service(resolution: CapabilityModeResolution<SymbolExtractorV2>) {
  return new SourceAnalysisService({
    registry: new CapabilityRegistry({ workspaceRoot: "/unused" }),
    resolveExtractorsV2: async () => resolution,
  });
}
const resolution = (
  builtin: CapabilityProviderBinding<SymbolExtractorV2>,
): CapabilityModeResolution<SymbolExtractorV2> => ({
  builtin,
  replace: null,
  augment: [],
  shadow: [],
});

describe("source analysis v2 host", () => {
  test("distinguishes an empty valid parse from no analyzer", async () => {
    const supported = await service(
      resolution(binding("empty", async () => result())),
    ).analyzeTextV2("sample.py", "pass");
    const unsupported = await service(
      resolution(binding("unused", async () => result(), false)),
    ).analyzeTextV2("sample.py", "pass");
    expect(supported.status).toBe("ok");
    expect(supported.symbols).toEqual([]);
    expect(unsupported.status).toBe("unsupported");
    expect(unsupported.providerId).toBeNull();
    expect(supported.inputFingerprint).toHaveLength(64);
  });
  test("a required provider failure cannot fall through to a successful provider", async () => {
    let calls = 0;
    const providers = resolution(
      binding("builtin", async () => {
        calls++;
        return result();
      }),
    );
    const actual = await service({
      ...providers,
      replace: binding("broken", async () => {
        throw new Error("ABI mismatch");
      }),
    }).analyzeTextV2("sample.py", "pass");
    expect(actual.status).toBe("failed");
    expect(actual.providerId).toBe("broken");
    expect(calls).toBe(0);
    expect(actual.diagnostics[0]?.message).toContain("ABI mismatch");
  });
  test("partial output stays partial and failed shadows do not replace canonical results", async () => {
    const providers = resolution(
      binding("partial", async () => result("partial")),
    );
    const actual = await service({
      ...providers,
      shadow: [
        binding("shadow", async () => {
          throw new Error("unavailable");
        }),
      ],
    }).analyzeTextV2("sample.py", "pass");
    expect(actual.status).toBe("partial");
    expect(actual.uncoveredRanges).toHaveLength(1);
    expect(actual.shadowComparisons[0]?.ok).toBe(false);
    expect(actual.providerId).toBe("partial");
  });
  test("captures supports errors and invalid provider data as failures", async () => {
    const provider = binding("invalid", async () => ({
      ...result(),
      sourceFile: "other.py",
    }));
    expect(
      (await service(resolution(provider)).analyzeTextV2("sample.py", "pass"))
        .status,
    ).toBe("failed");
    const throwing = {
      ...provider,
      capability: {
        ...provider.capability,
        supports: () => {
          throw new Error("configuration");
        },
      },
    };
    expect(
      (await service(resolution(throwing)).analyzeTextV2("sample.py", "pass"))
        .status,
    ).toBe("failed");
  });
  test("fingerprints supplied content and path and never assigns ownership or proof", async () => {
    const analyzer = service(
      resolution(
        binding("valid", async (input) => ({
          ...result(),
          sourceFile: input.path,
        })),
      ),
    );
    const first = await analyzer.analyzeTextV2("sample.py", "pass");
    const second = await analyzer.analyzeTextV2("sample.py", "pass\n");
    expect(first.inputFingerprint).not.toBe(second.inputFingerprint);
    expect(first.stamp?.pluginVersion).toBe("1.0.0");
    expect(first).not.toHaveProperty("proof");
    expect(first).not.toHaveProperty("requirements");
  });
});

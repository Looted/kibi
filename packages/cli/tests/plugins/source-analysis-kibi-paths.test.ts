// executable_for TEST-kibi-tree-sitter-language-packs
import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";

/** A service whose only analyzer refuses every file for a missing pack. */
function packlessService(code: string): SourceAnalysisService {
  return new SourceAnalysisService({
    registry: new CapabilityRegistry({ workspaceRoot: tmpdir() }),
    resolveExtractorsV2: async () => ({
      builtin: {
        pluginId: "kibi-plugin-treesitter",
        pluginVersion: "3.0.0",
        packageName: null,
        mode: "builtin",
        external: false,
        permissions: { network: false, metered: false, secrets: [] },
        capability: {
          id: "kibi-plugin-treesitter.tree-sitter.v2",
          supports: () => true,
          analyze: async (input: { path: string }) => ({
            contractVersion: "kibi.symbol-extractor.v2" as const,
            status: "unsupported" as const,
            sourceFile: input.path,
            language: "prolog",
            module: {
              title: "m",
              language: "prolog",
              analysisMode: "parser" as const,
            },
            symbols: [],
            diagnostics: [
              { code, message: "SWI-Prolog needs kibi-lang-prolog@1.0.0" },
            ],
            uncoveredRanges: [],
          }),
        },
        stamp: {
          pluginId: "kibi-plugin-treesitter",
          pluginVersion: "3.0.0",
          capability: "kibi.symbol-extractor.v2",
          mode: "augment",
          external: false,
          network: false,
          metered: false,
        },
      },
      replace: null,
      augment: [],
      shadow: [],
    }),
  } as ConstructorParameters<typeof SourceAnalysisService>[0]);
}

describe("source analysis of Kibi's own files", () => {
  it("does not analyze Kibi's knowledge-base files as project source", async () => {
    const service = packlessService("TREESITTER_LANGUAGE_PACK_MISSING");
    for (const file of [".kb/schema/entities.pl", "./.kb/schema/kb.pl"]) {
      const result = await service.analyzeTextV2(file, "a.\n");
      expect(result.status).toBe("unsupported");
      expect(result.diagnostics.map((row) => row.code)).toEqual([
        "kibi_knowledge_base_file",
      ]);
    }
  });
});

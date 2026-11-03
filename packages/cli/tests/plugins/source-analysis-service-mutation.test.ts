// executable_for TEST-kibi-tree-sitter-language-packs
import { describe, expect, it } from "bun:test";
import { tmpdir } from "node:os";
import { CapabilityRegistry } from "../../src/plugins/registry.js";
import { SourceAnalysisService } from "../../src/plugins/source-analysis-service.js";

type Diagnostic = { code: string; message: string };
type Waiver = (file: string, content: string, pack: string) => string | null;

const MISSING_RUST: Diagnostic = {
  code: "TREESITTER_LANGUAGE_PACK_MISSING",
  message:
    "Rust files need kibi-lang-rust 1.0.0, which is not installed. Run: npm install --save-dev kibi-lang-rust@1.0.0",
};

/** A service whose only analyzer answers every file with `status` and `diagnostics`. */
function service(
  status: "unsupported" | "partial",
  diagnostics: Diagnostic[],
  waiver?: Waiver,
): SourceAnalysisService {
  return new SourceAnalysisService({
    registry: new CapabilityRegistry({ workspaceRoot: tmpdir() }),
    ...(waiver ? { languagePackWaiver: waiver } : {}),
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
            status,
            sourceFile: input.path,
            language: "rust",
            module: {
              title: "m",
              language: "rust",
              analysisMode: "parser" as const,
            },
            symbols: [],
            diagnostics,
            // A partial result names what it did not read.
            uncoveredRanges:
              status === "partial"
                ? [
                    {
                      startLine: 1,
                      startColumn: 1,
                      endLine: 1,
                      endColumn: 12,
                      reason: "not read",
                    },
                  ]
                : [],
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

/** The diagnostic codes of the file's analysis, and the packs the waiver was asked about. */
async function analyze(
  status: "unsupported" | "partial",
  diagnostics: Diagnostic[],
  withWaiver = true,
): Promise<{ codes: string[]; asked: string[] }> {
  const asked: string[] = [];
  const waiver: Waiver = (_file, _content, pack) => {
    asked.push(String(pack));
    return "waived";
  };
  const result = await service(
    status,
    diagnostics,
    withWaiver ? waiver : undefined,
  ).analyzeTextV2("src/main.rs", "fn main() {}\n");
  return { codes: result.diagnostics.map((item) => item.code), asked };
}

describe("language pack waivers", () => {
  it("waives a missing or another version's pack, naming the pack", async () => {
    expect(await analyze("unsupported", [MISSING_RUST])).toEqual({
      codes: ["language_pack_not_required"],
      asked: ["kibi-lang-rust"],
    });
    expect(
      await analyze("unsupported", [
        {
          code: "TREESITTER_LANGUAGE_PACK_VERSION",
          message: "Rust files need kibi-lang-rust 2.0.0; 1.0.0 is installed.",
        },
      ]),
    ).toEqual({
      codes: ["language_pack_not_required"],
      asked: ["kibi-lang-rust"],
    });
  });

  it("leaves the result as it is without a waiver", async () => {
    expect(await analyze("unsupported", [MISSING_RUST], false)).toEqual({
      codes: ["TREESITTER_LANGUAGE_PACK_MISSING"],
      asked: [],
    });
  });

  it("waives only a refused file", async () => {
    expect(await analyze("partial", [MISSING_RUST])).toEqual({
      codes: ["TREESITTER_LANGUAGE_PACK_MISSING"],
      asked: [],
    });
  });

  it("waives no other refusal, nor one that names no pack", async () => {
    const other = {
      code: "TREESITTER_PARSE_FAILED",
      message: "kibi-lang-rust could not parse the file",
    };
    expect(await analyze("unsupported", [other])).toEqual({
      codes: ["TREESITTER_PARSE_FAILED"],
      asked: [],
    });
    const unnamed = {
      code: "TREESITTER_LANGUAGE_PACK_MISSING",
      message: "Rust files need a grammar pack, which is not installed.",
    };
    expect(await analyze("unsupported", [unnamed])).toEqual({
      codes: ["TREESITTER_LANGUAGE_PACK_MISSING"],
      asked: [],
    });
  });
});

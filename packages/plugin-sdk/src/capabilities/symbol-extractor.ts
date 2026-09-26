/**
 * kibi.symbol-extractor.v1 — language-specific source symbol analysis.
 */

// implements REQ-capability-plugin-protocol-v1
export type SourceAnalysisMode = "parser" | "fallback";

// implements REQ-capability-plugin-protocol-v1
export type SourceSymbolKind =
  | "function"
  | "class"
  | "method"
  | "property"
  | "accessor"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "unknown";

// implements REQ-capability-plugin-protocol-v1
export interface SourceSymbolAnalysis {
  readonly name: string;
  readonly kind: SourceSymbolKind;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  readonly directiveText?: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SourceModuleAnalysis {
  readonly title: string;
  readonly language: string;
  readonly analysisMode: SourceAnalysisMode;
  readonly fallbackReason?: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisResult {
  readonly sourceFile: string;
  readonly language: string;
  readonly module: SourceModuleAnalysis;
  readonly symbols: readonly SourceSymbolAnalysis[];
}

/** A source span with 1-based lines and 0-based UTF-16 columns. Ends are exclusive. */
// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisRangeV2 {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

// implements REQ-capability-plugin-protocol-v1
export type SourceAnalysisStatusV2 =
  | "ok"
  | "partial"
  | "unsupported"
  | "failed";

// implements REQ-capability-plugin-protocol-v1
export interface SourceSymbolAnalysisV2 extends SourceSymbolAnalysis {
  readonly qualifiedName?: string;
  readonly containerName?: string;
  readonly nativeKind?: string;
  readonly signature?: string;
  readonly nameRange?: SourceAnalysisRangeV2;
}

// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisDiagnosticV2 {
  readonly code: string;
  readonly message: string;
  readonly range?: SourceAnalysisRangeV2;
}

// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisUncoveredRangeV2 extends SourceAnalysisRangeV2 {
  readonly reason: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisResultV2
  extends Omit<SourceAnalysisResult, "symbols"> {
  readonly contractVersion: "kibi.symbol-extractor.v2";
  readonly status: SourceAnalysisStatusV2;
  readonly symbols: readonly SourceSymbolAnalysisV2[];
  readonly diagnostics: readonly SourceAnalysisDiagnosticV2[];
  readonly uncoveredRanges: readonly SourceAnalysisUncoveredRangeV2[];
}

/** Maximum source size accepted for ranged v2 analysis, measured in UTF-16 code units. */
// implements REQ-capability-plugin-protocol-v1
export const SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS = 5 * 1024 * 1024;

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorSupportsInput {
  readonly path: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorAnalyzeInput {
  readonly path: string;
  readonly content: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorV2SupportsInput {
  readonly path: string;
  readonly language?: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorV2AnalyzeInput
  extends SymbolExtractorV2SupportsInput {
  readonly content: string;
}

/**
 * Public symbol extractor capability. The host stamps provider identity;
 * plugins must not self-author trusted provenance fields.
 */
// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorV1 {
  readonly id: string;
  supports(input: SymbolExtractorSupportsInput): boolean;
  analyze(input: SymbolExtractorAnalyzeInput): SourceAnalysisResult;
}

/** Asynchronous, source-bound symbol analysis with explicit coverage status. */
// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorV2 {
  readonly id: string;
  supports(input: SymbolExtractorV2SupportsInput): boolean;
  analyze(
    input: SymbolExtractorV2AnalyzeInput,
  ): Promise<SourceAnalysisResultV2>;
}

/**
 * Limits applied while validating untrusted v2 extractor output. The defaults
 * are 100,000 symbols and 5 Mi UTF-16 code units of input content.
 */
// implements REQ-capability-plugin-protocol-v1
export interface ValidateSourceAnalysisResultV2Options {
  readonly maxSymbols?: number;
  readonly maxInputSize?: number;
}

/** Host-facing provider adapter used by Kibi core before stamping. */
// implements REQ-capability-plugin-protocol-v1
export interface SourceAnalysisProvider {
  readonly id: string;
  supportsFile(filePath: string): boolean;
  analyzeText(filePath: string, content: string): SourceAnalysisResult;
}

// implements REQ-capability-plugin-protocol-v1
export function toSourceAnalysisProvider(
  extractor: SymbolExtractorV1,
): SourceAnalysisProvider {
  return {
    id: extractor.id,
    supportsFile(filePath: string): boolean {
      return extractor.supports({ path: filePath });
    },
    analyzeText(filePath: string, content: string): SourceAnalysisResult {
      return extractor.analyze({ path: filePath, content });
    },
  };
}

/** Adapt a synchronous v1 extractor to the explicit asynchronous v2 contract. */
// implements REQ-capability-plugin-protocol-v1
export function createSymbolExtractorV2Adapter(
  extractor: SymbolExtractorV1,
): SymbolExtractorV2 {
  return {
    id: `${extractor.id}.v2`,
    supports(input): boolean {
      return extractor.supports({ path: input.path });
    },
    async analyze(input): Promise<SourceAnalysisResultV2> {
      const result = await extractor.analyze({
        path: input.path,
        content: input.content,
      });
      return {
        contractVersion: "kibi.symbol-extractor.v2",
        status: "ok",
        sourceFile: result.sourceFile,
        language: result.language,
        module: result.module,
        symbols: result.symbols,
        diagnostics: [],
        uncoveredRanges: [],
      };
    },
  };
}

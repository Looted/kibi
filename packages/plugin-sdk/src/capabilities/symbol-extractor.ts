/**
 * kibi.symbol-extractor.v1 — language-specific source symbol analysis.
 */

export type SourceAnalysisMode = "parser" | "fallback";

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

export interface SourceSymbolAnalysis {
  readonly name: string;
  readonly kind: SourceSymbolKind;
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
  /**
   * @deprecated Kibi hosts ignore this field. Source comments are not a
   * traceability source: the symbol manifest is the only record of which
   * requirements a symbol implements. Kept so existing extractors that still
   * send it keep validating.
   */
  readonly directiveText?: string;
}

export interface SourceModuleAnalysis {
  readonly title: string;
  readonly language: string;
  readonly analysisMode: SourceAnalysisMode;
  readonly fallbackReason?: string;
}

export interface SourceAnalysisResult {
  readonly sourceFile: string;
  readonly language: string;
  readonly module: SourceModuleAnalysis;
  readonly symbols: readonly SourceSymbolAnalysis[];
}

/** A source span with 1-based lines and 0-based UTF-16 columns. Ends are exclusive. */
export interface SourceAnalysisRangeV2 {
  readonly startLine: number;
  readonly startColumn: number;
  readonly endLine: number;
  readonly endColumn: number;
}

export type SourceAnalysisStatusV2 =
  | "ok"
  | "partial"
  | "unsupported"
  | "failed";

export interface SourceSymbolAnalysisV2 extends SourceSymbolAnalysis {
  readonly qualifiedName?: string;
  readonly containerName?: string;
  readonly nativeKind?: string;
  readonly signature?: string;
  readonly nameRange?: SourceAnalysisRangeV2;
}

export interface SourceAnalysisDiagnosticV2 {
  readonly code: string;
  readonly message: string;
  readonly range?: SourceAnalysisRangeV2;
}

export interface SourceAnalysisUncoveredRangeV2 extends SourceAnalysisRangeV2 {
  readonly reason: string;
}

export interface SourceAnalysisResultV2
  extends Omit<SourceAnalysisResult, "symbols"> {
  readonly contractVersion: "kibi.symbol-extractor.v2";
  readonly status: SourceAnalysisStatusV2;
  readonly symbols: readonly SourceSymbolAnalysisV2[];
  readonly diagnostics: readonly SourceAnalysisDiagnosticV2[];
  readonly uncoveredRanges: readonly SourceAnalysisUncoveredRangeV2[];
}

/** Maximum source size accepted for ranged v2 analysis, measured in UTF-16 code units. */
export const SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS = 5 * 1024 * 1024;

export interface SymbolExtractorSupportsInput {
  readonly path: string;
}

export interface SymbolExtractorAnalyzeInput {
  readonly path: string;
  readonly content: string;
}

export interface SymbolExtractorV2SupportsInput {
  readonly path: string;
  readonly language?: string;
}

export interface SymbolExtractorV2AnalyzeInput
  extends SymbolExtractorV2SupportsInput {
  readonly content: string;
  /**
   * Wall-clock budget, in milliseconds, the host grants this call. The host
   * owns the deadline: a provider should return its own failed result before
   * the budget elapses, and the host abandons the call when its deadline passes.
   */
  readonly timeoutMs?: number;
}

/**
 * Public symbol extractor capability. The host stamps provider identity;
 * plugins must not self-author trusted provenance fields.
 */
export interface SymbolExtractorV1 {
  readonly id: string;
  supports(input: SymbolExtractorSupportsInput): boolean;
  analyze(input: SymbolExtractorAnalyzeInput): SourceAnalysisResult;
}

/** Asynchronous, source-bound symbol analysis with explicit coverage status. */
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
export interface ValidateSourceAnalysisResultV2Options {
  readonly maxSymbols?: number;
  readonly maxInputSize?: number;
}

/** Host-facing provider adapter used by Kibi core before stamping. */
export interface SourceAnalysisProvider {
  readonly id: string;
  supportsFile(filePath: string): boolean;
  analyzeText(filePath: string, content: string): SourceAnalysisResult;
}

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

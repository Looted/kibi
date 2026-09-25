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

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorSupportsInput {
  readonly path: string;
}

// implements REQ-capability-plugin-protocol-v1
export interface SymbolExtractorAnalyzeInput {
  readonly path: string;
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

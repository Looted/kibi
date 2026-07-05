import type { ExtractionResult } from "../../extractors/markdown.js";
import type { HunkRange, StagedFile } from "../../traceability/git-staged.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";

export type QualityDiagnosticSeverity = "error" | "warning" | "review" | "info";

export type QualityDiagnostic = {
  readonly id: string;
  readonly severity: QualityDiagnosticSeverity;
  readonly blocking: boolean;
  readonly category:
    | "symbol"
    | "requirement"
    | "coverage"
    | "fact"
    | "status"
    | "coordinate"
    | "mixed-purpose"
    | string;
  readonly entityId?: string;
  readonly source?: string;
  readonly files?: readonly string[];
  readonly docs?: readonly string[];
  readonly message: string;
  readonly suggestion: string;
  readonly evidence?: Readonly<Record<string, unknown>>;
};

export type SymbolsByFile = Map<string, readonly ExtractedSymbol[]>;

export type TraceabilityRelationship = {
  readonly type: string;
  readonly to: string;
};

export type SymbolGranularityDiagnosticsOptions = {
  readonly manifestResults: readonly ExtractionResult[];
  readonly activeEntityIds?: ReadonlySet<string>;
  readonly symbolsByFile: SymbolsByFile;
  readonly sourceContentByFile?: ReadonlyMap<string, string>;
  readonly workspaceRoot?: string;
};

export type SemanticReviewDiagnosticsOptions = {
  readonly symbolsByFile: SymbolsByFile;
};

export type SymbolQualityDiagnosticsOptions = {
  readonly manifestResults: readonly ExtractionResult[];
  readonly activeEntityIds?: ReadonlySet<string>;
  readonly symbolsByFile: SymbolsByFile;
};

export type RequirementQualityDiagnosticsOptions = {
  readonly manifestResults: readonly ExtractionResult[];
  readonly hardViolationEntityIds?: ReadonlySet<string>;
};

export type ChangedFileImpactOptions = {
  readonly workspaceRoot: string;
  readonly sourceFiles?: readonly string[];
  readonly staged?: boolean;
  readonly includeWorkingTreeDiff?: boolean;
  readonly includeImpactDiagnostics?: boolean;
  readonly maxDiagnostics?: number;
};

export type ImpactExtractedSymbol = {
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly role: string;
  readonly location: ExtractedSymbol["location"];
  readonly hunkRanges: readonly HunkRange[];
  readonly linkedEntityIds: readonly string[];
};

export type ImpactLinkedEntity = {
  readonly id: string;
  readonly relationshipType: string;
  readonly sourceSymbolId: string;
  readonly sourceSymbolName: string;
};

export type ChangedFileImpactResult = {
  readonly impactDiagnostics: readonly KibiImpactDiagnostic[];
  readonly sourceFiles: readonly string[];
  readonly extractedSymbols: readonly ImpactExtractedSymbol[];
  readonly linkedEntities: readonly ImpactLinkedEntity[];
  readonly nextActions: readonly string[];
};

export type SourceChange = {
  readonly file: string;
  readonly status: StagedFile["status"];
  readonly hunkRanges: readonly HunkRange[];
  readonly content: string;
};

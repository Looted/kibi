import type { ExtractionResult } from "../../extractors/markdown.js";
import type { HunkRange, StagedFile } from "../../traceability/git-staged.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";

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

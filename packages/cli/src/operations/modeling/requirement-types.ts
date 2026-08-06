import type {
  SemanticClaim,
  StrictWriteSet,
} from "../../public/check-types.js";

// implements REQ-002
export type ModelRequirementArgs = Readonly<Record<string, unknown>> & {
  readonly text: string;
  readonly source?: string;
  readonly sourceFiles?: string[];
  readonly confidence?: number;
  readonly subjectKey?: string;
  readonly propertyKey?: string;
  readonly operator?: SemanticClaim["operator"];
  readonly value?: string | number | boolean;
  readonly provenance?: string;
  /** Existing requirement claim manifest. Returned req updates merge this list. */
  readonly existingLogicClaims?: readonly string[];
};

// implements REQ-002
export interface ExtractedRequirementClaim {
  claim: SemanticClaim;
  extractionMode: "provided" | "heuristic" | "fallback";
  extractionWarnings: string[];
}

// implements REQ-002
export interface ModelRequirementResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    statement: string;
    claimKey: string;
    logicClaims: string[];
    source: string;
    sourceFiles: string[];
    claim: SemanticClaim;
    writeSet: StrictWriteSet;
    applyPlan: Array<Record<string, unknown>>;
    isStrict: boolean;
    confidence: number;
    extractionMode: "provided" | "heuristic" | "fallback";
    extractionWarnings: string[];
    warnings: Array<{
      kind: string;
      message: string;
      nextAction: string;
    }>;
    migrationWarning: string | null;
  };
  applyPlan: Array<Record<string, unknown>>;
  writeSet: StrictWriteSet;
  migrationWarning: string | null;
}

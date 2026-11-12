import { qualifiedSourceAnalyzers } from "./approved-source-analyzers.generated.js";

/** Release-qualified executable and asset closure. Updated only after qualification. */
export interface ApprovedSourceAnalyzer {
  packageName: string;
  version: string;
  files: Readonly<Record<string, string>>;
  dependencies: readonly {
    packageName: string;
    version: string;
    files: Readonly<Record<string, string>>;
  }[];
}

export const APPROVED_SOURCE_ANALYZERS: readonly ApprovedSourceAnalyzer[] =
  qualifiedSourceAnalyzers;

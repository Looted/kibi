import type { Violation } from "kibi-cli/public/check-types";
/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import type { ChangedFileImpactResult } from "kibi-cli/public/impact-diagnostics";
import type { QualityDiagnostic } from "kibi-cli/public/impact-diagnostics";

export interface CheckArgs {
  rules?: string[];
  workspaceRoot?: string;
  sourceFiles?: string[];
  staged?: boolean;
  includeWorkingTreeDiff?: boolean;
  includeImpactDiagnostics?: boolean;
  maxDiagnostics?: number;
}

export interface Diagnostic {
  category: string;
  severity: "error" | "warning";
  message: string;
  file?: string;
  suggestion?: string;
}

export interface CheckResult {
  content: Array<{ type: string; text: string }>;
  structuredContent?: {
    violations: Violation[];
    count: number;
    diagnostics: Array<{
      category: string;
      severity: string;
      message: string;
      file?: string;
      suggestion?: string;
    }>;
    qualityDiagnostics?: QualityDiagnostic[];
    impactDiagnostics?: ChangedFileImpactResult["impactDiagnostics"];
    sourceFiles?: ChangedFileImpactResult["sourceFiles"];
    extractedSymbols?: ChangedFileImpactResult["extractedSymbols"];
    linkedEntities?: ChangedFileImpactResult["linkedEntities"];
    nextActions?: ChangedFileImpactResult["nextActions"];
  };
}

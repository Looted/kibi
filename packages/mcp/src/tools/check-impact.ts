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
import {
  type ChangedFileImpactResult,
  analyzeChangedFileImpact,
} from "kibi-cli/public/impact-diagnostics";
import type { CheckArgs } from "./check-types.js";

export function hasImpactOptions(args: CheckArgs): boolean {
  return Boolean(
    args.includeImpactDiagnostics ||
      args.staged ||
      args.includeWorkingTreeDiff ||
      (args.sourceFiles && args.sourceFiles.length > 0),
  );
}

export function analyzeKbCheckImpact(
  workspaceRoot: string,
  args: CheckArgs,
): ChangedFileImpactResult | undefined {
  if (!hasImpactOptions(args)) {
    return undefined;
  }

  return analyzeChangedFileImpact({
    workspaceRoot,
    ...(args.sourceFiles !== undefined
      ? { sourceFiles: args.sourceFiles }
      : {}),
    ...(args.staged !== undefined ? { staged: args.staged } : {}),
    ...(args.includeWorkingTreeDiff !== undefined
      ? { includeWorkingTreeDiff: args.includeWorkingTreeDiff }
      : {}),
    ...(args.includeImpactDiagnostics !== undefined
      ? { includeImpactDiagnostics: args.includeImpactDiagnostics }
      : {}),
    ...(args.maxDiagnostics !== undefined
      ? { maxDiagnostics: args.maxDiagnostics }
      : {}),
  });
}

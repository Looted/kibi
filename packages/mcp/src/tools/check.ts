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
import type { PrologProcess } from "kibi-cli/prolog";
import type { Violation } from "kibi-cli/public/check-types";
import { resolveWorkspaceRoot } from "../workspace.js";
import { getEffectiveRules, loadChecksConfig } from "./check-config.js";
import {
  buildStructuredContent,
  formatImpactText,
  formatViolationText,
} from "./check-format.js";
import { analyzeKbCheckImpact } from "./check-impact.js";
import { runAggregatedChecks } from "./check-prolog.js";
import type { CheckArgs, CheckResult, Diagnostic } from "./check-types.js";

export type { CheckArgs, CheckResult } from "./check-types.js";

/**
 * Handle kb_check tool calls - run validation rules on the KB
 * Reuses validation logic from CLI check command
 */
// implements REQ-002
export async function handleKbCheck(
  prolog: PrologProcess,
  args: CheckArgs,
): Promise<CheckResult> {
  const { rules, workspaceRoot: workspaceOverride } = args;

  try {
    const workspaceRoot = workspaceOverride ?? resolveWorkspaceRoot();
    const checksConfig = await loadChecksConfig(workspaceRoot);
    const rulesAllowlist = getEffectiveRules(checksConfig.rules, rules);
    const impactResult = analyzeKbCheckImpact(workspaceRoot, args);

    if (rulesAllowlist.size === 0) {
      return {
        content: [
          {
            type: "text",
            text: impactResult
              ? `No violations found\n${formatImpactText(impactResult)}`
              : "No violations found",
          },
        ],
        structuredContent: buildStructuredContent({
          violations: [],
          diagnostics: [],
          impactResult,
        }),
      };
    }

    // Ensure we read the latest KB state, not a cached snapshot.
    prolog.invalidateCache();

    // Run aggregated checks using same approach as CLI
    // This now runs ALL rules including symbol-traceability
    const aggregatedViolations = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
      checksConfig.symbolTraceability.requireAdr,
    );

    const diagnostics: Diagnostic[] = aggregatedViolations.map((v) => ({
      category: "SYNC_ERROR",
      severity: "error",
      message: v.description,
      ...(v.source !== undefined ? { file: v.source } : {}),
      ...(v.suggestion !== undefined ? { suggestion: v.suggestion } : {}),
    }));

    const summary = impactResult
      ? `${formatViolationText(aggregatedViolations)}\n${formatImpactText(impactResult)}`
      : formatViolationText(aggregatedViolations);

    return {
      content: [
        {
          type: "text",
          text: summary,
        },
      ],
      structuredContent: buildStructuredContent({
        violations: aggregatedViolations,
        diagnostics,
        impactResult,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

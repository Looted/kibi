import { runAggregatedChecks } from "../../commands/aggregated-checks.js";
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
import type { Violation } from "../check-types.js";
import { collectFullKbQualityDiagnostics } from "../impact-diagnostics.js";
import {
  type CheckDiagnostic,
  type CheckStructuredContent,
  buildStructuredContent,
  buildSummary,
} from "./check-format-shared.js";
import {
  analyzeKbCheckImpact,
  collectQueryPlanSafetyViolations,
  getEffectiveRules,
  loadChecksConfig,
  qualityDiagnosticsFromImpact,
} from "./check-helpers.js";
import type { OperationContext, PrologPort } from "./runtime-types.js";
import type { OperationResult } from "./types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

// implements REQ-kibi-operation-interface-parity, REQ-002
export type CheckInput = {
  readonly rules?: readonly string[];
  readonly workspaceRoot?: string;
  readonly sourceFiles?: readonly string[];
  readonly staged?: boolean;
  readonly includeWorkingTreeDiff?: boolean;
  readonly includeImpactDiagnostics?: boolean;
  readonly maxDiagnostics?: number;
};

export type CheckPayload = CheckStructuredContent;
export type { CheckDiagnostic, CheckStructuredContent };
export {
  buildStructuredContent,
  buildSummary,
  getEffectiveRules,
  loadChecksConfig,
};

export type CheckExecutionOptions = {
  readonly collectFullQualityDiagnosticsForExplicitRules?: boolean;
};

function requireProlog(context: OperationContext): PrologPort {
  if (context.prolog === undefined) {
    throw new Error("Check operation requires a Prolog runtime");
  }
  return context.prolog;
}

function invalidatePrologCache(prolog: PrologPort): void {
  prolog.invalidateCache?.();
}

// implements REQ-kibi-operation-interface-parity, REQ-002
export async function executeCheck(
  args: CheckInput,
  context: OperationContext,
  options: CheckExecutionOptions = {},
): Promise<OperationResult<CheckPayload>> {
  try {
    const workspaceRoot = args.workspaceRoot ?? context.workspaceRoot;
    const prolog = requireProlog(context);
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    const verificationSnapshot = snapshotEvidence.available
      ? snapshotEvidence.snapshot.hash
      : undefined;
    const checkedAt = context.clock().toISOString();
    const checksConfig = await loadChecksConfig(workspaceRoot);
    const rulesAllowlist =
      args.rules === undefined
        ? getEffectiveRules(checksConfig.rules)
        : args.rules.length === 0
          ? new Set<string>()
          : getEffectiveRules(undefined, args.rules.join(","));
    const hasExplicitRules = args.rules !== undefined;
    const impactResult = analyzeKbCheckImpact(workspaceRoot, args);
    const impactQualityDiagnostics = qualityDiagnosticsFromImpact(impactResult);
    const maxDiagnosticsOption =
      args.maxDiagnostics !== undefined
        ? { maxDiagnostics: args.maxDiagnostics }
        : {};

    if (rulesAllowlist.size === 0) {
      const qualityDiagnostics =
        hasExplicitRules &&
        options.collectFullQualityDiagnosticsForExplicitRules !== true
          ? []
          : impactResult
            ? impactQualityDiagnostics
            : await collectFullKbQualityDiagnostics({
                prolog,
                workspaceRoot,
                ...(verificationSnapshot !== undefined
                  ? { verificationSnapshot }
                  : {}),
                checkedAt,
                now: context.clock(),
                ...maxDiagnosticsOption,
              });
      return {
        content: [
          {
            type: "text",
            text: buildSummary({
              violations: [],
              impactResult,
              qualityDiagnostics,
            }),
          },
        ],
        structuredContent: buildStructuredContent({
          violations: [],
          diagnostics: [],
          qualityDiagnostics,
          impactResult,
        }),
      };
    }

    invalidatePrologCache(prolog);

    const aggregatedViolations = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
      checksConfig.symbolTraceability.requireAdr,
    );
    const queryPlanViolations = rulesAllowlist.has("query-plan-safety")
      ? collectQueryPlanSafetyViolations()
      : [];
    const violations: Violation[] = [
      ...aggregatedViolations,
      ...queryPlanViolations,
    ];

    const diagnostics: CheckDiagnostic[] = violations.map((v) => ({
      category: "SYNC_ERROR",
      severity: "error",
      message: v.description,
      ...(v.source !== undefined ? { file: v.source } : {}),
      ...(v.suggestion !== undefined ? { suggestion: v.suggestion } : {}),
    }));

    const collectFullQualityDiagnostics =
      !hasExplicitRules ||
      options.collectFullQualityDiagnosticsForExplicitRules === true;
    const qualityDiagnostics = !collectFullQualityDiagnostics
      ? impactQualityDiagnostics
      : impactResult
        ? impactQualityDiagnostics
        : await collectFullKbQualityDiagnostics({
            prolog,
            hardViolationEntityIds: new Set(violations.map((v) => v.entityId)),
            workspaceRoot,
            ...(verificationSnapshot !== undefined
              ? { verificationSnapshot }
              : {}),
            checkedAt,
            now: context.clock(),
            ...maxDiagnosticsOption,
          });

    return {
      content: [
        {
          type: "text",
          text: buildSummary({
            violations,
            impactResult,
            qualityDiagnostics,
          }),
        },
      ],
      structuredContent: buildStructuredContent({
        violations,
        diagnostics,
        qualityDiagnostics,
        impactResult,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

import { runAggregatedChecks } from "../../commands/aggregated-checks.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  BRANCH_STORE_NOT_COMPILED_RULE,
  inspectBranchStore,
  uncompiledBranchStoreReason,
} from "../../utils/branch-store.js";
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
  partitionCheckFindings,
  qualityDiagnosticsFromImpact,
  resolveCheckRules,
  stagedEntityIdStyleDiagnostics,
} from "./check-helpers.js";
import { collectCheckPolicyViolations } from "./check-policy-rules.js";
import { executeStatus } from "./discovery-executors.js";
import { collectEntityContextViolations } from "./entity-context.js";
import {
  buildActionsFromCheck,
  buildMigrationPlan,
  mergeMigrationPlans,
} from "./migration-plan.js";
import { collectOriginReviewViolations } from "./origin-review.js";
import { collectPredicateSchemaConformanceViolations } from "./predicate-schema-conformance.js";
import type { OperationContext, PrologPort } from "./runtime-types.js";
import {
  SOURCE_PATH_DANGLING_RULE,
  collectSourcePathDanglingViolations,
} from "./source-path-dangling.js";
import { collectSourceRelationshipParityViolations } from "./source-relationship-parity.js";
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
  resolveCheckRules,
};

export type CheckExecutionOptions = {
  readonly collectFullQualityDiagnosticsForExplicitRules?: boolean;
  /**
   * The engine reads the current branch's store although the context carries
   * no branch attachment (the `kibi check` engine path). A context with a
   * branch attachment (the CLI and MCP runtimes) implies it; without either,
   * the attached store is unknown (an explicit --kb-path store or an injected
   * test store) and the branch-store compilation check is skipped.
   */
  readonly branchStoreAttached?: boolean;
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

async function migrationPlanForCheck(
  context: OperationContext,
  violations: readonly Violation[],
  qualityDiagnostics: readonly Readonly<Record<string, unknown>>[],
  statusPlan?: ReturnType<typeof buildMigrationPlan>,
) {
  const checkPlan = buildMigrationPlan({
    expected: {
      branch: context.branchAttachment?.gitBranch ?? null,
      kbBranch: context.branchAttachment?.kbBranch ?? null,
    },
    evaluatedDomains: ["quality"],
    actions: buildActionsFromCheck({
      violations: violations as unknown as readonly Readonly<
        Record<string, unknown>
      >[],
      qualityDiagnostics,
    }),
  });
  return statusPlan ? mergeMigrationPlans([statusPlan, checkPlan]) : checkPlan;
}

async function readStatusMigrationPlan(
  context: OperationContext,
): Promise<ReturnType<typeof buildMigrationPlan> | undefined> {
  try {
    const statusResult = await executeStatus({}, context);
    return statusResult.structuredContent?.migrationPlan;
  } catch (error) {
    // A check can still provide a complete quality-domain plan in a detached
    // or synthetic workspace used by an agent/test harness. Status remains a
    // separately actionable domain; preserve the check result rather than
    // turning a missing Git attachment into a check failure.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Failed to resolve active branch")) return undefined;
    throw error;
  }
}

/**
 * The one finding for a branch whose store was never compiled while .kb/
 * holds authored sources. Every store-backed rule would read an empty KB
 * (source-relationship-parity alone reports each authored relationship as
 * missing), so kb_check reports this instead of any of them.
 */
// implements REQ-cli-status-pre-first-sync
export function uncompiledBranchStoreViolation(
  context: OperationContext,
  workspaceRoot: string,
): Violation | null {
  let attachment: ReturnType<typeof resolveBranchAttachment>;
  try {
    attachment =
      context.branchAttachment ?? resolveBranchAttachment(workspaceRoot);
  } catch {
    return null;
  }
  if ("error" in attachment) return null;
  const store = inspectBranchStore(workspaceRoot, attachment.kbBranch);
  const reason = uncompiledBranchStoreReason(
    workspaceRoot,
    store,
    attachment.kbBranch,
  );
  if (reason === null) return null;
  return {
    rule: BRANCH_STORE_NOT_COMPILED_RULE,
    entityId: attachment.kbBranch,
    description: String(reason.detail),
    suggestion:
      "Run kibi sync to compile this branch's store from the authored .kb/ sources (or apply the branch-store-compile action of the returned migrationPlan with kb_apply_plan), then rerun kb_check. Run kibi init once to install the git hooks that compile a new branch on checkout.",
    source: store.path,
    evidence: {
      store: { state: store.state, path: store.path },
      authoredSources: reason.authoredSources,
      ...(reason.generation !== undefined
        ? { generation: reason.generation }
        : {}),
      remediation: reason.remediation,
    },
  };
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
    const proofSnapshot = snapshotEvidence.available
      ? snapshotEvidence.snapshot.hash
      : undefined;
    const checkedAt = context.clock().toISOString();
    // Enforcement policy is Kibi-owned and deterministic from the installed
    // version. `args.rules` is an invocation-time diagnostic selector only.
    const rulesAllowlist = resolveCheckRules(args);
    const hasExplicitRules = args.rules !== undefined;
    const impactResult = await analyzeKbCheckImpact(workspaceRoot, args);
    const impactQualityDiagnostics = [
      ...qualityDiagnosticsFromImpact(impactResult),
      ...stagedEntityIdStyleDiagnostics(workspaceRoot, args),
    ];
    const maxDiagnosticsOption =
      args.maxDiagnostics !== undefined
        ? { maxDiagnostics: args.maxDiagnostics }
        : {};

    const uncompiled =
      context.branchAttachment !== undefined ||
      options.branchStoreAttached === true
        ? uncompiledBranchStoreViolation(context, workspaceRoot)
        : null;
    if (uncompiled !== null) {
      const violations = [uncompiled];
      const statusPlan = await readStatusMigrationPlan(context);
      const migrationPlan = await migrationPlanForCheck(
        context,
        violations,
        [],
        statusPlan,
      );
      return {
        content: [
          {
            type: "text",
            text: buildSummary({
              violations,
              impactResult,
              qualityDiagnostics: [],
            }),
          },
        ],
        structuredContent: buildStructuredContent({
          violations,
          diagnostics: [
            {
              category: "SYNC_ERROR",
              severity: "error",
              message: uncompiled.description,
              ...(uncompiled.source !== undefined
                ? { file: uncompiled.source }
                : {}),
              ...(uncompiled.suggestion !== undefined
                ? { suggestion: uncompiled.suggestion }
                : {}),
            },
          ],
          qualityDiagnostics: [],
          impactResult,
          migrationPlan,
        }),
      };
    }

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
                ...(proofSnapshot !== undefined ? { proofSnapshot } : {}),
                checkedAt,
                now: context.clock(),
                ...maxDiagnosticsOption,
              });
      const statusPlan = await readStatusMigrationPlan(context);
      const migrationPlan = await migrationPlanForCheck(
        context,
        [],
        qualityDiagnostics as unknown as readonly Readonly<
          Record<string, unknown>
        >[],
        statusPlan,
      );
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
          migrationPlan,
        }),
      };
    }

    invalidatePrologCache(prolog);

    const aggregatedFindings = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
    );
    const queryPlanViolations = rulesAllowlist.has("query-plan-safety")
      ? collectQueryPlanSafetyViolations()
      : [];
    const sourceRelationshipParityViolations = rulesAllowlist.has(
      "source-relationship-parity",
    )
      ? await collectSourceRelationshipParityViolations(workspaceRoot, prolog)
      : [];
    const predicateConformanceFindings = rulesAllowlist.has(
      "predicate-schema-conformance",
    )
      ? await collectPredicateSchemaConformanceViolations(prolog)
      : [];
    const sourcePathFindings = rulesAllowlist.has(SOURCE_PATH_DANGLING_RULE)
      ? collectSourcePathDanglingViolations(workspaceRoot)
      : [];
    const originReviewFindings = await collectOriginReviewViolations(
      prolog,
      rulesAllowlist,
      workspaceRoot,
    );
    const entityContextFindings = collectEntityContextViolations(
      rulesAllowlist,
      workspaceRoot,
    );
    const checkPolicyFindings = await collectCheckPolicyViolations(
      prolog,
      rulesAllowlist,
      workspaceRoot,
    );
    const partitioned = partitionCheckFindings([
      ...aggregatedFindings,
      ...queryPlanViolations,
      ...sourceRelationshipParityViolations,
      ...sourcePathFindings,
      ...predicateConformanceFindings,
      ...originReviewFindings,
      ...entityContextFindings,
      ...checkPolicyFindings,
    ]);
    const violations: Violation[] = partitioned.violations;

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
    const extraQualityDiagnostics = !collectFullQualityDiagnostics
      ? impactQualityDiagnostics
      : impactResult
        ? impactQualityDiagnostics
        : await collectFullKbQualityDiagnostics({
            prolog,
            hardViolationEntityIds: new Set(violations.map((v) => v.entityId)),
            workspaceRoot,
            ...(proofSnapshot !== undefined ? { proofSnapshot } : {}),
            checkedAt,
            now: context.clock(),
            ...maxDiagnosticsOption,
          });
    const qualityDiagnostics = [
      ...partitioned.qualityDiagnostics,
      ...extraQualityDiagnostics,
    ];

    const statusPlan = await readStatusMigrationPlan(context);
    const migrationPlan = await migrationPlanForCheck(
      context,
      violations,
      qualityDiagnostics as unknown as readonly Readonly<
        Record<string, unknown>
      >[],
      statusPlan,
    );
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
        migrationPlan,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

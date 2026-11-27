import {
  type KibiLevel,
  type ResolvedKibiLevel,
  kibiLevelSettingName,
  readKibiLevel,
} from "kibi-agent-core/kibi-level";
import { runAggregatedChecks } from "../../commands/aggregated-checks.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import {
  BRANCH_STORE_NOT_COMPILED_RULE,
  inspectBranchStore,
  uncompiledBranchStoreReason,
} from "../../utils/branch-store.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
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
import {
  type ChangedFileImpactResult,
  collectFullKbQualityDiagnostics,
} from "../impact-diagnostics.js";
import {
  type ChangedGateRunner,
  executeChangedCheck,
} from "./changed-check.js";
import {
  type CheckDiagnostic,
  type CheckEvaluated,
  type CheckStructuredContent,
  buildStructuredContent,
  buildSummary,
  describeEvaluatedRules,
  fitScopedCheckToBudget,
  fitSymbolDebtToBudget,
  pageCheckFindings,
} from "./check-format-shared.js";
import {
  SCOPED_CHECK_OMITTED_ID,
  analyzeKbCheckImpact,
  changedKbEntityIds,
  collectQueryPlanSafetyViolations,
  getEffectiveRules,
  partitionCheckFindings,
  qualityDiagnosticsFromImpact,
  resolveCheckRules,
  scopeQualityDiagnosticsToImpact,
  scopeViolationsToImpact,
  stagedEntityIdStyleDiagnostics,
} from "./check-helpers.js";
import { collectCheckPolicyViolations } from "./check-policy-rules.js";
import { collectDecisionFirmnessViolations } from "./decision-firmness.js";
import { executeStatus } from "./discovery-executors.js";
import { collectEntityContextViolations } from "./entity-context.js";
import { collectEvidenceFloorViolations } from "./evidence-floor.js";
import { tagBlocks } from "./finding-blocks.js";
import { collectRequiredEvidenceAboveLevelViolations } from "./level-evidence.js";
import {
  buildActionsFromCheck,
  buildMigrationPlan,
  mergeMigrationPlans,
} from "./migration-plan.js";
import { collectOriginReviewViolations } from "./origin-review.js";
import { collectPositiveScenarioViolations } from "./positive-scenario.js";
import { collectPredicateSchemaConformanceViolations } from "./predicate-schema-conformance.js";
import { collectProofContractClaimViolations } from "./proof-contract-claims.js";
import { collectQuantityDuplicateViolations } from "./quantity-layer.js";
import type { OperationContext, PrologPort } from "./runtime-types.js";
import { openSourceAnalysisCache } from "./source-analysis-cache.js";
import {
  SOURCE_PATH_DANGLING_RULE,
  collectSourcePathDanglingViolations,
} from "./source-path-dangling.js";
import { collectSourceRelationshipParityViolations } from "./source-relationship-parity.js";
import { collectSubjectLayerViolations } from "./subject-layer.js";
import { collectSymbolCoordinatesMissingViolations } from "./symbol-coordinates-check.js";
import {
  type SymbolDebt,
  collectSymbolDebt,
  symbolDebtListing,
} from "./symbol-debt.js";
import { collectSymbolGranularityViolations } from "./symbol-granularity-check.js";
import type { OperationResult } from "./types.js";
import { readWorkspaceSnapshot } from "./workspace-snapshot.js";

export type CheckInput = {
  readonly rules?: readonly string[];
  readonly workspaceRoot?: string;
  readonly sourceFiles?: readonly string[];
  readonly staged?: boolean;
  /**
   * Run the commit gate (kibi check --staged) over the working tree plus
   * the index instead of the KB rules; with sourceFiles, only those files
   * and .kb are added to the index it judges.
   */
  readonly changed?: boolean;
  readonly includeWorkingTreeDiff?: boolean;
  readonly includeImpactDiagnostics?: boolean;
  readonly maxDiagnostics?: number;
  /** evidence-floor judges receipts as they are and needs a clean snapshot. */
  readonly freshEvidence?: boolean;
  /** A scoped check returns the full migration plan instead of its summary. */
  readonly includeMigrationPlan?: boolean;
  /** An unscoped check lists its symbol debt per file, not only as counts. */
  readonly includeSymbolDebt?: boolean;
  /** With rules: the first finding of the page to list. */
  readonly offset?: number;
};

export type CheckPayload = CheckStructuredContent;
export type { CheckDiagnostic, CheckEvaluated, CheckStructuredContent };
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
  /** Runs the commit gate for `changed: true` (tests inject one). */
  readonly changedGateRunner?: ChangedGateRunner;
  /**
   * Every finding in full, past the size budget a check without a rule
   * selection keeps (the `kibi check` command prints them all).
   */
  readonly fullListing?: boolean;
};

/**
 * What this run evaluated: how many rules ran (named, in registry order,
 * only when a default rule did not), and for `domain-contradictions` the
 * number of requirement fact pairs the rule compared, read from the engine
 * after the rules ran on the same store. A count the engine cannot give (an
 * older engine) is left out rather than reported as zero.
 */
/** A recorded level Kibi does not know: the check ran at test. */
export function invalidLevelDiagnostic(
  workspaceRoot: string,
  resolved: ResolvedKibiLevel,
): CheckDiagnostic {
  const where = kibiLevelSettingName(workspaceRoot);
  return {
    category: "CONFIG_WARNING",
    severity: "warning",
    message: `${where} is ${JSON.stringify(resolved.invalid)}, which is not a Kibi level (remember or test), so Kibi runs at test.`,
    file:
      resolved.source === "package.json" ? "package.json" : ".kb/setup.json",
    suggestion: `Ask the person which level the project uses and set ${where} to "remember" or "test".`,
  };
}

async function describeEvaluation(
  prolog: PrologPort,
  rules: ReadonlySet<string>,
  level: KibiLevel,
): Promise<CheckEvaluated> {
  const evaluated: {
    ruleCount: number;
    rules?: readonly string[];
    domainContradictions?: { factPairsExamined: number };
  } = describeEvaluatedRules(rules, level);
  if (!rules.has("domain-contradictions")) return evaluated;
  try {
    const result = await prolog.query(
      "kb_domain_contradiction_pairs_examined(Count)",
    );
    const count = Number(result.bindings.Count);
    if (result.success && Number.isInteger(count) && count >= 0)
      evaluated.domainContradictions = { factPairsExamined: count };
  } catch {
    // An engine without the predicate leaves the count out.
  }
  return evaluated;
}

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
  impactResult?: ChangedFileImpactResult,
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
      ...(impactResult !== undefined
        ? { impactDiagnostics: new Set<object>(impactResult.impactDiagnostics) }
        : {}),
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

/**
 * The branch store this check reads, when the engine is known to read it, as
 * the place to keep parsed source analyses. A read-only detached snapshot
 * and an unknown store (an explicit --kb-path) get no cache.
 */
/** The summary with one non-blocking sentence about unrecorded declarations. */
export function withSymbolDebtSummary(
  debt: SymbolDebt | undefined,
  summary: string,
): string {
  if (debt === undefined || debt.total === 0) return summary;
  return `${summary}\nSymbol records (not blocking): ${debt.total} declaration(s) in ${debt.fileCount} file(s) with symbol records have none; a commit is judged on them only when it adds or changes them.${debt.files === undefined ? " includeSymbolDebt: true lists them." : ""}`;
}

export function analysisCacheDir(
  context: OperationContext,
  workspaceRoot: string,
  options: CheckExecutionOptions,
): string | undefined {
  if (
    context.branchAttachment === undefined &&
    options.branchStoreAttached !== true
  ) {
    return undefined;
  }
  try {
    const attachment =
      context.branchAttachment ?? resolveBranchAttachment(workspaceRoot);
    if ("storePath" in attachment && attachment.readOnly === undefined) {
      return attachment.storePath;
    }
  } catch {
    // A branch that cannot be resolved gets no cache.
  }
  return undefined;
}

export async function executeCheck(
  args: CheckInput,
  context: OperationContext,
  options: CheckExecutionOptions = {},
): Promise<OperationResult<CheckPayload>> {
  try {
    const workspaceRoot = args.workspaceRoot ?? context.workspaceRoot;
    if (args.changed === true)
      return (await executeChangedCheck(
        workspaceRoot,
        args.sourceFiles,
        options.changedGateRunner,
      )) as unknown as OperationResult<CheckPayload>;
    const prolog = requireProlog(context);
    const snapshotEvidence = await readWorkspaceSnapshot(context);
    const proofSnapshot = snapshotEvidence.available
      ? snapshotEvidence.snapshot.hash
      : undefined;
    const checkedAt = context.clock().toISOString();
    const proofTestBindings = async () => {
      const { perContractTestBindings } = await import("./specs/reporting.js");
      return perContractTestBindings({ ...context, prolog });
    };
    // Enforcement policy is Kibi-owned and deterministic from the installed
    // version. `args.rules` is an invocation-time diagnostic selector only.
    // The project's Kibi level selects whether the verification rules run.
    const resolvedLevel = readKibiLevel(workspaceRoot);
    const level = resolvedLevel.level;
    const rulesAllowlist = resolveCheckRules(args, level);
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
      // Every store-backed rule was skipped: only this one was evaluated.
      const evaluated = describeEvaluatedRules([
        BRANCH_STORE_NOT_COMPILED_RULE,
      ]);
      return {
        content: [
          {
            type: "text",
            text: buildSummary({
              violations,
              evaluated,
              impactResult,
              qualityDiagnostics: [],
            }),
          },
        ],
        structuredContent: buildStructuredContent({
          violations,
          evaluated,
          diagnostics: [
            {
              category: "SYNC_ERROR",
              severity: "error",
              message: uncompiled.description,
              ...(uncompiled.source !== undefined
                ? { file: uncompiled.source }
                : {}),
              // The uncompiled-store finding always carries a suggestion.
              suggestion: uncompiled.suggestion as string,
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
                proofTestBindings,
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
        impactResult,
      );
      const evaluated = describeEvaluatedRules([]);
      return {
        content: [
          {
            type: "text",
            text: buildSummary({
              violations: [],
              evaluated,
              impactResult,
              qualityDiagnostics,
            }),
          },
        ],
        structuredContent: buildStructuredContent({
          violations: [],
          evaluated,
          diagnostics: [],
          qualityDiagnostics,
          impactResult,
          migrationPlan,
        }),
      };
    }

    invalidatePrologCache(prolog);

    // A store without a manifest predates every schema-gated rule.
    const aggregatedFindings = await runAggregatedChecks(
      prolog,
      rulesAllowlist,
      readKbManifest(workspaceRoot)?.schemaVersion ?? 0,
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
    // One analysis cache serves every step that parses sources and is saved
    // once, after the last of them.
    const analysisCache = openSourceAnalysisCache(
      analysisCacheDir(context, workspaceRoot, options),
      workspaceRoot,
    );
    const symbolGranularityFindings = await collectSymbolGranularityViolations(
      prolog,
      workspaceRoot,
      rulesAllowlist,
      analysisCache,
    );
    const symbolCoordinateFindings =
      await collectSymbolCoordinatesMissingViolations(
        prolog,
        workspaceRoot,
        rulesAllowlist,
      );
    const originReviewFindings = await collectOriginReviewViolations(
      prolog,
      rulesAllowlist,
      workspaceRoot,
    );
    const entityContextFindings = collectEntityContextViolations(
      rulesAllowlist,
      workspaceRoot,
    );
    const subjectLayerFindings = collectSubjectLayerViolations(
      rulesAllowlist,
      workspaceRoot,
    );
    const quantityFindings = collectQuantityDuplicateViolations(
      rulesAllowlist,
      workspaceRoot,
    );
    const decisionFirmnessFindings = collectDecisionFirmnessViolations(
      rulesAllowlist,
      workspaceRoot,
    );
    const levelEvidenceFindings = collectRequiredEvidenceAboveLevelViolations(
      rulesAllowlist,
      workspaceRoot,
      level,
    );
    const checkPolicyFindings = await collectCheckPolicyViolations(
      prolog,
      rulesAllowlist,
      workspaceRoot,
    );
    const evidenceFloorFindings = await collectEvidenceFloorViolations(
      context,
      rulesAllowlist,
      {
        freshEvidence: args.freshEvidence === true,
        checkedAt,
        snapshotEvidence,
      },
    );
    const proofContractClaimFindings =
      await collectProofContractClaimViolations(context, rulesAllowlist);
    const positiveScenarioFindings = await collectPositiveScenarioViolations(
      context,
      rulesAllowlist,
    );
    const partitioned = partitionCheckFindings([
      ...aggregatedFindings,
      ...queryPlanViolations,
      ...sourceRelationshipParityViolations,
      ...sourcePathFindings,
      ...symbolGranularityFindings,
      ...symbolCoordinateFindings,
      ...predicateConformanceFindings,
      ...originReviewFindings,
      ...entityContextFindings,
      ...subjectLayerFindings,
      ...quantityFindings,
      ...decisionFirmnessFindings,
      ...levelEvidenceFindings,
      ...checkPolicyFindings,
      ...evidenceFloorFindings,
      ...proofContractClaimFindings,
      ...positiveScenarioFindings,
    ]);
    const allViolations: Violation[] = partitioned.violations;
    const evaluated = await describeEvaluation(prolog, rulesAllowlist, level);
    // A check scoped to sourceFiles answers about those files: blocking
    // findings elsewhere are counted, not listed (kb_check without
    // sourceFiles lists them all).
    const scoped =
      impactResult !== undefined &&
      args.sourceFiles !== undefined &&
      !hasExplicitRules;
    const violationScope = scoped
      ? scopeViolationsToImpact(
          allViolations,
          impactResult,
          changedKbEntityIds(workspaceRoot),
        )
      : undefined;
    const violations: Violation[] = violationScope?.kept ?? allViolations;

    const diagnostics: CheckDiagnostic[] = violations.map((v) => ({
      category: "SYNC_ERROR",
      severity: "error",
      message: v.description,
      ...(v.source !== undefined ? { file: v.source } : {}),
      ...(v.suggestion !== undefined ? { suggestion: v.suggestion } : {}),
    }));
    if (resolvedLevel.invalid !== undefined)
      diagnostics.push(invalidLevelDiagnostic(workspaceRoot, resolvedLevel));

    const collectFullQualityDiagnostics =
      !hasExplicitRules ||
      options.collectFullQualityDiagnosticsForExplicitRules === true;
    const extraQualityDiagnostics = !collectFullQualityDiagnostics
      ? impactQualityDiagnostics
      : impactResult
        ? impactQualityDiagnostics
        : await collectFullKbQualityDiagnostics({
            prolog,
            hardViolationEntityIds: new Set(
              allViolations.map((v) => v.entityId),
            ),
            workspaceRoot,
            ...(proofSnapshot !== undefined ? { proofSnapshot } : {}),
            checkedAt,
            proofTestBindings,
            now: context.clock(),
            ...maxDiagnosticsOption,
          });
    // A check scoped to sourceFiles answers about those files; the KB-wide
    // advisory scan only lists what concerns them.
    const advisoryQualityDiagnostics = scoped
      ? scopeQualityDiagnosticsToImpact(
          partitioned.qualityDiagnostics,
          impactResult,
        )
      : partitioned.qualityDiagnostics;
    const REMEMBER_SKIPPED_QUALITY_DIAGNOSTICS = new Set([
      "coverage_depth_review",
      "logical_coverage_review",
    ]);
    const qualityDiagnostics = [
      ...advisoryQualityDiagnostics,
      ...extraQualityDiagnostics,
    ].filter(
      (diagnostic) =>
        resolvedLevel.level !== "remember" ||
        !REMEMBER_SKIPPED_QUALITY_DIAGNOSTICS.has(diagnostic.id),
    );

    const statusPlan = await readStatusMigrationPlan(context);
    // The plan repairs every finding, so a scoped check plans from all of
    // them too; it shows the plan's summary unless asked for the plan.
    const migrationPlan = await migrationPlanForCheck(
      context,
      allViolations,
      // The omitted-findings count is a pointer, not a repair to plan.
      qualityDiagnostics.filter(
        (diagnostic) => diagnostic.id !== SCOPED_CHECK_OMITTED_ID,
      ) as unknown as readonly Readonly<Record<string, unknown>>[],
      statusPlan,
      impactResult,
    );
    const structured = buildStructuredContent({
      violations,
      evaluated,
      diagnostics,
      qualityDiagnostics,
      impactResult,
      migrationPlan,
      ...(violationScope?.omitted !== undefined
        ? { omittedViolations: violationScope.omitted }
        : {}),
      ...(scoped && args.includeMigrationPlan !== true
        ? { summarizePlan: true }
        : {}),
    });
    // Only a check with no rule or file scope reports the repository's
    // unrecorded declarations: it is the one that answers for the whole KB.
    // The debt never blocks, so an engine that cannot project it leaves the
    // field out instead of failing the check.
    const symbolDebt =
      !hasExplicitRules && args.sourceFiles === undefined
        ? await collectSymbolDebt(prolog, workspaceRoot, analysisCache)
            .then((debt) =>
              symbolDebtListing(debt, args.includeSymbolDebt === true),
            )
            .catch(() => undefined)
        : undefined;
    analysisCache?.save();
    // The kibi check command lists every finding. A rule selection lists
    // its findings in pages within the size budget; any other check keeps
    // to the budget by cutting advisory findings, the plan and then the
    // blocking findings, and the debt list, when asked for, fits in what is
    // left.
    const fitted =
      options.fullListing === true
        ? structured
        : hasExplicitRules
          ? pageCheckFindings(
              // Tagged before the cut, so the budget counts the tags.
              withMergeBlocks(structured),
              args.offset ?? 0,
              scoped,
              args.includeMigrationPlan === true,
            )
          : fitScopedCheckToBudget(
              withMergeBlocks(structured),
              undefined,
              scoped,
              args.includeMigrationPlan === true,
            );
    // Tagged again because the cut may group findings into new entries.
    const tagged = withMergeBlocks(fitted);
    const listedDebt =
      symbolDebt !== undefined && options.fullListing !== true
        ? fitSymbolDebtToBudget(tagged, symbolDebt)
        : symbolDebt;
    const structuredContent =
      listedDebt !== undefined ? { ...tagged, symbolDebt: listedDebt } : tagged;
    return {
      content: [
        {
          type: "text",
          text: withSymbolDebtSummary(
            symbolDebt,
            buildSummary({
              violations: structuredContent.violations,
              evaluated,
              impactResult,
              qualityDiagnostics: structuredContent.qualityDiagnostics ?? [],
              ...(structuredContent.violationGroups !== undefined
                ? { violationGroups: structuredContent.violationGroups }
                : {}),
              ...(structuredContent.omittedViolations !== undefined
                ? { omittedViolations: structuredContent.omittedViolations }
                : {}),
              ...(structuredContent.truncation !== undefined
                ? { truncation: structuredContent.truncation }
                : {}),
            }),
          ),
        },
      ],
      structuredContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Check execution failed: ${message}`);
  }
}

/**
 * Tags each finding of the full check with what it stops: a violation or
 * blocking quality diagnostic fails the merge check, a blocking impact
 * diagnostic is one the commit gate refuses, and the rest are advice.
 * `diagnostics` restates the violations for the result envelope, whose
 * schema is fixed, so it is left as it is.
 */
export function withMergeBlocks(
  content: CheckStructuredContent,
): CheckStructuredContent {
  return {
    ...content,
    violations: tagBlocks(content.violations, "merge", true),
    ...(content.qualityDiagnostics !== undefined
      ? { qualityDiagnostics: tagBlocks(content.qualityDiagnostics, "merge") }
      : {}),
    ...(content.impactDiagnostics !== undefined
      ? { impactDiagnostics: tagBlocks(content.impactDiagnostics, "commit") }
      : {}),
    ...(content.violationGroups !== undefined
      ? { violationGroups: tagBlocks(content.violationGroups, "merge", true) }
      : {}),
  };
}

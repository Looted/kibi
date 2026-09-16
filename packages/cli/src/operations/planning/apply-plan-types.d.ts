import type { MigrationPlan } from "../../public/operations/migration-plan.js";
import type { BootstrapPlanV1 } from "../bootstrap/types.js";
import type { CompilePlanV1, SourceWritePlan } from "./compile-intent.js";

// implements REQ-kibi-change-to-proof-plan-compiler
export type ApplyPlanArgs =
  | Readonly<{
      plan: BootstrapPlanV1;
      approvedPlanHash: string;
    }>
  | Readonly<{
      plan: CompilePlanV1;
      approvedPlanHash: string;
    }>
  | Readonly<{
      plan: MigrationPlan;
      approvedPlanHash: string;
      approvedActionIds: readonly string[];
    }>
  | Readonly<{
      plan: EntityDeletionPlan;
      approvedPlanHash: string;
    }>
  | Readonly<{
      recoveryJournalId: string;
    }>;

export type EntityDeletionPlan = Readonly<{
  version: "kibi.entity-deletion-plan.v1";
  planHash: string;
  entityIds: readonly string[];
  sourceHashes: Readonly<Record<string, string | null>>;
  sourceWrites?: readonly SourceWritePlan[];
  supersessionRequired: boolean;
}>;

export type BootstrapActionResult = Readonly<{
  actionId: string;
  outcome: "applied" | "failed" | "skipped";
  detail: string;
}>;

export type ApplyPlanResult =
  | Readonly<{
      version: "kibi.plan-apply-result.v1";
      outcome: "applied" | "replayed" | "partially_applied";
      planHash: string;
      actionResults: readonly BootstrapActionResult[];
      changedEntities: number;
      changedRelationships: number;
      finalSnapshots: {
        branch: string;
        kbSnapshotId: string;
        workspaceSnapshot: string;
      };
      recoveryJournalId: string | null;
      changedPaths?: readonly string[];
      validationSummary?: Readonly<Record<string, unknown>>;
      status?: "committed_with_repairs";
      effectFailures?: readonly Readonly<Record<string, unknown>>[];
      nextActions?: readonly Readonly<Record<string, unknown>>[];
    }>
  | Readonly<{
      version: "kibi.plan-apply-result.v1";
      outcome: "applied" | "replayed";
      planHash: string;
      changedEntities: number;
      changedRelationships: number;
      changedPaths: readonly string[];
      finalSnapshots: {
        branch: string;
        kbSnapshotId: string;
        workspaceSnapshot: string;
      };
      validationSummary: {
        stepsValidated: number;
        stepsApplied: number;
        sourceHashesChecked: number;
        notes: readonly string[];
      };
      recoveryJournalId: string | null;
      status?: "committed_with_repairs";
      effectFailures?: readonly Readonly<Record<string, unknown>>[];
      nextActions?: readonly Readonly<Record<string, unknown>>[];
    }>
  | Readonly<{
      version: "kibi.entity-deletion-apply-result.v1";
      outcome: "applied";
      planHash: string;
      deleted: number;
      sourcePaths: readonly string[];
      recoveryJournalId?: string | null;
      status?: "committed_with_repairs";
      nextActions?: readonly Readonly<Record<string, unknown>>[];
    }>
  | Readonly<{
      version: "kibi.migration-apply-result.v1";
      outcome:
        | "applied"
        | "partially_applied"
        | "replayed"
        | "reconciliation_required";
      planHash: string;
      actionResults: readonly Readonly<{
        actionId: string;
        outcome: "applied" | "failed" | "skipped";
        detail: string;
      }>[];
      finalSnapshots: {
        branch: string;
        kbSnapshotId: string;
        workspaceSnapshot: string;
      };
      notes: readonly string[];
      remainingPlan?: MigrationPlan;
      closeout?: {
        taskOutcome: "complete" | "interim" | "blocked";
        kbState:
          | "clean_fresh"
          | "stale"
          | "dirty"
          | "legacy_compat"
          | "not_evaluated";
        snapshotState: "fresh" | "dirty" | "unavailable" | "not_evaluated";
        proofState: "proven" | "mixed" | "unresolved" | "not_evaluated";
        limitationDisposition:
          | "none"
          | "accepted"
          | "unaccepted"
          | "not_applicable";
      };
    }>;

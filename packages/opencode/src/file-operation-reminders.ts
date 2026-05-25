// implements REQ-opencode-file-context-guidance-v1
import type { RepoPosture } from "./repo-posture.js";
import type { PathKind } from "./path-kind.js";
import type { RiskClass } from "./risk-classifier.js";
import type { ReminderKind } from "./file-operation-state.js";
import type {
  E2eCoverageSignal,
} from "./e2e-coverage-signals.js";
import {
  computeEnforcementPolicy,
  type CheckpointEvidence,
  type EnforcementLifecycleEvent,
  type EnforcementPolicyResult,
} from "./enforcement-policy.js";
import type { EffectiveMode } from "./smart-enforcement.js";
import type { WorkContext } from "./work-context-resolver.js";

// ── Types ───────────────────────────────────────────────────────

export interface LinkedEntityResult {
  ids: string[];
  source: "symbols" | "doc-path" | "none";
}

export interface DeriveFileOperationReminderParams {
  normalizedPath: string;
  lifecycle: "created" | "edited" | "deleted";
  pathKind: PathKind;
  linkedEntityResult: LinkedEntityResult;
  e2eSignal: E2eCoverageSignal;
  currentSemanticRisk: RiskClass;
  posture: RepoPosture;
  effectiveMode?: EffectiveMode;
  workContext?: WorkContext;
  resolvedContext?: WorkContext;
  lifecycleEvents?: EnforcementLifecycleEvent[];
  pathKinds?: PathKind[];
  linkedEntityResults?: LinkedEntityResult[];
  e2eSignals?: E2eCoverageSignal[];
  checkpointEvidence?: CheckpointEvidence;
}

export interface DeriveFileOperationReminderResult {
  lifecycleReminder: string | null;
  e2eReminder: string | null;
  reminderKindsToMark: ReminderKind[];
  policyDecision: EnforcementPolicyResult["kind"];
  policyResult: EnforcementPolicyResult;
}

function addUniqueReminderKind(
  kinds: ReminderKind[],
  kind: ReminderKind,
): ReminderKind[] {
  return kinds.includes(kind) ? kinds : [...kinds, kind];
}

// ── Main exported function ────────────────────────────────────

// implements REQ-opencode-file-context-guidance-v1
export function deriveFileOperationReminder(
  params: DeriveFileOperationReminderParams,
): DeriveFileOperationReminderResult {
  const {
    normalizedPath,
    lifecycle,
    pathKind,
    linkedEntityResult,
    e2eSignal,
    currentSemanticRisk,
    posture,
  } = params;

  const policyResult = computeEnforcementPolicy({
    resolvedContext: params.resolvedContext,
    workContext: params.workContext,
    effectiveMode: params.effectiveMode ?? "advisory",
    lifecycleEvents: params.lifecycleEvents ?? [{ normalizedPath, lifecycle }],
    pathKinds: params.pathKinds ?? [pathKind],
    linkedEntityResults: params.linkedEntityResults ?? [linkedEntityResult],
    e2eSignals: params.e2eSignals ?? [e2eSignal],
    currentSemanticRisk,
    checkpointEvidence: params.checkpointEvidence,
    posture,
  });

  const lifecycleReminder = policyResult.text;
  let reminderKindsToMark = [...policyResult.reminderKindsToMark];

  // Derive e2e reminder (only when e2e signal exists)
  // E2e reminders are NOT posture-gated - they're always relevant
  let e2eReminder = policyResult.e2eReminder;
  if (e2eSignal.level !== "none" && e2eSignal.reminderText !== null) {
    e2eReminder = e2eSignal.reminderText;
    if (lifecycle === "deleted") {
      reminderKindsToMark = addUniqueReminderKind(reminderKindsToMark, "e2e_delete");
    } else {
      reminderKindsToMark = addUniqueReminderKind(reminderKindsToMark, "e2e_write");
    }
  }

  return {
    lifecycleReminder,
    e2eReminder,
    reminderKindsToMark,
    policyDecision: policyResult.kind,
    policyResult,
  };
}

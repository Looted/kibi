// implements REQ-opencode-smart-enforcement-v1
// Single source of truth for auto-briefing eligibility.
// No side effects, no SDK calls - pure function.

import type { RepoPosture } from "./repo-posture.js";
import type { RiskClass } from "./risk-classifier.js";

/**
 * Postures considered authoritative for strict/briefing eligibility.
 * Matches prompt.ts AUTHORITATIVE_POSTURES.
 */
const AUTHORITATIVE_POSTURES: readonly RepoPosture[] = [
  "root_active",
  "hybrid_root_plus_vendored",
];

/**
 * Risk classes eligible for auto-briefing.
 * Only authoritative risky code edits trigger auto-briefing.
 */
const ELIGIBLE_RISK_CLASSES: readonly RiskClass[] = [
  "behavior_candidate",
  "traceability_candidate",
];

/**
 * Check if posture is authoritative.
 */
function isAuthoritativePosture(posture: RepoPosture): boolean {
  return AUTHORITATIVE_POSTURES.includes(posture);
}

/**
 * Check if risk class is eligible for auto-briefing.
 */
function isEligibleRiskClass(riskClass: RiskClass): boolean {
  return ELIGIBLE_RISK_CLASSES.includes(riskClass);
}

/**
 * Input parameters for computing brief intent.
 * All fields are required - caller provides runtime context.
 */
export interface BriefIntentInputs {
  /** Workspace root path */
  workspaceRoot: string;
  /** Current branch name */
  branch: string;
  /** Path to the edited file */
  editedFilePath: string;
  /** Current repository posture */
  posture: RepoPosture;
  /** Classified risk of the edit */
  riskClass: RiskClass;
  /** Whether maintenance subsystem is degraded */
  maintenanceDegraded: boolean;
  /** Function to get source-linked requirement IDs for a file */
  getSourceLinkedRequirementIds: (worktree: string, absoluteFilePath: string) => string[];
}

/**
 * Result of computing brief intent.
 * All fields are deterministically derived from inputs.
 */
export interface BriefIntentResult {
  /** Whether auto-briefing is eligible */
  eligible: boolean;
  /** Human-readable reason for eligibility decision */
  reason: string;
  /** Stable fingerprint for cache lookups */
  fingerprint: string;
  /** Source files to include in briefing */
  sourceFiles: string[];
  /** Source-linked requirement IDs (up to 3) */
  seedIds: string[];
  /** Whether to keep the manual /brief-kibi cue */
  keepManualCue: boolean;
}

/**
 * Compute auto-briefing eligibility and metadata from current plugin state.
 *
 * Eligibility rules (matched from prompt.ts /brief-kibi cue conditions):
 * - Risk class must be behavior_candidate or traceability_candidate
 * - Posture must be authoritative (root_active or hybrid_root_plus_vendored)
 * - Maintenance must not be degraded
 * - Must have sourceFiles or seedIds context
 *
 * This is a PURE function - no side effects, no SDK calls.
 */
// implements REQ-opencode-smart-enforcement-v1
export function computeBriefIntent(inputs: BriefIntentInputs): BriefIntentResult {
  const {
    workspaceRoot,
    branch,
    editedFilePath,
    posture,
    riskClass,
    maintenanceDegraded,
    getSourceLinkedRequirementIds,
  } = inputs;

  // Derive sourceFiles: default to edited file if present
  const sourceFiles: string[] = editedFilePath ? [editedFilePath] : [];

  // Build fingerprint: workspace\0branch\0editedFilePath\0riskClass
  // Matches guidance-cache.ts serializeKey pattern
  const fingerprint = [
    workspaceRoot,
    branch,
    editedFilePath,
    riskClass,
  ].join("\0");

  // Check eligibility conditions (mirrors prompt.ts lines 293-299)
  const riskEligible = isEligibleRiskClass(riskClass);
  const postureAuthorized = isAuthoritativePosture(posture);
  const notDegraded = !maintenanceDegraded;

  // Get seedIds if we have context
  let seedIds: string[] = [];
  if (sourceFiles.length > 0 && getSourceLinkedRequirementIds) {
    try {
      // Convert relative path to absolute for the lookup
      const absolutePath = editedFilePath.startsWith("/")
        ? editedFilePath
        : `${workspaceRoot}/${editedFilePath}`.replace(/\/+/g, "/");
      seedIds = getSourceLinkedRequirementIds(workspaceRoot, absolutePath).slice(0, 3);
    } catch {
      // Best-effort: empty on error
      seedIds = [];
    }
  }

  // Eligibility: must have eligible risk class AND authoritative posture AND not degraded
  // AND must have some context (sourceFiles OR seedIds)
  const hasContext = sourceFiles.length > 0 || seedIds.length > 0;
  const eligible =
    riskEligible && postureAuthorized && notDegraded && hasContext;

  // Derive reason
  let reason: string;
  if (!riskEligible) {
    reason = `Risk class '${riskClass}' is not eligible for auto-briefing`;
  } else if (!postureAuthorized) {
    reason = `Posture '${posture}' is not authoritative`;
  } else if (maintenanceDegraded) {
    reason = "Maintenance subsystem is degraded";
  } else if (!hasContext) {
    reason = "No source context available (no sourceFiles or seedIds)";
  } else {
    reason = `Eligible: authoritative ${riskClass} in ${posture} posture`;
  }

  // keepManualCue defaults to true
  // Caller will set to false only when runtime state confirms ready
  const keepManualCue = true;

  return {
    eligible,
    reason,
    fingerprint,
    sourceFiles,
    seedIds,
    keepManualCue,
  };
}

/**
 * Type exports for consumers
 */
export type { RepoPosture } from "./repo-posture.js";
export type { RiskClass } from "./risk-classifier.js";
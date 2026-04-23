// implements REQ-opencode-kibi-briefing-v2, REQ-opencode-smart-enforcement-v1

import * as path from "node:path";
import type { RepoPosture } from "./repo-posture.js";
import type { RiskClass } from "./risk-classifier.js";
import { getSourceLinkedRequirementIds } from "./source-linked-guidance.js";

const ELIGIBLE_RISK_CLASSES: ReadonlySet<RiskClass> = new Set([
  "behavior_candidate",
  "traceability_candidate",
]);

const STRICT_ELIGIBLE_POSTURES: ReadonlySet<RepoPosture> = new Set([
  "root_active",
  "hybrid_root_plus_vendored",
]);

export interface BriefIntentParams {
  riskClass: RiskClass;
  posture: RepoPosture;
  maintenanceDegraded: boolean;
  workspaceRoot: string;
  branch: string;
  editedFilePath: string | undefined;
  seedIds?: string[];
}

export interface BriefIntentResult {
  eligible: boolean;
  reason: string;
  fingerprint: string;
  sourceFiles: string[];
  seedIds: string[];
}

export interface BriefIntentInputs {
  riskClass: RiskClass;
  posture: RepoPosture;
  maintenanceDegraded: boolean;
  worktreeRoot: string;
  branch: string;
  editedFile: string | undefined;
  seedIds?: string[];
}

function hasEditedFilePath(editedFilePath: string | undefined): editedFilePath is string {
  return typeof editedFilePath === "string" && editedFilePath.length > 0;
}

function deriveSeedIds(params: BriefIntentParams): string[] {
  if (!hasEditedFilePath(params.editedFilePath)) {
    return [];
  }

  if (params.seedIds !== undefined) {
    return params.seedIds.slice(0, 3);
  }

  const absoluteEditedPath = path.isAbsolute(params.editedFilePath)
    ? params.editedFilePath
    : path.join(params.workspaceRoot, params.editedFilePath);

  return getSourceLinkedRequirementIds(
    params.workspaceRoot,
    absoluteEditedPath,
  ).slice(0, 3);
}

// implements REQ-opencode-kibi-briefing-v2, REQ-opencode-smart-enforcement-v1
export function deriveBriefIntent(
  params: BriefIntentParams,
): BriefIntentResult {
  const fingerprint = `brief:${params.workspaceRoot}\0${params.branch}\0${params.editedFilePath ?? ""}\0${params.riskClass}`;
  const sourceFiles = hasEditedFilePath(params.editedFilePath)
    ? [params.editedFilePath]
    : [];
  const seedIds = deriveSeedIds(params);

  if (!hasEditedFilePath(params.editedFilePath)) {
    return {
      eligible: false,
      reason: "Ineligible: edited file path is missing",
      fingerprint,
      sourceFiles,
      seedIds,
    };
  }

  if (!ELIGIBLE_RISK_CLASSES.has(params.riskClass)) {
    return {
      eligible: false,
      reason: `Ineligible: riskClass ${params.riskClass} is not auto-brief eligible`,
      fingerprint,
      sourceFiles,
      seedIds,
    };
  }

  if (!STRICT_ELIGIBLE_POSTURES.has(params.posture)) {
    return {
      eligible: false,
      reason: `Ineligible: posture ${params.posture} is not authoritative`,
      fingerprint,
      sourceFiles,
      seedIds,
    };
  }

  if (params.maintenanceDegraded) {
    return {
      eligible: false,
      reason: "Ineligible: maintenance is degraded",
      fingerprint,
      sourceFiles,
      seedIds,
    };
  }

  return {
    eligible: true,
    reason: "Eligible for auto-briefing",
    fingerprint,
    sourceFiles,
    seedIds,
  };
}

export function computeBriefIntent( // implements REQ-opencode-kibi-briefing-v2
  inputs: BriefIntentInputs,
): BriefIntentResult {
  return deriveBriefIntent({
    riskClass: inputs.riskClass,
    posture: inputs.posture,
    maintenanceDegraded: inputs.maintenanceDegraded,
    workspaceRoot: inputs.worktreeRoot,
    branch: inputs.branch,
    editedFilePath: inputs.editedFile,
    ...(inputs.seedIds !== undefined ? { seedIds: inputs.seedIds } : {}),
  });
}

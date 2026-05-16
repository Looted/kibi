// implements REQ-opencode-kibi-briefing-v2, REQ-opencode-smart-enforcement-v1

// Inlined from kibi-cli/operational-artifacts to avoid heavy module resolution
function isOperationalArtifactPath(pathLike: string): boolean {
  const normalized = pathLike.replaceAll("\\", "/");
  return /(^|\/)\.sisyphus\//.test(normalized);
}
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
  sourceFiles: string[];
  focusFilePath?: string;
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
  sourceFiles: string[];
  focusFilePath?: string;
  seedIds?: string[];
}

function sortAndDedup(files: string[]): string[] {
  return [...new Set(files)].sort();
}

function deriveSeedIds(params: BriefIntentParams): string[] {
  if (params.seedIds !== undefined && params.seedIds.length > 0) {
    return buildBriefingContext({
      sourceFiles: params.sourceFiles,
      seedIds: params.seedIds,
    }).seedIds.slice(0, 3);
  }

  const focusFile = params.focusFilePath ?? params.sourceFiles[0];
  if (!focusFile) {
    return [];
  }

  return buildBriefingContext({
    sourceFiles: params.sourceFiles,
    seedIds: getSourceLinkedRequirementIds(params.workspaceRoot, focusFile),
  }).seedIds.slice(0, 3);
}

// implements REQ-opencode-kibi-briefing-v2, REQ-opencode-smart-enforcement-v1
export function deriveBriefIntent(
  params: BriefIntentParams,
): BriefIntentResult {
  const sortedSourceFiles = sortAndDedup(params.sourceFiles);
  const nonOperationalSourceFiles = sortedSourceFiles.filter(
    (f) => !isOperationalArtifactPath(f),
  );
  const fingerprint = `brief:${params.workspaceRoot}\0${params.branch}\0${params.riskClass}\0${nonOperationalSourceFiles.join("\0")}`;
  const seedIds = deriveSeedIds(params);

  if (sortedSourceFiles.length === 0) {
    return {
      eligible: false,
      reason: "Ineligible: no source files in session",
      fingerprint,
      sourceFiles: sortedSourceFiles,
      seedIds: [],
    };
  }

  if (nonOperationalSourceFiles.length === 0) {
    return {
      eligible: false,
      reason: "All source changes are operational task-tracking artifacts",
      fingerprint,
      sourceFiles: sortedSourceFiles,
      seedIds: [],
    };
  }

  if (!ELIGIBLE_RISK_CLASSES.has(params.riskClass)) {
    return {
      eligible: false,
      reason: `Ineligible: riskClass ${params.riskClass} is not auto-brief eligible`,
      fingerprint,
      sourceFiles: sortedSourceFiles,
      seedIds,
    };
  }

  if (!STRICT_ELIGIBLE_POSTURES.has(params.posture)) {
    return {
      eligible: false,
      reason: `Ineligible: posture ${params.posture} is not authoritative`,
      fingerprint,
      sourceFiles: sortedSourceFiles,
      seedIds,
    };
  }

  if (params.maintenanceDegraded) {
    return {
      eligible: false,
      reason: "Ineligible: maintenance is degraded",
      fingerprint,
      sourceFiles: sortedSourceFiles,
      seedIds,
    };
  }

  return {
    eligible: true,
    reason: "Eligible for auto-briefing",
    fingerprint,
    sourceFiles: nonOperationalSourceFiles,
    seedIds,
  };
}

export function computeBriefIntent(
  // implements REQ-opencode-kibi-briefing-v2
  inputs: BriefIntentInputs,
): BriefIntentResult {
  return deriveBriefIntent({
    riskClass: inputs.riskClass,
    posture: inputs.posture,
    maintenanceDegraded: inputs.maintenanceDegraded,
    workspaceRoot: inputs.worktreeRoot,
    branch: inputs.branch,
    sourceFiles: inputs.sourceFiles,
    ...(inputs.focusFilePath !== undefined
      ? { focusFilePath: inputs.focusFilePath }
      : {}),
    ...(inputs.seedIds !== undefined ? { seedIds: inputs.seedIds } : {}),
  });
}

export interface BriefingContextParams {
  sourceFiles: string[];
  seedIds?: string[];
  changedEntityIds?: string[];
}

export interface BriefingContextResult {
  sourceFiles: string[];
  seedIds: string[];
}

export function buildBriefingContext(
  // implements REQ-opencode-kibi-briefing-v6
  params: BriefingContextParams,
): BriefingContextResult {
  const sourceFiles = [...new Set(params.sourceFiles)].sort();

  const seen = new Set<string>();
  const seeds: string[] = [];

  // Take first 3 changed entity IDs in original order, dedupe, sort
  if (params.changedEntityIds) {
    for (const id of params.changedEntityIds.slice(0, 3)) {
      if (!seen.has(id)) {
        seeds.push(id);
        seen.add(id);
      }
    }
  }

  // Fill remaining slots from seedIds in original order
  if (params.seedIds) {
    for (const id of params.seedIds) {
      if (seeds.length >= 5) break;
      if (!seen.has(id)) {
        seeds.push(id);
        seen.add(id);
      }
    }
  }

  // Sort final seedIds alphabetically
  seeds.sort((a, b) => a.localeCompare(b));

  return {
    sourceFiles,
    seedIds: seeds,
  };
}

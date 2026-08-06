import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildStrictWriteSet } from "../../public/check-types.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { getSchemaVersionStatus } from "../../public/schema-version.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import {
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
} from "./requirement-applyplan.js";
import {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
} from "./requirement-modeler.js";
import type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "./requirement-types.js";
import {
  normalizeOptionalString,
  normalizeSourceFiles,
} from "./requirement-utils.js";

export type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "./requirement-types.js";
export {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
};

export async function getWorkspaceMigrationWarning(
  workspaceRoot: string,
): Promise<string | null> {
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  let rawConfig: string;
  try {
    rawConfig = await readFile(configPath, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(rawConfig) as {
      schemaVersion?: number | string;
    } | null;
    return getSchemaVersionStatus(parsed ?? undefined).warning;
  } catch {
    return "KB config schemaVersion could not be read and should be checked before applying automated modeling.";
  }
}

export async function handleKbModelRequirement(
  _prolog: unknown,
  args: ModelRequirementArgs,
  workspaceRoot: string,
): Promise<ModelRequirementResult> {
  const extracted = extractRequirementClaim({
    ...args,
    source:
      normalizeOptionalString(args.source) ??
      normalizeSourceFiles(args.sourceFiles)[0] ??
      "mcp://kibi/model-requirement",
  });
  const writeSet = buildStrictWriteSet({
    claim: extracted.claim,
    statement: extracted.statement,
  });
  const claimKey = semanticClaimKey(extracted.statement);
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );
  const applyPlan = strictWriteSetToApplyPlan(writeSet).map((step) => {
    const properties =
      step.properties !== null && typeof step.properties === "object"
        ? (step.properties as Record<string, unknown>)
        : {};
    if (step.type === "fact") {
      return {
        ...step,
        properties: {
          ...properties,
          claim_key: claimKey,
          claim_text: extracted.statement,
        },
      };
    }
    if (step.type === "req") {
      return {
        ...step,
        properties: { ...properties, logic_claims: logicClaims },
      };
    }
    return step;
  });
  const migrationWarning = await getWorkspaceMigrationWarning(workspaceRoot);
  const warnings = writeSet.isStrict
    ? []
    : [
        {
          kind: "low_confidence_observation_downgrade",
          message: `Claim confidence ${writeSet.confidence.toFixed(2)} is below the strict threshold 0.70, so Kibi emitted an observation fact instead of strict subject/property facts.`,
          nextAction:
            "If this is normative, provide subjectKey, propertyKey, operator, and value explicitly, then apply the returned strict write-set sequentially.",
        },
      ];
  const strictSummary = writeSet.isStrict
    ? `Modeled strict requirement into ${applyPlan.length} sequential applyPlan step(s).`
    : "Modeled a non-blocking observation review artifact; deterministic claim extraction stayed below the strict threshold.";
  const structuredContent = {
    statement: extracted.statement,
    claimKey,
    logicClaims,
    source: extracted.source,
    sourceFiles: extracted.sourceFiles,
    claim: extracted.claim,
    writeSet,
    applyPlan,
    isStrict: writeSet.isStrict,
    confidence: writeSet.confidence,
    extractionMode: extracted.extractionMode,
    extractionWarnings: extracted.extractionWarnings,
    warnings,
    migrationWarning,
  };
  return {
    content: [
      {
        type: "text",
        text: migrationWarning
          ? `${strictSummary} Migration warning included.`
          : strictSummary,
      },
    ],
    structuredContent,
    applyPlan,
    writeSet,
    migrationWarning,
  };
}

export async function executeModelRequirement(
  args: ModelRequirementArgs,
  context: OperationContext,
): Promise<ModelRequirementResult> {
  return handleKbModelRequirement(context.prolog, args, context.workspaceRoot);
}

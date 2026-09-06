import { buildStrictWriteSet } from "../../public/check-types.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../semantic-advisor/clauses.js";
import { semanticSourceHash } from "../semantic-advisor/shared.js";
import { buildLogicApplyPlan } from "./logic-modeling.js";
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

export function annotateModelRequirementStep(
  step: Record<string, unknown>,
  context: {
    claimKey: string;
    statement: string;
    logicClaims: string[];
  },
): Record<string, unknown> {
  const properties =
    step.properties !== null && typeof step.properties === "object"
      ? (step.properties as Record<string, unknown>)
      : {};
  if (step.type === "fact") {
    return {
      ...step,
      properties: {
        ...properties,
        claim_key: context.claimKey,
        claim_text: context.statement,
      },
    };
  }
  if (step.type === "req") {
    const claimText = context.statement.trim();
    const normalizedClaimText = normalizeSemanticClause(claimText);
    return {
      ...step,
      properties: {
        ...properties,
        semantic_text: claimText,
        logic_claims: context.logicClaims,
        semantic_clauses: [claimText],
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "semantic_text",
        semantic_source_hash: semanticSourceHash(claimText),
        semantic_inventory: [
          {
            claim_key: context.claimKey,
            claim_text: normalizedClaimText,
            role: /\b(?:must|shall|should|required|requires?)\b/i.test(claimText)
              ? "normative"
              : "descriptive",
            status: "modeled",
            span: {
              start: 0,
              end: Buffer.byteLength(normalizedClaimText, "utf8"),
            },
          },
        ],
      },
    };
  }
  return step;
}

export async function getWorkspaceMigrationWarning(
  workspaceRoot: string,
): Promise<string | null> {
  const status = readKbManifestStatus(workspaceRoot);
  if (status.state === "ok") return null;
  return status.warning;
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
  if (args.logic !== undefined) {
    const logicPlan = buildLogicApplyPlan({
      text: args.text,
      logic: args.logic,
      source: extracted.source,
      ...(typeof args.requirementId === "string"
        ? { requirementId: args.requirementId }
        : {}),
      ...(args.existingLogicClaims !== undefined
        ? { existingLogicClaims: args.existingLogicClaims }
        : {}),
      ...(args.claimKey !== undefined ? { claimKey: args.claimKey } : {}),
      ...(args.claimText !== undefined ? { claimText: args.claimText } : {}),
    });
    const fallbackWriteSet = buildStrictWriteSet({
      claim: extracted.claim,
      statement: extracted.statement,
    });
    const migrationWarning = await getWorkspaceMigrationWarning(workspaceRoot);
    const structuredContent = {
      statement: extracted.statement,
      claimKey: logicPlan.claimKey,
      logicClaims: Array.from(
        new Set([...(args.existingLogicClaims ?? []), logicPlan.claimKey]),
      ),
      source: extracted.source,
      sourceFiles: extracted.sourceFiles,
      claim: extracted.claim,
      writeSet: fallbackWriteSet,
      applyPlan: logicPlan.applyPlan,
      isStrict: false,
      confidence: args.confidence ?? 1,
      extractionMode: extracted.extractionMode,
      extractionWarnings: extracted.extractionWarnings,
      warnings: [],
      migrationWarning,
      logic: {
        semanticKey: logicPlan.semanticKey,
        claimKey: logicPlan.claimKey,
        claimText: logicPlan.claimText,
        renderedProlog: logicPlan.renderedProlog,
        normalized: logicPlan.normalized,
      },
    };
    return {
      content: [
        {
          type: "text",
          text: `Modeled typed kibi.logic.v1 rule ${logicPlan.semanticKey}; apply the returned schema, rule, and requirement steps sequentially.`,
        },
      ],
      structuredContent,
      applyPlan: logicPlan.applyPlan,
      writeSet: fallbackWriteSet,
      migrationWarning,
    };
  }
  const writeSet = buildStrictWriteSet({
    claim: extracted.claim,
    statement: extracted.statement,
  });
  const claimKey = semanticClaimKey(extracted.statement);
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );
  const applyPlan = strictWriteSetToApplyPlan(writeSet).map((step) =>
    annotateModelRequirementStep(step, {
      claimKey,
      statement: extracted.statement,
      logicClaims,
    }),
  );
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

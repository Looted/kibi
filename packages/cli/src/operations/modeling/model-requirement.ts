import {
  type StrictWriteSet,
  buildStrictWriteSet,
} from "../../public/check-types.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { readKbManifestStatus } from "../../utils/kb-manifest.js";
import {
  isConventionalSubjectKey,
  normalizeSubjectKey,
} from "../../utils/strict-modeling.js";
import {
  extractSemanticClauses,
  modeledClaimRole,
  normalizeSemanticClause,
  semanticClaimKey,
} from "../semantic-advisor/clauses.js";
import { detectConditionalRule } from "../semantic-advisor/conditional-rules.js";
import { advisorPropositionRole } from "../semantic-advisor/proposition-role.js";
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
import {
  type VocabularyAlignmentOutcome,
  alignRequirementVocabulary,
} from "./vocabulary-alignment.js";

export type {
  ModelRequirementArgs,
  ModelRequirementResult,
} from "./requirement-types.js";

type ExtractedClaim = ReturnType<typeof extractRequirementClaim>;

type AlignedWriteSet = Readonly<{
  writeSet: StrictWriteSet;
  outcome: VocabularyAlignmentOutcome | null;
  warnings: ReadonlyArray<{
    kind: string;
    message: string;
    nextAction: string;
  }>;
  reviewPlan: Array<Record<string, unknown>>;
  adjustPlan: (
    plan: Array<Record<string, unknown>>,
  ) => Array<Record<string, unknown>>;
}>;

const NEW_SUBJECT_REVIEW_SCORE = 0.3;

function reuseExistingSubject(
  writeSet: StrictWriteSet,
  existingFactId: string,
): { writeSet: StrictWriteSet; replacedSubjectId: string | null } {
  if (!writeSet.isStrict) return { writeSet, replacedSubjectId: null };
  const replacedSubjectId = writeSet.subjectFact.id;
  return {
    replacedSubjectId,
    writeSet: {
      ...writeSet,
      subjectFact: {
        ...writeSet.subjectFact,
        id: existingFactId,
        properties: { ...writeSet.subjectFact.properties, id: existingFactId },
      },
      relationships: writeSet.relationships.map((relationship) =>
        relationship.type === "constrains"
          ? { ...relationship, to: existingFactId }
          : relationship,
      ),
    },
  };
}

function possibleDuplicateObservation(
  claimKey: string,
  statement: string,
  source: string,
  candidates: VocabularyAlignmentOutcome["redundancyCandidates"],
): Record<string, unknown> {
  const id = `FACT-OBS-POSSIBLE-DUPLICATE-${claimKey.replace(/^CLAIM-/, "")}`;
  return {
    type: "fact",
    id,
    properties: {
      id,
      title: `Possible duplicate: ${statement}`,
      status: "active",
      source,
      fact_kind: "observation",
      tags: ["review:possible-duplicate", "vocabulary-alignment"],
    },
    relationships: candidates.map((candidate) => ({
      type: "relates_to",
      from: id,
      to: candidate.factId,
    })),
  };
}

/**
 * Resolve the clause subject against the existing KB vocabulary. A heuristic
 * subject converges onto the chosen existing subject; an explicitly provided
 * subject is kept (the caller owns it) but reuses the existing subject fact
 * when the keys match. Otherwise the plan explicitly declares a new subject.
 */
// implements REQ-kibi-subject-vocabulary
async function applyVocabularyAlignment(
  context: OperationContext | undefined,
  extracted: ExtractedClaim,
  claimKey: string,
): Promise<AlignedWriteSet> {
  const initial = buildStrictWriteSet({
    claim: extracted.claim,
    statement: extracted.statement,
  });
  const unchanged: AlignedWriteSet = {
    writeSet: initial,
    outcome: null,
    warnings: [],
    reviewPlan: [],
    adjustPlan: (plan) => plan,
  };
  if (!context?.prolog || !initial.isStrict) return unchanged;

  const proposedSubjectKey = normalizeSubjectKey(extracted.claim.subjectKey);
  const outcome = await alignRequirementVocabulary(context, {
    claimKey,
    statement: extracted.statement,
    proposedSubjectKey,
  });
  if (outcome === null) return unchanged;

  const warnings: Array<{ kind: string; message: string; nextAction: string }> =
    [];
  let writeSet: StrictWriteSet = initial;
  let replacedSubjectId: string | null = null;
  const subject = outcome.subject;
  if (subject.decision === "reuse_existing" && subject.existingFactId) {
    const followsVocabulary =
      extracted.extractionMode !== "provided" ||
      proposedSubjectKey === subject.subjectKey;
    if (followsVocabulary) {
      const rebuilt = buildStrictWriteSet({
        claim: { ...extracted.claim, subjectKey: subject.subjectKey },
        statement: extracted.statement,
      });
      ({ writeSet, replacedSubjectId } = reuseExistingSubject(
        rebuilt,
        subject.existingFactId,
      ));
    } else {
      warnings.push({
        kind: "subject_reuse_review",
        message: `Provided subjectKey ${proposedSubjectKey} is new, but existing subject ${subject.subjectKey} (${subject.existingFactId}) matches this clause.`,
        nextAction: `Reuse subjectKey ${subject.subjectKey} so this requirement can be compared with the others on that subject, or keep ${proposedSubjectKey} if it is genuinely a different component.`,
      });
    }
  } else {
    if (!isConventionalSubjectKey(subject.subjectKey)) {
      warnings.push({
        kind: "subject_key_shape_review",
        message: `New subject key ${subject.subjectKey} does not follow the component.aspect[.sub] convention checked by subject-key-shape.`,
        nextAction:
          "Pass subjectKey as a dotted key with lowercase snake segments (for example kibi.cli.gc) so later requirements about the same component can reuse it.",
      });
    }
    const nearest = subject.candidates[0];
    if (nearest && nearest.score >= NEW_SUBJECT_REVIEW_SCORE) {
      warnings.push({
        kind: "new_subject_declared",
        message: `Declaring new subject ${subject.subjectKey}; nearest existing subject is ${nearest.subjectKey} (score ${nearest.score}).`,
        nextAction:
          "Confirm the new subject is a different component, or pass subjectKey set to the existing subject to reuse it.",
      });
    }
  }

  const reviewPlan =
    outcome.redundancyCandidates.length > 0
      ? [
          possibleDuplicateObservation(
            claimKey,
            extracted.statement,
            extracted.source,
            outcome.redundancyCandidates,
          ),
        ]
      : [];
  if (outcome.redundancyCandidates.length > 0) {
    warnings.push({
      kind: "possible_duplicate",
      message: `This clause may restate existing claim(s) ${outcome.redundancyCandidates
        .map((candidate) => candidate.factId)
        .join(", ")} on ${subject.subjectKey}.`,
      nextAction:
        "Review the candidates: reuse the existing fact, supersede or restate the existing requirement, or record the returned review:possible-duplicate observation. This is advice, not a check verdict.",
    });
  }

  const declaredNew = subject.decision === "declare_new";
  return {
    writeSet,
    outcome,
    warnings,
    reviewPlan,
    adjustPlan: (plan) =>
      plan
        .filter(
          (step) =>
            !(
              replacedSubjectId !== null &&
              writeSet.isStrict &&
              step.id === writeSet.subjectFact.id &&
              step.type === "fact" &&
              (step.properties as { fact_kind?: string } | undefined)
                ?.fact_kind === "subject"
            ),
        )
        .map((step) => {
          if (
            !declaredNew ||
            step.type !== "fact" ||
            (step.properties as { fact_kind?: string } | undefined)
              ?.fact_kind !== "subject"
          ) {
            return step;
          }
          const properties = step.properties as Record<string, unknown>;
          const tags = Array.isArray(properties.tags) ? properties.tags : [];
          return {
            ...step,
            properties: {
              ...properties,
              tags: [...tags, "vocabulary:new-subject"],
            },
          };
        }),
  };
}
export {
  estimateNormativeSignalConfidence,
  extractRequirementClaim,
  strictWriteSetToApplyPlan,
  writeSetPrimaryEntityId,
};

// implements REQ-kibi-logical-requirement-coverage
// covered_by TEST-kibi-logical-requirement-coverage
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
            role:
              advisorPropositionRole(claimText, context.claimKey, [
                claimText,
              ]) ?? modeledClaimRole(claimText),
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

type ModeledStatement = ExtractedClaim & {
  statement: string;
  source: string;
  sourceFiles: string[];
};

function stepProperties(
  step: Record<string, unknown>,
): Record<string, unknown> {
  return step.properties !== null && typeof step.properties === "object"
    ? (step.properties as Record<string, unknown>)
    : {};
}

// implements REQ-kibi-truthful-consistency
function unresolvedObservationStep(
  step: Record<string, unknown>,
): Record<string, unknown> {
  if (step.type !== "fact") return step;
  const properties = stepProperties(step);
  const tags = Array.isArray(properties.tags) ? properties.tags : [];
  return {
    ...step,
    properties: {
      ...properties,
      tags: Array.from(new Set([...tags, "review:ontology-gap"])),
    },
  };
}

// implements REQ-kibi-proposition-complete-ingestion
// The advisor decides each proposition's role, and proposition-complete
// ingestion compares the persisted inventory with it. A rule modality alone
// would call "X must not happen unless C" normative where the advisor reads an
// exception, so the role comes from the advisor's own clause analysis.
function withAdvisorRoles(
  plan: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return plan.map((step) => {
    if (step.type !== "req") return step;
    const properties = stepProperties(step);
    const semanticText = properties.semantic_text;
    const inventory = properties.semantic_inventory;
    if (typeof semanticText !== "string" || !Array.isArray(inventory))
      return step;
    return {
      ...step,
      properties: {
        ...properties,
        semantic_inventory: inventory.map((entry: unknown) => {
          if (entry === null || typeof entry !== "object") return entry;
          const row = entry as Record<string, unknown>;
          const role =
            typeof row.claim_key === "string"
              ? advisorPropositionRole(semanticText, row.claim_key)
              : null;
          return role === null ? row : { ...row, role };
        }),
      },
    };
  });
}

// implements REQ-kibi-logical-requirement-coverage
async function logicModelResult(
  args: ModelRequirementArgs,
  extracted: ModeledStatement,
  logic: NonNullable<ModelRequirementArgs["logic"]>,
  workspaceRoot: string,
  confidence: number,
): Promise<ModelRequirementResult> {
  const logicPlan = buildLogicApplyPlan({
    text: args.text,
    logic,
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
  const applyPlan = withAdvisorRoles(logicPlan.applyPlan);
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
    applyPlan,
    isStrict: false,
    confidence,
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
    applyPlan,
    writeSet: fallbackWriteSet,
    migrationWarning,
  };
}

// implements REQ-kibi-truthful-consistency
// A recognised conditional clause that cannot be translated gets no
// observation and no strict property. With a requirementId the requirement
// records the clause as an unresolved ontology gap in its inventory.
async function unresolvedConditionalResult(
  args: ModelRequirementArgs,
  extracted: ModeledStatement,
  reason: string,
  workspaceRoot: string,
): Promise<ModelRequirementResult> {
  const semanticText = args.text.trim();
  const claimText = normalizeSemanticClause(extracted.statement);
  const claimKey = semanticClaimKey(claimText);
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );
  const start = Math.max(0, semanticText.indexOf(claimText));
  const applyPlan: Array<Record<string, unknown>> =
    typeof args.requirementId === "string"
      ? [
          {
            type: "req",
            id: args.requirementId,
            properties: {
              title:
                claimText.split(/[.!?]/, 1)[0] || "Conditional requirement",
              status: "open",
              source: extracted.source,
              semantic_text: semanticText,
              logic_claims: logicClaims,
              semantic_clauses: [claimText],
              semantic_inventory_version: "kibi.semantic-inventory.v1",
              semantic_source_field: "semantic_text",
              semantic_source_hash: semanticSourceHash(semanticText),
              semantic_inventory: [
                {
                  claim_key: claimKey,
                  claim_text: claimText,
                  role:
                    advisorPropositionRole(semanticText, claimKey) ??
                    modeledClaimRole(claimText),
                  status: "ontology_gap",
                  span: {
                    start: Buffer.byteLength(
                      semanticText.slice(0, start),
                      "utf8",
                    ),
                    end: Buffer.byteLength(
                      semanticText.slice(0, start + claimText.length),
                      "utf8",
                    ),
                  },
                  reason,
                },
              ],
            },
            relationships: [],
          },
        ]
      : [];
  const writeSet = buildStrictWriteSet({
    claim: extracted.claim,
    statement: extracted.statement,
  });
  const migrationWarning = await getWorkspaceMigrationWarning(workspaceRoot);
  return {
    content: [
      {
        type: "text",
        text: "Recognised a conditional requirement but could not translate it; it stays unresolved until a typed kibi.logic.v1 rule is supplied.",
      },
    ],
    structuredContent: {
      statement: extracted.statement,
      claimKey,
      logicClaims,
      source: extracted.source,
      sourceFiles: extracted.sourceFiles,
      claim: extracted.claim,
      writeSet,
      applyPlan,
      isStrict: false,
      confidence: 0,
      extractionMode: extracted.extractionMode,
      extractionWarnings: extracted.extractionWarnings,
      warnings: [
        {
          kind: "unresolved_conditional_clause",
          message: `${reason} The clause stays unresolved: Kibi emitted no strict property and no observation for it.`,
          nextAction:
            "Pass logic with a kibi.logic.v1 rule that forbids the action unless the condition holds, or call kb_model with mode predicates when the condition is a domain relation, then apply the returned steps sequentially.",
        },
      ],
      migrationWarning,
    },
    applyPlan,
    writeSet,
    migrationWarning,
  };
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
  context?: OperationContext,
): Promise<ModelRequirementResult> {
  const extracted = extractRequirementClaim({
    ...args,
    source:
      normalizeOptionalString(args.source) ??
      normalizeSourceFiles(args.sourceFiles)[0] ??
      "mcp://kibi/model-requirement",
  });
  if (args.logic !== undefined)
    return logicModelResult(
      args,
      extracted,
      args.logic,
      workspaceRoot,
      args.confidence ?? 1,
    );
  // implements REQ-kibi-truthful-consistency
  // A conditional requirement ("X may happen only when C", "X must not happen
  // unless C") restricts an action. It goes to the rule lane and never falls
  // back to a strict property or an observation; a conditional clause this
  // reader cannot translate stays unresolved.
  const conditional =
    extracted.extractionMode === "provided"
      ? null
      : detectConditionalRule(extracted.statement);
  if (conditional?.kind === "rule")
    return logicModelResult(
      args,
      extracted,
      conditional.ir,
      workspaceRoot,
      args.confidence ?? 0.8,
    );
  if (conditional?.kind === "unparsed")
    return unresolvedConditionalResult(
      args,
      extracted,
      conditional.reason,
      workspaceRoot,
    );
  const claimKey = semanticClaimKey(extracted.statement);
  const aligned = await applyVocabularyAlignment(context, extracted, claimKey);
  const writeSet = aligned.writeSet;
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );
  const plan = aligned.adjustPlan(strictWriteSetToApplyPlan(writeSet));
  // A strict write set grounds the claim, so its steps carry the claim. The
  // below-threshold observation is only a review artifact: it gets no claim
  // provenance (that would make it look like grounding) and is tagged as an
  // open ontology gap.
  const applyPlan = writeSet.isStrict
    ? plan.map((step) =>
        annotateModelRequirementStep(step, {
          claimKey,
          statement: extracted.statement,
          logicClaims,
        }),
      )
    : plan.map(unresolvedObservationStep);
  const migrationWarning = await getWorkspaceMigrationWarning(workspaceRoot);
  const warnings = writeSet.isStrict
    ? [...aligned.warnings]
    : [
        {
          kind: "low_confidence_observation_downgrade",
          message: `Claim confidence ${writeSet.confidence.toFixed(2)} is below the strict threshold 0.70, so Kibi emitted a review:ontology-gap observation instead of strict subject/property facts. The clause stays unresolved: the observation does not ground it.`,
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
    ...(aligned.outcome !== null
      ? {
          vocabularyAlignment: {
            ...aligned.outcome,
            reviewPlan: aligned.reviewPlan,
          },
        }
      : {}),
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
  // kb_model_requirement is intentionally off the external semantic-classifier
  // allowlist: classification after modeling only produced provenance warnings
  // and is not worth a metered provider call. Use kb_semantic_advisor when
  // classifier routing is needed. It is on the vocabulary-alignment allowlist:
  // choosing an existing subject is exactly the modeling-time decision that
  // provider is for, and it only runs when explicitly activated.
  return handleKbModelRequirement(
    context.prolog,
    args,
    context.workspaceRoot,
    context,
  );
}

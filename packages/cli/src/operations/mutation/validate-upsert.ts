// implements REQ-kibi-operation-interface-parity
import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import type { OperationResult } from "../../public/operations/types.js";
import { entityIdStyleWarnings } from "../../utils/entity-id-style.js";
import { entityContextWarnings } from "./context-warning.js";
import {
  buildUpsertContradictionPreviewGoal,
  buildWhatIfAnalysisGoal,
  formatUpsertError,
} from "./contradictions.js";
import { validateRelationshipSources } from "./relationships.js";
import { canonicalSourcePath } from "./source-authoring.js";
import { validateSymbolGranularity } from "./symbol-granularity.js";
import type {
  PlannedFactInput,
  RelationshipInput,
  StagedUpsertState,
  UpsertInput,
  ValidateUpsertPayload,
} from "./types.js";
import {
  type UpsertSemanticAnalysis,
  analyzeUpsertSemantics,
  validateAppendOnlyProofReceipts,
  validateUpsertForCommit,
} from "./upsert.js";
import { validateUpsertInput } from "./validation.js";
import { symbolCoverageWarnings } from "./warnings.js";
import { isBlockingWitness, parseWhatIfAnalysis } from "./what-if.js";

// implements REQ-kibi-entity-id-style
async function entityExists(prolog: PrologPort, id: string): Promise<boolean> {
  const result = await prolog.query(
    `once(kb_entity('${escapeAtom(id)}', _Type, _Props))`,
  );
  return result.success;
}

// implements REQ-kibi-operation-interface-parity, REQ-kb-entity-body-context
/**
 * The authored document a real kb_upsert would update, resolved with the
 * write's own rules (stored authored source, else the canonical lane path).
 * The preview entity's `source` is the runtime marker, so without this the
 * context warning would judge the statement instead of the existing body the
 * write preserves. Undefined when the write would not touch a document.
 */
async function previewDocumentPath(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  context: OperationContext,
): Promise<string | undefined> {
  if (context.fs === undefined || context.sourceFirst === false) {
    return undefined;
  }
  try {
    const existing =
      context.prolog === undefined
        ? undefined
        : (
            await loadEntities(context.prolog, {
              id: input.id,
              type: input.type,
            })
          )[0];
    const existingSource =
      typeof existing?.source === "string" ? existing.source : undefined;
    if (
      input.document === undefined &&
      existing !== undefined &&
      !existingSource?.match(/\.(?:md|mdx|ya?ml|json)$/i)
    ) {
      return undefined;
    }
    return canonicalSourcePath(context, input, entity, existing);
  } catch {
    return undefined;
  }
}

// implements REQ-kibi-operation-interface-parity, REQ-kibi-truthful-consistency
/**
 * The commit-time contradiction check, run against a staged and rolled-back
 * copy of the store. Only a `req` commit runs it (facts and scenarios never
 * do), and `_skipContradictionCheck` skips it at commit, so the preview skips
 * it too. A refusal carries the same message the commit would raise.
 */
async function previewContradictions(
  prolog: PrologPort,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
): Promise<void> {
  if (input.type !== "req" || input._skipContradictionCheck === true) return;
  const preview = await prolog.query(
    buildUpsertContradictionPreviewGoal({
      entity,
      relationships,
      skipContradictionCheck: false,
    }),
  );
  if (!preview.success) {
    throw new Error(
      formatUpsertError(input.id, preview.error, preview.errorRecord),
    );
  }
}

// implements REQ-model-what-if-planned-facts
type StagedFacts = Readonly<{
  staged: StagedUpsertState;
  steps: readonly {
    entity: Readonly<Record<string, unknown>>;
    relationships: readonly RelationshipInput[];
  }[];
}>;

// implements REQ-model-what-if-planned-facts
/**
 * Validate the planned facts in order, each against the live store plus the
 * facts before it, exactly as kb_apply_plan validates a plan's steps. The
 * result is the staged state the payload's own validation reads: a planned
 * fact counts as a live relationship target and its claim_key is read from
 * the plan, so a requirement can be previewed before its facts are written.
 */
async function stagePlannedFacts(
  input: UpsertInput,
  context: OperationContext,
): Promise<StagedFacts | null> {
  const planned = input.plannedFacts;
  if (planned === undefined) return null;
  if (!Array.isArray(planned))
    throw new Error("plannedFacts must be an array of fact upsert payloads");
  const entities = new Map<string, Readonly<Record<string, unknown>>>();
  const relationships: RelationshipInput[] = [];
  const steps: {
    entity: Readonly<Record<string, unknown>>;
    relationships: readonly RelationshipInput[];
  }[] = [];
  for (const [index, fact] of planned.entries()) {
    const id = typeof fact?.id === "string" ? fact.id : `#${index + 1}`;
    if (fact?.type !== "fact")
      throw new Error(
        `planned fact ${id} is invalid: plannedFacts stages fact entities only (got type '${String(fact?.type)}')`,
      );
    if (fact.id === input.id)
      throw new Error(
        `planned fact ${id} is invalid: it has the same id as the payload`,
      );
    try {
      const { validated } = await validateUpsertForCommit(
        plannedFactUpsert(fact),
        context,
        { staged: { entities, relationships: [...relationships] } },
      );
      entities.set(fact.id, validated.entity);
      relationships.push(...validated.relationships);
      steps.push({
        entity: validated.entity,
        relationships: validated.relationships,
      });
    } catch (error) {
      throw new Error(
        `planned fact ${id} is invalid: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return { staged: { entities, relationships }, steps };
}

function plannedFactUpsert(fact: PlannedFactInput): UpsertInput {
  return {
    type: fact.type,
    id: fact.id,
    properties: fact.properties,
    ...(fact.relationships !== undefined
      ? { relationships: fact.relationships }
      : {}),
  };
}

// implements REQ-model-what-if-planned-facts, REQ-kibi-truthful-consistency
/**
 * The contradiction preview for a payload with planned facts: the facts and
 * the payload are staged together in a rolled-back transaction and the
 * witnesses the KB would then hold are compared with the current KB's. A
 * blocking witness the batch introduces refuses the dry run the way the
 * commit would refuse the last write of the batch; the full split is
 * returned so an agent sees the conflict before any fact exists.
 */
async function previewStagedContradictions(
  prolog: PrologPort,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  facts: StagedFacts,
): Promise<NonNullable<ValidateUpsertPayload["whatIf"]>> {
  const result = await prolog.query(
    buildWhatIfAnalysisGoal([
      ...facts.steps.map((step) => ({
        entity: step.entity,
        relationships: step.relationships,
        skipContradictionCheck: true,
      })),
      { entity, relationships, skipContradictionCheck: true },
    ]),
  );
  if (!result.success)
    throw new Error(
      formatUpsertError(input.id, result.error, result.errorRecord),
    );
  const analysis = parseWhatIfAnalysis(result.bindings.JsonString);
  if (analysis === null)
    throw new Error(
      `Failed to preview ${input.id} with planned facts: the staged contradiction analysis could not be read`,
    );
  const skip = input.type !== "req" || input._skipContradictionCheck === true;
  const blocking = skip ? [] : analysis.introduced.filter(isBlockingWitness);
  if (blocking.length > 0) {
    const conflicts = blocking.map((witness) => {
      const others = witness.requirements.filter((id) => id !== input.id);
      return `  - Conflicts with ${others.join(", ") || witness.requirements.join(", ")}: ${witness.reason}`;
    });
    throw new Error(
      `Contradiction detected for requirement ${input.id} once its planned facts are written:\n${conflicts.join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one. (stage=contradiction_check, plannedFacts staged)`,
    );
  }
  return {
    introduced: analysis.introduced,
    removed: analysis.removed,
    unchanged: analysis.unchanged,
  };
}

/**
 * The validation chain for a runtime without a store: everything that does
 * not need to read the KB.
 */
async function validateWithoutStore(
  input: UpsertInput,
  context: OperationContext,
): Promise<{
  entity: Readonly<Record<string, unknown>>;
  semantic: UpsertSemanticAnalysis;
}> {
  const validated = validateUpsertInput(input, context.clock());
  await validateAppendOnlyProofReceipts(validated.entity, context);
  validateRelationshipSources(input.id, validated.relationships);
  await validateSymbolGranularity(
    validated.entity,
    validated.relationships,
    context,
  );
  const semantic = analyzeUpsertSemantics({
    ...input,
    relationships: validated.relationships,
  });
  return { entity: validated.entity, semantic };
}

function isModuleLoadFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: unknown }).code;
  return code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND";
}

// implements REQ-kibi-operation-interface-parity, REQ-kibi-truthful-consistency
/**
 * kb_upsert dryRun:true (and the former kb_validate_upsert preflight). With a
 * store it runs validateUpsertForCommit, the exact validation a real
 * kb_upsert runs before its first write, so a dry run accepts only what the
 * write would accept; without a store it runs the store-independent checks.
 */
export async function executeValidateUpsert(
  input: UpsertInput,
  context: OperationContext,
): Promise<OperationResult<ValidateUpsertPayload>> {
  try {
    if (input.plannedFacts !== undefined && context.prolog === undefined)
      throw new Error(
        "plannedFacts needs a KB store: the planned facts are staged against the current KB",
      );
    let whatIf: ValidateUpsertPayload["whatIf"];
    let stagedFacts: readonly string[] | undefined;
    let relationships: readonly RelationshipInput[] = input.relationships ?? [];
    const { entity, semantic } =
      context.prolog !== undefined
        ? await stagePlannedFacts(input, context).then(async (facts) => {
            const result = await validateUpsertForCommit(
              input,
              context,
              facts === null ? {} : { staged: facts.staged },
            );
            // The commit goal checks requirement contradictions after the
            // validations above; a dry run previews that stage as well, so
            // "valid" means the commit would not refuse the write.
            if (facts === null) {
              await previewContradictions(
                context.prolog as PrologPort,
                input,
                result.validated.entity,
                result.validated.relationships,
              );
            } else {
              stagedFacts = [...facts.staged.entities.keys()];
              whatIf = await previewStagedContradictions(
                context.prolog as PrologPort,
                input,
                result.validated.entity,
                result.validated.relationships,
                facts,
              );
            }
            relationships = result.validated.relationships;
            return {
              entity: result.validated.entity,
              semantic: result.semantic,
            };
          })
        : await validateWithoutStore(input, context);
    // Style warnings apply only to entities this upsert would create, so the
    // existence read happens only when the ID actually has a style issue.
    const candidateIdStyleWarnings = entityIdStyleWarnings({
      id: input.id,
      sourcePath: typeof entity.source === "string" ? entity.source : undefined,
    });
    const idStyleWarnings =
      candidateIdStyleWarnings.length > 0 &&
      context.prolog &&
      !(await entityExists(context.prolog, input.id))
        ? candidateIdStyleWarnings
        : [];
    // The same symbol-coverage warning the write returns, so the dry run
    // tells the agent before the write that kb_check will flag it.
    const coverageWarnings = context.prolog
      ? await symbolCoverageWarnings(
          context.prolog,
          relationships,
          input.type,
          input.id,
        )
      : [];
    const payload: ValidateUpsertPayload = {
      valid: true,
      errors: [],
      warnings: [
        ...semantic.warnings,
        ...coverageWarnings,
        ...idStyleWarnings,
        ...entityContextWarnings(input, entity, context.workspaceRoot, {
          targetPath: await previewDocumentPath(input, entity, context),
        }),
      ],
      semanticAdvisor: semantic.receipt,
      normalizedPreview: entity,
      ...(stagedFacts !== undefined ? { stagedFacts } : {}),
      ...(whatIf !== undefined ? { whatIf } : {}),
    };
    const stagedNote =
      stagedFacts === undefined
        ? ""
        : ` ${stagedFacts.length} planned fact(s) were staged ahead of it (${stagedFacts.join(", ")}); the batch introduces ${whatIf?.introduced.length ?? 0} witness(es).`;
    return {
      content: [
        {
          type: "text",
          text: `kb_validate_upsert: payload is valid for kb_upsert preflight checks. No mutation was performed.${stagedNote}`,
        },
      ],
      structuredContent: payload,
    };
  } catch (error) {
    // A module that fails to load is a broken installation, not a property of
    // the payload: report it as a tool failure instead of an invalid payload.
    if (isModuleLoadFailure(error)) throw error;
    const message = error instanceof Error ? error.message : String(error);
    const payload: ValidateUpsertPayload = {
      valid: false,
      errors: [message],
      warnings: [],
      semanticAdvisor: null,
      normalizedPreview: null,
    };
    return {
      content: [
        {
          type: "text",
          text: `kb_validate_upsert: payload is invalid. ${message}`,
        },
      ],
      structuredContent: payload,
    };
  }
}

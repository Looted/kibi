import { KbRejection } from "../../cli-errors.js";
import { escapeAtom } from "../../prolog/codec.js";
import type { PrologErrorRecord } from "../../prolog/error-terms.js";
import {
  formatInvalidRelationshipError,
  formatInvalidRelationshipTuple,
} from "./relationships.js";
import {
  buildPropertyList,
  buildRelationshipMetadata,
} from "./serialization.js";
import type { RelationshipInput } from "./types.js";

type TransactionInput = {
  readonly entity: Readonly<Record<string, unknown>>;
  readonly relationships: readonly RelationshipInput[];
  readonly skipContradictionCheck: boolean;
};

export function buildUpsertCommitGoal(input: TransactionInput): string {
  const type = String(input.entity.type);
  const relationships = input.relationships.map(
    (relationship) =>
      `rel(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
  );
  return `kb_commit_upsert(${type}, ${buildPropertyList(input.entity)}, [${relationships.join(", ")}], ${input.skipContradictionCheck ? "true" : "false"}, ChangeKind)`;
}

/**
 * Goal that stages the same entity and relationships the commit goal would,
 * inside a transaction that is always rolled back
 * (kb_preview_upsert_contradiction/4), and runs the commit's own refusal
 * rules: missing relationship endpoints, invalid directions, mixed symbol
 * roles and, unless skipped, the requirement contradiction check. It
 * succeeds when the commit would accept the write and fails with the
 * commit's error when it would not; it never writes.
 */
export function buildUpsertContradictionPreviewGoal(
  input: TransactionInput,
): string {
  const type = String(input.entity.type);
  const relationships = input.relationships.map(
    (relationship) =>
      `rel(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
  );
  return `kb_preview_upsert_contradiction(${type}, ${buildPropertyList(input.entity)}, [${relationships.join(", ")}], ${input.skipContradictionCheck ? "true" : "false"})`;
}

function upsertBatchEntry(input: TransactionInput): string {
  const type = String(input.entity.type);
  const relationships = input.relationships.map(
    (relationship) =>
      `rel(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
  );
  return `upsert(${type}, ${buildPropertyList(input.entity)}, [${relationships.join(", ")}], ${input.skipContradictionCheck ? "true" : "false"})`;
}

// Engines that only loaded kb.pl (one-shot processes, embedders) have not
// loaded checks.pl yet; load it from kb.pl's directory on first use. The
// call/1 defers resolving the checks procedure until after the load.
const ENSURE_CHECKS_LOADED =
  "(current_predicate(checks:what_if_analysis_json/2) -> true ; module_property(kb, file(KbFile)), file_directory_name(KbFile, KbDir), directory_file_path(KbDir, 'checks.pl', ChecksFile), use_module(ChecksFile))";

type WhatIfInput = TransactionInput & { readonly relationshipsOnly?: boolean };

function whatIfEntries(inputs: readonly WhatIfInput[]): string {
  const entries = inputs.map((input) => {
    const relationships = input.relationships.map(
      (relationship) =>
        `rel(${String(relationship.type)}, '${escapeAtom(String(relationship.from))}', '${escapeAtom(String(relationship.to))}', ${buildRelationshipMetadata(relationship)})`,
    );
    if (input.relationshipsOnly === true)
      return `relate([${relationships.join(", ")}])`;
    return `upsert(${String(input.entity.type)}, ${buildPropertyList(input.entity)}, [${relationships.join(", ")}])`;
  });
  return `[${entries.join(", ")}]`;
}

/**
 * Goal that stages inputs in a rolled-back transaction and returns the
 * contradiction witnesses the KB would then contain, as JSON in JsonString.
 * Inputs without entity properties stage only their relationships, so a
 * relationship-only step never erases an existing entity's properties.
 */
export function buildWhatIfContradictionGoal(
  inputs: readonly WhatIfInput[],
): string {
  return `(${ENSURE_CHECKS_LOADED}, call(checks:what_if_contradiction_witnesses_json(${whatIfEntries(inputs)}, JsonString)))`;
}

/**
 * Goal for checks:what_if_analysis_json/2: the current and staged
 * contradiction and scenario-infeasibility witnesses, with the
 * introduced/removed/unchanged split, as JSON in JsonString.
 */
export function buildWhatIfAnalysisGoal(
  inputs: readonly WhatIfInput[],
): string {
  return `(${ENSURE_CHECKS_LOADED}, call(checks:what_if_analysis_json(${whatIfEntries(inputs)}, JsonString)))`;
}

/** One transaction and one journal flush for a receipt campaign. */
export function buildUpsertBatchCommitGoal(
  inputs: readonly TransactionInput[],
): string {
  const first = inputs[0];
  if (!first) throw new Error("Upsert batch requires at least one entity");
  if (inputs.length === 1) return buildUpsertCommitGoal(first);
  return `kb_commit_upsert_batch([${inputs.map(upsertBatchEntry).join(", ")}], ChangeKinds)`;
}

export function parseUpsertChangeKinds(
  bindings: Readonly<Record<string, string>>,
  count: number,
): Array<"created" | "updated"> {
  const listed = bindings.ChangeKinds;
  if (typeof listed === "string") {
    const kinds = [...listed.matchAll(/\b(created|updated)\b/g)].map(
      (match) => match[1] as "created" | "updated",
    );
    if (kinds.length === count) return kinds;
  }
  const one = bindings.ChangeKind;
  if ((one === "created" || one === "updated") && count >= 1) {
    return Array.from({ length: count }, () => one);
  }
  throw new Error(
    `Upsert batch completed without ${count} created/updated result(s)`,
  );
}

/**
 * The error a failed store write throws: the formatted message, coded as a
 * rejection when the store refused the entity (a contradiction, an invalid
 * relationship, a relationship endpoint that does not exist) rather than
 * failing itself.
 */
export function upsertFailure(
  entityId: string,
  raw?: string,
  record?: PrologErrorRecord,
): Error {
  const message = formatUpsertError(entityId, raw, record);
  if (message.startsWith("Contradiction detected for ")) {
    return new KbRejection("SEMANTIC_CONTRADICTION", message);
  }
  if (record?.code === "entity_not_found" && record.role !== undefined) {
    return new KbRejection("RELATIONSHIP_ENDPOINT_MISSING", message);
  }
  const invalidRelationship = record
    ? record.code === "invalid_relationship"
    : raw !== undefined && formatInvalidRelationshipError(raw) !== null;
  return invalidRelationship
    ? new KbRejection("INVALID_RELATIONSHIP", message)
    : new Error(message);
}

export function formatUpsertError(
  entityId: string,
  raw?: string,
  record?: PrologErrorRecord,
): string {
  const stage = raw?.match(/\(stage=([^)]+)\)/)?.[1];
  const stageSuffix = stage === undefined ? "" : ` (stage=${stage})`;
  if (record) {
    return formatStructuredUpsertError(entityId, record, stageSuffix);
  }
  return formatTextUpsertError(entityId, raw, stageSuffix);
}

function formatStructuredUpsertError(
  entityId: string,
  record: PrologErrorRecord,
  stageSuffix: string,
): string {
  if (
    record.code === "contradiction" &&
    record.conflicts?.some((conflict) => conflict.requirementId !== undefined)
  ) {
    return formatFactContradiction(
      entityId,
      (record.conflicts ?? []).map(
        (conflict) =>
          `  - ${conflict.requirementId ?? entityId} conflicts with ${conflict.otherId}: ${conflict.reason}`,
      ),
      stageSuffix,
    );
  }
  if (record.code === "contradiction") {
    const conflicts = [
      ...new Set(
        (record.conflicts ?? []).map(
          (conflict) =>
            `  - Conflicts with ${conflict.otherId}: ${conflict.reason}`,
        ),
      ),
    ];
    if (conflicts.length > 0) {
      return `Contradiction detected for requirement ${entityId}:\n${conflicts.join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.${stageSuffix}`;
    }
    return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.${stageSuffix}`;
  }
  if (
    record.code === "entity_not_found" &&
    record.role !== undefined &&
    record.entityId !== undefined
  ) {
    return `Failed to upsert entity ${entityId}: ${record.message}. Create ${record.entityId} first, or write both entities in the same kb_apply_plan, then retry${stageSuffix}`;
  }
  if (record.code === "invalid_relationship" && record.relationship) {
    return `Failed to upsert entity ${entityId}: ${formatInvalidRelationshipTuple(record.relationship)}${stageSuffix}`;
  }
  return `Failed to upsert entity ${entityId}: ${record.message}${stageSuffix}`;
}

const FACT_CONTRADICTION_REMEDY =
  "To resolve:\n  1. Change the conflicting requirement in the same kb_apply_plan as this fact, OR\n  2. Supersede one requirement, or scope the two so they no longer constrain one quantity.";

/**
 * A fact write refused because it makes two current requirements grounded
 * on the fact contradict: each pair, and how to send the change instead.
 */
function formatFactContradiction(
  factId: string,
  lines: readonly string[],
  stageSuffix: string,
): string {
  return `Contradiction detected for fact ${factId}: the write makes current requirements conflict:\n${[...new Set(lines)].join("\n")}\n\n${FACT_CONTRADICTION_REMEDY}${stageSuffix}`;
}

function formatTextUpsertError(
  entityId: string,
  raw: string | undefined,
  stageSuffix: string,
): string {
  if (!raw) return `Failed to upsert entity ${entityId}: Unknown error`;
  const diagnosticFree = raw.replace(
    /^__KIBI_(?:STAGE|RUNTIME|ERROR)__:[^\r\n]*\r?\n?/gm,
    "",
  );
  if (diagnosticFree.includes("stale_snapshot")) {
    return `Failed to upsert entity ${entityId}: KB snapshot is stale; reattach or refresh the runtime before retrying (stale_snapshot)${stageSuffix}`;
  }
  if (
    diagnosticFree.includes("Audit journal is locked") ||
    diagnosticFree.includes("audit_log") ||
    diagnosticFree.includes("audit.log") ||
    diagnosticFree.includes("Resource temporarily unavailable")
  ) {
    return `Failed to upsert entity ${entityId}: Audit journal is locked by another Kibi runtime; restart the stale MCP/CLI session before retrying${stageSuffix}`;
  }
  const invalidRelationship = formatInvalidRelationshipError(diagnosticFree);
  if (invalidRelationship !== null) {
    return `Failed to upsert entity ${entityId}: ${invalidRelationship}${stageSuffix}`;
  }
  const factContradiction = diagnosticFree.match(
    /Contradiction detected for fact [^:\n]+: the write makes current requirements conflict:((?:\n {2}- [^\n]+)+)/,
  );
  if (factContradiction) {
    // The group is required by the pattern.
    const lines = (factContradiction[1] as string).split("\n").slice(1);
    return formatFactContradiction(entityId, lines, stageSuffix);
  }
  const contradiction = diagnosticFree.match(
    /kb_contradiction\(\s*\[([^\]]+)\]\s*\)/,
  );
  if (contradiction) {
    // The group is required by the pattern.
    const details = contradiction[1] as string;
    const conflicts = [
      ...details.matchAll(
        /(?:'([^']+)'|"([^"\\]*(?:\\.[^"\\]*)*)")-'([^']+)'/g,
      ),
    ].map(
      (match) =>
        `  - Conflicts with ${String(match[3])}: ${String(match[1] ?? match[2])}`,
    );
    if (conflicts.length > 0) {
      return `Contradiction detected for requirement ${entityId}:\n${[...new Set(conflicts)].join("\n")}\n\nTo resolve:\n  1. Add a supersedes relationship from the new requirement to the conflicting one, OR\n  2. Deprecate the conflicting requirement before creating the new one.${stageSuffix}`;
    }
    return `Contradiction detected for entity ${entityId}: This requirement conflicts with existing requirements. Add a supersedes relationship to the conflicting requirement, or deprecate the old requirement before creating the new one.${stageSuffix}`;
  }
  if (diagnosticFree.includes("rdf_transaction")) {
    return `Failed to upsert entity ${entityId}: Transaction failed${stageSuffix}`;
  }
  return `Failed to upsert entity ${entityId}: ${diagnosticFree || raw}`;
}

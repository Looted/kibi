/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Type-only import: migration-plan.ts imports this module at runtime.
import type { MigrationAction } from "./migration-plan.js";

/**
 * Review actions for the check findings the schema 6 migration asks a human
 * to resolve. Each one has a stable id (not a diagnostic index), so the same
 * item planned from authored sources and from a later check merges into one
 * action, and findings that share a fix collapse into one action.
 */

// implements REQ-cli-schema-migration, REQ-kibi-schema6-migration
export type MigrationActionInput = Partial<MigrationAction> &
  Pick<MigrationAction, "id" | "code">;

/** Review: an exception that exempts nothing until a human approves it. */
// implements REQ-kibi-entity-origin, REQ-kibi-schema6-migration
export const EXCEPTION_UNAPPROVED_REVIEW_CODE = "review_exception_unapproved";
/** Review: an agent-recorded exception approval nobody corroborated. */
// implements REQ-kibi-entity-origin, REQ-kibi-schema6-migration
export const EXCEPTION_SELF_ATTESTED_REVIEW_CODE =
  "review_exception_approval_self_attested";
/** Review: a predicate whose missing key_arguments leave rule pairs open. */
// implements REQ-kibi-schema6-migration
export const PREDICATE_KEY_ARGUMENTS_REVIEW_CODE =
  "review_predicate_key_arguments";
/** Review: a success scenario whose feasibility cannot be decided. */
// implements REQ-kibi-schema6-migration
export const SCENARIO_FEASIBILITY_REVIEW_CODE =
  "review_scenario_feasibility_unknown";
/** Review: agent-authored requirements no human has approved (one action). */
// implements REQ-kibi-entity-origin, REQ-kibi-schema6-migration
export const AGENT_REQUIREMENTS_REVIEW_CODE =
  "review_agent_requirements_unapproved";
// implements REQ-kibi-entity-origin, REQ-kibi-schema6-migration
export const AGENT_REQUIREMENTS_REVIEW_ACTION_ID =
  "review-agent-requirements-unapproved";

/** Automatic: close superseded requirements that are not closed. */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const CLOSE_SUPERSEDED_REQUIREMENTS_CODE =
  "close_superseded_requirements";
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID =
  "close-superseded-requirements";
/** Review: requirements that supersede each other (no automatic fix). */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const SUPERSESSION_CYCLE_REVIEW_CODE = "review_supersession_cycle";
/**
 * Automatic: repair redundant or dead authored `source` values. A moved
 * knowledge file is rewritten to its `.kb/` path; a value naming the
 * entity's own file or nothing Kibi can map is removed.
 */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const SOURCE_PATH_REWRITE_CODE = "source_path_rewrite";
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const SOURCE_PATH_REWRITE_ACTION_ID = "source-path-rewrite";
/** Review: a source value Kibi cannot edit safely (the automatic fix's fallback). */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const SOURCE_PATH_REVIEW_CODE = "review_source_path_dangling";
/** Review: symbols whose every owning requirement is retired (one queue). */
// implements REQ-kibi-schema6-migration
export const SYMBOL_OWNER_REVIEW_CODE = "review_symbol_owner_superseded";
// implements REQ-kibi-schema6-migration
export const SYMBOL_OWNER_REVIEW_ACTION_ID = "review-symbol-owner-superseded";
/** Review: an accepted ADR nothing links to. */
// implements REQ-kibi-schema6-migration
export const ADR_UNLINKED_REVIEW_CODE = "review_adr_unlinked";
/** Review: an ADR still proposed. */
// implements REQ-kibi-schema6-migration
export const ADR_PROPOSED_REVIEW_CODE = "review_adr_proposed";
/** Review: human- or agent-authored requirements with no rationale (one queue). */
// implements REQ-kibi-schema6-migration
export const RATIONALE_REVIEW_CODE = "review_requirement_rationale_missing";
// implements REQ-kibi-schema6-migration
export const RATIONALE_REVIEW_ACTION_ID =
  "review-requirement-rationale-missing";
/** Automatic: recompile sources rewritten by earlier migration actions. */
// implements REQ-cli-schema-migration, REQ-kibi-schema6-migration
export const MIGRATION_SYNC_CODE = "migration_sync";
// implements REQ-cli-schema-migration, REQ-kibi-schema6-migration
export const MIGRATION_SYNC_ACTION_ID = "migration-sync";

const MIGRATE_YES = {
  kind: "cli",
  command_argv: ["kibi", "migrate", "--yes"],
} as const;

// implements REQ-kibi-entity-origin, REQ-kibi-schema6-migration
export function exceptionUnapprovedActionId(exceptionId: string): string {
  return `review-exception-unapproved-${exceptionId}`;
}

function stableIdPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "-");
}

/** The sync that recompiles sources rewritten by earlier actions. */
// implements REQ-cli-schema-migration, REQ-kibi-schema6-migration
export function migrationSyncActionInput(
  dependsOn: readonly string[],
): MigrationActionInput {
  return {
    id: MIGRATION_SYNC_ACTION_ID,
    code: MIGRATION_SYNC_CODE,
    category: "freshness",
    safety: "automatic",
    autoApplicable: true,
    invocation: { kind: "cli", command_argv: ["kibi", "sync"] },
    dependsOn,
    affectedFiles: [".kb/branches"],
    postconditions: [{ syncState: "fresh" }],
    evidence: {
      reason:
        "Earlier migration actions rewrite authored sources; recompile them so status, check and coverage read the migrated KB.",
    },
  };
}

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SupersededClosureInput = Readonly<{
  id: string;
  path?: string;
  status: string;
  supersededBy: readonly string[];
}>;

/** One automatic action that closes every listed superseded requirement. */
// implements REQ-cli-schema-migration, REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function closeSupersededRequirementsActionInput(
  closures: readonly SupersededClosureInput[],
): MigrationActionInput {
  const sorted = [...closures].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  return {
    id: CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID,
    code: CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
    category: "quality",
    safety: "automatic",
    autoApplicable: true,
    invocation: MIGRATE_YES,
    affectedEntityIds: sorted.map((closure) => closure.id),
    affectedFiles: sorted.flatMap((closure) =>
      closure.path !== undefined ? [closure.path] : [],
    ),
    postconditions: [{ rule: "superseded-requirement-open", violations: 0 }],
    evidence: {
      reason:
        "A requirement another requirement supersedes is retired and must be closed (superseded-requirement-open). Each listed requirement gets status: closed; the rest of its file is unchanged.",
      count: sorted.length,
      requirements: sorted.map((closure) => ({
        id: closure.id,
        status: closure.status,
        supersededBy: [...closure.supersededBy],
      })),
    },
  };
}

/** Review: requirements that supersede each other; a person picks the current one. */
// implements REQ-cli-schema-migration, REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function supersessionCycleReviewActionInput(cycle: {
  members: readonly string[];
  edges: readonly (readonly [string, string])[];
  files?: readonly string[];
}): MigrationActionInput {
  const members = [...cycle.members].sort();
  const edges = cycle.edges.map(([from, to]) => `${from} supersedes ${to}`);
  return {
    id: `review-supersession-cycle-${members.map(stableIdPart).join("-")}`,
    code: SUPERSESSION_CYCLE_REVIEW_CODE,
    category: "quality",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `Supersession cycle between ${members.join(" and ")} (${edges.join("; ")}): none of them is current, so kibi migrate closes none of them. Decide which requirement states current intent, delete the supersedes link that points at it (kb_delete relationships [{type: supersedes, from: <other>, to: <current>}]), then set status: closed on the requirements it replaces.`,
    },
    affectedEntityIds: members,
    affectedFiles: [...(cycle.files ?? [])],
    dispositionRequired: true,
    allowedDispositions: ["fixed", "deferred"],
    evidence: {
      cycle: members,
      edges: cycle.edges.map(([from, to]) => [from, to]),
    },
  };
}

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourcePathRewriteInput = Readonly<{
  entityId: string;
  file: string;
  from: string;
  to: string;
}>;

// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export type SourcePathRemovalInput = Readonly<{
  entityId: string;
  file: string;
  from: string;
  /** `self`: the value names the entity's own file; `dangling`: nothing Kibi can map. */
  reason: "self" | "dangling";
}>;

function byEntityThenFile(
  left: Readonly<{ entityId: string; file: string }>,
  right: Readonly<{ entityId: string; file: string }>,
): number {
  return (
    left.entityId.localeCompare(right.entityId) ||
    left.file.localeCompare(right.file)
  );
}

/**
 * One automatic action that rewrites every listed moved source and removes
 * every listed redundant or dead one.
 */
// implements REQ-kibi-schema6-migration, REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function sourcePathRewriteActionInput(
  input: Readonly<{
    rewrites: readonly SourcePathRewriteInput[];
    removals: readonly SourcePathRemovalInput[];
  }>,
): MigrationActionInput {
  const rewrites = [...input.rewrites].sort(byEntityThenFile);
  const removals = [...input.removals].sort(byEntityThenFile);
  const all = [...rewrites, ...removals].sort(byEntityThenFile);
  return {
    id: SOURCE_PATH_REWRITE_ACTION_ID,
    code: SOURCE_PATH_REWRITE_CODE,
    category: "quality",
    safety: "automatic",
    autoApplicable: true,
    invocation: MIGRATE_YES,
    affectedEntityIds: [...new Set(all.map((item) => item.entityId))],
    affectedFiles: [...new Set(all.map((item) => item.file))],
    postconditions: [
      { rule: "source-path-dangling", violations: 0 },
      { selfReferencingSources: 0 },
    ],
    evidence: {
      reason:
        "The authored source field is dead data: the compiled source is always the entity's own file, and Kibi ignores the field when compiling and never writes it. Each rewrite points a knowledge file named by its pre-canonical path (under documentation/, or relative to the knowledge root) at the same file under .kb/. Each removal deletes a value that names the entity's own file (reason self) or nothing Kibi can map (reason dangling). Only the source line changes.",
      count: all.length,
      rewrites: rewrites.map((rewrite) => ({ ...rewrite })),
      removals: removals.map((removal) => ({ ...removal })),
    },
  };
}

/**
 * Review: a source value Kibi would rewrite or remove but cannot edit
 * safely (it spans several lines, or the edit would change other fields).
 */
// implements REQ-kibi-schema6-migration, REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function sourcePathReviewActionInput(source: {
  entityId: string;
  value: unknown;
  file?: string;
  reason?: string;
  rewrite?: string;
}): MigrationActionInput {
  const shown =
    typeof source.value === "string"
      ? source.value
      : JSON.stringify(source.value);
  const where = source.file !== undefined ? ` in ${source.file}` : "";
  const edit =
    source.rewrite !== undefined
      ? `replace the whole field with the single line 'source: ${source.rewrite}'`
      : "delete the whole field, every line of it";
  return {
    id: `review-source-path-dangling-${stableIdPart(source.entityId)}`,
    code: SOURCE_PATH_REVIEW_CODE,
    category: "quality",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `${source.entityId} has source '${shown}'${where}, which kibi migrate would repair automatically but cannot edit safely (${source.reason ?? "the edit would not read back as exactly that change"}). The compiled source is always the entity's own file; Kibi ignores the authored field when compiling and never writes it. A person edits the frontmatter by hand: ${edit}. Then rerun kibi migrate.`,
    },
    affectedEntityIds: [source.entityId],
    affectedFiles: source.file !== undefined ? [source.file] : [],
    dispositionRequired: true,
    evidence: {
      entityId: source.entityId,
      source: source.value,
      ...(source.reason !== undefined ? { refused: source.reason } : {}),
      ...(source.rewrite !== undefined ? { rewrite: source.rewrite } : {}),
    },
  };
}

type Violation = Readonly<Record<string, unknown>>;

/**
 * Map the blocking findings that schema 6 migrates mechanically to stable
 * actions with the same ids `kibi migrate` plans from authored sources:
 * superseded-requirement-open (one close action, one review per cycle) and
 * source-path-dangling (one automatic rewrite-or-remove action; a review
 * only for a value Kibi cannot edit safely), plus the sync that recompiles
 * what they rewrite.
 */
// implements REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration, REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export function lifecycleActionsFromViolations(
  violations: readonly Violation[],
): { actions: MigrationActionInput[]; consumed: ReadonlySet<number> } {
  const actions: MigrationActionInput[] = [];
  const consumed = new Set<number>();
  const closures: SupersededClosureInput[] = [];
  const rewrites: SourcePathRewriteInput[] = [];
  const removals: SourcePathRemovalInput[] = [];
  for (const [index, violation] of violations.entries()) {
    const entityId = text(violation.entityId);
    const evidence = isRecord(violation.evidence) ? violation.evidence : {};
    const source = text(violation.source);
    if (violation.rule === "superseded-requirement-open") {
      const cycle = stringList(evidence.cycle);
      if (cycle.length > 0) {
        const edges = Array.isArray(evidence.edges)
          ? evidence.edges.flatMap((edge) => {
              const pair = stringList(edge);
              return pair.length === 2
                ? [[pair[0], pair[1]] as [string, string]]
                : [];
            })
          : [];
        actions.push(
          supersessionCycleReviewActionInput({ members: cycle, edges }),
        );
      } else if (entityId !== "") {
        closures.push({
          id: entityId,
          ...(source !== "" ? { path: source } : {}),
          status: text(evidence.status),
          supersededBy: stringList(evidence.supersededBy),
        });
      } else {
        continue;
      }
      consumed.add(index);
    } else if (violation.rule === "source-path-dangling") {
      if (entityId === "") continue;
      const file = text(evidence.file) || source;
      const rewrite = text(evidence.rewrite);
      const refused = text(evidence.refused);
      const from =
        typeof evidence.value === "string"
          ? evidence.value
          : (JSON.stringify(evidence.value) ?? "");
      if (refused !== "" || file === "") {
        actions.push(
          sourcePathReviewActionInput({
            entityId,
            value: evidence.value,
            ...(file !== "" ? { file } : {}),
            ...(refused !== "" ? { reason: refused } : {}),
            ...(rewrite !== "" ? { rewrite } : {}),
          }),
        );
      } else if (rewrite !== "") {
        rewrites.push({ entityId, file, from, to: rewrite });
      } else {
        removals.push({
          entityId,
          file,
          from,
          reason: evidence.remove === "self" ? "self" : "dangling",
        });
      }
      consumed.add(index);
    }
  }
  const rewriteActionIds: string[] = [];
  if (closures.length > 0) {
    actions.push(closeSupersededRequirementsActionInput(closures));
    rewriteActionIds.push(CLOSE_SUPERSEDED_REQUIREMENTS_ACTION_ID);
  }
  if (rewrites.length > 0 || removals.length > 0) {
    actions.push(sourcePathRewriteActionInput({ rewrites, removals }));
    rewriteActionIds.push(SOURCE_PATH_REWRITE_ACTION_ID);
  }
  if (rewriteActionIds.length > 0) {
    actions.push(migrationSyncActionInput(rewriteActionIds));
  }
  return { actions, consumed };
}

/** Action codes `kibi migrate` plans itself from authored sources. */
// implements REQ-kibi-schema6-migration, REQ-kibi-kb-lifecycle-integrity
export const SOURCE_PLANNED_LIFECYCLE_CODES: ReadonlySet<string> = new Set([
  CLOSE_SUPERSEDED_REQUIREMENTS_CODE,
  SUPERSESSION_CYCLE_REVIEW_CODE,
  SOURCE_PATH_REWRITE_CODE,
  SOURCE_PATH_REVIEW_CODE,
  MIGRATION_SYNC_CODE,
]);

/** Exception review shared by the source scan and the exception-unapproved rule. */
// implements REQ-kibi-schema6-migration, REQ-cli-schema-migration
export function exceptionUnapprovedActionInput(input: {
  exceptionId: string;
  exempts: readonly string[];
  source?: string;
}): MigrationActionInput {
  const bases = input.exempts.join(", ");
  return {
    id: exceptionUnapprovedActionId(input.exceptionId),
    code: EXCEPTION_UNAPPROVED_REVIEW_CODE,
    category: "quality",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `${input.exceptionId} exempts ${bases} but has no approved_by, so it exempts nothing: success scenarios it specifies are checked against ${bases} and fail scenario-feasibility if they assume a forbidden value. If a human approved the exception, kb_upsert ${input.exceptionId} with approved_by set to that person and approval_ref to the decision record. If not, remove the exempts link (kb_delete relationships [{type: exempts, from: ${input.exceptionId}, to: <base>}]) and set expects: rejection on the scenario, or correct its assumes facts.`,
    },
    affectedEntityIds: [input.exceptionId, ...input.exempts],
    affectedFiles: input.source !== undefined ? [input.source] : [],
    dispositionRequired: true,
    evidence: { exceptionId: input.exceptionId, exempts: [...input.exempts] },
  };
}

type Diagnostic = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

type ReviewQueue = {
  ids: string[];
  files: string[];
  evidence: Array<{ entityId: string; evidence: Record<string, unknown> }>;
  total: number;
};

function reviewQueue(): ReviewQueue {
  return { ids: [], files: [], evidence: [], total: 0 };
}

const PREDICATE_SIGNATURE =
  /predicate (\S+):(\S+)\/(\d+) declares no key_arguments/;

/**
 * Map the schema 6 review findings of one check to stable review actions.
 * Returns the actions and the indexes of the diagnostics they replace.
 */
// implements REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration, REQ-kibi-schema6-migration
export function schema6ReviewActionsFromCheck(
  diagnostics: readonly Diagnostic[],
): { actions: MigrationActionInput[]; consumed: ReadonlySet<number> } {
  const actions: MigrationActionInput[] = [];
  const consumed = new Set<number>();
  const agentRequirements: string[] = [];
  let agentRequirementsTotal = 0;
  const agentRequirementFiles: string[] = [];
  const symbolOwners = reviewQueue();
  const rationaleQueue = reviewQueue();
  const predicates = new Map<
    string,
    {
      signature: string;
      pairs: string[];
      messages: string[];
      suggestion: string;
    }
  >();
  for (const [index, diagnostic] of diagnostics.entries()) {
    const entityId = text(diagnostic.entityId);
    const evidence = isRecord(diagnostic.evidence) ? diagnostic.evidence : {};
    const source = text(diagnostic.source);
    switch (diagnostic.id) {
      case "rule.exception-unapproved": {
        if (entityId === "") continue;
        actions.push(
          exceptionUnapprovedActionInput({
            exceptionId: entityId,
            exempts: stringList(evidence.exempts),
            ...(source !== "" ? { source } : {}),
          }),
        );
        consumed.add(index);
        break;
      }
      case "rule.exception-approval-self-attested": {
        if (entityId === "") continue;
        actions.push({
          id: `review-exception-approval-self-attested-${entityId}`,
          code: EXCEPTION_SELF_ATTESTED_REVIEW_CODE,
          category: "quality",
          safety: "review",
          invocation: {
            kind: "review",
            instruction:
              text(diagnostic.suggestion) || text(diagnostic.message),
          },
          affectedEntityIds: [entityId, ...stringList(evidence.exempts)],
          affectedFiles: source !== "" ? [source] : [],
          dispositionRequired: true,
          evidence: { diagnostic },
        });
        consumed.add(index);
        break;
      }
      case "rule.scenario-feasibility-unknown": {
        if (entityId === "") continue;
        actions.push({
          id: `review-scenario-feasibility-unknown-${entityId}`,
          code: SCENARIO_FEASIBILITY_REVIEW_CODE,
          category: "semantic",
          safety: "review",
          invocation: {
            kind: "review",
            instruction: `${text(diagnostic.message)}. ${text(diagnostic.suggestion)}`,
          },
          affectedEntityIds: [entityId],
          affectedFiles: source !== "" ? [source] : [],
          dispositionRequired: true,
          evidence: { diagnostic },
        });
        consumed.add(index);
        break;
      }
      case "rule.agent-requirement-unapproved": {
        // The rule lists a bounded page plus one workspace summary; the
        // review is one decision queue, not one action per requirement.
        if (entityId !== "" && entityId !== "workspace") {
          agentRequirements.push(entityId);
          if (source !== "") agentRequirementFiles.push(source);
        }
        if (typeof evidence.total === "number") {
          agentRequirementsTotal = evidence.total;
        }
        consumed.add(index);
        break;
      }
      case "rule.symbol-owner-superseded":
      case "rule.requirement-rationale-missing": {
        // Bounded page plus one summary finding: one review queue each.
        const queue =
          diagnostic.id === "rule.symbol-owner-superseded"
            ? symbolOwners
            : rationaleQueue;
        if (entityId !== "" && entityId !== "workspace") {
          queue.ids.push(entityId);
          if (source !== "") queue.files.push(source);
          queue.evidence.push({ entityId, evidence });
        }
        if (typeof evidence.total === "number") queue.total = evidence.total;
        consumed.add(index);
        break;
      }
      case "rule.adr-unlinked":
      case "rule.adr-proposed": {
        if (entityId === "") continue;
        const unlinked = diagnostic.id === "rule.adr-unlinked";
        actions.push({
          id: `${unlinked ? "review-adr-unlinked" : "review-adr-proposed"}-${entityId}`,
          code: unlinked ? ADR_UNLINKED_REVIEW_CODE : ADR_PROPOSED_REVIEW_CODE,
          category: "quality",
          safety: "review",
          invocation: {
            kind: "review",
            instruction: `${text(diagnostic.message)}. ${text(diagnostic.suggestion)}`,
          },
          affectedEntityIds: [entityId],
          affectedFiles: source !== "" ? [source] : [],
          dispositionRequired: true,
          evidence: { diagnostic },
        });
        consumed.add(index);
        break;
      }
      case "rule.rule-key-arguments-missing": {
        const match = PREDICATE_SIGNATURE.exec(text(diagnostic.message));
        if (match === null) continue;
        const signature = `${match[1]}:${match[2]}/${match[3]}`;
        const group = predicates.get(signature) ?? {
          signature,
          pairs: [],
          messages: [],
          suggestion: text(diagnostic.suggestion),
        };
        if (entityId !== "") group.pairs.push(entityId);
        group.messages.push(text(diagnostic.message));
        predicates.set(signature, group);
        consumed.add(index);
        break;
      }
      default:
        break;
    }
  }
  for (const group of [...predicates.values()].sort((left, right) =>
    left.signature.localeCompare(right.signature),
  )) {
    const pairs = [...new Set(group.pairs)].sort();
    actions.push({
      id: `review-predicate-key-arguments-${group.signature.replace(/[^A-Za-z0-9_-]+/g, "-")}`,
      code: PREDICATE_KEY_ARGUMENTS_REVIEW_CODE,
      category: "semantic",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: `Predicate ${group.signature} declares no key_arguments, which leaves ${pairs.length} opposing rule pair(s) unresolved (${pairs.join(", ")}). ${group.suggestion}`,
      },
      affectedEntityIds: [...new Set(pairs.flatMap((pair) => pair.split("/")))],
      dispositionRequired: true,
      evidence: {
        predicate: group.signature,
        rulePairs: pairs,
        findings: [...new Set(group.messages)].sort(),
      },
    });
  }
  if (symbolOwners.ids.length > 0) {
    const listed = [...new Set(symbolOwners.ids)].sort();
    const total = Math.max(symbolOwners.total, listed.length);
    actions.push({
      id: SYMBOL_OWNER_REVIEW_ACTION_ID,
      code: SYMBOL_OWNER_REVIEW_CODE,
      category: "symbol",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: `${total} symbol(s) implement only superseded or deprecated requirements${total > listed.length ? `; these ${listed.length} come first` : ""}: ${listed.join(", ")}. For each, kb_upsert the symbol with an implements link to the requirement that replaced its owner (evidence lists the replacements) when it still implements that behavior, or remove the symbol when the behavior is gone. Rerun kb_check for the next page.`,
      },
      affectedEntityIds: listed,
      affectedFiles: [...new Set(symbolOwners.files)].sort(),
      dispositionRequired: true,
      evidence: { symbols: symbolOwners.evidence, total },
    });
  }
  if (rationaleQueue.ids.length > 0) {
    const listed = [...new Set(rationaleQueue.ids)].sort();
    const total = Math.max(rationaleQueue.total, listed.length);
    actions.push({
      id: RATIONALE_REVIEW_ACTION_ID,
      code: RATIONALE_REVIEW_CODE,
      category: "quality",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: `${total} human- or agent-authored requirement(s) state no rationale${total > listed.length ? `; these ${listed.length} come first` : ""}: ${listed.join(", ")}. Ask the person who stated the intent why it matters, then kb_upsert the requirement with rationale set to that answer (or link the ADR that records the decision). Rerun kb_check for the next page.`,
      },
      affectedEntityIds: listed,
      affectedFiles: [...new Set(rationaleQueue.files)].sort(),
      dispositionRequired: true,
      evidence: { requirements: listed, total },
    });
  }
  if (agentRequirements.length > 0) {
    const listed = [...new Set(agentRequirements)].sort();
    const total = Math.max(agentRequirementsTotal, listed.length);
    actions.push({
      id: AGENT_REQUIREMENTS_REVIEW_ACTION_ID,
      code: AGENT_REQUIREMENTS_REVIEW_CODE,
      category: "quality",
      safety: "review",
      invocation: {
        kind: "review",
        instruction: `${total} agent-authored requirement(s) have no human approval${total > listed.length ? `; these ${listed.length} come first` : ""}: ${listed.join(", ")}. Have a person read each one; when it states the intended behavior, kb_upsert it with origin.approved_by set to the reviewer (keep kind: agent and the rest of origin). Rerun kb_check for the next page.`,
      },
      affectedEntityIds: listed,
      affectedFiles: [...new Set(agentRequirementFiles)].sort(),
      dispositionRequired: true,
      evidence: { requirements: listed, total },
    });
  }
  return { actions, consumed };
}

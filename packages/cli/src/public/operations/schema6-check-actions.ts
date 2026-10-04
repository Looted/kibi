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

export type MigrationActionInput = Partial<MigrationAction> &
  Pick<MigrationAction, "id" | "code">;

/** Review: an exception that exempts nothing until a human approves it. */
export const EXCEPTION_UNAPPROVED_REVIEW_CODE = "review_exception_unapproved";
/** Review: an agent-recorded exception approval nobody corroborated. */
export const EXCEPTION_SELF_ATTESTED_REVIEW_CODE =
  "review_exception_approval_self_attested";
/** Review: a predicate whose missing key_arguments leave rule pairs open. */
export const PREDICATE_KEY_ARGUMENTS_REVIEW_CODE =
  "review_predicate_key_arguments";
/** Review: a success scenario whose feasibility cannot be decided. */
export const SCENARIO_FEASIBILITY_REVIEW_CODE =
  "review_scenario_feasibility_unknown";
/** Review: agent-authored requirements no human has approved (one action). */
export const AGENT_REQUIREMENTS_REVIEW_CODE =
  "review_agent_requirements_unapproved";
export const AGENT_REQUIREMENTS_REVIEW_ACTION_ID =
  "review-agent-requirements-unapproved";

export function exceptionUnapprovedActionId(exceptionId: string): string {
  return `review-exception-unapproved-${exceptionId}`;
}

/** Exception review shared by the source scan and the exception-unapproved rule. */
// implements REQ-kibi-scenario-feasibility, REQ-cli-schema-migration
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

const PREDICATE_SIGNATURE =
  /predicate (\S+):(\S+)\/(\d+) declares no key_arguments/;

/**
 * Map the schema 6 review findings of one check to stable review actions.
 * Returns the actions and the indexes of the diagnostics they replace.
 */
// implements REQ-cli-schema-migration, REQ-agent-guided-migration-orchestration, REQ-kibi-scenario-feasibility
export function schema6ReviewActionsFromCheck(
  diagnostics: readonly Diagnostic[],
): { actions: MigrationActionInput[]; consumed: ReadonlySet<number> } {
  const actions: MigrationActionInput[] = [];
  const consumed = new Set<number>();
  const agentRequirements: string[] = [];
  let agentRequirementsTotal = 0;
  const agentRequirementFiles: string[] = [];
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

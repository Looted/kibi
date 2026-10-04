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

import { parseListOfLists, parsePrologValue } from "../../prolog/codec.js";
import type { Violation } from "../../utils/rule-registry.js";
import { readEntityOrigin } from "../entity-origin.js";
import { loadEntitiesPaged } from "./discovery-entities.js";
import type { PrologPort } from "./runtime-types.js";

/**
 * Advisory review of who approved what. Kibi cannot verify that a person
 * approved anything; these rules make agent-recorded approvals and
 * agent-authored requirements visible so a human can confirm them.
 */

/** An exception without approved_by exempts nothing. */
export const EXCEPTION_UNAPPROVED_RULE = "exception-unapproved";
/** An agent recorded an exception approval without human corroboration. */
export const EXCEPTION_APPROVAL_SELF_ATTESTED_RULE =
  "exception-approval-self-attested";
/** Agent-authored requirements no human has approved yet. */
export const AGENT_REQUIREMENT_UNAPPROVED_RULE = "agent-requirement-unapproved";

export const ORIGIN_REVIEW_RULES = [
  EXCEPTION_UNAPPROVED_RULE,
  EXCEPTION_APPROVAL_SELF_ATTESTED_RULE,
  AGENT_REQUIREMENT_UNAPPROVED_RULE,
] as const;

/**
 * agent-requirement-unapproved lists at most this many requirements (sorted
 * by id) and then one summary finding, so a large agent-authored KB yields a
 * bounded review queue instead of one warning per requirement.
 */
export const AGENT_REQUIREMENT_REVIEW_LIMIT = 25;

const CURRENT_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

type Entity = Readonly<Record<string, unknown>>;

export type OriginReviewInput = Readonly<{
  requirements: readonly Entity[];
  /** `[exception, base]` pairs of `exempts` relationships. */
  exempts: readonly (readonly [string, string])[];
  /** Requirements some other requirement supersedes. */
  superseded: ReadonlySet<string>;
}>;

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function sourceField(entity: Entity): { source?: string } {
  const source = text(entity.source);
  return source !== undefined ? { source } : {};
}

function isCurrent(entity: Entity, superseded: ReadonlySet<string>): boolean {
  const status = text(entity.status);
  return (
    status !== undefined &&
    CURRENT_REQUIREMENT_STATUSES.has(status) &&
    !superseded.has(String(entity.id))
  );
}

/** Evaluate the origin review rules over loaded requirements. */
// implements REQ-kibi-scenario-feasibility, REQ-004
export function evaluateOriginReview(
  input: OriginReviewInput,
  rules: ReadonlySet<string> = new Set(ORIGIN_REVIEW_RULES),
): Violation[] {
  const byId = new Map(
    input.requirements.map((entity) => [String(entity.id), entity]),
  );
  const current = [...byId.values()]
    .filter((entity) => isCurrent(entity, input.superseded))
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
  const exempted = new Map<string, string[]>();
  for (const [exception, base] of input.exempts) {
    exempted.set(exception, [...(exempted.get(exception) ?? []), base]);
  }
  const findings: Violation[] = [];

  for (const entity of current) {
    const id = String(entity.id);
    const bases = [...new Set(exempted.get(id) ?? [])].sort();
    if (bases.length === 0) continue;
    const approvedBy = text(entity.approved_by);
    const approvalRef = text(entity.approval_ref);
    const origin = readEntityOrigin(entity.origin);
    if (approvedBy === undefined) {
      if (!rules.has(EXCEPTION_UNAPPROVED_RULE)) continue;
      findings.push({
        rule: EXCEPTION_UNAPPROVED_RULE,
        entityId: id,
        description: `Exception ${id} exempts ${bases.join(", ")} but has no approved_by, so it exempts nothing: success scenarios it specifies are still checked against ${bases.join(", ")}`,
        suggestion: `Have a human decide: set approved_by (and approval_ref to the decision record) on ${id} if the exception is approved, or remove the exempts link and set expects: rejection on the scenario if it is not`,
        ...sourceField(entity),
        evidence: { exceptionId: id, exempts: bases },
      });
      continue;
    }
    if (
      !rules.has(EXCEPTION_APPROVAL_SELF_ATTESTED_RULE) ||
      origin?.kind !== "agent"
    ) {
      continue;
    }
    const missing = [
      ...(origin.approved_by === undefined ? ["origin.approved_by"] : []),
      ...(approvalRef === undefined ? ["approval_ref"] : []),
    ];
    if (missing.length === 0) continue;
    findings.push({
      rule: EXCEPTION_APPROVAL_SELF_ATTESTED_RULE,
      entityId: id,
      description: `Exception ${id} was recorded by an agent with approved_by '${approvedBy}', but nothing corroborates the approval (missing ${missing.join(" and ")})`,
      suggestion: `Have ${approvedBy} (or another human) confirm the exception: set origin.approved_by to the confirming person and approval_ref to the decision record (ticket, ADR or review link) on ${id}; if nobody approved it, remove approved_by so the exception stops exempting ${bases.join(", ")}`,
      ...sourceField(entity),
      evidence: {
        exceptionId: id,
        exempts: bases,
        approvedBy,
        origin,
        missing,
      },
    });
  }

  if (rules.has(AGENT_REQUIREMENT_UNAPPROVED_RULE)) {
    const unreviewed = current.filter((entity) => {
      const origin = readEntityOrigin(entity.origin);
      return origin?.kind === "agent" && origin.approved_by === undefined;
    });
    for (const entity of unreviewed.slice(0, AGENT_REQUIREMENT_REVIEW_LIMIT)) {
      const origin = readEntityOrigin(entity.origin);
      findings.push({
        rule: AGENT_REQUIREMENT_UNAPPROVED_RULE,
        entityId: String(entity.id),
        description: `Requirement ${String(entity.id)} was authored by an agent${origin?.ref !== undefined ? ` (${origin.ref})` : ""} and no human has approved it`,
        suggestion:
          "Review the requirement text; when it states the intended behavior, record the reviewer in origin.approved_by (keep kind: agent and the rest of origin)",
        ...sourceField(entity),
        evidence: { origin },
      });
    }
    const remaining = unreviewed.length - AGENT_REQUIREMENT_REVIEW_LIMIT;
    if (remaining > 0) {
      findings.push({
        rule: AGENT_REQUIREMENT_UNAPPROVED_RULE,
        entityId: "workspace",
        description: `${remaining} more agent-authored requirement(s) have no human approval; the list above stops at ${AGENT_REQUIREMENT_REVIEW_LIMIT}`,
        suggestion:
          "Approve the listed requirements first; the next kb_check lists the following ones",
        evidence: {
          total: unreviewed.length,
          listed: AGENT_REQUIREMENT_REVIEW_LIMIT,
          remainingIds: unreviewed
            .slice(AGENT_REQUIREMENT_REVIEW_LIMIT)
            .map((entity) => String(entity.id)),
        },
      });
    }
  }
  return findings;
}

/** `[type, from, to]` rows of the relationship types the review reads. */
async function reviewRelationships(
  prolog: Pick<PrologPort, "query">,
): Promise<Array<[string, string, string]>> {
  const result = await prolog.query(
    "findall([Type,From,To], (member(Type, [exempts, supersedes]), kb_relationship(Type, From, To)), Rows)",
  );
  if (!result.success) {
    throw new Error(
      `Unable to read exempts and supersedes relationships: ${result.error ?? "query failed"}`,
    );
  }
  return parseListOfLists(result.bindings.Rows ?? "[]").map(
    ([type, from, to]) =>
      [
        String(parsePrologValue(type ?? "")),
        String(parsePrologValue(from ?? "")),
        String(parsePrologValue(to ?? "")),
      ] as [string, string, string],
  );
}

/** Load requirements and relationships once and evaluate the selected rules. */
// implements REQ-kibi-scenario-feasibility, REQ-004
export async function collectOriginReviewViolations(
  prolog: Pick<PrologPort, "query">,
  rules: ReadonlySet<string>,
): Promise<Violation[]> {
  if (!ORIGIN_REVIEW_RULES.some((rule) => rules.has(rule))) return [];
  // One Prolog port serves queries in order; read sequentially.
  const requirements = await loadEntitiesPaged(prolog, "req");
  const relationships = await reviewRelationships(prolog);
  return evaluateOriginReview(
    {
      requirements,
      exempts: relationships
        .filter(([type]) => type === "exempts")
        .map(([, from, to]) => [from, to] as const),
      superseded: new Set(
        relationships
          .filter(([type]) => type === "supersedes")
          .map(([, , to]) => to),
      ),
    },
    rules,
  );
}

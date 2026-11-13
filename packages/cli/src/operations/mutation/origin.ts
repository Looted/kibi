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

import { KbRejection } from "../../cli-errors.js";
import { readEntityOrigin } from "../../public/entity-origin.js";
import { approvalDateProblem } from "../../public/operations/evidence-floor.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  type StoredEntityLookup,
  storedEntityLookup,
} from "./stored-entity.js";
import type { StagedUpsertState, UpsertInput } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function withOrigin(input: UpsertInput, origin: unknown): UpsertInput {
  return { ...input, properties: { ...input.properties, origin } };
}

/**
 * A requirement's `origin.recorded_at`, else its `created_at`, starts the
 * grace period agent-requirement-unapproved-implemented gives an agent's
 * requirement before a person must approve it. A requirement write that
 * states either must state a real past time: free text, a day that does not
 * exist or a time more than a day later than now is
 * refused, so an agent cannot keep its own requirement out of review with a
 * date. Only the values the payload states are judged; a stored origin the
 * write keeps is not.
 */
export function assertRequirementClockDates(
  input: UpsertInput,
  now: Date,
): void {
  if (input.type !== "req") return;
  const origin = input.properties.origin;
  const stated: Array<[string, unknown]> = [
    ["created_at", input.properties.created_at],
    ["origin.recorded_at", isRecord(origin) ? origin.recorded_at : undefined],
  ];
  for (const [field, value] of stated) {
    if (value === undefined) continue;
    const text = String(value);
    const problem = approvalDateProblem(text, now.toISOString());
    if (problem === undefined) continue;
    throw new KbRejection(
      "ENTITY_VALIDATION_FAILED",
      `Entity validation failed: ${field} ${JSON.stringify(text)} ${problem === "future" ? `is later than now (${now.toISOString()})` : "is not an ISO 8601 date or timestamp"}. It starts the review grace period of an agent-written requirement, so it must be the real time the requirement was written: leave it out and kb_upsert records the write time.`,
    );
  }
}

/**
 * Resolve the provenance an upsert writes. kb_upsert never overwrites who
 * authored an entity by omission:
 *
 * 1. A supplied `origin` is written as given (schema validation follows);
 *    when it omits `recorded_at`, the write time is recorded.
 * 2. Without one, an existing entity keeps its stored origin unchanged.
 * 3. Without one, a new entity is recorded as `{kind: agent, recorded_at}`:
 *    kb_upsert is the agent write path, and a human or import author says so
 *    explicitly.
 * 4. Without one, an existing entity that has no origin (authored before
 *    schema 6, or by hand) stays without one; editing it does not make the
 *    editor its author. `kibi migrate` backfills `kind: migration`.
 *
 * Without a Prolog runtime the existing entity cannot be read, so only rule 1
 * applies.
 */
export async function resolveUpsertOrigin(
  input: UpsertInput,
  prolog: Pick<PrologPort, "query"> | undefined,
  now: Date,
  staged?: StagedUpsertState,
  lookup?: StoredEntityLookup,
): Promise<UpsertInput> {
  assertRequirementClockDates(input, now);
  const supplied = input.properties.origin;
  if (supplied !== undefined) {
    return isRecord(supplied) && supplied.recorded_at === undefined
      ? withOrigin(input, { ...supplied, recorded_at: now.toISOString() })
      : input;
  }
  if (prolog === undefined) return input;
  // An earlier step of the same plan that writes this entity is its history.
  const planned = staged?.entities.get(input.id);
  if (planned !== undefined) {
    const stored = readEntityOrigin(planned.origin);
    return stored === null ? input : withOrigin(input, stored);
  }
  const existing = await (
    lookup ?? storedEntityLookup(prolog, input.id, input.type)
  ).entity();
  if (existing === undefined) {
    return withOrigin(input, { kind: "agent", recorded_at: now.toISOString() });
  }
  // Unreadable (null): leave origin out. The source-first write merges the
  // authored frontmatter, so a stored origin there survives either way.
  const stored = readEntityOrigin(existing?.origin);
  return stored === null ? input : withOrigin(input, stored);
}

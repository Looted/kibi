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

import { readEntityOrigin } from "../../public/entity-origin.js";
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
// implements REQ-kibi-entity-origin
export async function resolveUpsertOrigin(
  input: UpsertInput,
  prolog: Pick<PrologPort, "query"> | undefined,
  now: Date,
  staged?: StagedUpsertState,
  lookup?: StoredEntityLookup,
): Promise<UpsertInput> {
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

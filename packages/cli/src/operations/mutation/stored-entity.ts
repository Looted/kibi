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

import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";

/**
 * The stored entity an upsert replaces: `undefined` when no entity has the
 * id, `null` when one exists but cannot be read.
 */
export type StoredEntity = Readonly<Record<string, unknown>> | null | undefined;

export type StoredEntityLookup = {
  /** Whether an entity with the id is stored. */
  readonly exists: () => Promise<boolean>;
  /** The stored entity, loaded only when one exists. */
  readonly entity: () => Promise<StoredEntity>;
};

// implements REQ-kibi-upsert-preserves-requirement-semantics, REQ-kibi-entity-origin
/**
 * One read of the entity an upsert replaces, shared by every step of the
 * upsert that needs it (the requirement ledger merge, the stored
 * relationships and the stored origin), so the store is probed and loaded at
 * most once per upsert.
 */
export function storedEntityLookup(
  prolog: Pick<PrologPort, "query">,
  id: string,
  type: string,
): StoredEntityLookup {
  let probe: Promise<boolean> | undefined;
  let read: Promise<StoredEntity> | undefined;
  const exists = () => {
    probe ??= prolog
      .query(`once(kb_entity('${escapeAtom(id)}', _, _))`)
      .then((result) => result.success);
    return probe;
  };
  const entity = () => {
    read ??= (async () => {
      if (!(await exists())) return undefined;
      try {
        const [existing] = await loadEntities(prolog, { id, type });
        return existing ?? null;
      } catch {
        return null;
      }
    })();
    return read;
  };
  return { exists, entity };
}

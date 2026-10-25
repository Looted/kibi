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

import type { StoredEntityLookup } from "./stored-entity.js";
import type { StagedUpsertState, UpsertInput } from "./types.js";
import { isUpsertEntityProperty } from "./validation.js";

/**
 * Stored fields an update never inherits by omission: identity and write
 * times, fields derived from other fields, and fields other upsert steps
 * resolve with their own rules (origin, firmness, receipt history, the
 * requirement proposition ledger).
 */
const NOT_INHERITED = new Set([
  "id",
  "type",
  "created_at",
  "updated_at",
  "source",
  "origin",
  "firmness",
  "approval_ref",
  "proof_receipts",
  "claim_key",
  "text_ref",
  "semantic_text",
  "semantic_clauses",
  "semantic_inventory",
  "semantic_inventory_version",
  "semantic_source_field",
  "semantic_source_hash",
  "logic_claims",
]);

/**
 * An update keeps every property it leaves out. The authored file already
 * does (the writer patches its front matter), so the compiled entity must
 * too: otherwise a relationship-only upsert stores the requirement without,
 * say, its `required_evidence`, and the store disagrees with the file until a
 * rebuild.
 */
// implements REQ-kibi-operation-interface-parity
export async function withStoredOmittedProperties(
  input: UpsertInput,
  lookup: StoredEntityLookup,
  staged?: StagedUpsertState,
): Promise<UpsertInput> {
  const stored = staged?.entities.get(input.id) ?? (await lookup.entity());
  if (stored === undefined || stored === null) return input;
  if (stored.type !== undefined && stored.type !== input.type) return input;
  const properties = (input.properties ?? {}) as Record<string, unknown>;
  const inherited: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined || value === null) continue;
    if (NOT_INHERITED.has(key) || !isUpsertEntityProperty(key)) continue;
    if (properties[key] !== undefined) continue;
    inherited[key] = value;
  }
  if (Object.keys(inherited).length === 0) return input;
  return {
    ...input,
    properties: { ...inherited, ...properties },
  } as UpsertInput;
}

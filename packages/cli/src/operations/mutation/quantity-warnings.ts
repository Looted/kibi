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

import {
  type QuantityPair,
  type ValueFactEntry,
  quantityLayerApplies,
  quantityPair,
  readQuantityInputs,
  valueFactEntry,
  valueFactKey,
} from "../../public/operations/quantity-layer.js";

type Entity = Readonly<Record<string, unknown>>;
type Relationship = Readonly<Record<string, unknown>>;

export type QuantityWarningInput = Readonly<{
  type: string;
  id: string;
  /** The entity as written (or as the dry run would write it). */
  entity: Entity;
  /**
   * The entity before the write, when the write already happened; a dry run
   * leaves it out and the stored fact is the value before.
   */
  before?: Entity | undefined;
  relationships: readonly Relationship[];
  workspaceRoot: string;
}>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pairWarning(
  pair: QuantityPair,
  written: ValueFactEntry,
  heldBefore?: string,
): string {
  const other = pair.left.id === written.id ? pair.right : pair.left;
  const state =
    heldBefore === undefined
      ? `${written.id} (${written.key} = ${written.display}) states the same quantity as`
      : `${written.id} (${written.key}) held ${heldBefore} before this write, the value still stated by`;
  return `quantity-duplicate: ${state} ${other.id} (${other.key} = ${other.display}) of ${other.requirements.join(", ")}; both are implemented in ${pair.files.join(", ")}. If they are one quantity, ground both claims on one subject_key and property_key so a change to either is checked against the other; if they are different quantities, add ${other.key} to distinct_from on ${written.id}. kb_check blocks the pair otherwise.`;
}

function looseWarning(pair: QuantityPair, written: ValueFactEntry): string {
  const other = pair.left.id === written.id ? pair.right : pair.left;
  return `quantity-duplicate (note): ${written.id} (${written.key} = ${written.display}) may state the same quantity as ${other.id} (${other.key} = ${other.display}) of ${other.requirements.join(", ")}: their key or claim words match and both are implemented in ${pair.files.join(", ")}. If it is one quantity, ground both claims on one subject_key and property_key and settle the value; if not, add ${other.key} to distinct_from on ${written.id}. kb_check does not block this while the values differ.`;
}

/**
 * quantity-duplicate warnings for a write: each existing value fact that
 * states the same quantity as the value fact written, or as the facts a
 * requirement write grounds through requires_property. A value fact whose
 * value changed is also compared by the value it held before the write, so
 * the twin it leaves stale is named. The pairing is the check's own; a
 * requirement write that newly grounds a fact also gets a note for a fact in
 * the same file whose key or claim words match although its value differs.
 */
export function quantityWarnings(input: QuantityWarningInput): string[] {
  try {
    if (!quantityLayerApplies(input.workspaceRoot)) return [];
    if (input.type === "fact") return valueFactWarnings(input);
    if (input.type === "req") return requirementWarnings(input);
  } catch {
    // The warnings advise; a failed read never fails the write.
  }
  return [];
}

function valueFactWarnings(input: QuantityWarningInput): string[] {
  if (text(input.entity.fact_kind) !== "property_value") return [];
  const inputs = readQuantityInputs(input.workspaceRoot);
  const stored = inputs.byId.get(input.id);
  if (stored === undefined || stored.requirements.length === 0) return [];
  const written = valueFactEntry(
    { id: input.id, data: input.entity, path: stored.path },
    valueFactKey(input.entity),
    stored.requirements,
  );
  const warnings: string[] = [];
  const named = new Set<string>();
  for (const other of inputs.facts) {
    if (other.id === input.id) continue;
    const pair = quantityPair(written, other, inputs.code);
    if (pair) {
      warnings.push(pairWarning(pair, written));
      named.add(other.id);
    }
  }
  // Before a write (a dry run) the stored fact holds the old value; after
  // it, the caller passes the entity as it was.
  const previous =
    input.before === undefined
      ? stored
      : valueFactEntry(
          { id: input.id, data: input.before, path: stored.path },
          written.key,
          stored.requirements,
        );
  if (previous.display !== written.display) {
    for (const other of inputs.facts) {
      if (other.id === input.id || named.has(other.id)) continue;
      const pair = quantityPair(previous, other, inputs.code);
      if (pair) warnings.push(pairWarning(pair, written, previous.display));
    }
  }
  return warnings;
}

function requirementWarnings(input: QuantityWarningInput): string[] {
  const grounded = input.relationships
    .filter(
      (relationship) =>
        relationship.type === "requires_property" &&
        relationship.from === input.id &&
        typeof relationship.to === "string",
    )
    .map((relationship) => String(relationship.to));
  if (grounded.length === 0) return [];
  const inputs = readQuantityInputs(input.workspaceRoot);
  const warnings: string[] = [];
  for (const factId of grounded) {
    const stored = inputs.byId.get(factId);
    if (stored === undefined) continue;
    const written: ValueFactEntry = {
      ...stored,
      requirements: [...new Set([...stored.requirements, input.id])].sort(),
    };
    const newLink = !stored.requirements.includes(input.id);
    for (const other of inputs.facts) {
      if (other.id === factId) continue;
      const pair = quantityPair(written, other, inputs.code);
      if (pair) {
        warnings.push(pairWarning(pair, written));
        continue;
      }
      // A new link is where a second name is born: a fact whose key or
      // claim words match, in the same file, may be the same quantity even
      // when the values already differ.
      if (!newLink) continue;
      const loose = quantityPair(written, other, inputs.code, {
        compareValues: false,
      });
      if (
        loose?.signals.some(
          (signal) => signal === "property_words" || signal === "claim_words",
        )
      )
        warnings.push(looseWarning(loose, written));
    }
  }
  return warnings;
}

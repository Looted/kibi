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

import { effectiveFirmness } from "../../decision-firmness.js";
import type { AuthoredEntity } from "../../public/operations/entity-context.js";
import {
  type QuantityInputs,
  type ValueFactEntry,
  quantityPair,
  readQuantityInputs,
  valueFactEntry,
  valueFactKey,
} from "../../public/operations/quantity-layer.js";

type Entity = Readonly<Record<string, unknown>>;

/**
 * Another current requirement on the quantity a value fact write changes:
 * one grounded on the fact itself (`shared_fact`), or one grounded on a
 * fact under the same subject and property, or a fact the quantity-duplicate
 * rule pairs with the written one by its value before the write
 * (`same_quantity`). A pair the write would make contradict is not listed
 * here: the write is refused with SEMANTIC_CONTRADICTION instead.
 */
export type SiblingRequirement = Readonly<{
  requirementId: string;
  title: string;
  firmness: string;
  factId: string;
  subjectKey: string;
  propertyKey: string;
  /** The value the sibling's fact states after the write. */
  value: string;
  claimText: string;
  relation: "shared_fact" | "same_quantity";
  /**
   * The sibling still states the value from before the write: its claim
   * text contains the old value and not the new one (literally), or, for a
   * same_quantity fact, the fact holds the old value.
   */
  statesOldValue: boolean;
}>;

export type SiblingNextAction = Readonly<{
  operation: "kb_upsert";
  input: Readonly<{ id: string }>;
  reason: string;
  required: true;
}>;

export type SiblingReport = Readonly<{
  siblings: readonly SiblingRequirement[];
  /** One message per sibling, placed first in the write's warnings. */
  warnings: readonly string[];
  nextActions: readonly SiblingNextAction[];
}>;

export type SiblingInput = Readonly<{
  type: string;
  id: string;
  /** The fact as written, or as the dry run would write it. */
  entity: Entity;
  /**
   * The fact before the write, when the write already happened, or null
   * when the write created it; a dry run leaves it out and the stored fact,
   * if any, is the value before.
   */
  before?: Entity | null | undefined;
  workspaceRoot: string;
}>;

const EMPTY: SiblingReport = { siblings: [], warnings: [], nextActions: [] };

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

const VALUE_FIELDS = [
  "value_int",
  "value_number",
  "value_string",
  "value_bool",
  "value_set",
] as const;

/** What the write compares: operator, value type, value and unit. */
function valueSignature(data: Entity): string {
  return JSON.stringify([
    text(data.operator),
    text(data.value_type),
    ...VALUE_FIELDS.map((field) => JSON.stringify(data[field] ?? null)),
    text(data.unit),
  ]);
}

/** The value as an author would write it in a claim, when it is one token. */
function literalValue(data: Entity): string | undefined {
  for (const field of ["value_int", "value_number", "value_string"] as const) {
    const value = text(data[field]);
    if (value !== "") return value;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whether `claim` contains `value` as a whole token. */
function statesLiteral(claim: string, value: string): boolean {
  return new RegExp(
    `(?<![\\w.])${escapeRegExp(value)}(?![\\w]|\\.\\d)`,
    "i",
  ).test(claim);
}

/**
 * The requirement's own claim text for a fact: the inventory entry with the
 * fact's claim_key, else the fact's claim_text, else the requirement's
 * statement.
 */
function requirementClaimText(
  requirement: AuthoredEntity,
  fact: Entity | undefined,
): string {
  const claimKey = text(fact?.claim_key);
  const inventory = requirement.data.semantic_inventory;
  if (claimKey !== "" && Array.isArray(inventory)) {
    for (const entry of inventory) {
      const record = entry as Record<string, unknown> | null;
      if (text(record?.claim_key) === claimKey) {
        const claim = text(record?.claim_text);
        if (claim !== "") return claim;
      }
    }
  }
  const factClaim = text(fact?.claim_text);
  if (factClaim !== "") return factClaim;
  return text(requirement.data.semantic_text) || text(requirement.data.title);
}

/**
 * The sibling requirements of a value fact write that changes the fact's
 * operator, value or unit, or creates a value fact: every current
 * requirement grounded on the fact, and every current requirement grounded
 * on another fact of the same quantity (same subject_key and property_key,
 * or paired by the quantity-duplicate rule with the value before the
 * write). Each gets one message, first in the warnings, and one required
 * next action, so an agent updates or asks about each before it stops.
 */
export function siblingRequirements(input: SiblingInput): SiblingReport {
  if (input.type !== "fact") return EMPTY;
  if (text(input.entity.fact_kind) !== "property_value") return EMPTY;
  try {
    return collectSiblings(input, readQuantityInputs(input.workspaceRoot));
  } catch {
    // The list advises; a failed read never fails the write.
    return EMPTY;
  }
}

function collectSiblings(
  input: SiblingInput,
  inputs: QuantityInputs,
): SiblingReport {
  const stored = inputs.byId.get(input.id);
  const storedData = inputs.entities.get(input.id)?.data;
  // A dry run reads the stored fact as the value before; after a write the
  // caller passes it. A created fact has no value before.
  const beforeData =
    input.before === null ? undefined : (input.before ?? storedData);
  const created = beforeData === undefined;
  if (
    !created &&
    valueSignature(beforeData as Entity) === valueSignature(input.entity)
  )
    return EMPTY;
  const key = valueFactKey(input.entity);
  const path = stored?.path ?? "";
  const requirements = stored?.requirements ?? [];
  const written = valueFactEntry(
    { id: input.id, data: input.entity, path },
    key,
    requirements,
  );
  const previous =
    beforeData === undefined
      ? undefined
      : valueFactEntry(
          { id: input.id, data: beforeData, path },
          valueFactKey(beforeData),
          requirements,
        );
  const oldLiteral =
    beforeData === undefined ? undefined : literalValue(beforeData);
  const newLiteral = literalValue(input.entity);
  const claimStatesOld = (claim: string): boolean =>
    oldLiteral !== undefined &&
    oldLiteral !== newLiteral &&
    statesLiteral(claim, oldLiteral) &&
    (newLiteral === undefined || !statesLiteral(claim, newLiteral));

  const siblings: SiblingRequirement[] = [];
  const seen = new Set<string>();
  const add = (
    requirementId: string,
    fact: ValueFactEntry,
    factData: Entity | undefined,
    relation: SiblingRequirement["relation"],
  ): void => {
    if (seen.has(requirementId)) return;
    const requirement = inputs.entities.get(requirementId);
    if (requirement === undefined) return;
    seen.add(requirementId);
    const claimText = requirementClaimText(requirement, factData);
    const factHoldsOld =
      relation === "same_quantity" &&
      previous !== undefined &&
      fact.display === previous.display &&
      fact.display !== written.display;
    siblings.push({
      requirementId,
      title: text(requirement.data.title),
      firmness:
        effectiveFirmness(
          "req",
          requirement.data.firmness,
          requirement.data.origin,
        ) ?? "firm",
      factId: fact.id,
      subjectKey: text(factData?.subject_key),
      propertyKey: fact.propertyKey,
      value: fact.display,
      claimText,
      relation,
      statesOldValue: factHoldsOld || claimStatesOld(claimText),
    });
  };

  for (const requirementId of requirements)
    add(requirementId, written, input.entity, "shared_fact");
  for (const other of inputs.facts) {
    if (other.id === input.id) continue;
    const sameKey = other.key === key;
    const twin =
      !sameKey &&
      ((previous !== undefined &&
        quantityPair(previous, other, inputs.code) !== null) ||
        quantityPair(written, other, inputs.code) !== null);
    if (!sameKey && !twin) continue;
    const otherData = inputs.entities.get(other.id)?.data;
    for (const requirementId of other.requirements)
      add(requirementId, other, otherData, "same_quantity");
  }
  siblings.sort((a, b) => a.requirementId.localeCompare(b.requirementId));
  const change =
    previous === undefined
      ? `${input.id} (${key} = ${written.display}), created by this write`
      : `${input.id} (${key}), changed by this write from ${previous.display} to ${written.display}`;
  const warnings = siblings.map((sibling) => siblingMessage(sibling, change));
  return {
    siblings,
    warnings,
    nextActions: siblings.map((sibling, index) => ({
      operation: "kb_upsert",
      input: { id: sibling.requirementId },
      reason: warnings[index] as string,
      required: true,
    })),
  };
}

function siblingMessage(sibling: SiblingRequirement, change: string): string {
  const link =
    sibling.relation === "shared_fact"
      ? `is grounded on ${change}`
      : `constrains the same quantity through ${sibling.factId} (${sibling.subjectKey}.${sibling.propertyKey} = ${sibling.value}) as ${change}`;
  const stale = sibling.statesOldValue
    ? `; it still states the old value ("${sibling.claimText}")`
    : "";
  const action =
    sibling.firmness === "firm"
      ? `${sibling.requirementId} is firm: ask the person whether this change covers it before touching it.`
      : `Update ${sibling.requirementId} in this change to the new value, with the person's words as origin.ref and their reason, and update the tests that pin the old value.`;
  return `sibling requirement: ${sibling.requirementId} (${sibling.title}, ${sibling.firmness}) ${link}${stale}. ${action} If the person's change does not cover it, supersede or scope the requirements so they no longer constrain one quantity.`;
}

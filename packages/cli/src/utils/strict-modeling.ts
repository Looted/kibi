/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { createHash } from "node:crypto";
import * as path from "node:path";
import type { BaseEntity, FactFields } from "../types/entities.js";
import type { BaseRelationship } from "../types/relationships.js";
import { DEFAULT_CONFIG, type KbConfigPaths } from "./config.js";

const STRICT_CONFIDENCE_THRESHOLD = 0.7;

export interface SemanticClaim {
  source: string;
  subjectKey: string;
  propertyKey: string;
  operator: "eq" | "gte" | "lte" | "neq" | "bool" | "polarity";
  value: string | number | boolean;
  confidence: number;
  provenance?: string;
}

export interface StrictModelInput {
  claim: SemanticClaim;
  statement: string;
  config?: Pick<{ paths: KbConfigPaths }, "paths">;
}

type EntityProperties = Partial<
  Omit<BaseEntity, "created_at" | "updated_at"> & FactFields
> & {
  id: string;
  title: string;
  status: string;
  source: string;
};

export interface EntitySpec<
  TType extends "req" | "fact" = "req" | "fact",
  TProperties extends EntityProperties = EntityProperties,
> {
  type: TType;
  id: string;
  properties: TProperties;
}

export type RelationshipSpec = Pick<
  BaseRelationship,
  "type" | "from" | "to" | "source" | "confidence"
>;

export interface StableRequirementIds {
  stableKey: string;
  reqId: string;
  subjectFactId: string;
  propertyFactId: string;
  observationFactId: string;
  normalizedSource: string;
  normalizedSubjectKey: string;
  normalizedPropertyKey: string;
  normalizedValue: string;
}

interface StrictRequirementWriteSet {
  req: EntitySpec<"req">;
  subjectFact: EntitySpec<"fact">;
  propertyFact: EntitySpec<"fact">;
  relationships: RelationshipSpec[];
  isStrict: true;
  confidence: number;
}

interface ObservationWriteSet {
  observationFact: EntitySpec<"fact">;
  relationships: RelationshipSpec[];
  isStrict: false;
  confidence: number;
}

export type StrictWriteSet = StrictRequirementWriteSet | ObservationWriteSet;

export function normalizeSubjectKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\\/]+/g, ".")
    .replace(/[^a-z0-9.]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/\.+/g, ".")
    .replace(/(^[._]+|[._]+$)/g, "");

  if (!normalized) {
    throw new Error(
      "Semantic claim subjectKey must normalize to a non-empty value",
    );
  }

  return normalized;
}

export function normalizePropertyKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) {
    throw new Error(
      "Semantic claim propertyKey must normalize to a non-empty value",
    );
  }

  return normalized;
}

export function buildStableRequirementIds(
  claim: SemanticClaim,
): StableRequirementIds {
  const normalizedSource = normalizeSourceKey(claim.source);
  const normalizedSubjectKey = normalizeSubjectKey(claim.subjectKey);
  const normalizedPropertyKey = normalizePropertyKey(claim.propertyKey);
  const normalizedValue = normalizeStableValue(claim.value);
  const stableKey = [
    normalizedSource,
    normalizedSubjectKey,
    normalizedPropertyKey,
    claim.operator,
    normalizedValue,
  ].join(":");

  return {
    stableKey,
    reqId: buildEntityId("REQ-AUTO", `req:${stableKey}`),
    subjectFactId: buildEntityId("FACT-SUBJECT", `subject:${stableKey}`),
    propertyFactId: buildEntityId("FACT-PROP", `property:${stableKey}`),
    observationFactId: buildEntityId("FACT-OBS", `observation:${stableKey}`),
    normalizedSource,
    normalizedSubjectKey,
    normalizedPropertyKey,
    normalizedValue,
  };
}

export function buildStrictWriteSet(input: StrictModelInput): StrictWriteSet {
  const statement = normalizeStatement(input.statement);
  const confidence = normalizeConfidence(input.claim.confidence);
  const ids = buildStableRequirementIds(input.claim);
  const textRef = normalizeTextRef(input.claim.provenance, input.claim.source);
  const metadataTags = buildMetadataTags({
    confidence,
    provenance: textRef,
  });
  const sourcePaths = resolveEntitySourcePaths(input.config?.paths);

  if (confidence < STRICT_CONFIDENCE_THRESHOLD) {
    return {
      observationFact: {
        type: "fact",
        id: ids.observationFactId,
        properties: {
          id: ids.observationFactId,
          title: statement,
          status: "active",
          source: buildEntitySourcePath(
            sourcePaths.facts,
            ids.observationFactId,
          ),
          text_ref: textRef,
          tags: buildUniqueTags([
            ...metadataTags,
            "lane:observation",
            "review:required",
          ]),
          fact_kind: "observation",
          subject_key: ids.normalizedSubjectKey,
          property_key: ids.normalizedPropertyKey,
          canonical_key: ids.stableKey,
        },
      },
      relationships: [],
      isStrict: false,
      confidence,
    };
  }

  const req: EntitySpec<"req"> = {
    type: "req",
    id: ids.reqId,
    properties: {
      id: ids.reqId,
      title: statement,
      status: "open",
      source: buildEntitySourcePath(sourcePaths.requirements, ids.reqId),
      text_ref: textRef,
      tags: buildUniqueTags([...metadataTags, "lane:strict"]),
    },
  };

  const subjectFact: EntitySpec<"fact"> = {
    type: "fact",
    id: ids.subjectFactId,
    properties: {
      id: ids.subjectFactId,
      title: humanizeKey(ids.normalizedSubjectKey),
      status: "active",
      source: buildEntitySourcePath(sourcePaths.facts, ids.subjectFactId),
      text_ref: textRef,
      tags: buildUniqueTags([...metadataTags, "lane:strict", "fact:subject"]),
      fact_kind: "subject",
      subject_key: ids.normalizedSubjectKey,
      canonical_key: ids.normalizedSubjectKey,
    },
  };

  const propertyFact: EntitySpec<"fact"> = {
    type: "fact",
    id: ids.propertyFactId,
    properties: {
      id: ids.propertyFactId,
      title: buildPropertyFactTitle(ids.normalizedPropertyKey, input.claim),
      status: "active",
      source: buildEntitySourcePath(sourcePaths.facts, ids.propertyFactId),
      text_ref: textRef,
      tags: buildUniqueTags([
        ...metadataTags,
        "lane:strict",
        "fact:property_value",
      ]),
      fact_kind: "property_value",
      subject_key: ids.normalizedSubjectKey,
      property_key: ids.normalizedPropertyKey,
      canonical_key: ids.stableKey,
      ...buildPropertyFactFields(input.claim),
    },
  };

  const relationships = dedupeRelationships([
    {
      type: "constrains",
      from: req.id,
      to: subjectFact.id,
      source: input.claim.source,
      confidence,
    },
    {
      type: "requires_property",
      from: req.id,
      to: propertyFact.id,
      source: input.claim.source,
      confidence,
    },
  ]);

  return {
    req,
    subjectFact,
    propertyFact,
    relationships,
    isStrict: true,
    confidence,
  };
}

export function modelRequirementClaims(
  inputs: ReadonlyArray<StrictModelInput>,
): StrictWriteSet[] {
  const seen = new Set<string>();
  const modeled: StrictWriteSet[] = [];

  for (const input of inputs) {
    const writeSet = buildStrictWriteSet(input);
    const stableId = writeSet.isStrict
      ? writeSet.req.id
      : writeSet.observationFact.id;
    if (seen.has(stableId)) {
      continue;
    }

    seen.add(stableId);
    modeled.push(writeSet);
  }

  return modeled;
}

function buildEntityId(prefix: string, value: string): string {
  const hash = createHash("sha256");
  hash.update(value);
  return `${prefix}-${hash.digest("hex").substring(0, 16).toUpperCase()}`;
}

function normalizeSourceKey(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!normalized) {
    throw new Error(
      "Semantic claim source must normalize to a non-empty value",
    );
  }

  return normalized;
}

function normalizeStableValue(value: string | number | boolean): string {
  if (typeof value === "string") {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");

    return normalized || "empty";
  }

  return String(value);
}

function normalizeStatement(statement: string): string {
  const normalized = statement.trim();
  if (!normalized) {
    throw new Error("Strict modeling requires a non-empty prose statement");
  }
  return normalized;
}

function normalizeTextRef(
  provenance: string | undefined,
  source: string,
): string {
  const value = provenance?.trim() || source.trim();
  if (!value) {
    throw new Error("Strict modeling requires claim provenance or source");
  }
  return value;
}

function normalizeConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;
}

function toConfidenceBand(confidence: number): string {
  if (confidence >= 0.9) return "high";
  if (confidence >= 0.8) return "medium";
  return "low";
}

function buildMetadataTags({
  confidence,
  provenance,
}: {
  confidence: number;
  provenance: string;
}): string[] {
  return buildUniqueTags([
    "strict-modeling",
    `confidence:${confidence.toFixed(2)}`,
    `confidence-band:${toConfidenceBand(confidence)}`,
    `provenance:${normalizeSourceKey(provenance)}`,
  ]);
}

function buildUniqueTags(tags: string[]): string[] {
  return Array.from(new Set(tags));
}

function buildPropertyFactTitle(
  normalizedPropertyKey: string,
  claim: SemanticClaim,
): string {
  const label = humanizeKey(normalizedPropertyKey);

  if (claim.operator === "polarity") {
    return `${label} ${normalizePolarityValue(claim.value)}`;
  }

  const operatorLabel =
    claim.operator === "bool"
      ? "="
      : claim.operator === "eq"
        ? "="
        : claim.operator === "neq"
          ? "!="
          : claim.operator === "gte"
            ? ">="
            : "<=";

  return `${label} ${operatorLabel} ${String(claim.value)}`;
}

function buildPropertyFactFields(claim: SemanticClaim): Partial<FactFields> {
  if (claim.operator === "polarity") {
    return {
      polarity: normalizePolarityValue(claim.value),
    };
  }

  if (claim.operator === "bool") {
    return {
      operator: "eq",
      value_type: "bool",
      value_bool: normalizeBooleanValue(claim.value),
    };
  }

  return {
    operator: claim.operator,
    ...buildTypedValueFields(claim.value),
  };
}

function buildTypedValueFields(
  value: string | number | boolean,
): Partial<FactFields> {
  if (typeof value === "boolean") {
    return {
      value_type: "bool",
      value_bool: value,
    };
  }

  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return {
        value_type: "int",
        value_int: value,
      };
    }

    return {
      value_type: "number",
      value_number: value,
    };
  }

  return {
    value_type: "string",
    value_string: value,
  };
}

function normalizePolarityValue(
  value: string | number | boolean,
): "require" | "forbid" {
  if (typeof value === "boolean") {
    return value ? "require" : "forbid";
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "require" || normalized === "forbid") {
      return normalized;
    }
  }

  throw new Error(
    "Polarity claims must use a boolean or the string 'require'/'forbid'",
  );
}

function normalizeBooleanValue(value: string | number | boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }

  throw new Error(
    "Boolean claims must use a boolean or the string 'true'/'false'",
  );
}

function humanizeKey(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function dedupeRelationships(
  relationships: RelationshipSpec[],
): RelationshipSpec[] {
  const seen = new Set<string>();
  const deduped: RelationshipSpec[] = [];

  for (const relationship of relationships) {
    const key = `${relationship.type}:${relationship.from}:${relationship.to}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(relationship);
  }

  return deduped;
}

function resolveEntitySourcePaths(configPaths: KbConfigPaths | undefined): {
  requirements: string;
  facts: string;
} {
  return {
    requirements: normalizeEntityDirectory(
      configPaths?.requirements,
      DEFAULT_CONFIG.paths.requirements,
    ),
    facts: normalizeEntityDirectory(
      configPaths?.facts,
      DEFAULT_CONFIG.paths.facts,
    ),
  };
}

function normalizeEntityDirectory(
  directory: string | undefined,
  fallback: string | undefined,
): string {
  const selected = directory?.trim() || fallback?.trim() || "documentation";
  return selected.split(path.sep).join("/").replace(/\/+$/g, "");
}

function buildEntitySourcePath(directory: string, entityId: string): string {
  return `${directory}/${entityId}.md`;
}

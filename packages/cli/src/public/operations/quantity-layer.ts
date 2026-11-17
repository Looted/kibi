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

import { existsSync } from "node:fs";
import path from "node:path";
import { extractFromManifest } from "../../extractors/manifest.js";
import type { ExtractionResult } from "../../extractors/markdown.js";
import {
  listLaneMarkdownFiles,
  readText,
} from "../../operations/migration/kb-sources.js";
import { singularizeToken } from "../../operations/semantic-advisor/shared.js";
import { readAllShards } from "../../relationships/shards.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import {
  type AuthoredEntity,
  authoredSupersededIds,
  readAuthoredEntity,
} from "./entity-context.js";

/**
 * Two active value facts of current requirements must not state one
 * quantity under different subject or property keys (blocking): a value
 * changed under one name stays stale under the other, and no rule that
 * compares facts on one key sees the pair.
 */
export const QUANTITY_DUPLICATE_RULE = "quantity-duplicate";

/**
 * The KB schema that introduced quantity-duplicate. A KB on an older schema
 * has not run the upgrade that lists its pairs for review, so the rule waits
 * for `kibi migrate`.
 */
export const QUANTITY_LAYER_SCHEMA_VERSION = 19;

/**
 * Share of the smaller word set two property keys, or two claim texts, must
 * have in common to count as naming one quantity.
 */
export const QUANTITY_WORD_SHARE = 0.5;

/** Numbers too common to say that two facts state one quantity. */
export const TRIVIAL_NUMBERS: readonly number[] = [0, 1];

/** The fewest members a set needs to count as a quantity of its own. */
const MIN_SET_MEMBERS = 2;

const INACTIVE_FACT_STATUSES = new Set([
  "superseded",
  "deprecated",
  "closed",
  "removed",
  "retired",
  "inactive",
  "archived",
]);

const CURRENT_REQUIREMENT_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

/** Units with a common base: the factor to the base and the base's name. */
const UNIT_SCALE: Readonly<Record<string, readonly [number, string]>> = {
  ms: [1, "ms"],
  millisecond: [1, "ms"],
  milliseconds: [1, "ms"],
  s: [1000, "ms"],
  sec: [1000, "ms"],
  second: [1000, "ms"],
  seconds: [1000, "ms"],
  min: [60_000, "ms"],
  minute: [60_000, "ms"],
  minutes: [60_000, "ms"],
  h: [3_600_000, "ms"],
  hour: [3_600_000, "ms"],
  hours: [3_600_000, "ms"],
  b: [1, "bytes"],
  byte: [1, "bytes"],
  bytes: [1, "bytes"],
  kb: [1024, "bytes"],
  kib: [1024, "bytes"],
  mb: [1024 * 1024, "bytes"],
  mib: [1024 * 1024, "bytes"],
};

/** A fact's value in a form two facts can be compared by. */
export type QuantityValue =
  | Readonly<{ kind: "number"; value: number; unit: string }>
  | Readonly<{ kind: "set"; members: readonly string[] }>;

/** One active value fact grounded by current requirements. */
export type ValueFactEntry = Readonly<{
  id: string;
  /** `subject_key.property_key`. */
  key: string;
  propertyKey: string;
  claimText: string;
  value: QuantityValue | null;
  /** Shown in messages: the value as written. */
  display: string;
  distinctFrom: readonly string[];
  /** Current requirements grounding the fact through requires_property. */
  requirements: readonly string[];
  path: string;
}>;

/** Code each requirement's implementing symbols live in. */
export type QuantityCode = Readonly<{
  /** Requirement id to the ids of the symbols implementing it. */
  symbolsByRequirement: ReadonlyMap<string, ReadonlySet<string>>;
  /** Symbol id to its source file. */
  fileBySymbol: ReadonlyMap<string, string>;
  /** Fact id to the symbols a proof of its claim reads its value from. */
  valueSourcesByFact: ReadonlyMap<string, ReadonlySet<string>>;
}>;

export type QuantitySignal =
  | "shared_symbol"
  | "proof_value_source"
  | "property_words"
  | "claim_words";

export type QuantityPair = Readonly<{
  left: ValueFactEntry;
  right: ValueFactEntry;
  /** Source files both facts' requirements are implemented in. */
  files: readonly string[];
  signals: readonly QuantitySignal[];
}>;

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return "";
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/**
 * A value fact's value for comparison, or null when the rule does not
 * compare it: booleans, strings, the numbers 0 and 1, and sets of fewer than
 * two members.
 */
export function quantityValue(
  data: Readonly<Record<string, unknown>>,
): QuantityValue | null {
  const type = text(data.value_type);
  if (type === "int" || type === "number") {
    const raw = data[type === "int" ? "value_int" : "value_number"];
    const value = typeof raw === "number" ? raw : Number(text(raw));
    if (!Number.isFinite(value)) return null;
    const unitName = text(data.unit).toLowerCase();
    const scale = UNIT_SCALE[unitName];
    const canonical = scale ? value * scale[0] : value;
    if (TRIVIAL_NUMBERS.includes(value)) return null;
    return {
      kind: "number",
      value: canonical,
      unit: scale ? scale[1] : unitName,
    };
  }
  if (type === "set") {
    const members = [
      ...new Set(strings(data.value_set).map((m) => m.trim())),
    ].sort();
    return members.length >= MIN_SET_MEMBERS ? { kind: "set", members } : null;
  }
  return null;
}

function sameValue(left: QuantityValue, right: QuantityValue): boolean {
  if (left.kind === "number" && right.kind === "number") {
    return left.value === right.value && left.unit === right.unit;
  }
  if (left.kind === "set" && right.kind === "set") {
    return left.members.join("\u0000") === right.members.join("\u0000");
  }
  return false;
}

const FUNCTION_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "must",
  "of",
  "on",
  "or",
  "shall",
  "should",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "which",
  "with",
]);

/** Content words of a key or a claim, singular, function words removed. */
export function quantityWords(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((word) => word !== "" && !FUNCTION_WORDS.has(word))
      .map((word) => singularizeToken(word, [])),
  );
}

/** Whether two word sets share at least QUANTITY_WORD_SHARE of the smaller. */
function shareWords(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  const smaller = Math.min(left.size, right.size);
  if (smaller === 0) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / smaller >= QUANTITY_WORD_SHARE;
}

function symbolsOf(fact: ValueFactEntry, code: QuantityCode): Set<string> {
  const symbols = new Set<string>();
  for (const req of fact.requirements) {
    for (const symbol of code.symbolsByRequirement.get(req) ?? []) {
      symbols.add(symbol);
    }
  }
  return symbols;
}

function filesOf(
  symbols: ReadonlySet<string>,
  code: QuantityCode,
): Set<string> {
  const files = new Set<string>();
  for (const symbol of symbols) {
    const file = code.fileBySymbol.get(symbol);
    if (file) files.add(file);
  }
  return files;
}

function intersects(
  left: ReadonlySet<string>,
  right: ReadonlySet<string>,
): boolean {
  for (const item of left) if (right.has(item)) return true;
  return false;
}

/**
 * Whether either fact says it is a different quantity from the other:
 * distinct_from naming the other's `subject_key.property_key`.
 */
export function declaredDistinct(
  left: Pick<ValueFactEntry, "key" | "distinctFrom">,
  right: Pick<ValueFactEntry, "key" | "distinctFrom">,
): boolean {
  return (
    left.distinctFrom.includes(right.key) ||
    right.distinctFrom.includes(left.key)
  );
}

/**
 * The pair as one quantity stated twice, or null. Two value facts under
 * different keys state one quantity when their values are equal and
 * comparable, their requirements are implemented in one source file, and one
 * signal holds: a shared implementing symbol, a proof of one reading its
 * value from a symbol that implements the other's requirement, or property
 * keys or claim texts that share at least half their words. A pair with a
 * requirement in common, or declared distinct, is never one.
 */
export function quantityPair(
  left: ValueFactEntry,
  right: ValueFactEntry,
  code: QuantityCode,
  options: Readonly<{ compareValues?: boolean }> = {},
): QuantityPair | null {
  if (left.key === right.key) return null;
  if (left.value === null || right.value === null) return null;
  if (options.compareValues !== false && !sameValue(left.value, right.value))
    return null;
  if (left.value.kind !== right.value.kind) return null;
  if (left.requirements.some((req) => right.requirements.includes(req)))
    return null;
  if (declaredDistinct(left, right)) return null;
  const leftSymbols = symbolsOf(left, code);
  const rightSymbols = symbolsOf(right, code);
  const leftFiles = filesOf(leftSymbols, code);
  const files = [...filesOf(rightSymbols, code)]
    .filter((file) => leftFiles.has(file))
    .sort();
  if (files.length === 0) return null;
  const signals: QuantitySignal[] = [];
  if (intersects(leftSymbols, rightSymbols)) signals.push("shared_symbol");
  const leftSources = code.valueSourcesByFact.get(left.id) ?? new Set();
  const rightSources = code.valueSourcesByFact.get(right.id) ?? new Set();
  if (
    intersects(leftSources, rightSymbols) ||
    intersects(rightSources, leftSymbols)
  )
    signals.push("proof_value_source");
  if (
    shareWords(
      quantityWords(left.propertyKey),
      quantityWords(right.propertyKey),
    )
  )
    signals.push("property_words");
  if (shareWords(quantityWords(left.claimText), quantityWords(right.claimText)))
    signals.push("claim_words");
  return signals.length === 0 ? null : { left, right, files, signals };
}

/**
 * Every pair of value facts that state one quantity under two keys. Facts
 * are grouped by the source files their requirements are implemented in and
 * compared only inside a group.
 */
export function quantityDuplicatePairs(
  facts: readonly ValueFactEntry[],
  code: QuantityCode,
): QuantityPair[] {
  const byFile = new Map<string, ValueFactEntry[]>();
  for (const fact of facts) {
    if (fact.value === null) continue;
    for (const file of filesOf(symbolsOf(fact, code), code)) {
      const group = byFile.get(file) ?? [];
      group.push(fact);
      byFile.set(file, group);
    }
  }
  const seen = new Set<string>();
  const pairs: QuantityPair[] = [];
  for (const group of byFile.values()) {
    for (let i = 0; i < group.length; i += 1) {
      const left = group[i] as ValueFactEntry;
      for (let j = i + 1; j < group.length; j += 1) {
        const right = group[j] as ValueFactEntry;
        const [a, b] = left.id < right.id ? [left, right] : [right, left];
        const id = `${a.id}\u0000${b.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const pair = quantityPair(a, b, code);
        if (pair) pairs.push(pair);
      }
    }
  }
  return pairs.sort(
    (x, y) =>
      x.left.id.localeCompare(y.left.id) ||
      x.right.id.localeCompare(y.right.id),
  );
}

/** quantity-duplicate findings: each pair, and each distinct_from naming no active value fact. */
export function quantityDuplicateViolations(
  facts: readonly ValueFactEntry[],
  code: QuantityCode,
  allValueKeys: ReadonlySet<string>,
): Violation[] {
  const findings: Violation[] = quantityDuplicatePairs(facts, code).map(
    ({ left, right, files, signals }) => ({
      rule: QUANTITY_DUPLICATE_RULE,
      entityId: left.id,
      description: `Value facts ${left.id} (${left.key} = ${left.display}) and ${right.id} (${right.key} = ${right.display}) state one quantity under two names: their requirements ${left.requirements.join(", ")} and ${right.requirements.join(", ")} are implemented in ${files.join(", ")}. A value changed under one name stays stale under the other, and no rule compares them`,
      suggestion: `If they are one quantity, ground both claims on one subject_key and property_key, moving the facts scenarios assume on the old key with them, so a change to either is checked against the other. If they are different quantities, add ${right.key} to distinct_from on ${left.id} (or ${left.key} on ${right.id}) and say in its body how they differ`,
      source: left.path,
      evidence: {
        key: left.key,
        other: right.key,
        otherId: right.id,
        files,
        signals,
      },
    }),
  );
  for (const fact of facts) {
    for (const entry of fact.distinctFrom) {
      if (allValueKeys.has(entry)) continue;
      findings.push({
        rule: QUANTITY_DUPLICATE_RULE,
        entityId: fact.id,
        description: `Value fact ${fact.id} lists ${entry} under distinct_from, but no active value fact has that subject_key and property_key, so the entry exempts nothing`,
        suggestion: `Name the subject_key.property_key of an active value fact, or remove ${entry} from distinct_from`,
        source: fact.path,
        evidence: { key: fact.key, distinctFrom: entry },
      });
    }
  }
  return findings;
}

/** Authored value facts, requirements and tests, read once. */
export type QuantityInputs = Readonly<{
  /** Active value facts grounded by at least one current requirement. */
  facts: ValueFactEntry[];
  /** Every active value fact by id, grounded or not. */
  byId: Map<string, ValueFactEntry>;
  code: QuantityCode;
  /** subject_key.property_key of every active value fact. */
  allValueKeys: Set<string>;
  /** Every fact, requirement and test read, by id. */
  entities: ReadonlyMap<string, AuthoredEntity>;
}>;

const QUANTITY_LANES = ["facts", "requirements", "tests"] as const;

/**
 * Read the value facts, the requirements grounding them, the symbols
 * implementing those requirements and the proofs' value sources from the
 * authored KB (front matter links, relationship shards and symbols.yaml), so
 * the check, the write and the migration agree before a sync.
 */
export function readQuantityInputs(workspaceRoot: string): QuantityInputs {
  const entities: AuthoredEntity[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, QUANTITY_LANES)) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const entity = readAuthoredEntity(content, file.relativePath);
    if (entity !== null) entities.push(entity);
  }
  const superseded = authoredSupersededIds(workspaceRoot, entities);
  const edges: Array<{ type: string; from: string; to: string }> = [];
  for (const entity of entities) {
    const links = entity.data.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      const edge = link as { type?: unknown; target?: unknown } | null;
      if (typeof edge?.type === "string" && typeof edge.target === "string") {
        edges.push({ type: edge.type, from: entity.id, to: edge.target });
      }
    }
  }
  try {
    edges.push(...readAllShards(path.join(workspaceRoot, ".kb")));
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  const fileBySymbol = new Map<string, string>();
  const manifest = path.join(workspaceRoot, ".kb", "symbols.yaml");
  if (existsSync(manifest)) {
    try {
      for (const result of extractFromManifest(manifest)) {
        const id = text(result.entity.id);
        const file = text(result.sourceFile);
        if (id && file) fileBySymbol.set(id, file);
        edges.push(...result.relationships);
      }
    } catch {
      // A malformed manifest fails sync with its own diagnostic.
    }
  }
  return buildQuantityInputs(entities, edges, fileBySymbol, superseded);
}

/**
 * The same inputs from compiled knowledge, such as the snapshot of a Git
 * tree the staged gate reads.
 */
export function quantityInputsFromKnowledge(
  knowledge: readonly ExtractionResult[],
): QuantityInputs {
  const entities: AuthoredEntity[] = [];
  const edges: Array<{ type: string; from: string; to: string }> = [];
  const fileBySymbol = new Map<string, string>();
  for (const { entity, relationships, sourceFile } of knowledge) {
    edges.push(...relationships);
    if (entity.type === "symbol") {
      const file = text(sourceFile);
      if (file) fileBySymbol.set(entity.id, file);
    } else if (QUANTITY_TYPES.has(entity.type)) {
      entities.push({
        id: entity.id,
        type: entity.type,
        data: entity as unknown as Record<string, unknown>,
        path: entity.source,
        body: "",
      });
    }
  }
  const superseded = new Set(
    edges.filter((edge) => edge.type === "supersedes").map((edge) => edge.to),
  );
  return buildQuantityInputs(entities, edges, fileBySymbol, superseded);
}

const QUANTITY_TYPES = new Set(["fact", "req", "test"]);

function buildQuantityInputs(
  entities: readonly AuthoredEntity[],
  edges: ReadonlyArray<{ type: string; from: string; to: string }>,
  fileBySymbol: ReadonlyMap<string, string>,
  superseded: ReadonlySet<string>,
): QuantityInputs {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const currentRequirement = (id: string): boolean => {
    const req = entityById.get(id);
    return (
      req !== undefined &&
      req.type === "req" &&
      CURRENT_REQUIREMENT_STATUSES.has(text(req.data.status)) &&
      !superseded.has(id)
    );
  };
  const requirementsByFact = new Map<string, Set<string>>();
  const symbolsByRequirement = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.type === "requires_property" && currentRequirement(edge.from)) {
      const set = requirementsByFact.get(edge.to) ?? new Set();
      set.add(edge.from);
      requirementsByFact.set(edge.to, set);
    } else if (edge.type === "implements" && fileBySymbol.has(edge.from)) {
      const set = symbolsByRequirement.get(edge.to) ?? new Set();
      set.add(edge.from);
      symbolsByRequirement.set(edge.to, set);
    }
  }
  const valueFacts = entities.filter(
    (entity) =>
      entity.type === "fact" &&
      text(entity.data.fact_kind) === "property_value" &&
      !INACTIVE_FACT_STATUSES.has(text(entity.data.status)) &&
      !superseded.has(entity.id) &&
      text(entity.data.subject_key) !== "" &&
      text(entity.data.property_key) !== "",
  );
  const factsByClaim = new Map<string, string[]>();
  for (const fact of valueFacts) {
    const claim = text(fact.data.claim_key);
    if (!claim) continue;
    factsByClaim.set(claim, [...(factsByClaim.get(claim) ?? []), fact.id]);
  }
  const valueSourcesByFact = new Map<string, Set<string>>();
  for (const test of entities) {
    if (test.type !== "test") continue;
    const contract = test.data.proof_contract as
      | Record<string, unknown>
      | undefined;
    if (!contract || typeof contract !== "object") continue;
    const sources = (
      Array.isArray(contract.value_source) ? contract.value_source : []
    )
      .map((source) => text((source as Record<string, unknown>)?.symbol_id))
      .filter((id) => id !== "");
    if (sources.length === 0) continue;
    for (const claim of strings(contract.proves)) {
      for (const factId of factsByClaim.get(claim) ?? []) {
        const set = valueSourcesByFact.get(factId) ?? new Set();
        for (const source of sources) set.add(source);
        valueSourcesByFact.set(factId, set);
      }
    }
  }
  const allValueKeys = new Set<string>();
  const byId = new Map<string, ValueFactEntry>();
  const facts: ValueFactEntry[] = [];
  for (const fact of valueFacts) {
    const key = valueFactKey(fact.data);
    allValueKeys.add(key);
    const requirements = [...(requirementsByFact.get(fact.id) ?? [])].sort();
    const entry = valueFactEntry(fact, key, requirements);
    byId.set(fact.id, entry);
    if (requirements.length > 0) facts.push(entry);
  }
  return {
    facts: facts.sort((a, b) => a.id.localeCompare(b.id)),
    byId,
    code: { symbolsByRequirement, fileBySymbol, valueSourcesByFact },
    allValueKeys,
    entities: entityById,
  };
}

/** A value fact's `subject_key.property_key`. */
export function valueFactKey(data: Readonly<Record<string, unknown>>): string {
  return `${text(data.subject_key)}.${text(data.property_key)}`;
}

/** A value fact as the rule reads it, from its authored record. */
export function valueFactEntry(
  fact: Pick<AuthoredEntity, "id" | "data" | "path">,
  key: string,
  requirements: readonly string[],
): ValueFactEntry {
  const value = quantityValue(fact.data);
  const unit = text(fact.data.unit);
  const raw =
    text(fact.data.value_type) === "set"
      ? `{${strings(fact.data.value_set).join(", ")}}`
      : text(
          fact.data.value_int ??
            fact.data.value_number ??
            fact.data.value_string ??
            fact.data.value_bool,
        );
  return {
    id: fact.id,
    key,
    propertyKey: text(fact.data.property_key),
    claimText: text(fact.data.claim_text) || text(fact.data.title),
    value,
    display: unit ? `${raw} ${unit}` : raw,
    distinctFrom: strings(fact.data.distinct_from),
    requirements,
    path: fact.path,
  };
}

/**
 * quantity-duplicate findings a commit is judged on, over one tree's
 * compiled knowledge: each pair one of whose facts or requirements is
 * staged, filed under the first staged one so the gate keeps it, and each
 * distinct_from entry on a staged fact.
 */
export function stagedQuantityViolations(
  knowledge: readonly ExtractionResult[],
  staged: ReadonlySet<string>,
): Violation[] {
  const inputs = quantityInputsFromKnowledge(knowledge);
  return quantityDuplicateViolations(
    inputs.facts,
    inputs.code,
    inputs.allValueKeys,
  ).flatMap((finding) => {
    const otherId = finding.evidence?.otherId;
    const touched = [finding.entityId, otherId]
      .flatMap((id) => {
        const entry = typeof id === "string" ? inputs.byId.get(id) : undefined;
        return entry === undefined ? [] : [entry.id, ...entry.requirements];
      })
      .find((id) => staged.has(id));
    return touched === undefined ? [] : [{ ...finding, entityId: touched }];
  });
}

/** Whether a KB's manifest is on the schema quantity-duplicate applies to. */
export function quantityLayerApplies(workspaceRoot: string): boolean {
  const manifest = readKbManifest(workspaceRoot);
  return (
    manifest !== null && manifest.schemaVersion >= QUANTITY_LAYER_SCHEMA_VERSION
  );
}

/**
 * quantity-duplicate over the authored KB. A KB whose manifest predates
 * schema 19 has not listed its pairs for review yet: the rule waits for
 * `kibi migrate`.
 */
export function collectQuantityDuplicateViolations(
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Violation[] {
  if (!rules.has(QUANTITY_DUPLICATE_RULE)) return [];
  if (!quantityLayerApplies(workspaceRoot)) return [];
  const inputs = readQuantityInputs(workspaceRoot);
  return quantityDuplicateViolations(
    inputs.facts,
    inputs.code,
    inputs.allValueKeys,
  );
}

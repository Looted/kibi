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

import { createHash } from "node:crypto";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import { parseDocument } from "yaml";
import {
  type ExtractedEntity,
  type ExtractedRelationship,
  extractFromMarkdown,
  extractFromMarkdownString,
} from "../../extractors/markdown.js";
import { readAllShards } from "../../relationships/shards.js";
import { KB_PATHS } from "../../utils/kb-paths.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../semantic-advisor/ingestion-boundary.js";
import {
  SEMANTIC_INVENTORY_VERSION,
  semanticSourceOf,
} from "../semantic-advisor/shared.js";
import type { SemanticProposition } from "../semantic-advisor/types.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * Re-derive a requirement's stored semantic inventory with the current
 * semantic advisor.
 *
 * An advisor upgrade can split or classify prose differently than the
 * version that wrote a requirement's inventory, and proposition-complete
 * ingestion then rejects the requirement on sync. Re-derivation keeps what
 * the author established and never invents logic:
 *
 * - a claim whose claim_key and claim_text still match keeps its status, so
 *   a `modeled` claim stays modeled and its grounding links still apply;
 * - a new or changed claim is unresolved (the advisor's own non-modeled
 *   status, `missing` when the advisor would call it modeled), never
 *   `modeled`;
 * - roles and spans follow the current advisor; logic_claims lists exactly
 *   the assertive claims; semantic_source_hash is recomputed from the prose.
 *
 * Re-derivation is unsafe, and left to a person, when a modeled claim would
 * disappear or turn into context while a logical grounding link still points
 * at it, or when the result would still fail ingestion.
 */

const CONTEXT_ROLES = new Set(["rationale", "example", "subjective"]);
const GROUNDING_RELATIONSHIPS = new Set([
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);
const UNRESOLVED_STATUSES = new Set(["ambiguous", "ontology_gap", "missing"]);

type InventoryEntry = {
  claim_key: string;
  claim_text: string;
  role: string;
  status: string;
  span: { start: number; end: number };
  semantic_key?: string;
  reason?: string;
};

/** What re-derivation changed for one claim. */
// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export type InventoryClaimChange = Readonly<{
  claim_key: string;
  change:
    | "kept"
    | "role_changed"
    | "span_changed"
    | "new_unresolved"
    | "new_context"
    | "now_unresolved"
    | "now_context"
    | "dropped";
  before?: Readonly<{ role: string; status: string }>;
  after?: Readonly<{ role: string; status: string }>;
}>;

// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export type InventoryRederivationSummary = Readonly<{
  keptModeled: number;
  roleChanges: number;
  newlyUnresolved: number;
  droppedClaims: number;
  downgradedModeled: number;
}>;

/** The re-derived inventory contract written to the requirement. */
// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export type InventoryContract = Readonly<{
  semantic_inventory_version: string;
  semantic_source_field: string;
  semantic_source_hash: string;
  semantic_inventory: readonly InventoryEntry[];
  logic_claims: readonly string[];
}>;

// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export type InventoryRederivation = Readonly<{
  requirementId: string;
  path: string;
  /** Ingestion errors the stored inventory produces today. */
  errors: readonly string[];
  safe: boolean;
  /** Why re-derivation is left to a person (empty when safe). */
  reasons: readonly string[];
  summary: InventoryRederivationSummary;
  changes: readonly InventoryClaimChange[];
  contract: InventoryContract;
  /** SHA-256 of the canonical re-derived contract; the apply step re-checks it. */
  contractHash: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function storedInventory(entity: ExtractedEntity): InventoryEntry[] {
  const raw = entity.semantic_inventory;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord).map((entry) => {
    const span = isRecord(entry.span) ? entry.span : {};
    return {
      claim_key: text(entry.claim_key),
      claim_text: text(entry.claim_text),
      role: text(entry.role),
      status: text(entry.status),
      span: {
        start: typeof span.start === "number" ? span.start : -1,
        end: typeof span.end === "number" ? span.end : -1,
      },
      ...(typeof entry.semantic_key === "string"
        ? { semantic_key: entry.semantic_key }
        : {}),
      ...(typeof entry.reason === "string" ? { reason: entry.reason } : {}),
    };
  });
}

function advertisesContract(entity: ExtractedEntity): boolean {
  return (
    entity.semantic_inventory_version !== undefined ||
    entity.semantic_source_hash !== undefined ||
    entity.semantic_inventory !== undefined
  );
}

/** Lazily resolves grounding fact ids to their claim_key. */
class FactClaimIndex {
  private byId: Map<string, string> | undefined;
  constructor(private readonly workspaceRoot: string) {}

  claimKey(factId: string): string | undefined {
    const direct = path.join(
      this.workspaceRoot,
      KB_PATHS.lanes.facts,
      `${factId}.md`,
    );
    try {
      const result = extractFromMarkdown(direct);
      if (result.entity.id === factId) return result.entity.claim_key;
    } catch {
      // Fall back to the full index: the file stem may differ from the id.
    }
    if (this.byId === undefined) {
      this.byId = new Map();
      for (const file of listLaneMarkdownFiles(this.workspaceRoot, ["facts"])) {
        try {
          const { entity } = extractFromMarkdown(file.absolutePath);
          if (entity.claim_key !== undefined) {
            this.byId.set(entity.id, entity.claim_key);
          }
        } catch {
          // Unreadable facts are reported by sync, not here.
        }
      }
    }
    return this.byId.get(factId);
  }
}

function relationshipsFor(
  id: string,
  extracted: readonly ExtractedRelationship[],
  shards: readonly ExtractedRelationship[],
): ExtractedRelationship[] {
  const unique = new Map<string, ExtractedRelationship>();
  for (const relationship of [...extracted, ...shards]) {
    if (relationship.from !== id) continue;
    unique.set(
      `${relationship.type}\u0000${relationship.from}\u0000${relationship.to}`,
      relationship,
    );
  }
  return [...unique.values()];
}

function unresolvedStatus(proposition: SemanticProposition): string {
  return UNRESOLVED_STATUSES.has(proposition.status)
    ? proposition.status
    : "missing";
}

function rederive(
  stored: readonly InventoryEntry[],
  propositions: readonly SemanticProposition[],
): {
  inventory: InventoryEntry[];
  changes: InventoryClaimChange[];
  modeledBecameContext: string[];
} {
  const storedByKey = new Map(stored.map((entry) => [entry.claim_key, entry]));
  const carried = new Set<string>();
  const inventory: InventoryEntry[] = [];
  const changes: InventoryClaimChange[] = [];
  const modeledBecameContext: string[] = [];
  for (const proposition of propositions) {
    const candidate = storedByKey.get(proposition.claim_key);
    const previous =
      candidate !== undefined && candidate.claim_text === proposition.claim_text
        ? candidate
        : undefined;
    const context = CONTEXT_ROLES.has(proposition.role);
    let status: string;
    let change: InventoryClaimChange["change"];
    if (previous === undefined) {
      status = context ? "nonlogical" : unresolvedStatus(proposition);
      change = context ? "new_context" : "new_unresolved";
    } else {
      carried.add(previous.claim_key);
      if (context) {
        status = "nonlogical";
        if (previous.status === "modeled") {
          modeledBecameContext.push(previous.claim_key);
        }
        change = previous.status === "nonlogical" ? "kept" : "now_context";
      } else if (previous.status === "nonlogical") {
        status = unresolvedStatus(proposition);
        change = "now_unresolved";
      } else {
        status = previous.status;
        change = "kept";
      }
      if (change === "kept" && previous.role !== proposition.role) {
        change = "role_changed";
      } else if (
        change === "kept" &&
        (previous.span.start !== proposition.span.start ||
          previous.span.end !== proposition.span.end)
      ) {
        change = "span_changed";
      }
    }
    const keepsStatus = previous !== undefined && previous.status === status;
    const reason = keepsStatus ? previous?.reason : proposition.reason;
    inventory.push({
      claim_key: proposition.claim_key,
      claim_text: proposition.claim_text,
      role: proposition.role,
      status,
      span: { start: proposition.span.start, end: proposition.span.end },
      ...(keepsStatus && status === "modeled" && previous?.semantic_key
        ? { semantic_key: previous.semantic_key }
        : {}),
      ...(status !== "modeled" && reason !== undefined ? { reason } : {}),
    });
    changes.push({
      claim_key: proposition.claim_key,
      change,
      ...(previous !== undefined
        ? { before: { role: previous.role, status: previous.status } }
        : {}),
      after: { role: proposition.role, status },
    });
  }
  for (const entry of stored) {
    if (carried.has(entry.claim_key)) continue;
    changes.push({
      claim_key: entry.claim_key,
      change: "dropped",
      before: { role: entry.role, status: entry.status },
    });
  }
  return { inventory, changes, modeledBecameContext };
}

function summarize(
  changes: readonly InventoryClaimChange[],
  inventory: readonly InventoryEntry[],
): InventoryRederivationSummary {
  return {
    keptModeled: inventory.filter((entry) => entry.status === "modeled").length,
    roleChanges: changes.filter(
      (change) =>
        change.before !== undefined &&
        change.after !== undefined &&
        change.before.role !== change.after.role,
    ).length,
    newlyUnresolved: changes.filter(
      (change) =>
        change.change === "new_unresolved" ||
        change.change === "now_unresolved",
    ).length,
    droppedClaims: changes.filter((change) => change.change === "dropped")
      .length,
    downgradedModeled: changes.filter(
      (change) =>
        change.before?.status === "modeled" &&
        change.after?.status !== "modeled",
    ).length,
  };
}

function planOne(
  workspaceRoot: string,
  relativePath: string,
  entity: ExtractedEntity,
  extracted: readonly ExtractedRelationship[],
  shards: readonly ExtractedRelationship[],
  facts: FactClaimIndex,
): InventoryRederivation | null {
  if (entity.type !== "req" || !advertisesContract(entity)) return null;
  const relationships = relationshipsFor(entity.id, extracted, shards);
  const payload = {
    type: entity.type,
    id: entity.id,
    properties: entity as unknown as Record<string, unknown>,
    relationships,
  };
  const receipt = analyzeSemanticAdvisorInput({ payload }).receipt;
  const before = validateSemanticInventoryBoundary(
    payload,
    relationships,
    receipt,
  );
  if (!before.applicable || before.errors.length === 0) return null;

  const stored = storedInventory(entity);
  const { inventory, changes, modeledBecameContext } = rederive(
    stored,
    receipt.propositions,
  );
  const contract: InventoryContract = {
    semantic_inventory_version: SEMANTIC_INVENTORY_VERSION,
    semantic_source_field: semanticSourceOf(payload).field,
    semantic_source_hash: before.sourceHash,
    semantic_inventory: inventory,
    logic_claims: inventory
      .filter((entry) => !CONTEXT_ROLES.has(entry.role))
      .map((entry) => entry.claim_key),
  };
  const reasons: string[] = [];
  for (const claimKey of modeledBecameContext) {
    reasons.push(
      `modeled claim ${claimKey} is now classified as context (${inventory.find((entry) => entry.claim_key === claimKey)?.role ?? "context"}); its grounding cannot stay`,
    );
  }

  const groundingKeys: string[] = [];
  for (const relationship of relationships) {
    if (!GROUNDING_RELATIONSHIPS.has(relationship.type)) continue;
    const claimKey = facts.claimKey(relationship.to);
    if (claimKey === undefined) {
      reasons.push(
        `grounding target ${relationship.to} (${relationship.type}) declares no claim_key`,
      );
      continue;
    }
    groundingKeys.push(claimKey);
  }
  const modeledKeys = inventory
    .filter((entry) => entry.status === "modeled")
    .map((entry) => entry.claim_key);
  for (const claimKey of new Set(groundingKeys)) {
    if (modeledKeys.includes(claimKey)) continue;
    const dropped = changes.find(
      (change) => change.claim_key === claimKey && change.change === "dropped",
    );
    reasons.push(
      dropped !== undefined
        ? `grounded claim ${claimKey} no longer exists in the current advisor's inventory`
        : `grounded claim ${claimKey} is not a modeled claim of the re-derived inventory`,
    );
  }

  const nextProperties = {
    ...(entity as unknown as Record<string, unknown>),
    ...contract,
  };
  const nextPayload = { ...payload, properties: nextProperties };
  const after = validateSemanticInventoryBoundary(
    nextPayload,
    relationships,
    analyzeSemanticAdvisorInput({ payload: nextPayload }).receipt,
  );
  for (const error of after.errors) {
    reasons.push(`re-derived inventory would still fail ingestion: ${error}`);
  }

  return {
    requirementId: entity.id,
    path: relativePath,
    errors: before.errors,
    safe: reasons.length === 0,
    reasons: [...new Set(reasons)],
    summary: summarize(changes, inventory),
    changes,
    contract,
    contractHash: createHash("sha256")
      .update(canonicalJson(contract))
      .digest("hex"),
  };
}

function readShardRelationships(
  workspaceRoot: string,
): ExtractedRelationship[] {
  try {
    return readAllShards(path.join(workspaceRoot, ".kb")).map(
      ({ type, from, to }) => ({ type, from, to }),
    );
  } catch {
    // Malformed shards fail sync with their own diagnostic.
    return [];
  }
}

/**
 * Every current requirement whose stored inventory contract no longer matches
 * the current semantic advisor, with its re-derived contract. Read-only;
 * reports all of them instead of stopping at the first. `onlyId` limits the
 * scan to one requirement.
 */
// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export function planInventoryRederivation(
  workspaceRoot: string,
  onlyId?: string,
): InventoryRederivation[] {
  const shards = readShardRelationships(workspaceRoot);
  const facts = new FactClaimIndex(workspaceRoot);
  const plans: InventoryRederivation[] = [];
  const files = listLaneMarkdownFiles(workspaceRoot, ["requirements"]);
  // The canonical file stem is the id; fall back to every file otherwise.
  const preferred =
    onlyId === undefined
      ? files
      : files.filter(
          (file) => path.basename(file.relativePath, ".md") === onlyId,
        );
  for (const file of preferred.length > 0 ? preferred : files) {
    let result: ReturnType<typeof extractFromMarkdown>;
    try {
      result = extractFromMarkdown(file.absolutePath);
    } catch {
      continue;
    }
    if (onlyId !== undefined && result.entity.id !== onlyId) continue;
    const plan = planOne(
      workspaceRoot,
      file.relativePath,
      result.entity,
      result.relationships,
      shards,
      facts,
    );
    if (plan !== null) plans.push(plan);
  }
  return plans;
}

/**
 * Rewrite the inventory contract keys of one requirement's frontmatter and
 * confirm every other frontmatter field reads back unchanged.
 */
function rewriteContract(
  content: string,
  contract: InventoryContract,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const document = parseDocument(slice.text);
  if (document.errors.length > 0) return null;
  const current = document.toJS() as Record<string, unknown>;
  const flowSpan = (span: InventoryEntry["span"]) => {
    const node = document.createNode(span) as { flow?: boolean };
    node.flow = true;
    return node;
  };
  for (const [key, value] of Object.entries(contract)) {
    if (isDeepStrictEqual(current[key], value)) continue;
    const previous = current[key];
    if (
      key === "semantic_inventory" &&
      Array.isArray(previous) &&
      previous.length === contract.semantic_inventory.length &&
      contract.semantic_inventory.every(
        (entry, index) =>
          isRecord(previous[index]) &&
          previous[index].claim_key === entry.claim_key,
      )
    ) {
      // Same claims in the same order: edit only the fields that changed so
      // untouched entries keep their exact formatting.
      contract.semantic_inventory.forEach((entry, index) => {
        const old = previous[index] as Record<string, unknown>;
        const fields = new Set([...Object.keys(old), ...Object.keys(entry)]);
        for (const field of fields) {
          const next = (entry as Record<string, unknown>)[field];
          if (isDeepStrictEqual(old[field], next)) continue;
          if (next === undefined) {
            document.deleteIn([key, index, field]);
          } else {
            document.setIn(
              [key, index, field],
              field === "span" ? flowSpan(entry.span) : next,
            );
          }
        }
      });
      continue;
    }
    const node = document.createNode(value);
    if (key === "semantic_inventory" && "items" in node) {
      for (const item of (node as { items: unknown[] }).items) {
        const span = (
          item as { get?: (k: string, keep: boolean) => unknown }
        ).get?.("span", true) as { flow?: boolean } | undefined;
        if (span !== undefined) span.flow = true;
      }
    }
    document.set(key, node);
  }
  let rendered = document.toString({
    lineWidth: 0,
    flowCollectionPadding: false,
  });
  if (slice.eol === "\r\n") rendered = rendered.replace(/\r?\n/g, "\r\n");
  try {
    const before = loadYaml(slice.text);
    const after = loadYaml(rendered);
    if (!isRecord(before) || !isRecord(after)) return null;
    for (const key of new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ])) {
      const expected =
        key in contract
          ? (contract as Record<string, unknown>)[key]
          : before[key];
      if (!isDeepStrictEqual(after[key], expected)) return null;
    }
  } catch {
    return null;
  }
  return `${slice.prefix}${rendered}${slice.suffix}`;
}

// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export type InventoryRederivationOutcome = Readonly<{
  requirementId: string;
  path: string;
  outcome: "rederived" | "unchanged";
  summary?: InventoryRederivationSummary;
}>;

/**
 * Apply the safe re-derivation of one requirement. When `expectedContractHash`
 * is given (the migration plan's evidence), the current re-derivation must
 * still produce exactly that contract. A requirement that no longer drifts is
 * left unchanged, so repeated runs are no-ops.
 */
// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export function applyInventoryRederivation(
  workspaceRoot: string,
  requirementId: string,
  expectedContractHash?: string,
): InventoryRederivationOutcome {
  const plan = planInventoryRederivation(workspaceRoot, requirementId).find(
    (candidate) => candidate.requirementId === requirementId,
  );
  if (plan === undefined) {
    return { requirementId, path: "", outcome: "unchanged" };
  }
  if (!plan.safe) {
    throw new Error(
      `Requirement ${requirementId} cannot be re-derived automatically: ${plan.reasons.join("; ")}`,
    );
  }
  if (
    expectedContractHash !== undefined &&
    plan.contractHash !== expectedContractHash
  ) {
    throw new Error(
      `Requirement ${requirementId} changed since planning; rerun kibi migrate and approve the new plan.`,
    );
  }
  const absolute = path.join(workspaceRoot, plan.path);
  const content = readText(absolute);
  const next =
    content === null ? null : rewriteContract(content, plan.contract);
  if (next === null) {
    throw new Error(
      `Requirement ${requirementId}: the re-derived inventory could not be written without changing other frontmatter fields.`,
    );
  }
  // The written requirement must now pass ingestion exactly as sync sees it.
  const reread = extractFromMarkdownString(next, absolute);
  if (reread.entity.semantic_source_hash !== plan.contract.semantic_source_hash)
    throw new Error(
      `Requirement ${requirementId}: re-derived inventory did not read back.`,
    );
  writeFileAtomically(absolute, next);
  return {
    requirementId,
    path: plan.path,
    outcome: "rederived",
    summary: plan.summary,
  };
}

/** Apply every safe re-derivation; unsafe ones are returned untouched. */
// implements REQ-kibi-proposition-complete-ingestion, REQ-cli-schema-migration
export function applySafeInventoryRederivations(workspaceRoot: string): {
  rederived: InventoryRederivationOutcome[];
  manual: InventoryRederivation[];
} {
  const plans = planInventoryRederivation(workspaceRoot);
  const rederived: InventoryRederivationOutcome[] = [];
  for (const plan of plans.filter((candidate) => candidate.safe)) {
    rederived.push(
      applyInventoryRederivation(
        workspaceRoot,
        plan.requirementId,
        plan.contractHash,
      ),
    );
  }
  return { rederived, manual: plans.filter((candidate) => !candidate.safe) };
}

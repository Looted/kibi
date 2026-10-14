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

import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  MIN_WHY_CHANGED_WORDS,
  WHY_THIS_CHANGED_HEADING,
  carriesFirmness,
  effectiveFirmness,
  firmnessIsImplicit,
  firmnessRef,
  supersedeAcknowledgement,
  whyThisChangedWords,
} from "../../decision-firmness.js";
import {
  firmEditGuidance,
  unapprovedFirmEdit,
} from "../../firm-decision-edit.js";
import {
  listLaneMarkdownFiles,
  readText,
} from "../../operations/migration/kb-sources.js";
import { readAllShards } from "../../relationships/shards.js";
import { readKbManifest } from "../../utils/kb-manifest.js";
import type { Violation } from "../../utils/rule-registry.js";
import {
  type AuthoredEntity,
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "./entity-context.js";

/** A firm decision must cite the human words it rests on (blocking). */
// implements REQ-kb-decision-firmness
export const DECISION_FIRM_UNREFERENCED_RULE = "decision-firm-unreferenced";
/** Only a firm decision may supersede a firm decision (blocking). */
// implements REQ-kb-decision-firmness
export const DECISION_FIRM_SUPERSEDED_RULE = "decision-firm-superseded";
/** A firm decision's claim must not change in place without new human words (blocking). */
// implements REQ-kb-firm-decision-edit
export const DECISION_FIRM_EDITED_RULE = "decision-firm-edited";
/** A supersede must say why under "Why this changed" (blocking). */
// implements REQ-kb-decision-firmness
export const SUPERSEDES_REASON_MISSING_RULE = "supersedes-reason-missing";
/** How many legacy supersedes the schema 9 migration acknowledged (info). */
// implements REQ-kb-decision-firmness
export const SUPERSEDES_REASON_ACKNOWLEDGED_RULE =
  "supersedes-reason-acknowledged";

// implements REQ-kb-decision-firmness
export const DECISION_FIRMNESS_RULES = [
  DECISION_FIRM_UNREFERENCED_RULE,
  DECISION_FIRM_SUPERSEDED_RULE,
  DECISION_FIRM_EDITED_RULE,
  SUPERSEDES_REASON_MISSING_RULE,
  SUPERSEDES_REASON_ACKNOWLEDGED_RULE,
] as const;

const DECISION_LANES = ["requirements", "adr"] as const;

/** The schema version from which a supersede must explain itself. */
const SUPERSEDES_REASON_SCHEMA_VERSION = 9;

/**
 * The schema version from which a decision without `firmness` reads its
 * firmness from its origin, so a person's or imported rule is firm.
 */
// implements REQ-kb-decision-firmness-from-origin
export const FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION = 10;

/**
 * Told on a KB older than schema 10: the pending schema upgrade acknowledges
 * supersedes of decisions that only became firm when firmness started to
 * follow origin.
 */
const PRE_SCHEMA10_FIRM_NOTE =
  " This decision has no firmness and was not written by an agent, so it reads as firm from schema 10; supersedes recorded before schema 10 are acknowledged by the plan's schema-config-upgrade (kibi migrate --yes).";

/**
 * Told on a KB older than schema 9: the pending schema upgrade acknowledges
 * supersedes recorded before the rule existed, so no edit is required now.
 */
const PRE_SCHEMA9_SUPERSEDES_NOTE =
  " Supersedes recorded before schema 9 are acknowledged by the plan's schema-config-upgrade (kibi migrate --yes); add the reason only when you next touch the requirement.";

/** Every authored requirement and ADR. */
// implements REQ-kb-decision-firmness
export function listDecisionEntities(workspaceRoot: string): AuthoredEntity[] {
  const entities: AuthoredEntity[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, DECISION_LANES)) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const entity = readAuthoredEntity(content, file.relativePath);
    if (entity !== null && carriesFirmness(entity.type)) entities.push(entity);
  }
  return entities;
}

/**
 * Supersedes edges from requirements and ADRs, keyed by the superseding id,
 * read from authored `links` and the relationship shards so the check and the
 * migration agree before a sync. A shard edge whose source entity no longer
 * exists is ignored: it must not make its target look replaced.
 */
// implements REQ-kb-decision-firmness
export function authoredSupersedes(
  workspaceRoot: string,
  entities: readonly AuthoredEntity[],
): Map<string, Set<string>> {
  const edges = new Map<string, Set<string>>();
  const known = new Set(entities.map((entity) => entity.id));
  const add = (from: string, to: string) => {
    const targets = edges.get(from) ?? new Set<string>();
    targets.add(to);
    edges.set(from, targets);
  };
  for (const entity of entities) {
    const links = entity.data.links;
    if (!Array.isArray(links)) continue;
    for (const link of links) {
      if (
        link !== null &&
        typeof link === "object" &&
        (link as { type?: unknown }).type === "supersedes" &&
        typeof (link as { target?: unknown }).target === "string"
      ) {
        add(entity.id, (link as { target: string }).target);
      }
    }
  }
  try {
    for (const relationship of readAllShards(path.join(workspaceRoot, ".kb"))) {
      if (relationship.type === "supersedes" && known.has(relationship.from))
        add(relationship.from, relationship.to);
    }
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  return edges;
}

function supersededIds(edges: ReadonlyMap<string, Set<string>>): Set<string> {
  const superseded = new Set<string>();
  for (const targets of edges.values())
    for (const target of targets) superseded.add(target);
  return superseded;
}

/**
 * Superseding requirements and ADRs, whatever their status, without a "Why
 * this changed" explanation. The schema 9 migration acknowledges their edges
 * once, retired ones included, so one that becomes current again does not
 * start blocking; read-only.
 */
// implements REQ-kb-decision-firmness
export function unexplainedSupersedes(
  entities: readonly AuthoredEntity[],
  edges: ReadonlyMap<string, Set<string>>,
): AuthoredEntity[] {
  return entities
    .filter(
      (entity) =>
        edges.has(entity.id) &&
        whyThisChangedWords(entity.body) < MIN_WHY_CHANGED_WORDS,
    )
    .sort((left, right) => left.id.localeCompare(right.id));
}

/** The supersede edges of an entity, as the manifest acknowledges them. */
// implements REQ-kb-decision-firmness
export function supersedeAcknowledgements(
  id: string,
  edges: ReadonlyMap<string, Set<string>>,
): string[] {
  return [...(edges.get(id) ?? [])]
    .sort()
    .map((target) => supersedeAcknowledgement(id, target));
}

/**
 * Supersede edges (`FROM -> TO`) whose target reads as firm only because
 * firmness follows origin (it has no `firmness` and an agent did not write
 * it) and whose superseder is not firm, retired entities included. These
 * were allowed before schema 10; the migration acknowledges them once.
 */
// implements REQ-kb-decision-firmness-from-origin
export function implicitFirmSupersedes(
  entities: readonly AuthoredEntity[],
  edges: ReadonlyMap<string, Set<string>>,
): string[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const found: string[] = [];
  for (const [from, targets] of edges) {
    const source = byId.get(from);
    if (
      source === undefined ||
      effectiveFirmness(
        source.type,
        source.data.firmness,
        source.data.origin,
      ) === "firm"
    )
      continue;
    for (const to of targets) {
      const target = byId.get(to);
      if (
        target !== undefined &&
        firmnessIsImplicit(target.type, target.data.firmness) &&
        effectiveFirmness(target.type, undefined, target.data.origin) === "firm"
      )
        found.push(supersedeAcknowledgement(from, to));
    }
  }
  return found.sort();
}

/** Evaluate the firmness rules over authored requirements and ADRs. */
// implements REQ-kb-decision-firmness
export function evaluateDecisionFirmness(
  entities: readonly AuthoredEntity[],
  edges: ReadonlyMap<string, Set<string>>,
  rules: ReadonlySet<string> = new Set(DECISION_FIRMNESS_RULES),
  acknowledged: ReadonlySet<string> = new Set(),
  options: Readonly<{
    schemaVersion?: number | null;
    /** Edges the schema 10 migration recorded (`FROM -> TO`). */
    firmSupersedeAcknowledged?: ReadonlySet<string>;
  }> = {},
): Violation[] {
  const preSchema9 =
    typeof options.schemaVersion === "number" &&
    options.schemaVersion < SUPERSEDES_REASON_SCHEMA_VERSION;
  const preSchema10 =
    typeof options.schemaVersion === "number" &&
    options.schemaVersion < FIRMNESS_FROM_ORIGIN_SCHEMA_VERSION;
  const firmAcknowledged = options.firmSupersedeAcknowledged ?? new Set();
  const findings: Violation[] = [];
  const superseded = supersededIds(edges);
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  const current = entities
    .filter((entity) => isCurrentAuthoredEntity(entity, superseded))
    .sort((left, right) => left.id.localeCompare(right.id));
  const firmnessOf = (entity: AuthoredEntity) =>
    effectiveFirmness(entity.type, entity.data.firmness, entity.data.origin);

  // Only an authored `firmness: firm` must cite the person's words: a
  // decision that reads as firm from its origin already names its author.
  if (rules.has(DECISION_FIRM_UNREFERENCED_RULE)) {
    for (const entity of current) {
      if (entity.data.firmness !== "firm") continue;
      if (firmnessRef({ type: entity.type, ...entity.data }) !== undefined)
        continue;
      findings.push({
        rule: DECISION_FIRM_UNREFERENCED_RULE,
        entityId: entity.id,
        description: `${entity.id} is marked firmness: firm but names no human words it rests on (origin.ref${entity.type === "req" ? " or approval_ref" : ""} is missing)`,
        suggestion:
          "Set origin.ref to the message, review or ticket where a human stated this rule; if no human stated it, use firmness: default (or exploratory for a guess)",
        source: entity.path,
        evidence: { type: entity.type, firmness: "firm" },
      });
    }
  }

  // Every superseder counts, retired ones too: replacing a non-firm
  // superseder must not launder the overruled firm decision.
  if (rules.has(DECISION_FIRM_SUPERSEDED_RULE)) {
    for (const entity of [...entities].sort((left, right) =>
      left.id.localeCompare(right.id),
    )) {
      if (firmnessOf(entity) === "firm") continue;
      const implicit = new Set<string>();
      const firmTargets = [...(edges.get(entity.id) ?? [])]
        .filter((id) => {
          const target = byId.get(id);
          if (target === undefined || firmnessOf(target) !== "firm")
            return false;
          if (!firmnessIsImplicit(target.type, target.data.firmness))
            return true;
          // Recorded before firmness followed origin: acknowledged once.
          if (firmAcknowledged.has(supersedeAcknowledgement(entity.id, id)))
            return false;
          implicit.add(id);
          return true;
        })
        .sort();
      if (firmTargets.length === 0) continue;
      findings.push({
        rule: DECISION_FIRM_SUPERSEDED_RULE,
        entityId: entity.id,
        description: `${entity.id} (firmness: ${firmnessOf(entity)}) supersedes the firm decision${firmTargets.length === 1 ? "" : "s"} ${firmTargets.join(", ")}; only a human may change a firm decision`,
        suggestion: `Ask the person who stated the firm decision; if they agree, mark the replacement firmness: firm with origin.ref to their words, otherwise remove the supersedes link and propose the change instead${preSchema10 && implicit.size > 0 ? `.${PRE_SCHEMA10_FIRM_NOTE}` : ""}`,
        source: entity.path,
        evidence: { firmness: firmnessOf(entity), firmTargets },
      });
    }
  }

  const currentIds = new Set(current.map((entity) => entity.id));
  const unexplained = unexplainedSupersedes(entities, edges).filter((entity) =>
    currentIds.has(entity.id),
  );
  const isAcknowledged = (entity: AuthoredEntity) =>
    supersedeAcknowledgements(entity.id, edges).every((edge) =>
      acknowledged.has(edge),
    );
  const exempt = unexplained.filter(isAcknowledged);
  if (rules.has(SUPERSEDES_REASON_MISSING_RULE)) {
    for (const entity of unexplained) {
      if (isAcknowledged(entity)) continue;
      const targets = [...(edges.get(entity.id) ?? [])].sort();
      const unacknowledged = targets.filter(
        (target) =>
          !acknowledged.has(supersedeAcknowledgement(entity.id, target)),
      );
      findings.push({
        rule: SUPERSEDES_REASON_MISSING_RULE,
        entityId: entity.id,
        description: `${entity.id} supersedes ${unacknowledged.join(", ")} without a '## ${WHY_THIS_CHANGED_HEADING}' section of at least ${MIN_WHY_CHANGED_WORDS} words`,
        suggestion: `Add '## ${WHY_THIS_CHANGED_HEADING}' to the body: name the evidence (a failing test, a measured cost, a constraint the old decision missed, a new requirement) and answer the superseded decision's reasoning. A preference is not evidence; propose it instead of superseding.${preSchema9 ? PRE_SCHEMA9_SUPERSEDES_NOTE : ""}`,
        source: entity.path,
        evidence: { type: entity.type, supersedes: unacknowledged },
      });
    }
  }
  if (rules.has(SUPERSEDES_REASON_ACKNOWLEDGED_RULE) && exempt.length) {
    findings.push({
      rule: SUPERSEDES_REASON_ACKNOWLEDGED_RULE,
      entityId: "workspace",
      description: `${exempt.length} current superseding requirement${exempt.length === 1 ? " or ADR was" : "s and ADRs were"} recorded before schema 9 without a '${WHY_THIS_CHANGED_HEADING}' section`,
      suggestion:
        "When you next touch one, add the reason if the history or a person states it; never invent one",
      evidence: {
        total: exempt.length,
        ids: exempt.slice(0, 25).map((entity) => entity.id),
      },
    });
  }
  return findings;
}

/** Reads a workspace-relative file as committed at HEAD; null when absent. */
// implements REQ-kb-firm-decision-edit
export type CommittedFileReader = (relativePath: string) => string | null;

/**
 * The decision files whose working copy differs from HEAD, with a reader for
 * their committed content; undefined outside a Git checkout or before the
 * first commit, where there is nothing to compare against.
 */
function committedDecisionChanges(
  workspaceRoot: string,
): { changed: Set<string>; read: CommittedFileReader } | undefined {
  try {
    const listed = execFileSync(
      "git",
      ["-C", workspaceRoot, "diff", "--name-only", "--relative", "-z", "HEAD"],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: "pipe" },
    );
    const changed = new Set(listed.split("\0").filter((name) => name !== ""));
    const read: CommittedFileReader = (relativePath) => {
      try {
        return execFileSync(
          "git",
          ["-C", workspaceRoot, "show", `HEAD:./${relativePath}`],
          { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: "pipe" },
        );
      } catch {
        return null;
      }
    };
    return { changed, read };
  } catch {
    return undefined;
  }
}

/**
 * Current firm requirements and ADRs whose claim changed since HEAD without
 * citing new human words: an in-place edit that bypassed kb_upsert's guard.
 * A decision new since HEAD, or one that was not firm there, is not judged.
 */
// implements REQ-kb-firm-decision-edit
export function evaluateFirmDecisionEdits(
  entities: readonly AuthoredEntity[],
  edges: ReadonlyMap<string, Set<string>>,
  changed: ReadonlySet<string>,
  readCommitted: CommittedFileReader,
): Violation[] {
  const superseded = supersededIds(edges);
  const findings: Violation[] = [];
  for (const entity of [...entities].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    if (!changed.has(entity.path)) continue;
    if (!isCurrentAuthoredEntity(entity, superseded)) continue;
    const committed = readCommitted(entity.path);
    if (committed === null) continue;
    const before = readAuthoredEntity(committed, entity.path);
    if (before === null || before.type !== entity.type) continue;
    const fields = unapprovedFirmEdit(before, entity);
    if (fields.length === 0) continue;
    findings.push({
      rule: DECISION_FIRM_EDITED_RULE,
      entityId: entity.id,
      description: `${entity.id} is a firm decision whose ${fields.join(", ")} changed since HEAD without citing new human words`,
      suggestion: `${firmEditGuidance(entity.type)}. To undo the edit, restore ${entity.path} from HEAD`,
      source: entity.path,
      evidence: { type: entity.type, changed: fields },
    });
  }
  return findings;
}

/** Read the authored decisions once and evaluate the selected rules. */
// implements REQ-kb-decision-firmness, REQ-kb-firm-decision-edit
export function collectDecisionFirmnessViolations(
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Violation[] {
  if (!DECISION_FIRMNESS_RULES.some((rule) => rules.has(rule))) return [];
  const entities = listDecisionEntities(workspaceRoot);
  const manifest = readKbManifest(workspaceRoot);
  const edges = authoredSupersedes(workspaceRoot, entities);
  const committed = rules.has(DECISION_FIRM_EDITED_RULE)
    ? committedDecisionChanges(workspaceRoot)
    : undefined;
  const edited = committed
    ? evaluateFirmDecisionEdits(
        entities,
        edges,
        committed.changed,
        committed.read,
      )
    : [];
  return [
    ...edited,
    ...evaluateDecisionFirmness(
      entities,
      edges,
      rules,
      new Set(manifest?.supersedesReasonAcknowledged ?? []),
      {
        schemaVersion: manifest?.schemaVersion ?? null,
        firmSupersedeAcknowledged: new Set(
          manifest?.firmSupersedeAcknowledged ?? [],
        ),
      },
    ),
  ];
}

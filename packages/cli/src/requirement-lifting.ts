/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { escapeAtom, normalizeEntityId, parseTriples } from "./prolog/codec.js";
import type { PrologPort } from "./public/operations/runtime-types.js";

export const CURRENT_REQ_STATUSES = new Set([
  "open",
  "in_progress",
  "closed",
  "active",
  "approved",
]);

export const SUPERSEDED_ADR_STATUSES = new Set([
  "superseded",
  "deprecated",
  "rejected",
]);

export const FACT_LINKS = new Set([
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
]);

/**
 * Typed relationships used to lift matched scenarios, tests, symbols and facts
 * to their governing requirements and resolve supersession chains.
 * Intentionally excludes `relates_to`.
 */
export const LIFT_RELATIONSHIPS = [
  "specified_by",
  "verified_by",
  "validates",
  "assumes",
  "implements",
  "constrains",
  "requires_property",
  "requires_predicate",
  "requires_rule",
  "supersedes",
] as const;

export type LiftEdge = Readonly<{
  rel: string;
  from: string;
  to: string;
}>;

/**
 * Direct requirement/target IDs a non-requirement entity points back to.
 * Current ADRs never lift to requirements.
 */
export function owningRequirements(
  id: string,
  type: string,
  edges: readonly LiftEdge[],
): string[] {
  if (type === "adr") return [];
  const owners: string[] = [];
  for (const edge of edges) {
    if (type === "scenario" && edge.rel === "specified_by" && edge.to === id)
      owners.push(edge.from);
    if (type === "test" && edge.rel === "verified_by" && edge.to === id)
      owners.push(edge.from);
    if (type === "test" && edge.rel === "validates" && edge.from === id)
      owners.push(edge.to);
    if (type === "symbol" && edge.rel === "implements" && edge.from === id)
      owners.push(edge.to);
    if (type === "fact" && FACT_LINKS.has(edge.rel) && edge.to === id)
      owners.push(edge.from);
  }
  return owners;
}

/** Unique scenario IDs that assume `factId` (`SCEN --assumes--> FACT`). */
export function assumedScenarioIds(
  factId: string,
  edges: readonly LiftEdge[],
): string[] {
  const scenarios: string[] = [];
  for (const edge of edges) {
    if (edge.rel === "assumes" && edge.to === factId && edge.from.length > 0) {
      if (!scenarios.includes(edge.from)) scenarios.push(edge.from);
    }
  }
  return scenarios;
}

/** Requirement IDs that specify `scenarioId` (`REQ --specified_by--> SCEN`). */
function scenarioOwners(
  scenarioId: string,
  edges: readonly LiftEdge[],
): string[] {
  const owners: string[] = [];
  for (const edge of edges) {
    if (
      edge.rel === "specified_by" &&
      edge.to === scenarioId &&
      edge.from.length > 0
    ) {
      owners.push(edge.from);
    }
  }
  return owners;
}

/**
 * Resolve a matched test's direct targets: targets specified by a requirement
 * are scenarios (2-hop `TEST -> SCEN -> REQ`); others are direct 1-hop targets.
 */
export function liftTestTargets(
  testId: string,
  targets: readonly string[],
  targetEdges: readonly LiftEdge[],
): { owner: string; twoHop: boolean; via: string }[] {
  const lifted: { owner: string; twoHop: boolean; via: string }[] = [];
  for (const target of targets) {
    const owners = scenarioOwners(target, targetEdges);
    if (owners.length === 0) {
      lifted.push({ owner: target, twoHop: false, via: `test ${testId}` });
      continue;
    }
    for (const owner of owners) {
      lifted.push({
        owner,
        twoHop: true,
        via: `test ${testId} via ${target}`,
      });
    }
  }
  return lifted;
}

/**
 * Resolve a fact assumed by scenarios (`FACT <- assumes <- SCEN <- specified_by <- REQ`).
 */
export function liftAssumedFact(
  factId: string,
  scenarios: readonly string[],
  targetEdges: readonly LiftEdge[],
): { owner: string; scenario: string; via: string }[] {
  return scenarios.flatMap((scenario) =>
    scenarioOwners(scenario, targetEdges).map((owner) => ({
      owner,
      scenario,
      via: `fact ${factId} via ${scenario}`,
    })),
  );
}

/**
 * Follow `supersededBy` (`oldId -> replacementId`) up to `maxHops` hops with
 * cycle detection, returning the terminal non-superseded ID or `null` if a
 * cycle or deeper chain remains unresolved.
 */
export function resolveSupersedesTarget(
  id: string,
  supersededBy: ReadonlyMap<string, string>,
  maxHops = 3,
): string | null {
  let current = id;
  const visited = new Set<string>([current]);
  for (let hop = 0; hop < maxHops; hop += 1) {
    const replacement = supersededBy.get(current);
    if (replacement === undefined) return current;
    if (visited.has(replacement)) return null;
    visited.add(replacement);
    current = replacement;
  }
  return supersededBy.has(current) ? null : current;
}

/** Query typed relationship edges for `seedIds` via `kb_relationship_edges/3`. */
export async function queryTypedEdges(
  prolog: Pick<PrologPort, "query">,
  relationships: readonly string[],
  seedIds: readonly string[],
  maxEdges = 2_000,
): Promise<LiftEdge[]> {
  const uniqueSeeds = [...new Set(seedIds.filter((id) => id.length > 0))];
  if (uniqueSeeds.length === 0 || relationships.length === 0) return [];
  const ids = uniqueSeeds.map((id) => `'${escapeAtom(id)}'`).join(",");
  const rels = relationships.join(",");
  const result = await prolog.query(
    `kb_relationship_edges([${rels}], [${ids}], Edges)`,
  );
  if (!result.success) return [];
  return parseTriples(String(result.bindings.Edges))
    .slice(0, maxEdges)
    .map(([rel, from, to]) => ({
      rel,
      from: normalizeEntityId(from),
      to: normalizeEntityId(to),
    }));
}

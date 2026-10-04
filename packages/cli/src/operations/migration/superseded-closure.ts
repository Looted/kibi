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

import path from "node:path";
import {
  type ExtractedRelationship,
  extractFromMarkdown,
} from "../../extractors/markdown.js";
import { readAllShards } from "../../relationships/shards.js";
import {
  listLaneMarkdownFiles,
  readText,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * A requirement another requirement supersedes is retired and must be
 * closed (the superseded-requirement-open rule). This module reads authored
 * sources, so the migration can plan before the KB compiles: superseded
 * requirements that are not closed, and supersession cycles, which no status
 * edit can resolve.
 */

/** The terminal requirement status. */
export const CLOSED_REQUIREMENT_STATUS = "closed";

/** A superseded requirement whose status is not closed. */
export type SupersededClosure = Readonly<{
  id: string;
  /** Workspace-relative path of the requirement's file. */
  path: string;
  status: string;
  supersededBy: readonly string[];
}>;

/** Requirements that supersede each other, directly or through a chain. */
export type SupersessionCycle = Readonly<{
  members: readonly string[];
  edges: readonly (readonly [string, string])[];
  files: readonly string[];
}>;

export type SupersessionPlan = Readonly<{
  closures: readonly SupersededClosure[];
  cycles: readonly SupersessionCycle[];
}>;

type SourceRequirement = Readonly<{ id: string; status: string; path: string }>;

function reachable(
  adjacency: ReadonlyMap<string, readonly string[]>,
  start: string,
): Set<string> {
  const seen = new Set<string>();
  const queue = [...(adjacency.get(start) ?? [])];
  while (queue.length > 0) {
    const node = queue.shift() as string;
    if (seen.has(node)) continue;
    seen.add(node);
    queue.push(...(adjacency.get(node) ?? []));
  }
  return seen;
}

/**
 * Sets of nodes that reach each other through the given edges (every
 * strongly connected component that contains a cycle), as sorted member
 * lists sorted by first member.
 */
// implements REQ-core-validation-rules
export function supersessionCycles(
  edges: readonly (readonly [string, string])[],
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const [from, to] of edges) {
    adjacency.set(from, [...(adjacency.get(from) ?? []), to]);
  }
  const reach = new Map<string, Set<string>>();
  const reachOf = (node: string): Set<string> => {
    let nodes = reach.get(node);
    if (nodes === undefined) {
      nodes = reachable(adjacency, node);
      reach.set(node, nodes);
    }
    return nodes;
  };
  const components = new Map<string, string[]>();
  for (const start of [...adjacency.keys()].sort()) {
    const fromStart = reachOf(start);
    if (!fromStart.has(start)) continue;
    const members = [...fromStart]
      .filter((node) => reachOf(node).has(start))
      .sort();
    components.set(members.join("\u0000"), members);
  }
  return [...components.values()].sort((left, right) =>
    (left[0] ?? "").localeCompare(right[0] ?? ""),
  );
}

function readRequirementsAndEdges(workspaceRoot: string): {
  requirements: Map<string, SourceRequirement>;
  edges: Array<[string, string]>;
} {
  const requirements = new Map<string, SourceRequirement>();
  const relationships: ExtractedRelationship[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, ["requirements"])) {
    try {
      const result = extractFromMarkdown(file.absolutePath);
      requirements.set(result.entity.id, {
        id: result.entity.id,
        status: String(result.entity.status ?? "").trim(),
        path: file.relativePath,
      });
      relationships.push(...result.relationships);
    } catch {
      // Unreadable requirements fail sync with their own diagnostic.
    }
  }
  try {
    relationships.push(...readAllShards(path.join(workspaceRoot, ".kb")));
  } catch {
    // Malformed shards fail sync with their own diagnostic.
  }
  const edges = new Map<string, [string, string]>();
  for (const relationship of relationships) {
    if (
      relationship.type !== "supersedes" ||
      !requirements.has(relationship.to)
    ) {
      continue;
    }
    edges.set(`${relationship.from}\u0000${relationship.to}`, [
      relationship.from,
      relationship.to,
    ]);
  }
  return {
    requirements,
    edges: [...edges.values()].sort(
      ([leftFrom, leftTo], [rightFrom, rightTo]) =>
        leftFrom.localeCompare(rightFrom) || leftTo.localeCompare(rightTo),
    ),
  };
}

/**
 * Superseded requirements that are not closed, and supersession cycles,
 * read from authored Markdown and relationship shards. Cycle members are
 * listed only under their cycle. Read-only.
 */
// implements REQ-core-validation-rules, REQ-cli-schema-migration
export function planSupersededClosures(
  workspaceRoot: string,
): SupersessionPlan {
  const { requirements, edges } = readRequirementsAndEdges(workspaceRoot);
  const cycles = supersessionCycles(edges);
  const inCycle = new Set(cycles.flat());
  const successors = new Map<string, string[]>();
  for (const [from, to] of edges) {
    successors.set(to, [...(successors.get(to) ?? []), from]);
  }
  const closures: SupersededClosure[] = [];
  for (const [id, supersededBy] of [...successors.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  )) {
    const requirement = requirements.get(id);
    if (
      requirement === undefined ||
      inCycle.has(id) ||
      requirement.status === CLOSED_REQUIREMENT_STATUS
    ) {
      continue;
    }
    closures.push({
      id,
      path: requirement.path,
      status: requirement.status,
      supersededBy: [...new Set(supersededBy)].sort(),
    });
  }
  return {
    closures,
    cycles: cycles.map((members) => {
      const memberSet = new Set(members);
      return {
        members,
        edges: edges.filter(
          ([from, to]) => memberSet.has(from) && memberSet.has(to),
        ),
        files: members
          .map((member) => requirements.get(member)?.path)
          .filter((file): file is string => file !== undefined),
      };
    }),
  };
}

export type SupersededClosureResult = Readonly<{
  closed: readonly SupersededClosure[];
  skipped: readonly Readonly<{ path: string; reason: string }>[];
}>;

/**
 * Set `status: closed` on each superseded requirement that is not closed,
 * editing only the status line (or appending it). Requirements in a
 * supersession cycle are never touched. With `planned`, only those ids are
 * closed. Idempotent: a closed requirement is not planned again.
 */
// implements REQ-cli-schema-migration
export function applySupersededClosures(
  workspaceRoot: string,
  planned?: ReadonlySet<string>,
): SupersededClosureResult {
  const closed: SupersededClosure[] = [];
  const skipped: Array<{ path: string; reason: string }> = [];
  for (const closure of planSupersededClosures(workspaceRoot).closures) {
    if (planned !== undefined && !planned.has(closure.id)) continue;
    const absolute = path.join(workspaceRoot, closure.path);
    const content = readText(absolute);
    const next =
      content === null
        ? null
        : withTopLevelField(content, "status", CLOSED_REQUIREMENT_STATUS);
    if (next === null) {
      skipped.push({
        path: closure.path,
        reason: "status could not be set without changing other fields",
      });
      continue;
    }
    writeFileAtomically(absolute, next);
    closed.push(closure);
  }
  return { closed, skipped };
}

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
import { load as loadYaml } from "js-yaml";
import {
  CONTEXT_REQUIRED_TYPES,
  assessContext,
  contextFinding,
  isContextAcknowledged,
} from "../../entity-body-context.js";
import { inferTypeFromPath } from "../../extractors/markdown.js";
import { requirementSemanticText } from "../../extractors/markdown.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
} from "../../operations/migration/kb-sources.js";
import { parseListOfLists, parsePrologValue } from "../../prolog/codec.js";
import type { Violation } from "../../utils/rule-registry.js";
import type { PrologPort } from "./runtime-types.js";

/** A current entity must carry body context (blocking). */
// implements REQ-kb-entity-body-context
export const ENTITY_CONTEXT_MISSING_RULE = "entity-context-missing";
/** How many legacy entities carry the review:context-missing tag (advisory). */
// implements REQ-kb-entity-body-context
export const ENTITY_CONTEXT_ACKNOWLEDGED_RULE = "entity-context-acknowledged";

// implements REQ-kb-entity-body-context
export const ENTITY_CONTEXT_RULES = [
  ENTITY_CONTEXT_MISSING_RULE,
  ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
] as const;

/** Statuses of entities that are no longer current. */
const RETIRED_STATUSES = new Set([
  "deprecated",
  "superseded",
  "archived",
  "removed",
]);

/** One authored entity document, front matter and body kept apart. */
// implements REQ-kb-entity-body-context
export type AuthoredEntity = Readonly<{
  id: string;
  type: string;
  path: string;
  data: Readonly<Record<string, unknown>>;
  body: string;
}>;

/**
 * Split an authored Markdown document into its front matter record and its
 * body. Returns null when the front matter is absent or does not parse.
 */
// implements REQ-kb-entity-body-context
export function readAuthoredEntity(
  content: string,
  relativePath: string,
): AuthoredEntity | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  let data: unknown;
  try {
    data = loadYaml(slice.text);
  } catch {
    return null;
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const type =
    typeof record.type === "string"
      ? record.type
      : (inferTypeFromPath(relativePath) ?? "");
  const id =
    typeof record.id === "string" && record.id.trim() !== ""
      ? record.id.trim()
      : path.basename(relativePath, ".md");
  const newline = slice.suffix.indexOf("\n");
  return {
    id,
    type,
    path: relativePath,
    data: record,
    body: newline < 0 ? "" : slice.suffix.slice(newline + 1),
  };
}

/** The entity fields the context rules read, with the derived meaning. */
// implements REQ-kb-entity-body-context
export function contextEntityOf(entity: AuthoredEntity): {
  title: unknown;
  semantic_text: unknown;
  fact_kind: unknown;
  tags: unknown;
} {
  const pinned = entity.data.semantic_text;
  return {
    title: entity.data.title,
    semantic_text:
      typeof pinned === "string" && pinned.trim() !== ""
        ? pinned
        : entity.type === "req"
          ? requirementSemanticText(entity.body)
          : undefined,
    fact_kind: entity.data.fact_kind,
    tags: entity.data.tags,
  };
}

/** Whether an authored entity is current: not retired, not superseded. */
// implements REQ-kb-entity-body-context
export function isCurrentAuthoredEntity(
  entity: AuthoredEntity,
  superseded: ReadonlySet<string>,
): boolean {
  const status = entity.data.status;
  return (
    !(typeof status === "string" && RETIRED_STATUSES.has(status)) &&
    !superseded.has(entity.id)
  );
}

const CONTEXT_LANES = [
  "requirements",
  "scenarios",
  "tests",
  "adr",
  "facts",
] as const;

/** Every authored entity of a type the context rules apply to. */
// implements REQ-kb-entity-body-context
export function listContextAuthoredEntities(
  workspaceRoot: string,
): AuthoredEntity[] {
  const entities: AuthoredEntity[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot, CONTEXT_LANES)) {
    const content = readText(file.absolutePath);
    if (content === null) continue;
    const entity = readAuthoredEntity(content, file.relativePath);
    if (
      entity !== null &&
      (CONTEXT_REQUIRED_TYPES as readonly string[]).includes(entity.type)
    ) {
      entities.push(entity);
    }
  }
  return entities;
}

/** Sources of ids some other entity supersedes, from the compiled store. */
async function supersededIds(
  prolog: Pick<PrologPort, "query">,
): Promise<Set<string>> {
  const result = await prolog.query(
    "findall([To], kb_relationship(supersedes, _From, To), Rows)",
  );
  if (!result.success) {
    throw new Error(
      `Unable to read supersedes relationships: ${result.error ?? "query failed"}`,
    );
  }
  return new Set(
    parseListOfLists(result.bindings.Rows ?? "[]").map(([to]) =>
      String(parsePrologValue(to ?? "")),
    ),
  );
}

/**
 * Evaluate the context rules over authored entities. Entities tagged
 * review:context-missing are acknowledged legacy: they never violate, and one
 * advisory finding counts them.
 */
// implements REQ-kb-entity-body-context
export function evaluateEntityContext(
  entities: readonly AuthoredEntity[],
  superseded: ReadonlySet<string>,
  rules: ReadonlySet<string> = new Set(ENTITY_CONTEXT_RULES),
): Violation[] {
  const findings: Violation[] = [];
  const acknowledged: { id: string; type: string }[] = [];
  const current = entities
    .filter((entity) => isCurrentAuthoredEntity(entity, superseded))
    .sort((left, right) => left.id.localeCompare(right.id));
  for (const entity of current) {
    const view = contextEntityOf(entity);
    const assessment = assessContext(entity.type, entity.body, view);
    if (assessment.ok) continue;
    if (isContextAcknowledged(view.tags)) {
      acknowledged.push({ id: entity.id, type: entity.type });
      continue;
    }
    if (!rules.has(ENTITY_CONTEXT_MISSING_RULE)) continue;
    const finding = contextFinding(entity.type, entity.id, entity.body, view);
    if (finding === null) continue;
    findings.push({
      rule: ENTITY_CONTEXT_MISSING_RULE,
      entityId: entity.id,
      description: finding.description,
      suggestion: finding.suggestion,
      source: entity.path,
      evidence: {
        type: entity.type,
        reason: finding.reason,
        contextWords: finding.words,
      },
    });
  }
  if (rules.has(ENTITY_CONTEXT_ACKNOWLEDGED_RULE) && acknowledged.length > 0) {
    const byType: Record<string, number> = {};
    for (const row of acknowledged) {
      byType[row.type] = (byType[row.type] ?? 0) + 1;
    }
    findings.push({
      rule: ENTITY_CONTEXT_ACKNOWLEDGED_RULE,
      entityId: "workspace",
      description: `${acknowledged.length} current entit${acknowledged.length === 1 ? "y is" : "ies are"} tagged review:context-missing and still lack body context (${Object.entries(
        byType,
      )
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([type, count]) => `${count} ${type}`)
        .join(", ")})`,
      suggestion:
        "Ask the person who knows why each entity exists, record the answer in its body, then remove the review:context-missing tag; never invent a reason",
      evidence: { total: acknowledged.length, byType },
    });
  }
  return findings;
}

/** Read authored entities and the supersedes edges once, then evaluate. */
// implements REQ-kb-entity-body-context
export async function collectEntityContextViolations(
  prolog: Pick<PrologPort, "query">,
  rules: ReadonlySet<string>,
  workspaceRoot: string,
): Promise<Violation[]> {
  if (!ENTITY_CONTEXT_RULES.some((rule) => rules.has(rule))) return [];
  return evaluateEntityContext(
    listContextAuthoredEntities(workspaceRoot),
    await supersededIds(prolog),
    rules,
  );
}

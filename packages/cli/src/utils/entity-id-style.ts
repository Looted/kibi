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

/**
 * Entity naming style (`entity-id-style`).
 *
 * Entities are named by what they govern (`REQ-cli-gc`), never by "the next
 * number". The compiled KB cannot tell a legacy numbered entity from a new one
 * (`created_at` is stamped at sync time when frontmatter omits it), so purely
 * numeric IDs are reported only at creation boundaries: a `kb_upsert` that
 * creates the entity, and staged added/renamed entity Markdown. Committed
 * legacy entities such as `REQ-003` are therefore never flagged. The Prolog
 * half of the rule (`check_entity_id_style/1`) reports filename-stem/`id`
 * mismatches over the whole KB.
 */

import * as path from "node:path";

/** Purely numeric entity ID such as `REQ-001` or `ADR-12`. */
// implements REQ-kibi-entity-id-style
export const NUMERIC_ENTITY_ID_PATTERN = /^[A-Z]+-\d+$/;

// implements REQ-kibi-entity-id-style
export type EntityIdStyleIssue = Readonly<{
  code: "numeric_id" | "stem_mismatch";
  message: string;
  suggestion: string;
}>;

// implements REQ-kibi-entity-id-style
export function isNumericEntityId(id: string): boolean {
  return NUMERIC_ENTITY_ID_PATTERN.test(id.trim());
}

/**
 * Filename stem for an authored Markdown source, or undefined for non-Markdown
 * sources (symbol manifests, code files, runtime `mcp://` provenance).
 */
// implements REQ-kibi-entity-id-style
export function markdownSourceStem(
  sourcePath: string | undefined,
): string | undefined {
  if (sourcePath === undefined) return undefined;
  const normalized = sourcePath.trim().replaceAll("\\", "/");
  if (!normalized.endsWith(".md") || normalized.includes("://")) {
    return undefined;
  }
  return path.posix.basename(normalized, ".md");
}

/**
 * Style issues for one newly created entity. Callers decide whether the entity
 * is new; this function never inspects the KB.
 */
// implements REQ-kibi-entity-id-style
export function entityIdStyleIssues(input: {
  readonly id: string;
  readonly sourcePath?: string | undefined;
}): EntityIdStyleIssue[] {
  const id = input.id.trim();
  const issues: EntityIdStyleIssue[] = [];
  if (isNumericEntityId(id)) {
    issues.push({
      code: "numeric_id",
      message: `Entity ID ${id} is a sequence number; parallel branches pick the same next number and collide.`,
      suggestion:
        "Name the entity by what it governs: <TYPE>-<area>-<behavior> in kebab-case (for example REQ-cli-gc). kb_search the area first and update or supersede an existing entity when one already covers the behavior.",
    });
  }
  const stem = markdownSourceStem(input.sourcePath);
  if (stem !== undefined && stem !== id) {
    issues.push({
      code: "stem_mismatch",
      message: `Entity ID ${id} does not match its filename stem ${stem}.`,
      suggestion: `Rename the file to ${id}.md or set frontmatter id: ${stem} so the file name and identity stay aligned.`,
    });
  }
  return issues;
}

/** Plain-text warnings for mutation receipts. */
// implements REQ-kibi-entity-id-style
export function entityIdStyleWarnings(input: {
  readonly id: string;
  readonly sourcePath?: string | undefined;
}): string[] {
  return entityIdStyleIssues(input).map(
    (issue) => `entity-id-style: ${issue.message} ${issue.suggestion}`,
  );
}

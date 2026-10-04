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
  type SourceRepair,
  findDanglingSources,
  shownSourceValue,
} from "../../operations/migration/source-paths.js";
import type { Violation } from "../../utils/rule-registry.js";

/** An authored source field that names no path, entity or URL. */
// implements REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export const SOURCE_PATH_DANGLING_RULE = "source-path-dangling";

function suggestion(source: SourceRepair): string {
  const compiled = `The compiled source is always the entity's own file (${source.file}), so the field carries nothing Kibi compiles.`;
  if (source.refused !== undefined) {
    return `kibi migrate cannot edit this source field safely (${source.refused}), so it plans a review_source_path_dangling action for a person. ${compiled}`;
  }
  if (source.fix.kind === "rewrite") {
    return `The file moved to ${source.fix.to}; kibi migrate rewrites the source field there (source_path_rewrite). ${compiled}`;
  }
  const why =
    source.fix.reason === "self"
      ? "it names the entity's own file"
      : "nothing it names can be mapped";
  return `kibi migrate removes this source field (source_path_rewrite) because ${why}. ${compiled}`;
}

/**
 * One blocking finding per authored source that resolves to nothing. The
 * evidence names the automatic fix (`rewrite` or `remove`) and, when the
 * edit is not safe, why (`refused`).
 */
// implements REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function sourcePathDanglingViolations(
  dangling: readonly SourceRepair[],
): Violation[] {
  return dangling.map((source) => ({
    rule: SOURCE_PATH_DANGLING_RULE,
    entityId: source.entityId,
    description: `${source.entityId} names source '${shownSourceValue(source.value)}', which is not an existing workspace path, an entity id or an http(s) URL`,
    suggestion: suggestion(source),
    source: source.file,
    evidence: {
      value: source.value,
      file: source.file,
      ...(source.fix.kind === "rewrite"
        ? { rewrite: source.fix.to }
        : { remove: source.fix.reason }),
      ...(source.refused !== undefined ? { refused: source.refused } : {}),
    },
  }));
}

/**
 * Read the authored `source` field of every entity file once and report the
 * values that resolve to nothing. The compiled `source` (the entity's own
 * file) always resolves, so the check reads authored frontmatter.
 */
// implements REQ-core-validation-rules, REQ-kibi-kb-lifecycle-integrity
export function collectSourcePathDanglingViolations(
  workspaceRoot: string,
): Violation[] {
  return sourcePathDanglingViolations(findDanglingSources(workspaceRoot));
}

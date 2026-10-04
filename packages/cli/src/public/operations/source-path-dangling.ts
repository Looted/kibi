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
  type DanglingSource,
  findDanglingSources,
} from "../../operations/migration/source-paths.js";
import type { Violation } from "../../utils/rule-registry.js";

/** An authored source field that names no path, entity or URL. */
export const SOURCE_PATH_DANGLING_RULE = "source-path-dangling";

function shown(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** One blocking finding per authored source that resolves to nothing. */
// implements REQ-core-validation-rules
export function sourcePathDanglingViolations(
  dangling: readonly DanglingSource[],
): Violation[] {
  return dangling.map((source) => ({
    rule: SOURCE_PATH_DANGLING_RULE,
    entityId: source.entityId,
    description: `${source.entityId} names source '${shown(source.value)}', which is not an existing workspace path, an entity id or an http(s) URL`,
    suggestion:
      source.rewrite !== undefined
        ? `The file moved to ${source.rewrite}; kibi migrate rewrites the source field there (source_path_rewrite)`
        : "Point source at the document this entity came from (a tracked path, optionally with #anchor; an entity id; or an http(s) URL), or remove the source field if nobody knows the origin",
    source: source.file,
    evidence: {
      value: source.value,
      file: source.file,
      ...(source.rewrite !== undefined ? { rewrite: source.rewrite } : {}),
    },
  }));
}

/**
 * Read the authored `source` field of every entity file once and report the
 * values that resolve to nothing. The compiled `source` (the entity's own
 * file) always resolves, so the check reads authored frontmatter.
 */
// implements REQ-core-validation-rules
export function collectSourcePathDanglingViolations(
  workspaceRoot: string,
): Violation[] {
  return sourcePathDanglingViolations(findDanglingSources(workspaceRoot));
}

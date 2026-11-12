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

import { existsSync, statSync } from "node:fs";
import * as path from "node:path";
import { parseEntityFromList, parseListOfLists } from "../../prolog/codec.js";
import type { Violation } from "../../utils/rule-registry.js";
import type { PrologPort } from "./runtime-types.js";

/**
 * A symbol whose source file exists but which Kibi could not place in it is
 * linked to no code: impact review, coverage and proofs never see it there.
 * kibi sync names it in its refresh output only, so the check reports every
 * such symbol as a warning (advisory, non-blocking).
 */
export const SYMBOL_COORDINATES_MISSING_RULE = "symbol-coordinates-missing";

const SYMBOL_PLACEMENT_QUERY =
  "findall([Id,symbol,Fields], (kb_entity(Id, symbol, Props), include([Key=_]>>memberchk(Key, [title,status,sourceFile,sourceLine]), Props, Fields)), Rows)";

const INACTIVE_STATUSES = new Set([
  "deprecated",
  "removed",
  "retired",
  "superseded",
]);

export async function collectSymbolCoordinatesMissingViolations(
  prolog: Pick<PrologPort, "query">,
  workspaceRoot: string,
  rules: ReadonlySet<string>,
): Promise<Violation[]> {
  if (!rules.has(SYMBOL_COORDINATES_MISSING_RULE)) return [];
  const rows = await prolog.query(SYMBOL_PLACEMENT_QUERY);
  if (!rows.success)
    throw new Error(
      `symbol-coordinates-missing symbol projection failed: ${rows.error ?? "unknown error"}`,
    );
  const listed = rows.bindings.Rows;
  if (listed === undefined) return [];
  const violations: Violation[] = [];
  for (const row of parseListOfLists(listed)) {
    const entity = parseEntityFromList(row);
    const sourceFile = entity.sourceFile;
    // An empty sourceFile resolves to the workspace directory, which the
    // isFile() test below skips.
    if (typeof sourceFile !== "string") continue;
    // A row with a sourceFile is complete, so parseEntityFromList gave it a
    // string id; codec values are strings or lists, never null, and a list
    // status is simply not an inactive one.
    const id = entity.id as string;
    if (id === "" || INACTIVE_STATUSES.has(entity.status as string)) continue;
    if (entity.sourceLine !== undefined) continue;
    const absolute = path.resolve(workspaceRoot, sourceFile);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) continue;
    const title = typeof entity.title === "string" ? entity.title : id;
    violations.push({
      rule: SYMBOL_COORDINATES_MISSING_RULE,
      entityId: id,
      source: sourceFile,
      description: `${id} (${title}) has no symbol coordinates in ${sourceFile}: Kibi could not place it, so its links are checked against no code`,
      suggestion:
        "Run kibi sync --refresh-symbol-coordinates and read its failed lines; use the name the extractor gives the declaration, install the plugins and grammar packs kibi doctor names, or add symbol_role and granularity_reason for a file-level link.",
    });
  }
  return violations;
}

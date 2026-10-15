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
import { inferTypeFromPath } from "../../extractors/markdown.js";
import {
  listLaneMarkdownFiles,
  readText,
  sliceFrontmatter,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";

/**
 * Entity files written before Kibi stated `type` in front matter take their
 * type from the folder. Every Kibi write states it, so the first kb_upsert
 * on such a file would add a `type:` line nobody asked for. `kibi migrate`
 * states the folder-implied type instead, at any schema version, so that
 * line lands in the migration commit.
 */
// implements REQ-cli-migrate-entity-type-backfill
export const ENTITY_TYPE_BACKFILL_CODE = "entity_type_backfill";
// implements REQ-cli-migrate-entity-type-backfill
export const ENTITY_TYPE_BACKFILL_ACTION_ID = "entity-type-backfill";

/** One authored entity file without `type` in its front matter. */
// implements REQ-cli-migrate-entity-type-backfill
export type EntityTypeBackfillTarget = Readonly<{
  id: string;
  /** The folder-implied type, as kibi sync reads it. */
  type: string;
  path: string;
  after: string;
}>;

// implements REQ-cli-migrate-entity-type-backfill
export type EntityTypeBackfillSkip = Readonly<{ path: string; reason: string }>;

// implements REQ-cli-migrate-entity-type-backfill
export type EntityTypeBackfillPlan = Readonly<{
  targets: readonly EntityTypeBackfillTarget[];
  skipped: readonly EntityTypeBackfillSkip[];
}>;

/**
 * Authored entity files whose front matter has no `type`, each with the
 * document that states the folder-implied type as the last front matter key
 * and changes no other byte. Files that do not parse are left to the checks
 * that report them. Read-only.
 */
// implements REQ-cli-migrate-entity-type-backfill
export function planEntityTypeBackfill(
  workspaceRoot: string,
): EntityTypeBackfillPlan {
  const targets: EntityTypeBackfillTarget[] = [];
  const skipped: EntityTypeBackfillSkip[] = [];
  for (const file of listLaneMarkdownFiles(workspaceRoot)) {
    const content = readText(file.absolutePath);
    const slice = content === null ? null : sliceFrontmatter(content);
    if (content === null || slice === null) continue;
    let data: unknown;
    try {
      data = loadYaml(slice.text);
    } catch {
      continue;
    }
    if (data === null || typeof data !== "object" || Array.isArray(data))
      continue;
    const record = data as Record<string, unknown>;
    if (Object.hasOwn(record, "type")) continue;
    const type = inferTypeFromPath(file.absolutePath);
    if (type === null) continue;
    const after = withTopLevelField(content, "type", type);
    if (after === null) {
      skipped.push({
        path: file.relativePath,
        reason: "type could not be added without changing other fields",
      });
      continue;
    }
    targets.push({
      id:
        typeof record.id === "string" && record.id.trim() !== ""
          ? record.id.trim()
          : path.basename(file.relativePath, ".md"),
      type,
      path: file.relativePath,
      after,
    });
  }
  return { targets, skipped };
}

/** State the folder-implied type on every authored entity file without one. */
// implements REQ-cli-migrate-entity-type-backfill
export function applyEntityTypeBackfill(
  workspaceRoot: string,
): EntityTypeBackfillPlan {
  const plan = planEntityTypeBackfill(workspaceRoot);
  for (const target of plan.targets)
    writeFileAtomically(path.join(workspaceRoot, target.path), target.after);
  return plan;
}

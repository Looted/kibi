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
import type { EntityLane } from "../../utils/kb-paths.js";
import {
  listLaneMarkdownSources,
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

/**
 * The entity type each lane implies. The lane, not a folder name anywhere in
 * the absolute path, decides: a workspace checked out under a `tests/` or
 * `requirements/` directory must not turn its facts into tests.
 */
/** The entity type each canonical lane holds. */
// implements REQ-cli-migrate-entity-type-backfill
export const LANE_TYPES: Readonly<Record<EntityLane, string>> = {
  requirements: "req",
  scenarios: "scenario",
  tests: "test",
  facts: "fact",
  adr: "adr",
  flags: "flag",
  events: "event",
};

/** One authored entity file without `type` in its front matter. */
// implements REQ-cli-migrate-entity-type-backfill
export type EntityTypeBackfillTarget = Readonly<{
  id: string;
  /** The type the entity's lane implies. */
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
  for (const file of listLaneMarkdownSources(workspaceRoot)) {
    const content = file.content;
    // Without front matter the text is "undefined", a scalar, not a mapping.
    const text = String(sliceFrontmatter(content)?.text);
    let data: unknown;
    try {
      data = loadYaml(text);
    } catch {
      // Unparsable front matter is left to the checks that report it.
    }
    if (data === null || typeof data !== "object" || Array.isArray(data))
      continue;
    const record = data as Record<string, unknown>;
    if (Object.hasOwn(record, "type")) continue;
    const type = LANE_TYPES[file.lane];
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

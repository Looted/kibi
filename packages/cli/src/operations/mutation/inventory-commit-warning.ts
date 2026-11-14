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

import { readFileSync } from "node:fs";
import path from "node:path";
import { extractFromMarkdownString } from "../../extractors/markdown.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../semantic-advisor/ingestion-boundary.js";

/**
 * kb_upsert warning for a requirement whose written document lacks the
 * semantic inventory its statement needs. kb_upsert judges the prose it was
 * sent (a descriptive title needs no inventory), but the document it writes
 * pins the body statement as semantic_text, and the commit gate and every
 * other workspace's sync judge that: `kibi check --staged` refuses to commit
 * the requirement while it is new or its statement changes.
 */
export function inventoryCommitWarnings(
  type: string,
  workspaceRoot: string,
  writtenPath: string | undefined,
): string[] {
  if (type !== "req" || writtenPath === undefined) return [];
  let content: string;
  try {
    content = readFileSync(path.resolve(workspaceRoot, writtenPath), "utf8");
  } catch {
    return [];
  }
  let result: ReturnType<typeof extractFromMarkdownString>;
  try {
    result = extractFromMarkdownString(content, writtenPath);
  } catch {
    return [];
  }
  const payload = {
    type: result.entity.type,
    id: result.entity.id,
    properties: result.entity,
    relationships: result.relationships,
  };
  const boundary = validateSemanticInventoryBoundary(
    payload,
    result.relationships,
    analyzeSemanticAdvisorInput({ payload }).receipt,
  );
  if (boundary.errors.length === 0) return [];
  return [
    `${result.entity.id} was written without a semantic inventory that matches its statement (${boundary.errors.length} inventory error(s), starting with: ${boundary.errors[0]}). kibi check --staged (the pre-commit hook) refuses to commit it while it is new or its statement changes, and kibi sync refuses it in another workspace that synced before. Run kb_model mode analyze with its id and complete semantic_text, then send the returned inventory contract (semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash, logic_claims) in a kb_upsert.`,
  ];
}

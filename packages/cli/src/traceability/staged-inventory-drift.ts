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

import type { ExtractionResult } from "../extractors/markdown.js";
import { extractFromMarkdownString } from "../extractors/markdown.js";
import { analyzeSemanticAdvisorInput } from "../operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../operations/semantic-advisor/ingestion-boundary.js";

/** A staged requirement whose semantic inventory no longer matches its prose. */
// implements REQ-kibi-proposition-complete-ingestion
export const STAGED_INVENTORY_DRIFT_RULE = "semantic-inventory-drift";

// implements REQ-kibi-proposition-complete-ingestion
export type StagedInventoryDriftViolation = Readonly<{
  rule: typeof STAGED_INVENTORY_DRIFT_RULE;
  entityId: string;
  source: string;
  message: string;
  errors: readonly string[];
}>;

function advertisesContract(entity: ExtractionResult["entity"]): boolean {
  return (
    entity.semantic_inventory_version !== undefined ||
    entity.semantic_source_hash !== undefined ||
    entity.semantic_inventory !== undefined
  );
}

function payloadOf(result: ExtractionResult): Record<string, unknown> {
  return {
    type: result.entity.type,
    id: result.entity.id,
    properties: result.entity,
    relationships: result.relationships,
  };
}

function baseResult(
  path: string,
  readBase: (path: string) => string | null,
): ExtractionResult | null {
  const content = readBase(path);
  if (content === null) return null;
  try {
    return extractFromMarkdownString(content, path);
  } catch {
    return null;
  }
}

/**
 * The staged requirements that declare a semantic inventory contract (now
 * or in the base tree) whose inventory no longer matches their prose. The
 * next `kibi sync` refuses them under the proposition-complete boundary;
 * the gate applies the same test, so drift is caught at the commit that
 * introduces it instead of after a later merge. Requirements without a
 * contract are left to sync, which decides from its own baseline.
 */
// implements REQ-kibi-proposition-complete-ingestion
export function stagedInventoryDriftViolations(input: {
  stagedPaths: ReadonlySet<string>;
  snapshotEntities: readonly ExtractionResult[];
  readBase: (path: string) => string | null;
}): StagedInventoryDriftViolation[] {
  const violations: StagedInventoryDriftViolation[] = [];
  for (const result of input.snapshotEntities) {
    if (result.entity.type !== "req") continue;
    const source = result.entity.source;
    if (!input.stagedPaths.has(source)) continue;
    const payload = payloadOf(result);
    const semantic = analyzeSemanticAdvisorInput({ payload });
    const boundary = validateSemanticInventoryBoundary(
      payload,
      result.relationships,
      semantic.receipt,
    );
    if (boundary.errors.length === 0) continue;
    const base = baseResult(source, input.readBase);
    const enforce =
      advertisesContract(result.entity) ||
      (base !== null && advertisesContract(base.entity));
    if (!enforce) continue;
    violations.push({
      rule: STAGED_INVENTORY_DRIFT_RULE,
      entityId: result.entity.id,
      source,
      errors: boundary.errors,
      message: `${result.entity.id} (${source}): the semantic inventory does not match the requirement's prose, so the next kibi sync rejects it: ${boundary.errors.join("; ")}. Run 'kibi migrate' to re-derive it, or kb_model mode analyze with the complete prose and keep its inventory contract.`,
    });
  }
  return violations.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
}

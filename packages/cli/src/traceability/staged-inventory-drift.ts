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
import {
  extractFromMarkdownString,
  requirementSemanticText,
} from "../extractors/markdown.js";
import { analyzeSemanticAdvisorInput } from "../operations/semantic-advisor/analyze-prose.js";
import { validateSemanticInventoryBoundary } from "../operations/semantic-advisor/ingestion-boundary.js";
import {
  isCurrentAuthoredEntity,
  readAuthoredEntity,
} from "../public/operations/entity-context.js";

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

/** The hash of the prose a requirement's inventory must cover. */
function semanticSourceHashOf(result: ExtractionResult): string {
  const payload = payloadOf(result);
  return validateSemanticInventoryBoundary(
    payload,
    result.relationships,
    analyzeSemanticAdvisorInput({ payload }).receipt,
  ).sourceHash;
}

function baseResult(
  path: string,
  readBase: (path: string) => string | null,
): ExtractionResult | null {
  try {
    // A missing base file (null) fails extraction like an unreadable one.
    return extractFromMarkdownString(readBase(path) as string, path);
  } catch {
    return null;
  }
}

/**
 * The staged requirements that declare a semantic inventory contract (now
 * or in the base tree) whose inventory no longer matches their prose. The
 * next `kibi sync` refuses them under the proposition-complete boundary;
 * the gate applies the same test, so drift is caught at the commit that
 * introduces it instead of after a later merge. A requirement the base tree
 * does not have yet is judged too, as sync judges a source it has never
 * imported, unless the commit has no parent (a first commit, which sync
 * imports as its semantic baseline). So is one whose statement (the prose
 * its inventory covers) differs from the base tree's, as sync judges a
 * source whose semantic hash changed. Other requirements without a contract,
 * such as a Context-only edit, are left to sync's baseline.
 */
// implements REQ-kibi-proposition-complete-ingestion
export function stagedInventoryDriftViolations(input: {
  stagedPaths: ReadonlySet<string>;
  snapshotEntities: readonly ExtractionResult[];
  readBase: (path: string) => string | null;
  /**
   * False for a first commit, or an amend of it: sync grandfathers its sources
   * as a baseline, so only declared contracts are judged.
   */
  judgeNewRequirements?: boolean;
}): StagedInventoryDriftViolation[] {
  const violations: StagedInventoryDriftViolation[] = [];
  for (const result of input.snapshotEntities) {
    const source = result.entity.source;
    if (!input.stagedPaths.has(source)) continue;
    // The boundary applies to current requirements only and reports no
    // errors for any other entity.
    const payload = payloadOf(result);
    const semantic = analyzeSemanticAdvisorInput({ payload });
    const boundary = validateSemanticInventoryBoundary(
      payload,
      result.relationships,
      semantic.receipt,
    );
    if (boundary.errors.length === 0) continue;
    const base = baseResult(source, input.readBase);
    const contract =
      advertisesContract(result.entity) ||
      (base !== null && advertisesContract(base.entity));
    const judgeUncontracted = input.judgeNewRequirements ?? true;
    const isNew = input.readBase(source) === null && judgeUncontracted;
    const restated =
      judgeUncontracted &&
      base !== null &&
      semanticSourceHashOf(base) !== boundary.sourceHash;
    if (!contract && !isNew && !restated) continue;
    violations.push({
      rule: STAGED_INVENTORY_DRIFT_RULE,
      entityId: result.entity.id,
      source,
      errors: boundary.errors,
      message: contract
        ? `${result.entity.id} (${source}): the semantic inventory does not match the requirement's prose, so the next kibi sync rejects it: ${boundary.errors.join("; ")}. Run 'kibi migrate' to re-derive it, or kb_model mode analyze with the complete prose and keep its inventory contract.`
        : `${result.entity.id} (${source}): ${isNew ? "a new requirement" : "a requirement whose statement changes"} needs a semantic inventory that matches its prose, so the next kibi sync rejects it: ${boundary.errors.join("; ")}. Run kb_model mode analyze (CLI: semantic-advisor) with its id and complete semantic_text, then write the returned inventory contract into it (kb_upsert with semantic_inventory, semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims).`,
    });
  }
  return violations.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
}

/**
 * A staged requirement whose body statement changed while its pinned
 * `semantic_text` did not.
 */
// implements REQ-kibi-proposition-complete-ingestion
export const STAGED_STATEMENT_DRIFT_RULE = "requirement-statement-drift";

// implements REQ-kibi-proposition-complete-ingestion
export type StagedStatementDriftViolation = Readonly<{
  rule: typeof STAGED_STATEMENT_DRIFT_RULE;
  entityId: string;
  source: string;
  message: string;
}>;

function collapsed(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function pinnedSemanticText(data: Readonly<Record<string, unknown>>): string {
  return typeof data.semantic_text === "string"
    ? collapsed(data.semantic_text)
    : "";
}

/**
 * The staged requirements that pin `semantic_text` in front matter and whose
 * body statement (the body without its context sections) changed against
 * the base tree while the pinned text stayed the same. A pinned
 * `semantic_text` is what Kibi models, grounds and proves, and the body is
 * not read once it is set, so such an edit would leave every claim, fact and
 * proof bound to the old wording while the document says something new. The
 * edit must restate `semantic_text` (whose inventory the drift rule above
 * then re-checks) or move the new text into a context section.
 */
// implements REQ-kibi-proposition-complete-ingestion
export function stagedStatementDriftViolations(input: {
  stagedFiles: readonly Readonly<{ path: string; content?: string }>[];
  readBase: (path: string) => string | null;
}): StagedStatementDriftViolation[] {
  const violations: StagedStatementDriftViolation[] = [];
  for (const file of input.stagedFiles) {
    if (file.content === undefined) continue;
    const staged = readAuthoredEntity(file.content, file.path);
    if (staged === null || staged.type !== "req") continue;
    if (!isCurrentAuthoredEntity(staged, new Set())) continue;
    const pinned = pinnedSemanticText(staged.data);
    if (pinned === "") continue;
    const baseContent = input.readBase(file.path);
    if (baseContent === null) continue;
    const base = readAuthoredEntity(baseContent, file.path);
    if (base === null || base.type !== "req") continue;
    if (pinnedSemanticText(base.data) !== pinned) continue;
    const before = collapsed(requirementSemanticText(base.body));
    const after = collapsed(requirementSemanticText(staged.body));
    if (before === after) continue;
    violations.push({
      rule: STAGED_STATEMENT_DRIFT_RULE,
      entityId: staged.id,
      source: file.path,
      message: `${staged.id} (${file.path}): the body's statement changed but the pinned semantic_text did not, so Kibi still models, grounds and proves the old wording. Restate semantic_text to say what the body now says and re-derive its inventory (kb_model mode analyze, CLI: semantic-advisor, then kb_upsert the returned contract), or move the new text under a context section (## Context, ## Rationale or ## Notes) if it does not change the requirement.`,
    });
  }
  return violations.sort((left, right) =>
    left.entityId.localeCompare(right.entityId),
  );
}

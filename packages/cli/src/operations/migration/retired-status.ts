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
import {
  type FrontmatterSlice,
  listLaneMarkdownSources,
  readText,
  readTopLevelField,
  sliceFrontmatter,
  withTopLevelField,
  writeFileAtomically,
} from "./kb-sources.js";
import { supersededRequirementIds } from "./superseded-closure.js";

/**
 * Closed requirements that say they were retired (KB schema 14).
 *
 * Before schema 14 a requirement had no status for "the behavior is gone":
 * `closed` meant both "done and still valid" and "retired", so a retired
 * requirement without a successor kept governing search, hooks and every
 * current-intent rule. Whether a closed requirement is retired is a person's
 * call, so the migration only suggests `status: retired` where the authored
 * source already says so, and quotes those words as the retired_reason it
 * would write. A superseded requirement is not suggested: its successor
 * already governs.
 */

/** The KB schema that adds the retired requirement status. */
// implements REQ-kb-requirement-retired-status
export const RETIRED_STATUS_SCHEMA_VERSION = 14;

/** The requirement status for intent whose behavior no longer exists. */
// implements REQ-kb-requirement-retired-status
export const RETIRED_REQUIREMENT_STATUS = "retired";

/** Migration action code of a suggested retirement. */
// implements REQ-kb-requirement-retired-status
export const REQ_RETIRED_STATUS_SUGGEST_CODE = "req_retired_status_suggest";

/** Migration action id prefix of a suggested retirement. */
// implements REQ-kb-requirement-retired-status
export const REQ_RETIRED_STATUS_ACTION_PREFIX = "req-retired-status-";

/** Where a closed requirement's source says it was retired. */
// implements REQ-kb-requirement-retired-status
export type RetiredSignal = Readonly<{
  field: "proof_exempt_reason" | "body" | "tags" | "title";
  text: string;
}>;

/** A closed requirement whose own source says it was retired. */
// implements REQ-kb-requirement-retired-status
export type RetiredStatusSuggestion = Readonly<{
  requirementId: string;
  path: string;
  /** Every place the source says so, strongest first. */
  signals: readonly RetiredSignal[];
  /** The retired_reason approving the suggestion writes. */
  retiredReason: string;
}>;

const RETIRED_WORD = /\b(?:retired|archived)\b/i;
const RETIRED_SENTENCE =
  /\b(?:this requirement|the requirement|it)\s+(?:is|was|has been)\s+(?:now\s+)?(?:retired|archived)\b/i;
/** historical-status tags that name a lifecycle end without a successor. */
const RETIRED_TAG =
  /^historical-status:(retired|archived|deprecated|superseded)$/;

function bodySentences(body: string): string[] {
  return body
    .split(/(?<=[.!?])\s+|\r?\n+/)
    .map((sentence) => sentence.replace(/^[#>*\-\s]+/, "").trim())
    .filter((sentence) => sentence.length > 0);
}

function retiredSignals(frontmatter: string, body: string): RetiredSignal[] {
  const signals: RetiredSignal[] = [];
  const exemption = readTopLevelField(frontmatter, "proof_exempt_reason");
  if (typeof exemption === "string" && RETIRED_WORD.test(exemption))
    signals.push({ field: "proof_exempt_reason", text: exemption.trim() });
  const sentence = bodySentences(body).find((line) =>
    RETIRED_SENTENCE.test(line),
  );
  if (sentence !== undefined) signals.push({ field: "body", text: sentence });
  const tags = readTopLevelField(frontmatter, "tags");
  const tag = Array.isArray(tags)
    ? tags.find(
        (value): value is string =>
          typeof value === "string" && RETIRED_TAG.test(value),
      )
    : undefined;
  if (tag !== undefined) signals.push({ field: "tags", text: tag });
  const title = readTopLevelField(frontmatter, "title");
  if (typeof title === "string" && RETIRED_WORD.test(title))
    signals.push({ field: "title", text: title.trim() });
  return signals;
}

/** The retired_reason a signal states, quoting the source's own words. */
function reasonOf(signal: RetiredSignal): string {
  switch (signal.field) {
    case "proof_exempt_reason":
    case "body":
      return signal.text;
    case "tags":
      return `Recorded with the tag ${signal.text} and no successor before requirements had a retired status.`;
    case "title":
      return `Its title marks it retired: ${signal.text}.`;
  }
}

/**
 * Closed requirements no other requirement supersedes whose proof exemption,
 * body, historical-status tag or title says they were retired. Read-only.
 */
// implements REQ-kb-requirement-retired-status
export function planRetiredStatusSuggestions(
  workspaceRoot: string,
): RetiredStatusSuggestion[] {
  const superseded = supersededRequirementIds(workspaceRoot);
  const suggestions: RetiredStatusSuggestion[] = [];
  for (const file of listLaneMarkdownSources(workspaceRoot, ["requirements"])) {
    const slice = sliceFrontmatter(file.content);
    if (slice === null) continue;
    if (readTopLevelField(slice.text, "status") !== "closed") continue;
    const id = readTopLevelField(slice.text, "id");
    const requirementId =
      typeof id === "string" && id.length > 0
        ? id
        : path.basename(file.relativePath, ".md");
    if (superseded.has(requirementId)) continue;
    const signals = retiredSignals(slice.text, slice.suffix);
    const [strongest] = signals;
    if (strongest === undefined) continue;
    suggestions.push({
      requirementId,
      path: file.relativePath,
      signals,
      retiredReason: reasonOf(strongest),
    });
  }
  return suggestions.sort((left, right) =>
    left.requirementId.localeCompare(right.requirementId),
  );
}

/**
 * Retire one closed requirement: set `status: retired` and `retired_reason`,
 * editing only those two front matter lines. Refuses when the requirement is
 * no longer closed or the edit would change any other field.
 */
// implements REQ-kb-requirement-retired-status
export function applyRetiredStatus(
  workspaceRoot: string,
  relativePath: string,
  retiredReason: string,
): void {
  const absolute = path.join(workspaceRoot, relativePath);
  const content = readText(absolute);
  const slice = content === null ? null : sliceFrontmatter(content);
  if (
    content === null ||
    slice === null ||
    readTopLevelField((slice as FrontmatterSlice).text, "status") !== "closed"
  )
    throw new Error(
      `${relativePath} is no longer closed; rerun kibi migrate and approve the new plan.`,
    );
  const withStatus = withTopLevelField(
    content,
    "status",
    RETIRED_REQUIREMENT_STATUS,
  );
  const next =
    withStatus === null
      ? null
      : withTopLevelField(withStatus, "retired_reason", retiredReason);
  if (next === null)
    throw new Error(
      `${relativePath}: status and retired_reason could not be set without changing other fields; set them by hand.`,
    );
  writeFileAtomically(absolute, next);
}

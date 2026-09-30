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

import { extractFromMarkdownString } from "../extractors/markdown.js";
import { entityIdStyleIssues } from "../utils/entity-id-style.js";
import { isEntityLanePath } from "../utils/kb-paths.js";
import type { StagedFile } from "./git-staged.js";
import type { KibiImpactDiagnostic } from "./staged-diagnostics.js";

/**
 * Naming-style review for entity Markdown that this commit introduces.
 *
 * Only added or renamed files are evaluated: a staged edit to a committed
 * legacy entity such as `REQ-003.md` is never reported, so the legacy numbered
 * lanes stay grandfathered without a cutoff date or history lookup. The
 * diagnostics are advisory and never block a commit.
 */
// implements REQ-kibi-entity-id-style
export function createStagedEntityIdStyleDiagnostics(
  stagedFiles: readonly StagedFile[],
): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];
  for (const file of stagedFiles) {
    if (file.status !== "A" && file.status !== "R") continue;
    if (!file.path.endsWith(".md") || !isEntityLanePath(file.path)) continue;
    const id = readEntityId(file);
    if (id === undefined) continue;
    for (const issue of entityIdStyleIssues({ id, sourcePath: file.path })) {
      diagnostics.push({
        id: "entity_id_style_review",
        severity: "warning",
        blocking: false,
        category: "naming",
        entityId: id,
        source: file.path,
        files: [file.path],
        docs: ["docs/entity-schema.md"],
        message: issue.message,
        suggestion: issue.suggestion,
      });
    }
  }
  return diagnostics;
}

function readEntityId(file: StagedFile): string | undefined {
  if (file.content === undefined) return undefined;
  try {
    const id = extractFromMarkdownString(file.content, file.path).entity.id;
    return typeof id === "string" && id.trim() !== "" ? id.trim() : undefined;
  } catch {
    // Frontmatter errors are reported by staged Markdown validation.
    return undefined;
  }
}

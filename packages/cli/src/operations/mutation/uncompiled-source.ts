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
  type SourceExtractionFailure,
  failedSourceKeepsSemanticBaseline,
  sourceExtractionFailure,
  sourceExtractionRemediation,
} from "../../commands/sync/cache.js";
import { extractFromMarkdownString } from "../../extractors/markdown.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { resolveBranchAttachment } from "../../utils/branch-resolver.js";
import { branchStorePath } from "../../utils/branch-store-locator.js";
import {
  authoredFrontmatter,
  newEntitySourceTarget,
  renderSourceDocument,
} from "./source-authoring.js";
import type { StoredEntityLookup } from "./stored-entity.js";
import type { RelationshipInput, UpsertInput } from "./types.js";

/**
 * An authored document for an entity the compiled store does not hold: the
 * file the source-first writer would merge an upsert into.
 */
// implements REQ-kibi-uncompiled-source-visibility
export type UncompiledAuthoredSource = Readonly<{
  /** Workspace-relative path. */
  path: string;
  absolute: string;
  content: string;
  /**
   * The entity as its file states it: the extracted entity when the file
   * compiles, its front matter when it does not.
   */
  stored: Readonly<Record<string, unknown>>;
  /** Why kibi sync cannot compile the file as authored; null when it can. */
  extractionError: string | null;
  /**
   * What the last sync recorded when it could not extract the file; undefined
   * when no sync has failed on it (the file was written since).
   */
  syncFailure: SourceExtractionFailure | undefined;
}>;

// implements REQ-kibi-uncompiled-source-semantic-baseline
function lastSyncFailure(
  context: OperationContext,
  relative: string,
): SourceExtractionFailure | undefined {
  const attachment =
    context.branchAttachment ?? resolveBranchAttachment(context.workspaceRoot);
  if ("error" in attachment) return undefined;
  return sourceExtractionFailure(
    context.workspaceRoot,
    branchStorePath(context.workspaceRoot, attachment.kbBranch),
    relative,
  );
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The authored document an upsert of `input` would merge into although the
 * store does not hold the entity: a file left out of the last sync (one sync
 * could not extract, or one written since). Null when the writer would
 * create a new file, writes a symbol manifest, or the file declares another
 * entity. A file whose front matter does not parse is refused here: the
 * writer could not merge into it either.
 */
// implements REQ-kibi-uncompiled-source-visibility
export async function readUncompiledAuthoredSource(
  context: OperationContext,
  input: UpsertInput,
): Promise<UncompiledAuthoredSource | null> {
  if (context.fs === undefined || context.sourceFirst === false) return null;
  if (input.type === "symbol") return null;
  const absolute = newEntitySourceTarget(context, input);
  if (absolute === undefined || !/\.mdx?$/i.test(absolute)) return null;
  let content: string;
  try {
    content = await context.fs.readFile(absolute);
  } catch {
    return null;
  }
  const relative = path
    .relative(context.workspaceRoot, absolute)
    .replaceAll(path.sep, "/");
  try {
    const { entity } = extractFromMarkdownString(content, absolute);
    if (entity.id !== input.id) return null;
    return {
      path: relative,
      absolute,
      content,
      stored: entity as unknown as Record<string, unknown>,
      extractionError: null,
      syncFailure: lastSyncFailure(context, relative),
    };
  } catch (error) {
    const extractionError = errorText(error);
    let frontmatter: Record<string, unknown>;
    try {
      frontmatter = authoredFrontmatter(content);
    } catch (parseError) {
      throw new Error(
        `Upsert of ${input.id} refused: ${relative} exists but kibi sync cannot compile it (${extractionError}), and its front matter does not parse (${errorText(parseError)}), so the write cannot merge into it. Fix the front matter of ${relative}, run kibi sync, then retry.`,
      );
    }
    if (frontmatter.id !== undefined && frontmatter.id !== input.id)
      return null;
    if (frontmatter.type !== undefined && frontmatter.type !== input.type)
      return null;
    return {
      path: relative,
      absolute,
      content,
      stored: { ...frontmatter, id: input.id, type: input.type },
      extractionError,
      syncFailure: lastSyncFailure(context, relative),
    };
  }
}

/**
 * The store lookup for an upsert whose entity exists only in its authored
 * file: the file's own state is what the write changes, so the stored
 * ledger, origin and firmness checks read it.
 */
// implements REQ-kibi-uncompiled-source-visibility
export function authoredEntityLookup(
  source: UncompiledAuthoredSource,
): StoredEntityLookup {
  const failure = source.syncFailure;
  return {
    exists: async () => true,
    entity: async () => source.stored,
    // The next sync judges the file by its last failure record, not by the
    // state the file states now, so the write guard does the same.
    keepsSemanticBaseline: (sourceHash) =>
      failure !== undefined &&
      failedSourceKeepsSemanticBaseline(failure, sourceHash),
  };
}

/**
 * Render the document the writer will leave and extract it as kibi sync
 * will. A write that leaves the file uncompilable is refused, naming the
 * file and the error, because the entity would stay invisible to every
 * store-backed tool. Returns the relationships the written file declares.
 */
// implements REQ-kibi-uncompiled-source-visibility
export function assertAuthoredWriteCompiles(
  source: UncompiledAuthoredSource,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
): readonly RelationshipInput[] {
  let after: string;
  try {
    after = renderSourceDocument(input, entity, source.content, source.path);
    return extractFromMarkdownString(after, source.absolute).relationships.map(
      (relationship) => ({ ...relationship }),
    );
  } catch (error) {
    const message = errorText(error);
    throw new Error(
      `Upsert of ${input.id} refused: ${input.id} exists in ${source.path} but is not compiled${source.extractionError === null ? "" : ` (${source.extractionError})`}, and this write would leave the file uncompilable: ${message}. ${sourceExtractionRemediation(source.path, message)}`,
    );
  }
}

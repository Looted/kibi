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

import { dump as dumpYaml } from "js-yaml";

/** Split after each newline, keeping it: joining the parts restores the text. */
function splitLines(content: string): string[] {
  return content.split(/(?<=\n)/);
}

const TOP_LEVEL_KEY = /^[A-Za-z_][A-Za-z0-9_-]*\s*:/;

type Frontmatter = Readonly<{ lines: readonly string[]; closing: number }>;

/** The lines of a document that opens with a closed `---` frontmatter. */
function frontmatter(content: string): Frontmatter | null {
  const lines = splitLines(content);
  // Splitting always yields at least one (possibly empty) line.
  if ((lines[0] as string).trim() !== "---") return null;
  const closing = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  return closing === -1 ? null : { lines, closing };
}

/**
 * The [start, end) lines of the first frontmatter block whose key line
 * matches `keyLine`: up to the next top-level key or the closing `---`.
 */
function blockRange(
  { lines, closing }: Frontmatter,
  keyLine: RegExp,
): readonly [number, number] | null {
  // Only the lines between the opening and closing `---` are searched.
  const body = lines.slice(1, closing);
  const key = body.findIndex((line) => keyLine.test(line));
  if (key === -1) return null;
  const next = body.findIndex(
    (line, index) => index > key && TOP_LEVEL_KEY.test(line),
  );
  return [key + 1, next === -1 ? closing : next + 1];
}

/**
 * Remove a top-level frontmatter block (`key:` plus its nested lines) from a
 * markdown document, leaving every other byte untouched. Returns the patched
 * content, or null when the content is not a well-formed frontmatter
 * document the remover can safely splice.
 *
 * Used by proof maintenance to drop legacy `verification_receipts` blocks
 * once a `proof_contract` exists, without canonicalizing the document.
 */
export function removeFrontmatterBlock(
  content: string,
  key: string,
): string | null {
  const document = frontmatter(content);
  if (document === null) return null;
  const range = blockRange(document, new RegExp(`^${key}\\s*:`));
  if (range === null) return null;
  const [start, end] = range;
  return [
    ...document.lines.slice(0, start),
    ...document.lines.slice(end),
  ].join("");
}

/**
 * Patch the `proof_receipts` frontmatter block of an authored test document
 * without re-rendering anything else.
 *
 * Receipt ingest used to route every append through the canonical entity
 * renderer, which re-dumps the whole frontmatter: inline tag lists became
 * block lists, timestamps gained milliseconds, and so on. Those non-receipt
 * edits are not stripped by the workspace snapshotter, so the snapshot hash
 * changed on the first ingest that touched a hand-authored document and every
 * later integration in the same `kibi prove --all` run refused with
 * "changed the tracked workspace". This patcher splices ONLY the receipts
 * block, leaving the rest of the document byte-for-byte identical.
 *
 * Returns null when the content is not a well-formed frontmatter document the
 * patcher can safely splice; the caller then falls back to the canonical
 * render.
 */
export function patchReceiptsIntoDocument(
  content: string,
  receipts: readonly Readonly<Record<string, unknown>>[],
): string | null {
  const document = frontmatter(content);
  if (document === null) return null;
  // Without a receipts block, the new one goes just before the closing line.
  const [start, end] = blockRange(document, /^proof_receipts\s*:/) ?? [
    document.closing,
    document.closing,
  ];
  const block = dumpYaml(
    { proof_receipts: receipts.map((receipt) => ({ ...receipt })) },
    { noRefs: true, lineWidth: -1, sortKeys: false },
  );
  return [
    ...document.lines.slice(0, start),
    block,
    ...document.lines.slice(end),
  ].join("");
}

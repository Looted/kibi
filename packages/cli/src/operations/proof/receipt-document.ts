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

/**
 * Remove a top-level frontmatter block (`key:` plus its nested lines) from a
 * markdown document, leaving every other byte untouched. Returns the patched
 * content, or null when the content is not a well-formed frontmatter
 * document the remover can safely splice.
 *
 * Used by proof maintenance to drop legacy `verification_receipts` blocks
 * once a `proof_contract` exists, without canonicalizing the document.
 */
// implements REQ-kibi-verification-evidence-contract
export function removeFrontmatterBlock(
  content: string,
  key: string,
): string | null {
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (lines.length === 0 || lines[0]?.trim() !== "---") return null;
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index++) {
    if (lines[index]?.trim() === "---") {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex === -1) return null;
  let blockStart = -1;
  let blockEnd = closingIndex;
  for (let index = 1; index < closingIndex; index++) {
    if (new RegExp(`^${key}\\s*:`).test(lines[index] ?? "")) {
      blockStart = index;
      break;
    }
  }
  if (blockStart === -1) return null;
  for (let index = blockStart + 1; index < closingIndex; index++) {
    const line = lines[index] ?? "";
    if (/^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line)) {
      blockEnd = index;
      break;
    }
  }
  return [...lines.slice(0, blockStart), ...lines.slice(blockEnd)].join("");
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
// implements REQ-kibi-verification-evidence-contract
export function patchReceiptsIntoDocument(
  content: string,
  receipts: readonly Readonly<Record<string, unknown>>[],
): string | null {
  const lines = content.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  if (lines.length === 0 || lines[0]?.trim() !== "---") return null;
  let closingIndex = -1;
  for (let index = 1; index < lines.length; index++) {
    if (lines[index]?.trim() === "---") {
      closingIndex = index;
      break;
    }
  }
  if (closingIndex === -1) return null;

  let receiptsStart = -1;
  let receiptsEnd = closingIndex;
  for (let index = 1; index < closingIndex; index++) {
    if (/^proof_receipts\s*:/.test(lines[index] ?? "")) {
      receiptsStart = index;
      break;
    }
  }
  if (receiptsStart !== -1) {
    for (let index = receiptsStart + 1; index < closingIndex; index++) {
      const line = lines[index] ?? "";
      if (/^[A-Za-z_][A-Za-z0-9_-]*\s*:/.test(line)) {
        receiptsEnd = index;
        break;
      }
    }
  }

  const block = dumpYaml(
    { proof_receipts: receipts.map((receipt) => ({ ...receipt })) },
    { noRefs: true, lineWidth: -1, sortKeys: false },
  );
  const blockLines = block.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const spliced = [
    ...lines.slice(0, receiptsStart === -1 ? closingIndex : receiptsStart),
    ...blockLines,
    ...lines.slice(receiptsEnd),
  ];
  return spliced.join("");
}

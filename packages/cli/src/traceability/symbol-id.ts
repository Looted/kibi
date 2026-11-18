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

import { createHash } from "node:crypto";
import path from "node:path";

/**
 * One part of a minted symbol id: the name split at camel case, with every
 * run of other characters as one dash, lowercased. A name with letters the
 * ASCII slug drops (non-ASCII ones), or with no letter or digit at all (as
 * `$`), keeps a short hash of itself, so it never mints an empty id part or
 * one another name shares.
 */
export function symbolIdSlug(value: string): string {
  const ascii = value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  // biome-ignore lint/suspicious/noControlCharactersInRegex: the ASCII range.
  if (ascii !== "" && /^[\x00-\x7F]*$/.test(value)) return ascii;
  const hash = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return ascii === "" ? hash : `${ascii}-${hash}`;
}

/**
 * The id a new symbol record for `symbol` in `sourceFile` gets: the first of
 * SYM-<file>-<name>, SYM-<directory>-<file>-<name> and
 * SYM-<path>-<name> that no record holds, else the file-qualified one
 * numbered from 2. The id is added to `taken`, so the next one minted from
 * the same set never repeats it.
 */
export function mintSymbolId(
  sourceFile: string,
  symbol: string,
  taken: Set<string>,
): string {
  const parsed = path.posix.parse(sourceFile);
  const directory = path.posix.basename(parsed.dir);
  const name = symbolIdSlug(symbol);
  const options = [
    `SYM-${symbolIdSlug(parsed.name)}-${name}`,
    `SYM-${symbolIdSlug(directory)}-${symbolIdSlug(parsed.name)}-${name}`,
    `SYM-${symbolIdSlug(path.posix.join(parsed.dir, parsed.name))}-${name}`,
  ];
  let id = options.find((option) => !taken.has(option));
  // The path-qualified id is taken too: number the file-qualified one.
  for (let suffix = 2; id === undefined; suffix += 1)
    if (!taken.has(`${options[0]}-${suffix}`)) id = `${options[0]}-${suffix}`;
  taken.add(id);
  return id;
}

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

import { normalizeSchemaVersion } from "../utils/schema-version.js";

const KB_MANIFEST_PATH = ".kb/manifest.json";
const LEGACY_CONFIG_PATH = ".kb/config.json";

function schemaVersionOf(text: string | null): number | null {
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text) as { schemaVersion?: unknown } | null;
    const raw = parsed?.schemaVersion;
    return typeof raw === "number" || typeof raw === "string"
      ? normalizeSchemaVersion(raw)
      : null;
  } catch {
    return null;
  }
}

/**
 * True when the staged commit carries a `kibi migrate` run: the staged
 * `.kb/manifest.json` records a schema generation newer than the base, or the
 * commit retires the legacy `.kb/config.json`. The audit record migrate writes
 * under `.kb/migrations/` is ignored by Git, so the schema bump is the
 * committed evidence; it cannot be repeated once a KB is at the latest schema,
 * so it cannot be used to waive later edits.
 *
 * `readBase` and `readStaged` return a file's content in the base and the
 * staged tree, or null when the file does not exist there.
 */
// implements REQ-cli-migration-first-commit
export function stagedCommitCarriesMigration(
  readBase: (filePath: string) => string | null,
  readStaged: (filePath: string) => string | null,
): boolean {
  const staged = schemaVersionOf(readStaged(KB_MANIFEST_PATH));
  if (staged === null) return false;
  const baseConfig = readBase(LEGACY_CONFIG_PATH);
  if (baseConfig !== null && readStaged(LEGACY_CONFIG_PATH) === null)
    return true;
  const baseVersions = [
    schemaVersionOf(readBase(KB_MANIFEST_PATH)),
    schemaVersionOf(baseConfig),
  ].filter((version): version is number => version !== null);
  return baseVersions.length === 0 || Math.min(...baseVersions) < staged;
}

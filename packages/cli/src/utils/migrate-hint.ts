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

import { readKbManifestStatus } from "./kb-manifest.js";
import { getSchemaVersionStatus } from "./schema-version.js";

/**
 * The one-line hint text `kibi check`, `kibi status` and `kibi report` print
 * first while the KB's manifest records a schema older than this Kibi, or
 * null when it does not (current, newer, missing or unreadable manifests
 * have their own diagnostics).
 */
export function schemaMigrationHint(workspaceRoot: string): string | null {
  const manifest = readKbManifestStatus(workspaceRoot);
  if (manifest.state !== "ok") return null;
  const schema = getSchemaVersionStatus(manifest.manifest);
  if (schema.status !== "older") return null;
  return `Migration needed: this KB is at schema ${schema.currentVersion} and this Kibi expects schema ${schema.latestVersion}. Run 'kibi migrate' to review the upgrade, then 'kibi migrate --yes' to apply it.`;
}

/** Print the hint, if any, followed by a blank line. */
export function printSchemaMigrationHint(workspaceRoot: string): void {
  const hint = schemaMigrationHint(workspaceRoot);
  if (hint === null) return;
  console.log(hint);
  console.log();
}

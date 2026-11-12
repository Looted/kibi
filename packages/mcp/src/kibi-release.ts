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

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * The Kibi release version (`YYYY.M.N`) from the release manifest of the
 * installed kibi-core, when it lists this kibi-mcp version. Undefined for an
 * older kibi-core without a manifest or a release that lists another kibi-mcp.
 */
export function kibiReleaseForMcp(
  mcpVersion: string,
  readManifest: () => string = () =>
    String(readFileSync(require.resolve("kibi-core/release.json"))),
): string | undefined {
  let manifest: unknown;
  // rationale: an emptied catch block leaves manifest undefined, which the
  // checks below turn into the same undefined result, so no test can tell.
  // Stryker disable BlockStatement
  try {
    manifest = JSON.parse(readManifest());
  } catch {
    return undefined;
  }
  // Stryker restore BlockStatement
  // Object() turns null and primitives into objects without these keys.
  const { release, packages } = Object(manifest) as {
    release?: unknown;
    packages?: unknown;
  };
  return typeof release === "string" &&
    Object(packages)["kibi-mcp"] === mcpVersion
    ? release
    : undefined;
}

/** The MCP server title: `Kibi MCP (Kibi 2026.11.0)` when the release is known. */
export function mcpServerTitle(release: string | undefined): string {
  return release === undefined ? "Kibi MCP" : `Kibi MCP (Kibi ${release})`;
}

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
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The Kibi release manifest kibi-core ships as `release.json`: one calendar
 * release version (`YYYY.M.N`) for the exact set of package versions released
 * together, plus the compatibility versions that release declares.
 */
export interface KibiReleaseManifest {
  release: string;
  date: string;
  packages: Record<string, string>;
  compatibility: {
    kbSchema: { current: number; migratesFrom: number };
    operationProtocol: number;
    pluginApi: string;
  };
}

export interface KibiReleaseMismatch {
  name: string;
  installed: string;
  listed: string;
}

const require = createRequire(import.meta.url);
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export function parseKibiReleaseManifest(
  value: unknown,
): KibiReleaseManifest | undefined {
  if (value === null || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const packages = record.packages;
  const compat = record.compatibility as Record<string, unknown> | undefined;
  const kbSchema = compat?.kbSchema as Record<string, unknown> | undefined;
  if (
    typeof record.release !== "string" ||
    !/^\d{4}\.\d{1,2}\.\d+$/.test(record.release) ||
    typeof record.date !== "string" ||
    packages === null ||
    typeof packages !== "object" ||
    Object.values(packages).some((version) => typeof version !== "string") ||
    !kbSchema ||
    typeof kbSchema.current !== "number" ||
    typeof kbSchema.migratesFrom !== "number" ||
    typeof compat?.operationProtocol !== "number" ||
    typeof compat?.pluginApi !== "string"
  ) {
    return undefined;
  }
  return value as KibiReleaseManifest;
}

function readManifestFile(file: string): KibiReleaseManifest | undefined {
  try {
    return parseKibiReleaseManifest(JSON.parse(readFileSync(file, "utf8")));
  } catch {
    return undefined;
  }
}

/**
 * The release manifest of the installed kibi-core, falling back to the
 * monorepo layout (src/ and dist/ sit directly under packages/cli).
 * Undefined when no readable manifest exists (kibi-core older than the
 * manifest, or a damaged install).
 */
export function readKibiRelease(
  resolveCore: () => string = () => require.resolve("kibi-core/release.json"),
): KibiReleaseManifest | undefined {
  let resolved: string | undefined;
  try {
    resolved = resolveCore();
  } catch {
    resolved = undefined;
  }
  return (
    (resolved === undefined ? undefined : readManifestFile(resolved)) ??
    readManifestFile(
      path.join(moduleDirectory, "..", "..", "core", "release.json"),
    )
  );
}

/**
 * Whether an installed version is the one a release lists. A local pack
 * stamped `<version>-dev.<suffix>` (`scripts/pack-packages.ts --dev-version`)
 * counts as that version.
 */
export function matchesListedVersion(
  installed: string,
  listed: string,
): boolean {
  return installed === listed || installed.startsWith(`${listed}-dev.`);
}

/**
 * Installed Kibi packages whose version differs from the one the release
 * lists. Packages that are not installed (optional plugins, language packs,
 * other platforms' SWI-Prolog builds) are not mismatches.
 */
export function releaseMismatches(
  release: KibiReleaseManifest,
  installed: Readonly<Record<string, string | undefined>>,
): KibiReleaseMismatch[] {
  const mismatches: KibiReleaseMismatch[] = [];
  for (const [name, listed] of Object.entries(release.packages)) {
    const version = installed[name];
    if (version !== undefined && !matchesListedVersion(version, listed)) {
      mismatches.push({ name, installed: version, listed });
    }
  }
  return mismatches;
}

/**
 * `kibi --version`: `Kibi 2026.11.0 (kibi-cli 2.41.0)` when the release lists
 * this CLI; otherwise the CLI version alone with a pointer to `kibi doctor`.
 */
export function formatVersionLine(
  cliVersion: string,
  release: KibiReleaseManifest | undefined,
): string {
  if (release === undefined) return `kibi-cli ${cliVersion}`;
  const listed = release.packages["kibi-cli"];
  if (listed !== undefined && matchesListedVersion(cliVersion, listed)) {
    return `Kibi ${release.release} (kibi-cli ${cliVersion})`;
  }
  return `kibi-cli ${cliVersion} (installed kibi-core belongs to Kibi ${release.release}, which lists kibi-cli ${listed ?? "none"}; run 'kibi doctor')`;
}

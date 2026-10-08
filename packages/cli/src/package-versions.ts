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
 * The kibi-cli version a bundle was built from. kibi-runtime bundles this
 * source and defines the constant at build time, so a bundled engine reports
 * the same versions as the kibi-cli release it was built from. Unbundled
 * builds leave it undefined and read the package manifest.
 */
declare const __KIBI_CLI_VERSION__: string | undefined;

const require = createRequire(import.meta.url);
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

function manifestVersion(
  manifestPath: string,
  expectedName: string,
): string | undefined {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      name?: unknown;
      version?: unknown;
    };
    return manifest.name === expectedName &&
      typeof manifest.version === "string"
      ? manifest.version
      : undefined;
  } catch {
    return undefined;
  }
}

function cliVersion(): string {
  if (typeof __KIBI_CLI_VERSION__ === "string") return __KIBI_CLI_VERSION__;
  // src/ and dist/ both sit directly under the package root.
  return (
    manifestVersion(
      path.join(moduleDirectory, "..", "package.json"),
      "kibi-cli",
    ) ?? "unknown"
  );
}

function coreVersion(): string {
  try {
    const resolved = manifestVersion(
      require.resolve("kibi-core/package.json"),
      "kibi-core",
    );
    if (resolved) return resolved;
  } catch {
    // Fall back to the monorepo layout below.
  }
  return (
    manifestVersion(
      path.join(moduleDirectory, "..", "..", "core", "package.json"),
      "kibi-core",
    ) ?? "unknown"
  );
}

/**
 * The package versions this build of the engine and its Prolog core carry,
 * for example `kibi-cli@3.6.0,kibi-core@0.18.0`. The engine client and the
 * daemon compare them, so a daemon left running by another install is
 * replaced instead of serving this client.
 */
// implements REQ-engine-daemon-package-versions
export const KIBI_BUILT_PACKAGE_VERSIONS = `kibi-cli@${cliVersion()},kibi-core@${coreVersion()}`;

/** KIBI_PACKAGE_VERSIONS when set (an explicit override), else the built versions. */
// implements REQ-engine-daemon-package-versions
export function kibiPackageVersions(): string {
  const override = process.env.KIBI_PACKAGE_VERSIONS;
  return override !== undefined && override.length > 0
    ? override
    : KIBI_BUILT_PACKAGE_VERSIONS;
}

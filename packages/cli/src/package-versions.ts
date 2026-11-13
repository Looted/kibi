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
import { readFileSync, readdirSync } from "node:fs";
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

/** The version of the manifest at `manifestPath` when it names `expectedName`. */
export function manifestVersion(
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
    // An unreadable or malformed manifest has no version.
  }
  return undefined;
}

/** The bundled kibi-cli version, else the one beside `directory` (src/ or dist/). */
export function cliVersion(directory: string = moduleDirectory): string {
  if (typeof __KIBI_CLI_VERSION__ === "string") return __KIBI_CLI_VERSION__;
  // src/ and dist/ both sit directly under the package root.
  return (
    manifestVersion(path.join(directory, "..", "package.json"), "kibi-cli") ??
    "unknown"
  );
}

/** The installed kibi-core version, else the monorepo sibling's. */
export function coreVersion(
  resolveManifest: (id: string) => string = require.resolve,
  directory: string = moduleDirectory,
): string {
  try {
    const resolved = manifestVersion(
      resolveManifest("kibi-core/package.json"),
      "kibi-core",
    );
    if (resolved) return resolved;
  } catch {
    // Fall back to the monorepo layout below.
  }
  return (
    manifestVersion(
      path.join(directory, "..", "..", "core", "package.json"),
      "kibi-core",
    ) ?? "unknown"
  );
}

/**
 * A short digest of the Prolog sources in `directory` (every `.pl` file, by
 * name and content); undefined when the directory holds none or cannot be
 * read.
 */
export function prologSourcesDigest(
  directory: string,
  list: (directory: string) => string[] = readdirSync,
): string | undefined {
  let files: string[];
  try {
    // Sorted, so the digest does not depend on the directory's order.
    files = list(directory)
      .filter((file) => file.endsWith(".pl"))
      .sort();
  } catch {
    return undefined;
  }
  if (files.length === 0) return undefined;
  const hash = createHash("sha256");
  for (const file of files) {
    let content: Buffer;
    try {
      content = readFileSync(path.join(directory, file));
    } catch {
      return undefined;
    }
    // Each name and length bounds its file, so no two layouts collide.
    hash.update(`${file}\0${content.byteLength}\0`).update(content);
  }
  return hash.digest("hex").slice(0, 12);
}

/**
 * The directory of the Prolog core the engine loads: KIBI_KB_PL_PATH's,
 * else the installed kibi-core's `src/`, else the monorepo sibling's.
 */
export function coreSourcesDirectory(
  resolveManifest: (id: string) => string = require.resolve,
  directory: string = moduleDirectory,
  override: string | undefined = process.env.KIBI_KB_PL_PATH,
): string {
  if (override) return path.dirname(override);
  try {
    return path.join(
      path.dirname(resolveManifest("kibi-core/package.json")),
      "src",
    );
  } catch {
    return path.join(directory, "..", "..", "core", "src");
  }
}

/**
 * The package versions this build of the engine and its Prolog core carry,
 * for example `kibi-cli@3.6.0,kibi-core@0.18.0,core-sources@1a2b3c4d5e6f`.
 * The engine client and the daemon compare them, so a daemon left running
 * by another install, or by a build whose Prolog rules differ under the
 * same version numbers, is replaced instead of serving this client.
 */
export function builtPackageVersions(
  cli: string = cliVersion(),
  core: string = coreVersion(),
  sourcesDigest: string | null = prologSourcesDigest(coreSourcesDirectory()) ??
    null,
): string {
  const versions = `kibi-cli@${cli},kibi-core@${core}`;
  return sourcesDigest === null
    ? versions
    : `${versions},core-sources@${sourcesDigest}`;
}

/** The versions {@link builtPackageVersions} reads for this build. */
export const KIBI_BUILT_PACKAGE_VERSIONS = builtPackageVersions();

/** KIBI_PACKAGE_VERSIONS when set (an explicit override), else the built versions. */
export function kibiPackageVersions(): string {
  return process.env.KIBI_PACKAGE_VERSIONS || KIBI_BUILT_PACKAGE_VERSIONS;
}

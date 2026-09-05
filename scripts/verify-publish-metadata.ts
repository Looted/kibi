/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Pre-publish metadata guard for npm provenance (sigstore) validation.
 *
 * The npm registry rejects `npm publish --provenance` server-side with
 * E422 when package.json repository information does not match the
 * repository that produced the build provenance. That validation only
 * happens on the real registry and cannot be reproduced by
 * `npm publish --dry-run`, so this script performs the same checks
 * locally before any tarball is packed or uploaded.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PUBLISHABLE_DIRS } from "./release-state";

type PublishMetadataIssue = {
  pkg: string;
  problem: string;
};

// implements REQ-020
export function expectedRepositoryUrl(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const repo = env.GITHUB_REPOSITORY || "Looted/kibi";
  return `https://github.com/${repo}`;
}

/**
 * Normalize a package.json repository value into `github.com/<owner>/<repo>`
 * form so provenance-relevant comparison ignores cosmetic differences
 * (`git+` prefix, protocol, trailing `.git`, string shorthand, trailing slash).
 */
// implements REQ-020
export function normalizeRepositoryUrl(url: string): string {
  return url
    .trim()
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/^https?:\/\//, "")
    .replace(/^github:/, "github.com/")
    .replace(/\.git\/?$/, "")
    .replace(/\/$/, "");
}

// implements REQ-020
export function repositoryMatches(url: string, expected: string): boolean {
  return normalizeRepositoryUrl(url) === normalizeRepositoryUrl(expected);
}

function readPackageJson(
  packagesRoot: string,
  dir: string,
): {
  name?: unknown;
  version?: unknown;
  private?: unknown;
  repository?: unknown;
} {
  return JSON.parse(
    readFileSync(join(packagesRoot, dir, "package.json"), "utf8"),
  );
}

// implements REQ-020
export function verifyPublishMetadata(
  packagesRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): PublishMetadataIssue[] {
  const expected = expectedRepositoryUrl(env);
  const issues: PublishMetadataIssue[] = [];

  for (const dir of PUBLISHABLE_DIRS) {
    let manifest: ReturnType<typeof readPackageJson>;
    try {
      manifest = readPackageJson(packagesRoot, dir);
    } catch (error) {
      issues.push({
        pkg: dir,
        problem: `package.json is missing or unreadable: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
      continue;
    }

    const name = typeof manifest.name === "string" ? manifest.name : "";
    if (name !== `kibi-${dir}`) {
      issues.push({
        pkg: dir,
        problem: `package name '${name || "<missing>"}' does not match expected 'kibi-${dir}'`,
      });
    }

    const version =
      typeof manifest.version === "string" ? manifest.version : "";
    if (!version) {
      issues.push({ pkg: dir, problem: "package version is missing" });
    }

    if (manifest.private === true) {
      issues.push({
        pkg: dir,
        problem: "package is marked private; npm publish would refuse it",
      });
    }

    const repository = manifest.repository;
    let url: string | undefined;
    if (typeof repository === "string") {
      url = repository;
    } else if (
      repository &&
      typeof repository === "object" &&
      typeof (repository as { url?: unknown }).url === "string"
    ) {
      url = (repository as { url: string }).url;
    }

    if (!url) {
      issues.push({
        pkg: dir,
        problem: `repository.url is missing — npm provenance validation would reject publishing with E422. Expected '${expected}'.`,
      });
      continue;
    }

    if (!repositoryMatches(url, expected)) {
      issues.push({
        pkg: dir,
        problem: `repository.url '${url}' does not match provenance repository '${expected}' — npm would reject publishing with E422.`,
      });
    }
  }

  return issues;
}

export function main(): number {
  const packagesRoot = join(process.cwd(), "packages");
  const issues = verifyPublishMetadata(packagesRoot);

  if (issues.length > 0) {
    console.error(
      `Publish metadata verification failed for ${issues.length} package(s):`,
    );
    for (const issue of issues) {
      console.error(`  - ${issue.pkg}: ${issue.problem}`);
    }
    return 1;
  }

  console.log(
    `Publish metadata OK: ${PUBLISHABLE_DIRS.length} packages match provenance repository '${expectedRepositoryUrl()}'.`,
  );
  return 0;
}

if (import.meta.main) {
  process.exit(main());
}

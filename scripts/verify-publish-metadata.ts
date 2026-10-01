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
import { PLATFORM_PACKAGES } from "../packages/swipl/index.js";
import { PUBLISHABLE_DIRS } from "./release-state";
import swiplPins from "./swipl-version.json";
import { verifySwiplPayload } from "./verify-swipl-payload.mjs";

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
  mcpName?: unknown;
} {
  return JSON.parse(
    readFileSync(join(packagesRoot, dir, "package.json"), "utf8"),
  );
}

const PAYLOAD_FILES = ["bin/", "lib/", "licenses/", "build-manifest.json"];
const INSTALL_HOOKS = ["preinstall", "install", "postinstall"];

type SwiplManifest = {
  name?: string;
  version?: string;
  os?: string[];
  cpu?: string[];
  libc?: string[];
  files?: string[];
  scripts?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  kibi?: { swiplVersion?: string; target?: string };
};

/**
 * Release invariants of the kibi-swipl package family: the resolver lists every
 * platform package at the version that will be published beside it, each
 * platform package restricts os/cpu/libc, ships only the payload, has no
 * install scripts, pins the SWI-Prolog version of scripts/swipl-version.json,
 * and (when the payload is required, i.e. after release population) carries a
 * runtime whose binary matches its manifest.
 */
// implements REQ-prolog-bundled-release
export function verifySwiplFamilyMetadata(
  packagesRoot: string,
  options: { requirePayload?: boolean } = {},
): PublishMetadataIssue[] {
  const issues: PublishMetadataIssue[] = [];
  const read = (dir: string): SwiplManifest | undefined => {
    try {
      return readPackageJson(packagesRoot, dir) as SwiplManifest;
    } catch {
      return undefined;
    }
  };
  const resolver = read("swipl");
  if (resolver === undefined) {
    return [{ pkg: "swipl", problem: "package.json is missing or unreadable" }];
  }
  const pinned = swiplPins.version;
  if (resolver.kibi?.swiplVersion !== pinned) {
    issues.push({
      pkg: "swipl",
      problem: `kibi.swiplVersion '${String(resolver.kibi?.swiplVersion)}' does not match the pinned SWI-Prolog ${pinned}`,
    });
  }
  const listed = Object.keys(resolver.optionalDependencies ?? {}).sort();
  const platformNames = Object.values(PLATFORM_PACKAGES)
    .map((entry) => entry.package)
    .sort();
  if (JSON.stringify(listed) !== JSON.stringify(platformNames)) {
    issues.push({
      pkg: "swipl",
      problem: `optionalDependencies must list exactly ${platformNames.join(", ")}`,
    });
  }
  for (const [target, entry] of Object.entries(PLATFORM_PACKAGES)) {
    const dir = `swipl-${target}`;
    const manifest = read(dir);
    if (manifest === undefined) {
      issues.push({
        pkg: dir,
        problem: "package.json is missing or unreadable",
      });
      continue;
    }
    const problem = (text: string) => issues.push({ pkg: dir, problem: text });
    if (manifest.name !== entry.package) {
      problem(`name '${String(manifest.name)}' must be '${entry.package}'`);
    }
    if (manifest.version !== resolver.version) {
      problem(
        `version '${String(manifest.version)}' must match kibi-swipl ${String(resolver.version)} (fixed group)`,
      );
    }
    if (resolver.optionalDependencies?.[entry.package] !== manifest.version) {
      problem(
        `kibi-swipl must depend on ${entry.package} at exactly ${String(manifest.version)}`,
      );
    }
    if (manifest.kibi?.target !== target) {
      problem(`kibi.target must be '${target}'`);
    }
    if (manifest.kibi?.swiplVersion !== pinned) {
      problem(
        `kibi.swiplVersion '${String(manifest.kibi?.swiplVersion)}' does not match the pinned SWI-Prolog ${pinned}`,
      );
    }
    if (JSON.stringify(manifest.os) !== JSON.stringify([entry.os])) {
      problem(`os must be ["${entry.os}"]`);
    }
    if (JSON.stringify(manifest.cpu) !== JSON.stringify([entry.cpu])) {
      problem(`cpu must be ["${entry.cpu}"]`);
    }
    const libc = "libc" in entry ? [entry.libc] : undefined;
    if (JSON.stringify(manifest.libc) !== JSON.stringify(libc)) {
      problem(`libc must be ${JSON.stringify(libc)}`);
    }
    if (JSON.stringify(manifest.files) !== JSON.stringify(PAYLOAD_FILES)) {
      problem(`files must be exactly ${JSON.stringify(PAYLOAD_FILES)}`);
    }
    for (const hook of INSTALL_HOOKS) {
      if (manifest.scripts?.[hook] !== undefined) {
        problem(`install script '${hook}' is not allowed`);
      }
    }
    if (!manifest.scripts?.prepack?.includes("verify-swipl-payload")) {
      problem("prepack must run scripts/verify-swipl-payload.mjs");
    }
    if (options.requirePayload === true) {
      for (const reason of verifySwiplPayload(join(packagesRoot, dir))) {
        problem(`bundled runtime payload: ${reason}`);
      }
    }
  }
  return issues;
}

// implements REQ-020
export function verifyPublishMetadata(
  packagesRoot: string,
  env: NodeJS.ProcessEnv = process.env,
  options: { requireSwiplPayload?: boolean } = {},
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

    if (dir === "mcp") {
      // Registry permissions preserve the repository_owner OIDC claim's case.
      // Matching the manifest to npm alone cannot detect a wrong namespace.
      const owner =
        env.GITHUB_REPOSITORY_OWNER ||
        (env.GITHUB_REPOSITORY || "Looted/kibi").split("/")[0];
      const expectedName = `io.github.${owner}/kibi-mcp`;
      if (manifest.mcpName !== expectedName) {
        issues.push({
          pkg: dir,
          problem: `npm mcpName '${String(manifest.mcpName)}' must match the case-sensitive GitHub namespace '${expectedName}'`,
        });
      }
      try {
        const registryManifest = JSON.parse(
          readFileSync(join(packagesRoot, dir, "server.json"), "utf8"),
        ) as { name?: unknown };
        if (registryManifest.name !== expectedName) {
          issues.push({
            pkg: dir,
            problem: `MCP Registry name '${String(registryManifest.name)}' must match the case-sensitive GitHub namespace '${expectedName}'`,
          });
        }
      } catch (error) {
        issues.push({
          pkg: dir,
          problem: `server.json is missing or unreadable: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
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

  issues.push(
    ...verifySwiplFamilyMetadata(packagesRoot, {
      requirePayload: options.requireSwiplPayload === true,
    }),
  );
  return issues;
}

export function main(argv: readonly string[] = process.argv.slice(2)): number {
  const packagesRoot = join(process.cwd(), "packages");
  const issues = verifyPublishMetadata(packagesRoot, process.env, {
    requireSwiplPayload: argv.includes("--require-swipl-payload"),
  });

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

export function defaultVerifyPublishExit(code: number): void {
  process.exit(code);
}

// implements REQ-020
// covered_by TEST-kibi-distribution-parity-matrix
export function runVerifyPublishMetadataIfMain(
  isMain = import.meta.main,
  start = main,
  exit: (code: number) => unknown = defaultVerifyPublishExit,
): void {
  if (!isMain) return;
  exit(start());
}

runVerifyPublishMetadataIfMain();

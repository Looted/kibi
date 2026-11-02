/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

/**
 * Release bump guard.
 *
 * Every publishable package whose shipped files differ from the last release
 * (the `master` tree) must either carry a new version or be named in a pending
 * changeset. Otherwise npm keeps serving the old build while its dependents
 * ship code that expects the new one: a check rule added to kibi-core's
 * Prolog registry without a kibi-core bump made every `kibi check` fail on a
 * fresh install.
 *
 * Usage: bun run scripts/check-release-bumps.ts [--base <git-ref>]
 * The base defaults to `origin/master`. Only tree contents are compared, so a
 * shallow fetch of the base ref is enough.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PACKAGE_CATALOG } from "./package-catalog";

export type BumpPackage = Readonly<{ dir: string; npmName: string }>;

export type BumpInputs = Readonly<{
  packages: readonly BumpPackage[];
  /** Changed file paths (repo-relative) between base and HEAD. */
  changedFiles: readonly string[];
  /** Version at base per npm name; undefined when the package is new. */
  baseVersions: ReadonlyMap<string, string | undefined>;
  headVersions: ReadonlyMap<string, string>;
  /** Package names listed in pending changeset front matter. */
  changesetPackages: ReadonlySet<string>;
}>;

export type MissingBump = Readonly<{
  npmName: string;
  version: string;
  files: readonly string[];
}>;

const NON_SHIPPED = [
  /(^|\/)(tests?|__tests__|fixtures)\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /(^|\/)CHANGELOG\.md$/,
  /(^|\/)(stryker|vitest|jest|bunfig|tsconfig)[^/]*$/,
];

// implements REQ-020
export function isShippedPath(relativePath: string): boolean {
  return !NON_SHIPPED.some((pattern) => pattern.test(relativePath));
}

// implements REQ-020
export function findMissingBumps(inputs: BumpInputs): MissingBump[] {
  const missing: MissingBump[] = [];
  for (const pkg of inputs.packages) {
    const prefix = `packages/${pkg.dir}/`;
    const files = inputs.changedFiles.filter(
      (file) =>
        file.startsWith(prefix) && isShippedPath(file.slice(prefix.length)),
    );
    if (files.length === 0) continue;
    const base = inputs.baseVersions.get(pkg.npmName);
    const head = inputs.headVersions.get(pkg.npmName) ?? "";
    if (base === undefined || base !== head) continue;
    if (inputs.changesetPackages.has(pkg.npmName)) continue;
    missing.push({ npmName: pkg.npmName, version: head, files });
  }
  return missing;
}

// implements REQ-020
export function parseChangesetPackages(markdown: string): string[] {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);
  if (!match) return [];
  const names: string[] = [];
  for (const line of match[1].split(/\r?\n/)) {
    const entry =
      /^\s*["']?([^"':\s]+)["']?\s*:\s*(major|minor|patch)\s*$/.exec(line);
    if (entry) names.push(entry[1]);
  }
  return names;
}

function git(cwd: string, args: readonly string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function versionAt(cwd: string, ref: string, dir: string): string | undefined {
  try {
    const raw = git(cwd, ["show", `${ref}:packages/${dir}/package.json`]);
    return (JSON.parse(raw) as { version?: string }).version;
  } catch {
    return undefined;
  }
}

export type ReleaseBumpOptions = Readonly<{
  /** Repository root; defaults to the working directory. */
  cwd?: string;
  /** Packages to guard; defaults to the publishable catalog entries. */
  packages?: readonly BumpPackage[];
}>;

export function main(
  argv: readonly string[],
  options: ReleaseBumpOptions = {},
): void {
  const cwd = options.cwd ?? process.cwd();
  const baseIndex = argv.indexOf("--base");
  const base = baseIndex >= 0 ? argv[baseIndex + 1] : "origin/master";
  if (!base) throw new Error("--base requires a git ref");

  const packages =
    options.packages ??
    PACKAGE_CATALOG.filter((entry) => entry.publishable).map((entry) => ({
      dir: entry.dir,
      npmName: entry.npmName,
    }));
  const changedFiles = git(cwd, [
    "diff",
    "--name-only",
    base,
    "HEAD",
    "--",
    "packages",
  ])
    .split("\n")
    .filter(Boolean);
  const baseVersions = new Map<string, string | undefined>();
  const headVersions = new Map<string, string>();
  for (const pkg of packages) {
    baseVersions.set(pkg.npmName, versionAt(cwd, base, pkg.dir));
    const head = JSON.parse(
      readFileSync(join(cwd, "packages", pkg.dir, "package.json"), "utf8"),
    ) as { version: string };
    headVersions.set(pkg.npmName, head.version);
  }
  const changesetPackages = new Set<string>();
  for (const file of readdirSync(join(cwd, ".changeset"))) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    for (const name of parseChangesetPackages(
      readFileSync(join(cwd, ".changeset", file), "utf8"),
    )) {
      changesetPackages.add(name);
    }
  }

  const missing = findMissingBumps({
    packages,
    changedFiles,
    baseVersions,
    headVersions,
    changesetPackages,
  });
  if (missing.length === 0) {
    process.stdout.write(
      `release bump guard: every changed publishable package is bumped or has a pending changeset (base ${base})\n`,
    );
    return;
  }
  for (const entry of missing) {
    process.stderr.write(
      `${entry.npmName}@${entry.version} changed since ${base} but has no version bump and no pending changeset:\n`,
    );
    for (const file of entry.files.slice(0, 10)) {
      process.stderr.write(`  ${file}\n`);
    }
    if (entry.files.length > 10) {
      process.stderr.write(`  … and ${entry.files.length - 10} more\n`);
    }
  }
  process.stderr.write(
    "Add the package to a changeset so npm gets the code its dependents expect.\n",
  );
  process.exitCode = 1;
}

if (import.meta.main) main(process.argv.slice(2));

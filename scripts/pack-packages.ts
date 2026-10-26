#!/usr/bin/env bun
/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { type PackageCatalogSlice, dirsForSlice } from "./package-catalog";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function sliceFromArgv(argv: readonly string[]): PackageCatalogSlice {
  const eq = argv.find((arg) => arg.startsWith("--slice="));
  if (eq !== undefined) {
    return eq.slice("--slice=".length) as PackageCatalogSlice;
  }
  const flagIndex = argv.indexOf("--slice");
  const value = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  if (typeof value === "string" && value.length > 0) {
    return value as PackageCatalogSlice;
  }
  return "ci-pack";
}

function destinationFromArgv(argv: readonly string[]): string | undefined {
  const eq = argv.find((arg) => arg.startsWith("--destination="));
  if (eq !== undefined) return eq.slice("--destination=".length);
  const flagIndex = argv.indexOf("--destination");
  const value = flagIndex >= 0 ? argv[flagIndex + 1] : undefined;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * `--dev-version[=<suffix>]`: stamp every packed version as
 * `<version>-dev.<suffix>` (default suffix: the short HEAD sha) so local
 * dogfood packs never reuse a published version number.
 */
function devSuffixFromArgv(
  argv: readonly string[],
  repoRoot: string,
): string | undefined {
  const eq = argv.find((arg) => arg.startsWith("--dev-version="));
  if (eq !== undefined) return eq.slice("--dev-version=".length);
  if (!argv.includes("--dev-version")) return undefined;
  const sha = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const value = sha.stdout?.trim();
  if ((sha.status ?? 1) !== 0 || !value)
    throw new Error("--dev-version needs a git checkout or an explicit suffix");
  return value;
}

type PackageManifest = Record<string, unknown> & {
  name: string;
  version: string;
};

const DEPENDENCY_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

/**
 * The manifest with its own version and every dependency on a packed sibling
 * pinned to the stamped dev version: a prerelease never satisfies the
 * caret range of its release (`^1.2.0` rejects `1.2.0-dev.x`).
 */
// implements REQ-020
export function stampDevVersion(
  manifest: PackageManifest,
  stamped: ReadonlyMap<string, string>,
): PackageManifest {
  const next: PackageManifest = {
    ...manifest,
    version: stamped.get(manifest.name) ?? manifest.version,
  };
  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field];
    if (deps === null || typeof deps !== "object") continue;
    next[field] = Object.fromEntries(
      Object.entries(deps as Record<string, string>).map(([name, range]) => [
        name,
        stamped.get(name) ?? range,
      ]),
    );
  }
  return next;
}

// implements REQ-020
export function packCatalogPackages(
  options: Readonly<{
    slice?: PackageCatalogSlice;
    destination?: string;
    repoRoot?: string;
    devSuffix?: string;
  }> = {},
): void {
  const slice = options.slice ?? "ci-pack";
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  // npm pack runs inside each package directory, so a relative destination
  // must be anchored to the caller's working directory first.
  const destination =
    options.destination === undefined
      ? undefined
      : resolve(options.destination);
  if (destination) mkdirSync(destination, { recursive: true });
  const dirs = dirsForSlice(slice);
  const manifestPath = (dir: string) =>
    join(repoRoot, "packages", dir, "package.json");
  const originals = new Map<string, string>();
  const stamped = new Map<string, string>();
  if (options.devSuffix !== undefined) {
    for (const dir of dirs) {
      const raw = readFileSync(manifestPath(dir), "utf8");
      originals.set(dir, raw);
      const manifest = JSON.parse(raw) as PackageManifest;
      stamped.set(
        manifest.name,
        `${manifest.version}-dev.${options.devSuffix}`,
      );
    }
  }
  try {
    for (const dir of dirs) {
      const cwd = join(repoRoot, "packages", dir);
      const original = originals.get(dir);
      if (original !== undefined) {
        const manifest = JSON.parse(original) as PackageManifest;
        writeFileSync(
          manifestPath(dir),
          `${JSON.stringify(stampDevVersion(manifest, stamped), null, 2)}\n`,
        );
      }
      const args = ["pack"];
      if (destination) args.push("--pack-destination", destination);
      const result = spawnSync("npm", args, {
        cwd,
        stdio: "inherit",
      });
      if ((result.status ?? 1) !== 0) {
        throw new Error(`npm pack failed for packages/${dir}`);
      }
    }
  } finally {
    for (const [dir, raw] of originals) writeFileSync(manifestPath(dir), raw);
  }
}

// implements REQ-020
export function runPackPackagesIfMain(
  isMain = import.meta.main,
  argv: readonly string[] = process.argv.slice(2),
): void {
  if (!isMain) return;
  packCatalogPackages({
    slice: sliceFromArgv(argv),
    destination: destinationFromArgv(argv),
    devSuffix: devSuffixFromArgv(argv, REPO_ROOT),
  });
}

runPackPackagesIfMain();

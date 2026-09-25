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
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
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

// implements REQ-020
export function packCatalogPackages(
  options: Readonly<{
    slice?: PackageCatalogSlice;
    destination?: string;
    repoRoot?: string;
  }> = {},
): void {
  const slice = options.slice ?? "ci-pack";
  const repoRoot = options.repoRoot ?? REPO_ROOT;
  const destination = options.destination;
  if (destination) mkdirSync(destination, { recursive: true });
  for (const dir of dirsForSlice(slice)) {
    const cwd = join(repoRoot, "packages", dir);
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
  });
}

runPackPackagesIfMain();

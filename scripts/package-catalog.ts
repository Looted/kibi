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
 * Canonical npm package catalog for scripts, CI, publish, and packed tests.
 * Adding a package should start here; workflow/test lists are derived or
 * contract-checked against this module.
 */

// implements REQ-020
export type PackageCatalogSlice =
  | "publishable"
  | "pack-all"
  | "packed-e2e"
  | "ci-pack"
  | "default-install"
  | "tarball-clean";

// implements REQ-020
export type PackageCatalogEntry = Readonly<{
  readonly dir: string;
  readonly npmName: string;
  readonly publishable: boolean;
  readonly packInCi: boolean;
  readonly includedInDefaultInstall: boolean;
  readonly optional: boolean;
  readonly packAll: boolean;
}>;

// implements REQ-020
export const PACKAGE_CATALOG = [
  {
    dir: "core",
    npmName: "kibi-core",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "plugin-sdk",
    npmName: "kibi-plugin-sdk",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "plugin-builtin",
    npmName: "kibi-plugin-builtin",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "plugin-jev",
    npmName: "kibi-plugin-jev",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: false,
    optional: true,
    packAll: true,
  },
  {
    dir: "plugin-treesitter",
    npmName: "kibi-plugin-treesitter",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: false,
    optional: true,
    packAll: true,
  },
  {
    dir: "runtime",
    npmName: "kibi-runtime",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "cli",
    npmName: "kibi-cli",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "mcp",
    npmName: "kibi-mcp",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "opencode",
    npmName: "kibi-opencode",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "codex",
    npmName: "kibi-codex",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "cursor",
    npmName: "kibi-cursor",
    publishable: true,
    packInCi: true,
    includedInDefaultInstall: true,
    optional: false,
    packAll: true,
  },
  {
    dir: "zcode",
    npmName: "kibi-zcode",
    publishable: false,
    packInCi: false,
    includedInDefaultInstall: false,
    optional: false,
    packAll: true,
  },
] as const satisfies readonly PackageCatalogEntry[];

// implements REQ-020
export type CatalogPackageDir = (typeof PACKAGE_CATALOG)[number]["dir"];

function dirsWhere(
  predicate: (entry: (typeof PACKAGE_CATALOG)[number]) => boolean,
): readonly CatalogPackageDir[] {
  return PACKAGE_CATALOG.filter(predicate).map((entry) => entry.dir);
}

/** Canonical publishable package directories (npm). */
// implements REQ-020
export const PUBLISHABLE_DIRS = dirsWhere((entry) => entry.publishable);

// implements REQ-020
export const CI_PACK_DIRS = dirsWhere((entry) => entry.packInCi);

// implements REQ-020
export const PACK_ALL_DIRS = dirsWhere((entry) => entry.packAll);

// implements REQ-020
export const PACKED_E2E_DIRS = CI_PACK_DIRS;

// implements REQ-020
export const DEFAULT_INSTALL_DIRS = dirsWhere(
  (entry) => entry.includedInDefaultInstall,
);

// implements REQ-020
export const TARBALL_CLEAN_DIRS = PACK_ALL_DIRS;

// implements REQ-020
export function catalogEntriesForSlice(
  slice: PackageCatalogSlice,
): readonly (typeof PACKAGE_CATALOG)[number][] {
  switch (slice) {
    case "publishable":
      return PACKAGE_CATALOG.filter((entry) => entry.publishable);
    case "pack-all":
      return PACKAGE_CATALOG.filter((entry) => entry.packAll);
    case "packed-e2e":
    case "ci-pack":
      return PACKAGE_CATALOG.filter((entry) => entry.packInCi);
    case "default-install":
      return PACKAGE_CATALOG.filter((entry) => entry.includedInDefaultInstall);
    case "tarball-clean":
      return PACKAGE_CATALOG.filter((entry) => entry.packAll);
    default: {
      const exhaustive: never = slice;
      throw new Error(`Unknown package catalog slice: ${String(exhaustive)}`);
    }
  }
}

// implements REQ-020
export function dirsForSlice(slice: PackageCatalogSlice): readonly string[] {
  return catalogEntriesForSlice(slice).map((entry) => entry.dir);
}

// implements REQ-020
export function lookupCatalogEntry(
  dirOrNpmName: string,
): (typeof PACKAGE_CATALOG)[number] | undefined {
  return PACKAGE_CATALOG.find(
    (entry) => entry.dir === dirOrNpmName || entry.npmName === dirOrNpmName,
  );
}

function printCatalogCli(argv: readonly string[]): void {
  const printDirs = argv.indexOf("--print-dirs");
  if (printDirs >= 0) {
    const slice = (argv[printDirs + 1] ?? "publishable") as PackageCatalogSlice;
    process.stdout.write(`${dirsForSlice(slice).join(" ")}\n`);
    return;
  }
  if (argv.includes("--print-publishable-tsv")) {
    for (const entry of catalogEntriesForSlice("publishable")) {
      process.stdout.write(`${entry.dir}\t${entry.npmName}\n`);
    }
    return;
  }
  const lookupIndex = argv.indexOf("--lookup");
  if (lookupIndex >= 0) {
    const query = argv[lookupIndex + 1];
    if (!query) {
      process.stderr.write("package-catalog --lookup requires a name\n");
      process.exitCode = 1;
      return;
    }
    const entry = lookupCatalogEntry(query);
    if (!entry) {
      process.stderr.write(`Unknown package: ${query}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`${entry.dir}\t${entry.npmName}\n`);
  }
}

// implements REQ-020
export function runPackageCatalogCliIfMain(
  isMain = import.meta.main,
  argv: readonly string[] = process.argv.slice(2),
): void {
  if (!isMain) return;
  printCatalogCli(argv);
}

runPackageCatalogCliIfMain();

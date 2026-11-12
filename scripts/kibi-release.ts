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

/**
 * The Kibi release version and its manifest.
 *
 * Every release gets one calendar version, `YYYY.M.N` (N counts releases in
 * that month from 0). `packages/core/release.json` names that version, the
 * exact version of every publishable package in the release, and the
 * compatibility versions (KB schema, operation protocol, plugin API) the
 * release declares. kibi-core ships the file, and every Kibi install depends
 * on kibi-core, so each release bumps kibi-core at least by a patch.
 *
 * Usage (wired into `bun run version-packages`):
 *   bun run scripts/kibi-release.ts prepare  # before `changeset version`
 *   bun run scripts/kibi-release.ts write    # after `changeset version`
 *   bun run scripts/kibi-release.ts check    # CI: manifest matches package.json files
 *   bun run scripts/kibi-release.ts notes    # Markdown body for the GitHub release
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LATEST_KB_SCHEMA_VERSION } from "../packages/cli/src/utils/schema-version.js";
import { KIBI_PLUGIN_API_VERSION } from "../packages/plugin-sdk/src/protocol.js";
import { parseChangesetPackages } from "./check-release-bumps";
import { PACKAGE_CATALOG } from "./package-catalog";

/**
 * The operation result protocol (`kibiProtocol` in every CLI JSON and MCP
 * result envelope). Kept equal to KIBI_PROTOCOL_VERSION in
 * packages/cli/src/public/operations/result-envelope.ts by a test.
 */
export const OPERATION_PROTOCOL_VERSION = 1;

/** Oldest KB schemaVersion that `kibi migrate` upgrades in place. */
export const OLDEST_MIGRATABLE_KB_SCHEMA = 1;

export const RELEASE_MANIFEST_PATH = "packages/core/release.json";
export const RELEASE_HISTORY_PATH = "releases/history.json";
const CARRIER_CHANGESET = "kibi-release-manifest.md";
const CARRIER_PACKAGE = "kibi-core";

export type ReleaseCompatibility = Readonly<{
  kbSchema: Readonly<{ current: number; migratesFrom: number }>;
  operationProtocol: number;
  pluginApi: string;
}>;

export type ReleaseManifest = Readonly<{
  release: string;
  date: string;
  packages: Readonly<Record<string, string>>;
  compatibility: ReleaseCompatibility;
}>;

const RELEASE_VERSION = /^(\d{4})\.([1-9]|1[0-2])\.(0|[1-9]\d*)$/;

export function currentCompatibility(): ReleaseCompatibility {
  return {
    kbSchema: {
      current: LATEST_KB_SCHEMA_VERSION,
      migratesFrom: OLDEST_MIGRATABLE_KB_SCHEMA,
    },
    operationProtocol: OPERATION_PROTOCOL_VERSION,
    pluginApi: KIBI_PLUGIN_API_VERSION,
  };
}

/**
 * The release version after `previous` on `date` (UTC): the next N in the
 * same month, else `YYYY.M.0`. A previous release dated in a later month than
 * `date` (a skewed clock) still advances its own counter, so versions never
 * go backwards.
 */
export function nextReleaseVersion(
  previous: string | undefined,
  date: Date,
): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const prev = previous === undefined ? null : RELEASE_VERSION.exec(previous);
  if (previous !== undefined && prev === null) {
    throw new Error(`Invalid Kibi release version '${previous}'`);
  }
  if (prev) {
    const prevYear = Number(prev[1]);
    const prevMonth = Number(prev[2]);
    const prevN = Number(prev[3]);
    if (prevYear * 12 + prevMonth >= year * 12 + month) {
      return `${prevYear}.${prevMonth}.${prevN + 1}`;
    }
  }
  return `${year}.${month}.0`;
}

export function isReleaseVersion(value: unknown): value is string {
  return typeof value === "string" && RELEASE_VERSION.test(value);
}

export function parseReleaseManifest(raw: string): ReleaseManifest {
  const value = JSON.parse(raw) as Record<string, unknown>;
  const problems: string[] = [];
  if (!isReleaseVersion(value.release)) problems.push("release");
  if (
    typeof value.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
  ) {
    problems.push("date");
  }
  const packages = value.packages as Record<string, unknown> | undefined;
  if (
    packages === null ||
    typeof packages !== "object" ||
    Object.values(packages).some((v) => typeof v !== "string")
  ) {
    problems.push("packages");
  }
  const compat = value.compatibility as Record<string, unknown> | undefined;
  const kbSchema = compat?.kbSchema as Record<string, unknown> | undefined;
  if (
    !compat ||
    !kbSchema ||
    !Number.isInteger(kbSchema.current) ||
    !Number.isInteger(kbSchema.migratesFrom) ||
    !Number.isInteger(compat.operationProtocol) ||
    typeof compat.pluginApi !== "string"
  ) {
    problems.push("compatibility");
  }
  if (problems.length > 0) {
    throw new Error(
      `Invalid Kibi release manifest: bad ${problems.join(", ")}`,
    );
  }
  return value as unknown as ReleaseManifest;
}

export function serializeManifest(manifest: ReleaseManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export type RepoIo = Readonly<{
  root: string;
  read: (relativePath: string) => string | undefined;
  write: (relativePath: string, content: string) => void;
  list: (relativeDir: string) => readonly string[];
}>;

export function fsRepo(root: string): RepoIo {
  return {
    root,
    read: (relativePath) => {
      const file = join(root, relativePath);
      return existsSync(file) ? readFileSync(file, "utf8") : undefined;
    },
    write: (relativePath, content) =>
      writeFileSync(join(root, relativePath), content),
    list: (relativeDir) => {
      const dir = join(root, relativeDir);
      return existsSync(dir) ? readdirSync(dir) : [];
    },
  };
}

/** Publishable package versions, in catalog order. */
export function packageVersions(repo: RepoIo): Record<string, string> {
  const versions: Record<string, string> = {};
  for (const entry of PACKAGE_CATALOG) {
    if (!entry.publishable) continue;
    const raw = repo.read(`packages/${entry.dir}/package.json`);
    if (raw === undefined) {
      throw new Error(`Missing packages/${entry.dir}/package.json`);
    }
    const manifest = JSON.parse(raw) as { name?: unknown; version?: unknown };
    if (
      manifest.name !== entry.npmName ||
      typeof manifest.version !== "string"
    ) {
      throw new Error(
        `packages/${entry.dir}/package.json must name ${entry.npmName} with a version`,
      );
    }
    versions[entry.npmName] = manifest.version;
  }
  return versions;
}

function readManifest(repo: RepoIo): ReleaseManifest | undefined {
  const raw = repo.read(RELEASE_MANIFEST_PATH);
  return raw === undefined ? undefined : parseReleaseManifest(raw);
}

function readHistory(repo: RepoIo): ReleaseManifest[] {
  const raw = repo.read(RELEASE_HISTORY_PATH);
  if (raw === undefined) return [];
  const value = JSON.parse(raw) as unknown;
  if (!Array.isArray(value)) {
    throw new Error(`${RELEASE_HISTORY_PATH} must hold a JSON array`);
  }
  return value.map((entry) => parseReleaseManifest(JSON.stringify(entry)));
}

function samePackages(
  a: Readonly<Record<string, string>>,
  b: Readonly<Record<string, string>>,
): boolean {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
}

export type PrepareResult = Readonly<{
  action: "none" | "already-carried" | "added-carrier";
  release?: string;
}>;

/**
 * Before `changeset version`: when changesets are pending and none bumps
 * kibi-core, add one that patch-bumps it, so the release manifest ships.
 */
export function prepareRelease(repo: RepoIo, date: Date): PrepareResult {
  const pending = repo
    .list(".changeset")
    .filter((file) => file.endsWith(".md") && file !== "README.md");
  if (pending.length === 0) return { action: "none" };
  const release = nextReleaseVersion(readManifest(repo)?.release, date);
  const carried = pending.some((file) =>
    parseChangesetPackages(repo.read(`.changeset/${file}`) ?? "").includes(
      CARRIER_PACKAGE,
    ),
  );
  if (carried) return { action: "already-carried", release };
  repo.write(
    `.changeset/${CARRIER_CHANGESET}`,
    `---\n"${CARRIER_PACKAGE}": patch\n---\n\nShips the release manifest for Kibi ${release}.\n`,
  );
  return { action: "added-carrier", release };
}

export type WriteResult = Readonly<{
  action: "unchanged" | "released";
  manifest: ReleaseManifest;
}>;

/**
 * After `changeset version`: when any publishable package version moved,
 * assign the next release version, write the manifest and prepend it to the
 * release history.
 */
export function writeRelease(
  repo: RepoIo,
  date: Date,
  compatibility: ReleaseCompatibility = currentCompatibility(),
): WriteResult {
  const previous = readManifest(repo);
  const packages = packageVersions(repo);
  if (previous && samePackages(previous.packages, packages)) {
    return { action: "unchanged", manifest: previous };
  }
  if (
    previous &&
    packages[CARRIER_PACKAGE] === previous.packages[CARRIER_PACKAGE]
  ) {
    throw new Error(
      `${CARRIER_PACKAGE} was not bumped, so it cannot ship the new release manifest; run 'bun run scripts/kibi-release.ts prepare' before 'changeset version'`,
    );
  }
  const manifest: ReleaseManifest = {
    release: nextReleaseVersion(previous?.release, date),
    date: date.toISOString().slice(0, 10),
    packages,
    compatibility,
  };
  repo.write(RELEASE_MANIFEST_PATH, serializeManifest(manifest));
  const history = readHistory(repo);
  repo.write(
    RELEASE_HISTORY_PATH,
    `${JSON.stringify([manifest, ...history], null, 2)}\n`,
  );
  return { action: "released", manifest };
}

/** Problems that make the committed manifest disagree with the tree. */
export function checkRelease(repo: RepoIo): string[] {
  const problems: string[] = [];
  let manifest: ReleaseManifest | undefined;
  try {
    manifest = readManifest(repo);
  } catch (error) {
    return [(error as Error).message];
  }
  if (!manifest) return [`${RELEASE_MANIFEST_PATH} is missing`];
  const packages = packageVersions(repo);
  for (const [name, version] of Object.entries(packages)) {
    const listed = manifest.packages[name];
    if (listed === undefined) {
      problems.push(
        `${name}@${version} is not listed in Kibi ${manifest.release}`,
      );
    } else if (listed !== version) {
      problems.push(
        `${name} is ${version} but Kibi ${manifest.release} lists ${listed}`,
      );
    }
  }
  for (const name of Object.keys(manifest.packages)) {
    if (!(name in packages)) {
      problems.push(
        `Kibi ${manifest.release} lists ${name}, which is not a publishable package`,
      );
    }
  }
  let history: ReleaseManifest[] = [];
  try {
    history = readHistory(repo);
  } catch (error) {
    problems.push((error as Error).message);
  }
  const latest = history[0];
  if (!latest || serializeManifest(latest) !== serializeManifest(manifest)) {
    problems.push(
      `${RELEASE_HISTORY_PATH} must start with the entry in ${RELEASE_MANIFEST_PATH}`,
    );
  }
  for (let i = 1; i < history.length; i++) {
    const newer = history[i - 1].release.split(".").map(Number);
    const older = history[i].release.split(".").map(Number);
    const ordered =
      newer[0] * 12 + newer[1] > older[0] * 12 + older[1] ||
      (newer[0] === older[0] && newer[1] === older[1] && newer[2] > older[2]);
    if (!ordered) {
      problems.push(
        `${RELEASE_HISTORY_PATH} is not newest first at ${history[i - 1].release}, ${history[i].release}`,
      );
    }
  }
  return problems;
}

/** Markdown body for the `kibi@<release>` GitHub release. */
export function releaseNotes(manifest: ReleaseManifest): string {
  const rows = Object.entries(manifest.packages).map(
    ([name, version]) => `| \`${name}\` | ${version} |`,
  );
  const { kbSchema, operationProtocol, pluginApi } = manifest.compatibility;
  return [
    `Kibi ${manifest.release} (${manifest.date}) is this exact package set:`,
    "",
    "| Package | Version |",
    "| --- | --- |",
    ...rows,
    "",
    "Compatibility:",
    "",
    `- KB schema ${kbSchema.current} (\`kibi migrate\` upgrades from schema ${kbSchema.migratesFrom})`,
    `- Operation result protocol ${operationProtocol}`,
    `- Plugin API \`${pluginApi}\``,
    "",
    "`release.json` (attached) is the machine-readable manifest; `kibi doctor` checks an install against it.",
    "",
  ].join("\n");
}

export function releaseDate(env: NodeJS.ProcessEnv = process.env): Date {
  const override = env.KIBI_RELEASE_DATE;
  if (override === undefined || override === "") return new Date();
  const date = new Date(`${override}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`KIBI_RELEASE_DATE must be YYYY-MM-DD, got '${override}'`);
  }
  return date;
}

export function main(
  argv: readonly string[],
  repo: RepoIo = fsRepo(join(import.meta.dir, "..")),
  env: NodeJS.ProcessEnv = process.env,
): number {
  const command = argv[0];
  switch (command) {
    case "prepare": {
      const result = prepareRelease(repo, releaseDate(env));
      if (result.action === "none") {
        console.log("No pending changesets; no Kibi release to prepare.");
      } else if (result.action === "added-carrier") {
        console.log(
          `Kibi ${result.release}: added .changeset/${CARRIER_CHANGESET} so ${CARRIER_PACKAGE} ships the release manifest.`,
        );
      } else {
        console.log(
          `Kibi ${result.release}: ${CARRIER_PACKAGE} is already bumped.`,
        );
      }
      return 0;
    }
    case "write": {
      const result = writeRelease(repo, releaseDate(env));
      console.log(
        result.action === "released"
          ? `Wrote Kibi ${result.manifest.release} to ${RELEASE_MANIFEST_PATH} and ${RELEASE_HISTORY_PATH}.`
          : `No package versions changed; Kibi ${result.manifest.release} stays current.`,
      );
      return 0;
    }
    case "check": {
      const problems = checkRelease(repo);
      if (problems.length === 0) {
        console.log(
          `Kibi release manifest is current (${readManifest(repo)?.release}).`,
        );
        return 0;
      }
      for (const problem of problems) console.error(`✗ ${problem}`);
      console.error(
        "Package versions change only through 'bun run version-packages', which rewrites the release manifest.",
      );
      return 1;
    }
    case "notes": {
      const manifest = readManifest(repo);
      if (!manifest) throw new Error(`${RELEASE_MANIFEST_PATH} is missing`);
      process.stdout.write(releaseNotes(manifest));
      return 0;
    }
    case "version": {
      const manifest = readManifest(repo);
      if (!manifest) throw new Error(`${RELEASE_MANIFEST_PATH} is missing`);
      console.log(manifest.release);
      return 0;
    }
    default:
      console.error(
        "Usage: bun run scripts/kibi-release.ts <prepare|write|check|notes|version>",
      );
      return 2;
  }
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)));
}

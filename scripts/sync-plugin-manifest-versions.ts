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

import { existsSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

// implements REQ-020
export interface PluginManifestSyncResult {
  readonly packageName: string;
  readonly packageVersion: string;
  readonly manifestPath: string;
  readonly previousVersion: string;
}

class PluginManifestSyncError extends Error {
  constructor(
    message: string,
    readonly filePath: string,
  ) {
    super(message);
    this.name = "PluginManifestSyncError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function readJsonObject(
  filePath: string,
): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!isRecord(parsed)) {
    throw new PluginManifestSyncError("Expected a JSON object", filePath);
  }

  return parsed;
}

function replaceVersionField(rawJson: string, version: string): string {
  return rawJson.replace(
    /("version"\s*:\s*)"[^"]*"/,
    `$1${JSON.stringify(version)}`,
  );
}

async function readPackageManifest(
  packageDir: string,
): Promise<PackageManifest> {
  const filePath = join(packageDir, "package.json");
  const manifest = await readJsonObject(filePath);
  if (typeof manifest.name !== "string") {
    throw new PluginManifestSyncError("Missing package name", filePath);
  }
  if (typeof manifest.version !== "string") {
    throw new PluginManifestSyncError("Missing package version", filePath);
  }

  return { name: manifest.name, version: manifest.version };
}

async function discoverPackageDirs(workspaceRoot: string): Promise<string[]> {
  const packagesDir = join(workspaceRoot, "packages");
  const entries = await readdir(packagesDir, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(packagesDir, entry.name, "package.json")),
    )
    .map((entry) => join(packagesDir, entry.name))
    .sort();
}

async function discoverPluginManifestPaths(
  packageDir: string,
): Promise<string[]> {
  const entries = await readdir(packageDir, { withFileTypes: true });

  return entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(".") &&
        entry.name.endsWith("-plugin"),
    )
    .map((entry) => join(packageDir, entry.name, "plugin.json"))
    .filter((manifestPath) => existsSync(manifestPath))
    .sort();
}

async function syncPackagePluginManifests(
  packageDir: string,
): Promise<PluginManifestSyncResult[]> {
  const packageManifest = await readPackageManifest(packageDir);
  const pluginManifestPaths = await discoverPluginManifestPaths(packageDir);
  const results: PluginManifestSyncResult[] = [];

  for (const manifestPath of pluginManifestPaths) {
    const pluginManifestRaw = await readFile(manifestPath, "utf8");
    const pluginManifest = await readJsonObject(manifestPath);
    const previousVersion =
      typeof pluginManifest.version === "string" ? pluginManifest.version : "";
    await writeFile(
      manifestPath,
      replaceVersionField(pluginManifestRaw, packageManifest.version),
      "utf8",
    );
    results.push({
      packageName: packageManifest.name,
      packageVersion: packageManifest.version,
      manifestPath,
      previousVersion,
    });
  }

  return results;
}

// implements REQ-020
export async function syncPluginManifestVersions(
  workspaceRoot: string,
): Promise<PluginManifestSyncResult[]> {
  const packageDirs = await discoverPackageDirs(workspaceRoot);
  const results: PluginManifestSyncResult[] = [];

  for (const packageDir of packageDirs) {
    results.push(...(await syncPackagePluginManifests(packageDir)));
  }

  return results;
}

export async function runSyncPluginManifestVersionsCli(
  workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), ".."),
): Promise<void> {
  const results = await syncPluginManifestVersions(workspaceRoot);
  for (const result of results) {
    console.log(
      `Synced ${relative(workspaceRoot, result.manifestPath)}: ${result.previousVersion} -> ${result.packageVersion}`,
    );
  }
}

if (import.meta.main) {
  await runSyncPluginManifestVersionsCli();
}

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

import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

interface PackageManifest {
  readonly name: string;
  readonly version: string;
}

interface JsonValueRange {
  readonly start: number;
  readonly end: number;
}

interface JsonReplacement {
  readonly range: JsonValueRange;
  readonly value: string;
}

interface PluginManifestPlan {
  readonly packageName: string;
  readonly packageVersion: string;
  readonly manifestPath: string;
  readonly previousVersion: string;
  readonly updatedRaw: string;
}

interface AnalyzerMetadataPlan {
  readonly catalogPath: string;
  readonly catalogRaw: string;
  readonly sbomPath: string;
  readonly sbomRaw: string;
  readonly updatedCatalogRaw: string;
  readonly updatedSbomRaw: string;
}

interface PackageSyncPlan {
  readonly packageDir: string;
  readonly packageManifest: PackageManifest;
  readonly pluginManifests: readonly PluginManifestPlan[];
  readonly analyzerMetadata?: AnalyzerMetadataPlan;
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

function parseJsonObject(
  rawJson: string,
  filePath: string,
): Record<string, unknown> {
  const parsed: unknown = JSON.parse(rawJson);
  if (!isRecord(parsed)) {
    throw new PluginManifestSyncError("Expected a JSON object", filePath);
  }

  return parsed;
}

async function readJsonObject(
  filePath: string,
): Promise<Record<string, unknown>> {
  return parseJsonObject(await readFile(filePath, "utf8"), filePath);
}

function replaceVersionField(rawJson: string, version: string): string {
  return rawJson.replace(
    /("version"\s*:\s*)"[^"]*"/,
    `$1${JSON.stringify(version)}`,
  );
}

function skipWhitespace(rawJson: string, start: number): number {
  let position = start;
  while (/\s/.test(rawJson[position] ?? "")) position += 1;
  return position;
}

function readJsonStringEnd(rawJson: string, start: number): number {
  if (rawJson[start] !== '"') {
    throw new Error("Expected a JSON string token");
  }

  for (let position = start + 1; position < rawJson.length; position += 1) {
    if (rawJson[position] === "\\") {
      position += 1;
    } else if (rawJson[position] === '"') {
      return position + 1;
    }
  }

  throw new Error("Unterminated JSON string token");
}

function readJsonValueEnd(rawJson: string, start: number): number {
  const first = rawJson[start];
  if (first === '"') return readJsonStringEnd(rawJson, start);

  if (first === "{" || first === "[") {
    const closers = [first === "{" ? "}" : "]"];
    for (let position = start + 1; position < rawJson.length; position += 1) {
      const character = rawJson[position];
      if (character === '"') {
        position = readJsonStringEnd(rawJson, position) - 1;
      } else if (character === "{" || character === "[") {
        closers.push(character === "{" ? "}" : "]");
      } else if (character === "}" || character === "]") {
        if (closers.pop() !== character) {
          throw new Error("Mismatched JSON container delimiter");
        }
        if (closers.length === 0) return position + 1;
      }
    }
    throw new Error("Unterminated JSON container value");
  }

  let position = start;
  while (
    position < rawJson.length &&
    !/[\s,}\]]/.test(rawJson[position] ?? "")
  ) {
    position += 1;
  }
  return position;
}

function findObjectMemberRange(
  rawJson: string,
  objectRange: JsonValueRange,
  key: string,
  filePath: string,
): JsonValueRange {
  if (rawJson[objectRange.start] !== "{") {
    throw new PluginManifestSyncError("Expected a JSON object value", filePath);
  }

  let position = skipWhitespace(rawJson, objectRange.start + 1);
  let foundRange: JsonValueRange | undefined;
  while (position < objectRange.end && rawJson[position] !== "}") {
    const keyEnd = readJsonStringEnd(rawJson, position);
    const memberKey = JSON.parse(rawJson.slice(position, keyEnd)) as string;
    position = skipWhitespace(rawJson, keyEnd);
    if (rawJson[position] !== ":") {
      throw new PluginManifestSyncError(
        "Malformed JSON object member",
        filePath,
      );
    }
    const valueStart = skipWhitespace(rawJson, position + 1);
    const valueEnd = readJsonValueEnd(rawJson, valueStart);
    if (memberKey === key) {
      if (foundRange) {
        throw new PluginManifestSyncError(
          `Ambiguous duplicate JSON field ${key}`,
          filePath,
        );
      }
      foundRange = { start: valueStart, end: valueEnd };
    }

    position = skipWhitespace(rawJson, valueEnd);
    if (rawJson[position] === ",") {
      position = skipWhitespace(rawJson, position + 1);
    } else if (rawJson[position] !== "}") {
      throw new PluginManifestSyncError(
        "Malformed JSON object separator",
        filePath,
      );
    }
  }

  if (!foundRange) {
    throw new PluginManifestSyncError(`Missing JSON field ${key}`, filePath);
  }
  return foundRange;
}

function firstArrayItemRange(
  rawJson: string,
  arrayRange: JsonValueRange,
  filePath: string,
): JsonValueRange {
  if (rawJson[arrayRange.start] !== "[") {
    throw new PluginManifestSyncError("Expected a JSON array value", filePath);
  }
  const start = skipWhitespace(rawJson, arrayRange.start + 1);
  if (rawJson[start] === "]") {
    throw new PluginManifestSyncError(
      "Expected a non-empty JSON array",
      filePath,
    );
  }
  return { start, end: readJsonValueEnd(rawJson, start) };
}

function applyJsonReplacements(
  rawJson: string,
  replacements: readonly JsonReplacement[],
): string {
  const ordered = [...replacements].sort(
    (left, right) => right.range.start - left.range.start,
  );
  let result = rawJson;
  for (const replacement of ordered) {
    result =
      result.slice(0, replacement.range.start) +
      JSON.stringify(replacement.value) +
      result.slice(replacement.range.end);
  }
  return result;
}

function requireStringField(
  value: Record<string, unknown>,
  field: string,
  filePath: string,
): string {
  const fieldValue = value[field];
  if (typeof fieldValue !== "string" || fieldValue.length === 0) {
    throw new PluginManifestSyncError(`Missing or invalid ${field}`, filePath);
  }
  return fieldValue;
}

function prepareAnalyzerMetadataSync(
  packageDir: string,
  packageManifest: PackageManifest,
): AnalyzerMetadataPlan | undefined {
  const catalogPath = join(packageDir, "catalog.json");
  const sbomPath = join(packageDir, "SBOM.spdx.json");
  const hasCatalog = existsSync(catalogPath);
  const hasSbom = existsSync(sbomPath);
  if (!hasCatalog && !hasSbom) return undefined;
  if (!hasCatalog || !hasSbom) {
    throw new PluginManifestSyncError(
      "Analyzer package must provide both catalog.json and SBOM.spdx.json",
      hasCatalog ? catalogPath : sbomPath,
    );
  }

  const catalogRaw = readFileSync(catalogPath, "utf8");
  const sbomRaw = readFileSync(sbomPath, "utf8");
  const catalog = parseJsonObject(catalogRaw, catalogPath);
  const sbom = parseJsonObject(sbomRaw, sbomPath);
  if (catalog.plugin !== packageManifest.name) {
    throw new PluginManifestSyncError(
      "Catalog plugin identity must match package.json name",
      catalogPath,
    );
  }
  const previousVersion = requireStringField(
    catalog,
    "pluginVersion",
    catalogPath,
  );

  const packages = sbom.packages;
  if (!Array.isArray(packages) || !packages.every(isRecord)) {
    throw new PluginManifestSyncError(
      "SBOM packages must be an array of objects",
      sbomPath,
    );
  }
  const firstPackage = packages[0];
  if (!isRecord(firstPackage) || firstPackage.name !== packageManifest.name) {
    throw new PluginManifestSyncError(
      "SBOM first package identity must match package.json name",
      sbomPath,
    );
  }
  const matchingPackages = packages.filter(
    (item) => isRecord(item) && item.name === packageManifest.name,
  );
  if (matchingPackages.length !== 1) {
    throw new PluginManifestSyncError(
      "SBOM first-party package identity is ambiguous",
      sbomPath,
    );
  }
  if (firstPackage.versionInfo !== previousVersion) {
    throw new PluginManifestSyncError(
      "SBOM first-party version must match catalog pluginVersion before sync",
      sbomPath,
    );
  }
  const packageRefs = firstPackage.externalRefs;
  if (!Array.isArray(packageRefs) || !packageRefs.every(isRecord)) {
    throw new PluginManifestSyncError(
      "SBOM first-party externalRefs must be an array of objects",
      sbomPath,
    );
  }
  const purlRefs = packageRefs.filter(
    (item) =>
      isRecord(item) &&
      item.referenceCategory === "PACKAGE-MANAGER" &&
      item.referenceType === "purl",
  );
  if (purlRefs.length !== 1 || packageRefs[0] !== purlRefs[0]) {
    throw new PluginManifestSyncError(
      "SBOM first-party package must have one unambiguous leading npm purl",
      sbomPath,
    );
  }
  const purlRef = purlRefs[0];
  if (
    !isRecord(purlRef) ||
    purlRef.referenceLocator !==
      `pkg:npm/${packageManifest.name}@${previousVersion}`
  ) {
    throw new PluginManifestSyncError(
      "SBOM first-party npm purl must match the catalog package identity/version",
      sbomPath,
    );
  }

  const expectedSbomName = `${packageManifest.name}-${previousVersion}`;
  if (sbom.name !== expectedSbomName) {
    throw new PluginManifestSyncError(
      "SBOM document name must match the first-party package identity/version",
      sbomPath,
    );
  }
  const documentNamespace = requireStringField(
    sbom,
    "documentNamespace",
    sbomPath,
  );
  const packageSlug = packageManifest.name.replace(/^kibi-/, "");
  const namespaceSuffix = `/${packageSlug}/${previousVersion}`;
  try {
    const parsedNamespace = new URL(documentNamespace);
    if (
      (parsedNamespace.protocol !== "https:" &&
        parsedNamespace.protocol !== "http:") ||
      parsedNamespace.search !== "" ||
      parsedNamespace.hash !== "" ||
      !documentNamespace.endsWith(namespaceSuffix)
    ) {
      throw new Error("Unexpected SPDX namespace form");
    }
  } catch {
    throw new PluginManifestSyncError(
      "SBOM document namespace must end with its first-party identity/version",
      sbomPath,
    );
  }

  const rootRange: JsonValueRange = {
    start: skipWhitespace(catalogRaw, 0),
    end: catalogRaw.length,
  };
  findObjectMemberRange(catalogRaw, rootRange, "plugin", catalogPath);
  const catalogPluginVersionRange = findObjectMemberRange(
    catalogRaw,
    rootRange,
    "pluginVersion",
    catalogPath,
  );
  const sbomRootRange: JsonValueRange = {
    start: skipWhitespace(sbomRaw, 0),
    end: sbomRaw.length,
  };
  const sbomNameRange = findObjectMemberRange(
    sbomRaw,
    sbomRootRange,
    "name",
    sbomPath,
  );
  const sbomNamespaceRange = findObjectMemberRange(
    sbomRaw,
    sbomRootRange,
    "documentNamespace",
    sbomPath,
  );
  const packagesRange = findObjectMemberRange(
    sbomRaw,
    sbomRootRange,
    "packages",
    sbomPath,
  );
  const firstPackageRange = firstArrayItemRange(
    sbomRaw,
    packagesRange,
    sbomPath,
  );
  findObjectMemberRange(sbomRaw, firstPackageRange, "name", sbomPath);
  const firstPackageVersionRange = findObjectMemberRange(
    sbomRaw,
    firstPackageRange,
    "versionInfo",
    sbomPath,
  );
  const externalRefsRange = findObjectMemberRange(
    sbomRaw,
    firstPackageRange,
    "externalRefs",
    sbomPath,
  );
  const firstExternalRefRange = firstArrayItemRange(
    sbomRaw,
    externalRefsRange,
    sbomPath,
  );
  findObjectMemberRange(
    sbomRaw,
    firstExternalRefRange,
    "referenceCategory",
    sbomPath,
  );
  findObjectMemberRange(
    sbomRaw,
    firstExternalRefRange,
    "referenceType",
    sbomPath,
  );
  const purlRange = findObjectMemberRange(
    sbomRaw,
    firstExternalRefRange,
    "referenceLocator",
    sbomPath,
  );

  const updatedCatalogRaw = applyJsonReplacements(catalogRaw, [
    { range: catalogPluginVersionRange, value: packageManifest.version },
  ]);
  const updatedSbomRaw = applyJsonReplacements(sbomRaw, [
    {
      range: sbomNameRange,
      value: `${packageManifest.name}-${packageManifest.version}`,
    },
    {
      range: sbomNamespaceRange,
      value: `${documentNamespace.slice(0, -previousVersion.length)}${packageManifest.version}`,
    },
    { range: firstPackageVersionRange, value: packageManifest.version },
    {
      range: purlRange,
      value: `pkg:npm/${packageManifest.name}@${packageManifest.version}`,
    },
  ]);

  return {
    catalogPath,
    catalogRaw,
    sbomPath,
    sbomRaw,
    updatedCatalogRaw,
    updatedSbomRaw,
  };
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

async function preparePackageSync(
  packageDir: string,
): Promise<PackageSyncPlan> {
  const packageManifest = await readPackageManifest(packageDir);
  const pluginManifestPaths = await discoverPluginManifestPaths(packageDir);
  const pluginManifests: PluginManifestPlan[] = [];

  for (const manifestPath of pluginManifestPaths) {
    const pluginManifestRaw = await readFile(manifestPath, "utf8");
    const pluginManifest = parseJsonObject(pluginManifestRaw, manifestPath);
    const previousVersion =
      typeof pluginManifest.version === "string" ? pluginManifest.version : "";
    pluginManifests.push({
      packageName: packageManifest.name,
      packageVersion: packageManifest.version,
      manifestPath,
      previousVersion,
      updatedRaw: replaceVersionField(
        pluginManifestRaw,
        packageManifest.version,
      ),
    });
  }

  return {
    packageDir,
    packageManifest,
    pluginManifests,
    analyzerMetadata: prepareAnalyzerMetadataSync(packageDir, packageManifest),
  };
}

// implements REQ-020
export async function syncPluginManifestVersions(
  workspaceRoot: string,
): Promise<PluginManifestSyncResult[]> {
  const packageDirs = await discoverPackageDirs(workspaceRoot);
  const preparedPackages: PackageSyncPlan[] = [];

  // Validate the complete release metadata set before the first write.
  for (const packageDir of packageDirs) {
    preparedPackages.push(await preparePackageSync(packageDir));
  }

  const results: PluginManifestSyncResult[] = [];
  for (const prepared of preparedPackages) {
    for (const pluginManifest of prepared.pluginManifests) {
      await writeFile(
        pluginManifest.manifestPath,
        pluginManifest.updatedRaw,
        "utf8",
      );
      results.push({
        packageName: pluginManifest.packageName,
        packageVersion: pluginManifest.packageVersion,
        manifestPath: pluginManifest.manifestPath,
        previousVersion: pluginManifest.previousVersion,
      });
    }
    if (prepared.analyzerMetadata) {
      await writeFile(
        prepared.analyzerMetadata.catalogPath,
        prepared.analyzerMetadata.updatedCatalogRaw,
        "utf8",
      );
      await writeFile(
        prepared.analyzerMetadata.sbomPath,
        prepared.analyzerMetadata.updatedSbomRaw,
        "utf8",
      );
    }
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

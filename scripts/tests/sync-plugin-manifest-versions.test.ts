/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  runSyncPluginManifestVersionsCli,
  syncPluginManifestVersions,
} from "../sync-plugin-manifest-versions.ts";

const testDir = dirname(fileURLToPath(import.meta.url));
const analyzerName = "kibi-plugin-treesitter";
const priorVersion = "0.2.0";
const nextVersion = "0.2.1";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function replaceUniqueText(
  text: string,
  previous: string,
  next: string,
): string {
  const first = text.indexOf(previous);
  if (first < 0 || text.indexOf(previous, first + previous.length) >= 0) {
    throw new Error(`Expected one exact fixture token: ${previous}`);
  }
  return `${text.slice(0, first)}${next}${text.slice(first + previous.length)}`;
}

async function withTempWorkspace<T>(
  prefix: string,
  action: (workspaceRoot: string) => Promise<T>,
): Promise<T> {
  const workspaceRoot = mkdtempSync(join(tmpdir(), prefix));
  try {
    return await action(workspaceRoot);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
}

async function writeAnalyzerFixture(workspaceRoot: string): Promise<{
  readonly packageDir: string;
  readonly packageManifestPath: string;
  readonly pluginManifestPath: string;
  readonly catalogPath: string;
  readonly sbomPath: string;
}> {
  const packageDir = join(workspaceRoot, "packages", "plugin-treesitter");
  const packageManifestPath = join(packageDir, "package.json");
  const pluginManifestPath = join(
    packageDir,
    ".treesitter-plugin",
    "plugin.json",
  );
  const catalogPath = join(packageDir, "catalog.json");
  const sbomPath = join(packageDir, "SBOM.spdx.json");
  const packageSlug = analyzerName.replace(/^kibi-/, "");

  await writeJson(packageManifestPath, {
    name: analyzerName,
    version: nextVersion,
  });
  await writeJson(pluginManifestPath, {
    name: analyzerName,
    version: priorVersion,
    capabilities: ["symbolExtractorV2"],
  });
  await writeJson(catalogPath, {
    schemaVersion: "kibi.treesitter-language-catalog.v1",
    plugin: analyzerName,
    pluginVersion: priorVersion,
    runtime: {
      package: "web-tree-sitter",
      version: "0.27.0",
      integrity: "sha512-runtime",
    },
    languages: [
      {
        id: "python",
        version: "0.25.0",
        assetSha256: "python-wasm-digest",
        querySha256: "python-query-digest",
      },
      {
        id: "go",
        version: "0.25.0",
        assetSha256: "go-wasm-digest",
        querySha256: "go-query-digest",
      },
    ],
  });
  await writeJson(sbomPath, {
    spdxVersion: "SPDX-2.3",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: `${analyzerName}-${priorVersion}`,
    documentNamespace: `https://example.test/spdx/${packageSlug}/${priorVersion}`,
    packages: [
      {
        name: analyzerName,
        SPDXID: "SPDXRef-Analyzer",
        versionInfo: priorVersion,
        licenseDeclared: "AGPL-3.0-or-later",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: `pkg:npm/${analyzerName}@${priorVersion}`,
          },
        ],
      },
      {
        name: "web-tree-sitter",
        SPDXID: "SPDXRef-WebTreeSitter",
        versionInfo: "0.27.0",
        licenseDeclared: "MIT",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: "pkg:npm/web-tree-sitter@0.27.0",
          },
        ],
      },
      {
        name: "tree-sitter-python",
        SPDXID: "SPDXRef-TreeSitterPython",
        versionInfo: "0.25.0",
        licenseDeclared: "MIT",
        externalRefs: [
          {
            referenceCategory: "PACKAGE-MANAGER",
            referenceType: "purl",
            referenceLocator: "pkg:npm/tree-sitter-python@0.25.0",
          },
        ],
      },
    ],
    relationships: [
      {
        spdxElementId: "SPDXRef-DOCUMENT",
        relationshipType: "DESCRIBES",
        relatedSpdxElement: "SPDXRef-Analyzer",
      },
      {
        spdxElementId: "SPDXRef-Analyzer",
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: "SPDXRef-WebTreeSitter",
      },
      {
        spdxElementId: "SPDXRef-Analyzer",
        relationshipType: "CONTAINS",
        relatedSpdxElement: "SPDXRef-TreeSitterPython",
      },
    ],
  });

  return {
    packageDir,
    packageManifestPath,
    pluginManifestPath,
    catalogPath,
    sbomPath,
  };
}

async function writeEarlierPluginPackage(
  workspaceRoot: string,
): Promise<string> {
  const pluginPath = join(
    workspaceRoot,
    "packages",
    "aaa-prior",
    ".codex-plugin",
    "plugin.json",
  );
  await writeJson(
    join(workspaceRoot, "packages", "aaa-prior", "package.json"),
    {
      name: "kibi-aaa-prior",
      version: "3.0.0",
    },
  );
  await writeJson(pluginPath, {
    name: "kibi-aaa-prior",
    version: "1.0.0",
    skills: "./skills/",
  });
  return pluginPath;
}

describe("syncPluginManifestVersions", () => {
  test("version-packages runs manifest sync after Changesets versioning", () => {
    const packageJson = readJson(join(testDir, "../../package.json"));

    expect(packageJson.scripts).toMatchObject({
      "version-packages":
        "changeset version && bun run scripts/sync-plugin-manifest-versions.ts",
    });
  });

  test("syncs package plugin manifests and only first-party analyzer versions", async () => {
    await withTempWorkspace(
      "kibi-plugin-manifest-sync-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const priorCatalog = readJson(fixture.catalogPath);
        priorCatalog.preservationNote = `Keep "pluginVersion": "${priorVersion}" as escaped text.`;
        let priorCatalogRaw = `\n  ${JSON.stringify(priorCatalog, null, 2)}`;
        priorCatalogRaw = replaceUniqueText(
          priorCatalogRaw,
          `"pluginVersion": "${priorVersion}"`,
          `"pluginVersion" :\t"${priorVersion}"`,
        );
        writeFileSync(fixture.catalogPath, priorCatalogRaw, "utf8");

        const priorSbom = readJson(fixture.sbomPath);
        priorSbom.preservationNote = `Keep "versionInfo": "${priorVersion}" as escaped text.`;
        const priorPackages = priorSbom.packages as Array<
          Record<string, unknown>
        >;
        const priorRuntimePackage = priorPackages[1];
        if (!priorRuntimePackage)
          throw new Error("Missing fixture runtime package");
        priorRuntimePackage.comment = `Third-party data contains "versionInfo": "${priorVersion}" and ${priorVersion}.`;
        let priorSbomRaw = `\n\t${JSON.stringify(priorSbom, null, 2)}`;
        priorSbomRaw = replaceUniqueText(
          priorSbomRaw,
          `"name": "${analyzerName}-${priorVersion}"`,
          `"name"  : "${analyzerName}-${priorVersion}"`,
        );
        const priorNamespace = `https://example.test/spdx/${analyzerName.replace(/^kibi-/, "")}/${priorVersion}`;
        priorSbomRaw = replaceUniqueText(
          priorSbomRaw,
          `"documentNamespace": "${priorNamespace}"`,
          `"documentNamespace" :\t"${priorNamespace}"`,
        );
        priorSbomRaw = replaceUniqueText(
          priorSbomRaw,
          `"versionInfo": "${priorVersion}"`,
          `"versionInfo"   : "${priorVersion}"`,
        );
        priorSbomRaw = replaceUniqueText(
          priorSbomRaw,
          `"referenceLocator": "pkg:npm/${analyzerName}@${priorVersion}"`,
          `"referenceLocator" : "pkg:npm/${analyzerName}@${priorVersion}"`,
        );
        writeFileSync(fixture.sbomPath, priorSbomRaw, "utf8");

        const expectedCatalogBytes = replaceUniqueText(
          priorCatalogRaw,
          `"pluginVersion" :\t"${priorVersion}"`,
          `"pluginVersion" :\t"${nextVersion}"`,
        );
        const expectedNamespace = `https://example.test/spdx/${analyzerName.replace(/^kibi-/, "")}/${nextVersion}`;
        let expectedSbomBytes = replaceUniqueText(
          priorSbomRaw,
          `"name"  : "${analyzerName}-${priorVersion}"`,
          `"name"  : "${analyzerName}-${nextVersion}"`,
        );
        expectedSbomBytes = replaceUniqueText(
          expectedSbomBytes,
          `"documentNamespace" :\t"${priorNamespace}"`,
          `"documentNamespace" :\t"${expectedNamespace}"`,
        );
        expectedSbomBytes = replaceUniqueText(
          expectedSbomBytes,
          `"versionInfo"   : "${priorVersion}"`,
          `"versionInfo"   : "${nextVersion}"`,
        );
        expectedSbomBytes = replaceUniqueText(
          expectedSbomBytes,
          `"referenceLocator" : "pkg:npm/${analyzerName}@${priorVersion}"`,
          `"referenceLocator" : "pkg:npm/${analyzerName}@${nextVersion}"`,
        );
        const codexPluginPath = join(
          workspaceRoot,
          "packages/codex/.codex-plugin/plugin.json",
        );
        const cursorPluginPath = join(
          workspaceRoot,
          "packages/cursor/.cursor-plugin/plugin.json",
        );

        await writeJson(join(workspaceRoot, "packages/codex/package.json"), {
          name: "kibi-codex",
          version: "2.3.4",
        });
        await writeJson(codexPluginPath, {
          name: "kibi-codex",
          version: "0.0.1",
          skills: "./skills/",
        });
        await writeJson(join(workspaceRoot, "packages/cursor/package.json"), {
          name: "kibi-cursor",
          version: "5.6.7",
        });
        await writeJson(cursorPluginPath, {
          name: "kibi-cursor",
          version: "0.0.2",
          rules: "./rules/",
        });
        writeFileSync(
          cursorPluginPath,
          '{\n  "name": "kibi-cursor",\n  "version": "0.0.2",\n  "keywords": ["kibi", "mcp"]\n}\n',
          "utf8",
        );
        await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
          name: "kibi-cli",
          version: "9.9.9",
        });
        await mkdir(join(workspaceRoot, "packages/.tmp"), { recursive: true });

        const synced = await syncPluginManifestVersions(workspaceRoot);

        expect(synced.map((entry) => entry.packageName).sort()).toEqual([
          "kibi-codex",
          "kibi-cursor",
          analyzerName,
        ]);
        expect(
          synced.find((entry) => entry.packageName === analyzerName),
        ).toEqual({
          packageName: analyzerName,
          packageVersion: nextVersion,
          manifestPath: join(
            fixture.packageDir,
            ".treesitter-plugin",
            "plugin.json",
          ),
          previousVersion: priorVersion,
        });
        expect(readJson(codexPluginPath).version).toBe("2.3.4");
        expect(readJson(cursorPluginPath).version).toBe("5.6.7");
        expect(readFileSync(cursorPluginPath, "utf8")).toContain(
          '"keywords": ["kibi", "mcp"]',
        );
        expect(readJson(fixture.catalogPath)).toEqual({
          ...priorCatalog,
          pluginVersion: nextVersion,
        });

        const expectedSbom = structuredClone(priorSbom);
        expectedSbom.name = `${analyzerName}-${nextVersion}`;
        expectedSbom.documentNamespace = `https://example.test/spdx/${analyzerName.replace(/^kibi-/, "")}/${nextVersion}`;
        const expectedPackages = expectedSbom.packages as Array<
          Record<string, unknown>
        >;
        const expectedFirstPackage = expectedPackages[0];
        if (!expectedFirstPackage)
          throw new Error("Missing fixture first package");
        expectedFirstPackage.versionInfo = nextVersion;
        const firstPartyRefs = expectedFirstPackage.externalRefs as Array<
          Record<string, unknown>
        >;
        const expectedPurlRef = firstPartyRefs[0];
        if (!expectedPurlRef)
          throw new Error("Missing fixture first-party purl");
        expectedPurlRef.referenceLocator = `pkg:npm/${analyzerName}@${nextVersion}`;
        expect(readJson(fixture.sbomPath)).toEqual(expectedSbom);
        expect(readJson(fixture.sbomPath).packages).toEqual(
          expectedSbom.packages,
        );

        const catalogBytes = readFileSync(fixture.catalogPath, "utf8");
        const sbomBytes = readFileSync(fixture.sbomPath, "utf8");
        expect(catalogBytes).toBe(expectedCatalogBytes);
        expect(sbomBytes).toBe(expectedSbomBytes);
        await syncPluginManifestVersions(workspaceRoot);
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(catalogBytes);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(sbomBytes);
      },
    );
  });

  test("syncs analyzer metadata without changing the plugin-manifest result API", async () => {
    await withTempWorkspace(
      "kibi-analyzer-metadata-only-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        await rm(join(fixture.packageDir, ".treesitter-plugin"), {
          recursive: true,
          force: true,
        });

        const results = await syncPluginManifestVersions(workspaceRoot);

        expect(results).toEqual([]);
        expect(readJson(fixture.catalogPath).pluginVersion).toBe(nextVersion);
        const firstPackage = (
          readJson(fixture.sbomPath).packages as Array<Record<string, unknown>>
        )[0];
        expect(firstPackage?.versionInfo).toBe(nextVersion);
      },
    );
  });

  test("rejects invalid package manifests before writes", async () => {
    await withTempWorkspace(
      "kibi-plugin-manifest-bad-",
      async (workspaceRoot) => {
        await writeJson(join(workspaceRoot, "packages/cli/package.json"), [
          "not-an-object",
        ]);
        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /Expected a JSON object/,
        );

        await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
          version: "1.0.0",
        });
        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /Missing package name/,
        );

        await writeJson(join(workspaceRoot, "packages/cli/package.json"), {
          name: "kibi-cli",
        });
        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /Missing package version/,
        );
      },
    );
  });

  test("rejects analyzer identity mismatches before changing earlier package metadata", async () => {
    await withTempWorkspace(
      "kibi-plugin-catalog-identity-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const earlierPluginPath =
          await writeEarlierPluginPackage(workspaceRoot);
        const beforeEarlierPlugin = readFileSync(earlierPluginPath, "utf8");
        const catalog = readJson(fixture.catalogPath);
        catalog.plugin = "wrong-analyzer";
        await writeJson(fixture.catalogPath, catalog);
        const wrongCatalog = readFileSync(fixture.catalogPath, "utf8");
        const beforeSbom = readFileSync(fixture.sbomPath, "utf8");

        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /Catalog plugin identity must match package.json name/,
        );
        expect(readFileSync(earlierPluginPath, "utf8")).toBe(
          beforeEarlierPlugin,
        );
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(wrongCatalog);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(beforeSbom);
      },
    );

    await withTempWorkspace(
      "kibi-plugin-sbom-identity-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const earlierPluginPath =
          await writeEarlierPluginPackage(workspaceRoot);
        const beforeEarlierPlugin = readFileSync(earlierPluginPath, "utf8");
        const beforeCatalog = readFileSync(fixture.catalogPath, "utf8");
        const sbom = readJson(fixture.sbomPath);
        sbom.packages = (sbom.packages as Array<Record<string, unknown>>).map(
          (pkg, index) =>
            index === 0 ? { ...pkg, name: "wrong-analyzer" } : pkg,
        );
        await writeJson(fixture.sbomPath, sbom);
        const wrongSbomIdentity = readFileSync(fixture.sbomPath, "utf8");

        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /SBOM first package identity must match package.json name/,
        );
        expect(readFileSync(earlierPluginPath, "utf8")).toBe(
          beforeEarlierPlugin,
        );
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(beforeCatalog);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(wrongSbomIdentity);
      },
    );
  });

  test("rejects ambiguous or malformed first-party SBOM metadata without writes", async () => {
    await withTempWorkspace(
      "kibi-plugin-analyzer-ambiguous-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const earlierPluginPath =
          await writeEarlierPluginPackage(workspaceRoot);
        const beforeEarlierPlugin = readFileSync(earlierPluginPath, "utf8");
        const beforeCatalog = readFileSync(fixture.catalogPath, "utf8");
        const sbom = readJson(fixture.sbomPath);
        const packages = sbom.packages as Array<Record<string, unknown>>;
        sbom.packages = [...packages, structuredClone(packages[0])];
        await writeJson(fixture.sbomPath, sbom);
        const ambiguousSbom = readFileSync(fixture.sbomPath, "utf8");

        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /SBOM first-party package identity is ambiguous/,
        );
        expect(readFileSync(earlierPluginPath, "utf8")).toBe(
          beforeEarlierPlugin,
        );
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(beforeCatalog);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(ambiguousSbom);
      },
    );

    await withTempWorkspace(
      "kibi-plugin-analyzer-malformed-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const earlierPluginPath =
          await writeEarlierPluginPackage(workspaceRoot);
        const beforeEarlierPlugin = readFileSync(earlierPluginPath, "utf8");
        const beforeCatalog = readFileSync(fixture.catalogPath, "utf8");
        const sbom = readJson(fixture.sbomPath);
        const packages = sbom.packages as Array<Record<string, unknown>>;
        const firstPackage = packages[0];
        if (!firstPackage) throw new Error("Missing fixture first package");
        firstPackage.externalRefs = [];
        await writeJson(fixture.sbomPath, sbom);
        const malformedSbom = readFileSync(fixture.sbomPath, "utf8");

        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /SBOM first-party package must have one unambiguous leading npm purl/,
        );
        expect(readFileSync(earlierPluginPath, "utf8")).toBe(
          beforeEarlierPlugin,
        );
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(beforeCatalog);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(malformedSbom);
      },
    );

    await withTempWorkspace(
      "kibi-plugin-analyzer-duplicate-key-",
      async (workspaceRoot) => {
        const fixture = await writeAnalyzerFixture(workspaceRoot);
        const earlierPluginPath =
          await writeEarlierPluginPackage(workspaceRoot);
        const beforeEarlierPlugin = readFileSync(earlierPluginPath, "utf8");
        const beforeCatalog = readFileSync(fixture.catalogPath, "utf8");
        const originalSbom = readFileSync(fixture.sbomPath, "utf8");
        const duplicatedVersion = originalSbom.replace(
          `"versionInfo": "${priorVersion}",`,
          `"versionInfo": "${priorVersion}",\n        "versionInfo": "${priorVersion}",`,
        );
        writeFileSync(fixture.sbomPath, duplicatedVersion, "utf8");

        await expect(syncPluginManifestVersions(workspaceRoot)).rejects.toThrow(
          /Ambiguous duplicate JSON field versionInfo/,
        );
        expect(readFileSync(earlierPluginPath, "utf8")).toBe(
          beforeEarlierPlugin,
        );
        expect(readFileSync(fixture.catalogPath, "utf8")).toBe(beforeCatalog);
        expect(readFileSync(fixture.sbomPath, "utf8")).toBe(duplicatedVersion);
      },
    );
  });

  test("CLI runner retains its plugin-manifest logging and restores console mock", async () => {
    await withTempWorkspace(
      "kibi-plugin-manifest-cli-",
      async (workspaceRoot) => {
        await writeJson(join(workspaceRoot, "packages/codex/package.json"), {
          name: "kibi-codex",
          version: "3.0.0",
        });
        await writeJson(
          join(workspaceRoot, "packages/codex/.codex-plugin/plugin.json"),
          { name: "kibi-codex", version: "0.1.0" },
        );
        const logs: string[] = [];
        const log = console.log;
        console.log = ((chunk: unknown) => {
          logs.push(String(chunk));
        }) as typeof console.log;
        try {
          await runSyncPluginManifestVersionsCli(workspaceRoot);
          expect(logs.join("\n")).toContain("Synced");
          expect(logs.join("\n")).toContain("0.1.0 -> 3.0.0");
        } finally {
          console.log = log;
        }
        expect(console.log).toBe(log);
      },
    );
  });
});

/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  KIBI_PLUGIN_API_VERSION,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  ONTOLOGY_PACK_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
  defineKibiPlugin,
  type KibiPluginV1,
  type ProjectKibiConfig,
  type SemanticClassifierV1,
  type OntologyPackV1,
  type SymbolExtractorV1,
} from "kibi-plugin-sdk";

import {
  CapabilityRegistry,
  CapabilityRegistryCache,
  allowsExternalSemanticClassifier,
  assertBarePackageName,
  composeOntologyCatalog,
  composeOntologyMatches,
  composeSemanticClassification,
  createCapabilityRegistry,
  createStubBuiltinPlugin,
  hasDeclaredProjectDependency,
  isBarePackageName,
  loadPluginPackage,
  readProjectKibiConfig,
  resolveProjectLocalPackage,
  PluginResolutionError,
  SourceAnalysisService,
  analyzeWithResolution,
} from "../../src/plugins/index.js";
import type { LoadedPlugin } from "../../src/plugins/load-plugin.js";
import type { CapabilityModeResolution } from "../../src/plugins/registry.js";

function makePlugin(
  id: string,
  overrides: {
    classifier?: SemanticClassifierV1;
    ontology?: OntologyPackV1;
    symbols?: SymbolExtractorV1;
    permissions?: KibiPluginV1["permissions"];
    apiVersion?: string;
  } = {},
): KibiPluginV1 {
  return defineKibiPlugin({
    apiVersion: (overrides.apiVersion ??
      KIBI_PLUGIN_API_VERSION) as typeof KIBI_PLUGIN_API_VERSION,
    id,
    version: "1.0.0",
    permissions: overrides.permissions ?? {
      network: false,
      metered: false,
      secrets: [],
    },
    capabilities: {
      semanticClassifier: overrides.classifier ?? {
        id: `${id}.classifier`,
        classify: () => ({
          decisions: [
            { claimKey: "c1", lane: "predicate", confidence: 0.9 },
          ],
        }),
      },
      ontologyPack: overrides.ontology ?? {
        id: `${id}.ontology`,
        schemas: () => [
          {
            schemaId: `${id}.schema`,
            predicateName: "holds",
            argumentNames: ["subject"],
            argumentTypes: ["entity"],
          },
        ],
        match: () => [
          {
            schemaId: `${id}.schema`,
            predicateName: "holds",
            arguments: ["req"],
            polarity: "assert",
            confidence: 0.8,
            evidence: "test",
          },
        ],
      },
      symbolExtractor: overrides.symbols ?? {
        id: `${id}.symbols`,
        supports: ({ path }) => path.endsWith(".ts"),
        analyze: ({ path }) => ({
          sourceFile: path,
          language: "typescript",
          module: {
            title: id,
            language: "typescript",
            analysisMode: "parser",
          },
          symbols: [
            {
              name: id,
              kind: "function",
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 3,
            },
          ],
        }),
      },
    },
  });
}

function loaded(
  packageName: string,
  plugin: KibiPluginV1,
): LoadedPlugin {
  return {
    packageName,
    plugin,
    resolved: {
      packageName,
      packageRoot: `/tmp/${packageName}`,
      packageJsonPath: `/tmp/${packageName}/package.json`,
      packageJson: { name: packageName },
      entryPath: `/tmp/${packageName}/index.js`,
      entryUrl: `file:///tmp/${packageName}/index.js`,
    },
  };
}

// executable_for TEST-capability-plugin-host-resolution-v1
describe("capability plugin host", () => {
  // executable_for TEST-capability-plugin-host-resolution-v1
  test("package not configured → not loaded", async () => {
    let loadCount = 0;
    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/unused",
      projectConfig: {},
      builtinFactory: () => createStubBuiltinPlugin(),
      loadPlugin: async () => {
        loadCount += 1;
        throw new Error("should not load");
      },
    });

    const resolution = await registry.resolveSemanticClassifiers();
    expect(loadCount).toBe(0);
    expect(resolution.replace).toBeNull();
    expect(resolution.augment).toEqual([]);
    expect(resolution.shadow).toEqual([]);
    expect(resolution.builtin.pluginId).toBe("kibi-plugin-builtin-stub");
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("undeclared dependency is rejected", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-plugin-undeclared-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "consumer",
          kibi: {
            plugins: [
              {
                package: "kibi-plugin-jev",
                capabilities: {
                  [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
                },
              },
            ],
          },
        }),
      );
      expect(hasDeclaredProjectDependency(root, "kibi-plugin-jev")).toBe(false);
      expect(() => resolveProjectLocalPackage(root, "kibi-plugin-jev")).toThrow(
        /UNDECLARED_DEPENDENCY|must be listed/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("path package is rejected", () => {
    expect(isBarePackageName("../evil")).toBe(false);
    expect(isBarePackageName("/abs/path")).toBe(false);
    expect(isBarePackageName("file:./local")).toBe(false);
    expect(() => assertBarePackageName("./relative")).toThrow(
      PluginResolutionError,
    );

    const root = mkdtempSync(join(tmpdir(), "kibi-plugin-path-"));
    try {
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "consumer",
          kibi: {
            plugins: [
              {
                package: "../evil",
                capabilities: {
                  [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
                },
              },
            ],
          },
        }),
      );
      expect(() => readProjectKibiConfig(root)).toThrow(/bare package name/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("API version rejection on load", async () => {
    await expect(
      loadPluginPackage("/tmp", "example-plugin", {
        resolvePackage: () => ({
          packageName: "example-plugin",
          packageRoot: "/tmp/example-plugin",
          packageJsonPath: "/tmp/example-plugin/package.json",
          packageJson: { name: "example-plugin" },
          entryPath: "/tmp/example-plugin/index.js",
          entryUrl: "file:///tmp/example-plugin/index.js",
        }),
        importModule: async () => ({
          kibiPlugin: {
            apiVersion: "kibi.plugin.v0",
            id: "bad",
            version: "1",
            permissions: { network: false, metered: false, secrets: [] },
            capabilities: {
              semanticClassifier: {
                id: "c",
                classify: () => ({ decisions: [] }),
              },
            },
          },
        }),
      }),
    ).rejects.toThrow(/Unsupported plugin apiVersion|UNSUPPORTED_API_VERSION/);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("mode resolution: replace / augment / shadow", async () => {
    const replacePlugin = makePlugin("replace-plugin");
    const augmentPlugin = makePlugin("augment-plugin");
    const shadowPlugin = makePlugin("shadow-plugin");
    const config: ProjectKibiConfig = {
      plugins: [
        {
          package: "pkg-replace",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "replace" },
          },
        },
        {
          package: "pkg-augment",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
          },
        },
        {
          package: "pkg-shadow",
          capabilities: {
            [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
          },
        },
      ],
    };

    const byPackage: Record<string, KibiPluginV1> = {
      "pkg-replace": replacePlugin,
      "pkg-augment": augmentPlugin,
      "pkg-shadow": shadowPlugin,
    };

    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/modes",
      projectConfig: config,
      builtinFactory: () => createStubBuiltinPlugin(),
      loadPlugin: async (_root, packageName) =>
        loaded(packageName, byPackage[packageName]!),
    });

    const resolution = await registry.resolveSemanticClassifiers();
    expect(resolution.replace?.packageName).toBe("pkg-replace");
    expect(resolution.augment.map((e) => e.packageName)).toEqual([
      "pkg-augment",
    ]);
    expect(resolution.shadow.map((e) => e.packageName)).toEqual(["pkg-shadow"]);
    expect(registry.canonicalProviders(resolution).map((e) => e.packageName)).toEqual([
      "pkg-replace",
      "pkg-augment",
    ]);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("deterministic augment ordering follows package.json activation order", async () => {
    const config: ProjectKibiConfig = {
      plugins: [
        {
          package: "pkg-a",
          capabilities: {
            [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "augment" },
          },
        },
        {
          package: "pkg-b",
          capabilities: {
            [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "augment" },
          },
        },
        {
          package: "pkg-c",
          capabilities: {
            [ONTOLOGY_PACK_CAPABILITY_ID]: { mode: "augment" },
          },
        },
      ],
    };

    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/order",
      projectConfig: config,
      builtinFactory: () => createStubBuiltinPlugin(),
      loadPlugin: async (_root, packageName) =>
        loaded(packageName, makePlugin(packageName)),
    });

    const resolution = await registry.resolveOntologyPacks();
    expect(resolution.augment.map((e) => e.packageName)).toEqual([
      "pkg-a",
      "pkg-b",
      "pkg-c",
    ]);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("permissions metadata is preserved on bindings", async () => {
    const plugin = makePlugin("net-plugin", {
      permissions: {
        network: true,
        metered: true,
        secrets: ["TYPESAFE_API_KEY"],
      },
    });
    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/perms",
      projectConfig: {
        plugins: [
          {
            package: "net-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
        ],
      },
      builtinFactory: () => createStubBuiltinPlugin(),
      loadPlugin: async () => loaded("net-plugin", plugin),
    });

    const resolution = await registry.resolveSemanticClassifiers();
    expect(resolution.augment[0]?.permissions).toEqual({
      network: true,
      metered: true,
      secrets: ["TYPESAFE_API_KEY"],
    });
    expect(resolution.augment[0]?.stamp.network).toBe(true);
    expect(resolution.augment[0]?.stamp.metered).toBe(true);
    expect(resolution.augment[0]?.stamp.external).toBe(true);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("injectable registry cache is not a process singleton", () => {
    const cacheA = new CapabilityRegistryCache();
    const cacheB = new CapabilityRegistryCache();
    const regA = cacheA.getOrCreate("/workspace", {
      builtinFactory: () => createStubBuiltinPlugin(),
      projectConfig: {},
    });
    const regB = cacheB.getOrCreate("/workspace", {
      builtinFactory: () => createStubBuiltinPlugin(),
      projectConfig: {},
    });
    expect(regA).not.toBe(regB);
    expect(cacheA.get("/workspace")).toBe(regA);
    expect(cacheB.get("/workspace")).toBe(regB);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("at most one replace per capability", async () => {
    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/dup-replace",
      projectConfig: {
        plugins: [
          {
            package: "r1",
            capabilities: {
              [SYMBOL_EXTRACTOR_CAPABILITY_ID]: { mode: "replace" },
            },
          },
          {
            package: "r2",
            capabilities: {
              [SYMBOL_EXTRACTOR_CAPABILITY_ID]: { mode: "replace" },
            },
          },
        ],
      },
      builtinFactory: () => createStubBuiltinPlugin(),
      loadPlugin: async (_root, packageName) =>
        loaded(packageName, makePlugin(packageName)),
    });

    await expect(registry.resolveSymbolExtractors()).rejects.toThrow(
      /At most one replace/,
    );
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("external semantic classifier allowlist", () => {
    expect(allowsExternalSemanticClassifier("kb_semantic_advisor")).toBe(true);
    expect(allowsExternalSemanticClassifier("kb_model_requirement")).toBe(false);
    expect(allowsExternalSemanticClassifier("kb_compile_intent")).toBe(true);
    expect(allowsExternalSemanticClassifier("kb_check")).toBe(false);
    expect(allowsExternalSemanticClassifier("kb_upsert")).toBe(false);
    expect(allowsExternalSemanticClassifier("kb_validate_upsert")).toBe(false);
    expect(allowsExternalSemanticClassifier("kb_status")).toBe(false);
    expect(allowsExternalSemanticClassifier("kb_ingest_proof")).toBe(false);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("semantic composition: shadow never canonical; disallow external off-allowlist", async () => {
    const builtin: SemanticClassifierV1 = {
      id: "builtin",
      classify: () => ({
        decisions: [{ claimKey: "c1", lane: "none", confidence: 0 }],
      }),
    };
    const augment: SemanticClassifierV1 = {
      id: "aug",
      classify: () => ({
        decisions: [
          { claimKey: "c1", lane: "observation_review", confidence: 0.7 },
        ],
      }),
    };
    const shadow: SemanticClassifierV1 = {
      id: "shadow",
      classify: () => ({
        decisions: [{ claimKey: "c1", lane: "rule", confidence: 0.5 }],
      }),
    };

    const resolution: CapabilityModeResolution<SemanticClassifierV1> = {
      builtin: {
        pluginId: "builtin",
        pluginVersion: "1",
        packageName: null,
        mode: "builtin",
        permissions: { network: false, metered: false, secrets: [] },
        external: false,
        capability: builtin,
        stamp: {
          pluginId: "builtin",
          pluginVersion: "1",
          capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
          mode: "augment",
          external: false,
          network: false,
          metered: false,
        },
      },
      replace: null,
      augment: [
        {
          pluginId: "aug",
          pluginVersion: "1",
          packageName: "aug-pkg",
          mode: "augment",
          permissions: { network: true, metered: true, secrets: [] },
          external: true,
          capability: augment,
          stamp: {
            pluginId: "aug",
            pluginVersion: "1",
            capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
            mode: "augment",
            external: true,
            network: true,
            metered: true,
          },
        },
      ],
      shadow: [
        {
          pluginId: "shadow",
          pluginVersion: "1",
          packageName: "shadow-pkg",
          mode: "shadow",
          permissions: { network: false, metered: false, secrets: [] },
          external: true,
          capability: shadow,
          stamp: {
            pluginId: "shadow",
            pluginVersion: "1",
            capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
            mode: "shadow",
            external: true,
            network: false,
            metered: false,
          },
        },
      ],
    };

    const blocked = await composeSemanticClassification(resolution, {
      propositions: [{ claimKey: "c1", statement: "maybe" }],
    }, { operationName: "kb_check" });
    expect(blocked.decisions[0]?.lane).toBe("none");
    expect(blocked.shadowComparisons).toEqual([]);

    const allowed = await composeSemanticClassification(resolution, {
      propositions: [{ claimKey: "c1", statement: "maybe" }],
    }, { operationName: "kb_semantic_advisor" });
    expect(allowed.decisions[0]?.lane).toBe("observation_review");
    expect(allowed.shadowComparisons).toHaveLength(1);
    expect(allowed.shadowComparisons[0]?.decisions[0]?.lane).toBe("rule");
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("replace semantic abstention does not fill from builtin classifier", async () => {
    const builtin: SemanticClassifierV1 = {
      id: "builtin-sem",
      classify: async (input) => ({
        decisions: input.propositions.map((proposition) => ({
          claimKey: proposition.claimKey,
          lane: "rule" as const,
          confidence: 0.99,
        })),
      }),
    };
    const replace: SemanticClassifierV1 = {
      id: "replace-sem",
      classify: async () => ({ decisions: [] }),
    };
    const stamp = {
      pluginId: "replace",
      pluginVersion: "1",
      capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
      mode: "replace" as const,
      external: true,
      network: true,
      metered: true,
    };
    const result = await composeSemanticClassification(
      {
        builtin: {
          pluginId: "builtin",
          pluginVersion: "1",
          packageName: null,
          mode: "builtin",
          permissions: { network: false, metered: false, secrets: [] },
          external: false,
          capability: builtin,
          stamp: { ...stamp, mode: "augment", external: false, network: false, metered: false },
        },
        replace: {
          pluginId: "replace",
          pluginVersion: "1",
          packageName: "replace-pkg",
          mode: "replace",
          permissions: { network: true, metered: true, secrets: [] },
          external: true,
          capability: replace,
          stamp,
        },
        augment: [],
        shadow: [],
      },
      { propositions: [{ claimKey: "c1", statement: "The system must validate tokens" }] },
      { operationName: "kb_semantic_advisor" },
    );
    expect(result.fallbackUsed).toBe(false);
    expect(result.decisions).toEqual([
      { claimKey: "c1", lane: "none", confidence: 0 },
    ]);
    expect(result.stamps[0]?.pluginId).toBe("replace");
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("ontology composition rejects schema collisions and ignores shadow canonically", () => {
    const builtinPack: OntologyPackV1 = {
      id: "builtin-ont",
      schemas: () => [
        {
          schemaId: "shared.schema",
          predicateName: "holds",
          argumentNames: ["subject"],
          argumentTypes: ["entity"],
        },
      ],
      match: () => [],
    };
    const colliding: OntologyPackV1 = {
      id: "collide-ont",
      schemas: () => [
        {
          schemaId: "shared.schema",
          predicateName: "other",
          argumentNames: ["subject"],
          argumentTypes: ["entity"],
        },
      ],
      match: () => [],
    };

    const stamp = {
      pluginId: "x",
      pluginVersion: "1",
      capability: ONTOLOGY_PACK_CAPABILITY_ID,
      mode: "augment" as const,
      external: false,
      network: false,
      metered: false,
    };

    expect(() =>
      composeOntologyCatalog({
        builtin: {
          pluginId: "builtin",
          pluginVersion: "1",
          packageName: null,
          mode: "builtin",
          permissions: { network: false, metered: false, secrets: [] },
          external: false,
          capability: builtinPack,
          stamp,
        },
        replace: null,
        augment: [
          {
            pluginId: "collide",
            pluginVersion: "1",
            packageName: "c",
            mode: "augment",
            permissions: { network: false, metered: false, secrets: [] },
            external: true,
            capability: colliding,
            stamp: { ...stamp, mode: "augment", external: true },
          },
        ],
        shadow: [],
      }),
    ).toThrow(/collides/);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("replace ontology abstention does not fall back to builtin match", () => {
    const builtinPack: OntologyPackV1 = {
      id: "builtin-ont",
      schemas: () => [
        {
          schemaId: "builtin.schema",
          predicateName: "holds",
          argumentNames: ["subject"],
          argumentTypes: ["entity"],
        },
      ],
      match: () => [
        {
          schemaId: "builtin.schema",
          predicateName: "holds",
          arguments: ["x"],
          polarity: "assert",
          confidence: 0.9,
          evidence: "builtin hit",
        },
      ],
    };
    const replacePack: OntologyPackV1 = {
      id: "replace-ont",
      schemas: () => [
        {
          schemaId: "replace.schema",
          predicateName: "holds",
          argumentNames: ["subject"],
          argumentTypes: ["entity"],
        },
      ],
      match: () => [],
    };
    const stamp = {
      pluginId: "x",
      pluginVersion: "1",
      capability: ONTOLOGY_PACK_CAPABILITY_ID,
      mode: "replace" as const,
      external: true,
      network: false,
      metered: false,
    };
    const matched = composeOntologyMatches(
      {
        builtin: {
          pluginId: "builtin",
          pluginVersion: "1",
          packageName: null,
          mode: "builtin",
          permissions: { network: false, metered: false, secrets: [] },
          external: false,
          capability: builtinPack,
          stamp: { ...stamp, mode: "augment", external: false },
        },
        replace: {
          pluginId: "replace",
          pluginVersion: "1",
          packageName: "r",
          mode: "replace",
          permissions: { network: false, metered: false, secrets: [] },
          external: true,
          capability: replacePack,
          stamp,
        },
        augment: [],
        shadow: [],
      },
      { claimKey: "c1", statement: "anything" },
    );
    expect(matched.canonical).toEqual([]);
    expect(matched.diagnostics.some((d) => /abstained/.test(d))).toBe(true);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("rejects plugin export version that mismatches package.json", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-plugin-ver-"));
    const pluginRoot = join(root, "node_modules", "ver-plugin");
    try {
      mkdirSync(pluginRoot, { recursive: true });
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "consumer",
          dependencies: { "ver-plugin": "1.0.0" },
        }),
      );
      writeFileSync(
        join(pluginRoot, "package.json"),
        JSON.stringify({
          name: "ver-plugin",
          version: "9.9.9",
          type: "module",
          main: "./index.js",
        }),
      );
      writeFileSync(
        join(pluginRoot, "index.js"),
        [
          "export const kibiPlugin = {",
          '  apiVersion: "kibi.plugin.v1",',
          '  id: "ver-plugin",',
          '  version: "1.0.0",',
          "  permissions: { network: false, metered: false, secrets: [] },",
          "  capabilities: {",
          "    semanticClassifier: {",
          '      id: "ver-plugin.classifier",',
          "      classify: () => ({ decisions: [] }),",
          "    },",
          "  },",
          "};",
        ].join("\n"),
      );
      await expect(loadPluginPackage(root, "ver-plugin")).rejects.toThrow(
        /does not match resolved package.json version/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("source analysis service uses conservative fallback and still runs shadow", async () => {
    const resolution: CapabilityModeResolution<SymbolExtractorV1> = {
      builtin: {
        pluginId: "builtin",
        pluginVersion: "1",
        packageName: null,
        mode: "builtin",
        permissions: { network: false, metered: false, secrets: [] },
        external: false,
        capability: {
          id: "builtin-symbols",
          supports: () => false,
          analyze: () => {
            throw new Error("unused");
          },
        },
        stamp: {
          pluginId: "builtin",
          pluginVersion: "1",
          capability: SYMBOL_EXTRACTOR_CAPABILITY_ID,
          mode: "augment",
          external: false,
          network: false,
          metered: false,
        },
      },
      replace: null,
      augment: [],
      shadow: [
        {
          pluginId: "shadow-sym",
          pluginVersion: "1",
          packageName: "s",
          mode: "shadow",
          permissions: { network: false, metered: false, secrets: [] },
          external: true,
          capability: {
            id: "shadow-symbols",
            supports: () => true,
            analyze: ({ path }) => ({
              sourceFile: path,
              language: "typescript",
              module: {
                title: "shadow",
                language: "typescript",
                analysisMode: "parser",
              },
              symbols: [
                {
                  name: "shadowOnly",
                  kind: "function",
                  startLine: 1,
                  startColumn: 0,
                  endLine: 1,
                  endColumn: 10,
                },
              ],
            }),
          },
          stamp: {
            pluginId: "shadow-sym",
            pluginVersion: "1",
            capability: SYMBOL_EXTRACTOR_CAPABILITY_ID,
            mode: "shadow",
            external: true,
            network: false,
            metered: false,
          },
        },
      ],
    };

    const result = await analyzeWithResolution(
      resolution,
      "file.ts",
      "export function x() {}",
    );
    expect(result.fallbackUsed).toBe(true);
    expect(result.symbols).toEqual([]);
    expect(result.providerId).toBeNull();
    expect(result.shadowComparisons).toHaveLength(1);
    expect(result.shadowComparisons[0]).toMatchObject({
      pluginId: "shadow-sym",
      symbolCount: 1,
      ok: true,
    });
    // Shadow must never become canonical.
    expect(result.symbols.some((s) => s.name === "shadowOnly")).toBe(false);
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("loads a real local package through project resolver", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-plugin-real-"));
    const pluginRoot = join(root, "node_modules", "demo-plugin");
    try {
      mkdirSync(pluginRoot, { recursive: true });
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          name: "consumer",
          dependencies: { "demo-plugin": "1.0.0" },
          kibi: {
            plugins: [
              {
                package: "demo-plugin",
                capabilities: {
                  [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
                },
              },
            ],
          },
        }),
      );
      writeFileSync(
        join(pluginRoot, "package.json"),
        JSON.stringify({
          name: "demo-plugin",
          version: "1.0.0",
          type: "module",
          main: "./index.js",
        }),
      );
      const plugin = makePlugin("demo-plugin");
      writeFileSync(
        join(pluginRoot, "index.js"),
        [
          "export const kibiPlugin = {",
          `  apiVersion: ${JSON.stringify(plugin.apiVersion)},`,
          `  id: ${JSON.stringify(plugin.id)},`,
          `  version: ${JSON.stringify(plugin.version)},`,
          `  permissions: ${JSON.stringify(plugin.permissions)},`,
          "  capabilities: {",
          "    semanticClassifier: {",
          '      id: "demo-plugin.classifier",',
          "      classify: () => ({ decisions: [] }),",
          "    },",
          "  },",
          "};",
          "",
        ].join("\n"),
      );

      const resolved = resolveProjectLocalPackage(root, "demo-plugin");
      expect(resolved.packageRoot).toBe(pluginRoot);
      expect(pathToFileURL(resolved.entryPath).href).toBe(resolved.entryUrl);

      const loadedPlugin = await loadPluginPackage(root, "demo-plugin");
      expect(loadedPlugin.plugin.id).toBe("demo-plugin");

      const registry = new CapabilityRegistry({
        workspaceRoot: root,
        builtinFactory: () => createStubBuiltinPlugin(),
      });
      const resolution = await registry.resolveSemanticClassifiers();
      expect(resolution.augment).toHaveLength(1);
      expect(resolution.augment[0]?.packageName).toBe("demo-plugin");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  // executable_for TEST-capability-plugin-host-resolution-v1
  test("SourceAnalysisService constructs from registry", async () => {
    const registry = createCapabilityRegistry({
      workspaceRoot: "/tmp/sas",
      projectConfig: {},
      builtinFactory: () => createStubBuiltinPlugin(),
    });
    const service = new SourceAnalysisService({ registry });
    const result = await service.analyzeText("readme.md", "# hi");
    expect(result.fallbackUsed).toBe(true);
    expect(result.module.analysisMode).toBe("fallback");
  });
});

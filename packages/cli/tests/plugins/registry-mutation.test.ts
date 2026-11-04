import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import {
  CHECK_POLICY_CAPABILITY_ID,
  CHECK_POLICY_CONTRACT_VERSION,
  KIBI_PLUGIN_API_VERSION,
  type KibiPluginV1,
  ONTOLOGY_PACK_CAPABILITY_ID,
  type ProjectKibiConfig,
  REFERENCE_EXTRACTOR_CAPABILITY_ID,
  SEARCH_HINTS_CAPABILITY_ID,
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_CAPABILITY_ID,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
  type SemanticClassifierV1,
  VOCABULARY_ALIGNMENT_CAPABILITY_ID,
  defineKibiPlugin,
  validateKibiPlugin,
} from "kibi-plugin-sdk";
import type { LoadedPlugin } from "../../src/plugins/load-plugin.js";
import {
  CapabilityRegistry,
  CapabilityRegistryCache,
  NO_SEARCH_HINTS,
  createCapabilityRegistry,
  createCapabilityRegistryCache,
  createStubBuiltinPlugin,
  ensureCapabilityRegistry,
} from "../../src/plugins/registry.js";

const ROOT = "/workspace";
const permissions = { network: false, metered: false, secrets: [] };

function classifierPlugin(
  id: string,
  classifier: Record<string, unknown> = {},
  extra: Partial<KibiPluginV1> = {},
): KibiPluginV1 {
  // Loaders validate plugins; these stay raw to reach every model shape.
  return defineKibiPlugin({
    apiVersion: KIBI_PLUGIN_API_VERSION,
    id,
    version: "1.0.0",
    permissions,
    capabilities: {
      semanticClassifier: {
        id: `${id}.classifier`,
        classify: () => ({ decisions: [] }),
        ...classifier,
      },
    },
    ...extra,
  } as KibiPluginV1);
}

function loader(plugins: Record<string, KibiPluginV1 | Error>) {
  const calls: unknown[][] = [];
  const loadPlugin = async (
    workspaceRoot: string,
    packageName: string,
    options?: unknown,
  ) => {
    calls.push([workspaceRoot, packageName, options]);
    const plugin = plugins[packageName];
    if (plugin instanceof Error) throw plugin;
    return { packageName, plugin } as unknown as LoadedPlugin;
  };
  return { loadPlugin, calls };
}

function config(
  ...entries: Array<[string, Record<string, "replace" | "augment" | "shadow">]>
): ProjectKibiConfig {
  return {
    plugins: entries.map(([pkg, capabilities]) => ({
      package: pkg,
      capabilities: Object.fromEntries(
        Object.entries(capabilities).map(([capability, mode]) => [
          capability,
          { mode },
        ]),
      ),
    })),
  };
}

function setup(
  projectConfig: ProjectKibiConfig,
  plugins: Record<string, KibiPluginV1 | Error> = {},
) {
  const { loadPlugin, calls } = loader(plugins);
  return {
    registry: new CapabilityRegistry({
      workspaceRoot: ROOT,
      builtinFactory: createStubBuiltinPlugin,
      projectConfig,
      loadPlugin,
      loadPluginOptions: { importModule: async () => ({}) },
    }),
    calls,
  };
}

async function failure(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "resolved";
  } catch (error) {
    return `${(error as { code?: string }).code}: ${(error as Error).message}`;
  }
}

describe("createStubBuiltinPlugin", () => {
  test("answers every capability with an empty result", async () => {
    const stub = createStubBuiltinPlugin();
    expect([stub.id, stub.version, stub.permissions]).toStrictEqual([
      "kibi-plugin-builtin-stub",
      "0.0.0-stub",
      permissions,
    ]);
    const caps = stub.capabilities;
    expect(caps.semanticClassifier?.id).toBe(
      "kibi-plugin-builtin-stub.classifier",
    );
    expect(await caps.semanticClassifier?.classify({} as never)).toStrictEqual({
      decisions: [],
    });
    expect(caps.ontologyPack?.id).toBe("kibi-plugin-builtin-stub.ontology");
    expect(caps.ontologyPack?.schemas()).toStrictEqual([]);
    expect(await caps.ontologyPack?.match({} as never)).toStrictEqual([]);
    const symbols = caps.symbolExtractor;
    expect(symbols?.id).toBe("kibi-plugin-builtin-stub.symbols");
    expect(symbols?.supports({ path: "a.ts" } as never)).toBe(false);
    expect(await symbols?.analyze({ path: "src/a.ts" } as never)).toStrictEqual(
      {
        sourceFile: "src/a.ts",
        language: "unknown",
        module: {
          title: "stub",
          language: "unknown",
          analysisMode: "fallback",
          fallbackReason: "builtin_stub",
        },
        symbols: [],
      },
    );
    const vocabulary = caps.vocabularyAlignment;
    expect(vocabulary?.id).toBe("kibi-plugin-builtin-stub.vocabulary");
    expect(
      await vocabulary?.rankSubjects({
        clauses: [{ claimKey: "a" }, { claimKey: "b" }],
      } as never),
    ).toStrictEqual({
      decisions: [
        { claimKey: "a", choice: "new_subject", confidence: 0 },
        { claimKey: "b", choice: "new_subject", confidence: 0 },
      ],
    });
    expect(
      await vocabulary?.compareClaims({ pairs: [{ pairKey: "p" }] } as never),
    ).toStrictEqual({
      judgments: [{ pairKey: "p", sameObligation: false, confidence: 0 }],
    });
    expect(caps.checkPolicy?.id).toBe("kibi-plugin-builtin-stub.check-policy");
    expect(caps.checkPolicy?.document).toStrictEqual({
      contractVersion: CHECK_POLICY_CONTRACT_VERSION,
      id: "builtin-stub",
      title: "Builtin stub check policy",
    });
  });

  test("has no search hints", () => {
    expect(NO_SEARCH_HINTS.id).toBe("kibi-host.search-hints.none");
    expect(NO_SEARCH_HINTS.model).toBe("none");
    expect(NO_SEARCH_HINTS.hint({} as never)).toStrictEqual({ hints: [] });
  });
});

describe("default builtin plugin", () => {
  test("loads kibi-plugin-builtin and checks its package version", async () => {
    const builtin = (await import("kibi-plugin-builtin")) as {
      kibiPlugin: KibiPluginV1;
    };
    const manifest = createRequire(import.meta.url)(
      "kibi-plugin-builtin/package.json",
    ) as { version: unknown };
    const version = builtin.kibiPlugin.version;
    const load = async (packageVersion: unknown) => {
      const previous = manifest.version;
      manifest.version = packageVersion;
      try {
        const plugin = await new CapabilityRegistry({
          workspaceRoot: ROOT,
        }).getBuiltinPlugin();
        return [plugin.id, plugin.version];
      } catch (error) {
        return (error as Error).message;
      } finally {
        manifest.version = previous;
      }
    };
    expect(manifest.version).toBe(version);
    expect(await load(version)).toStrictEqual([builtin.kibiPlugin.id, version]);
    expect(await load(` ${version} `)).toStrictEqual([
      builtin.kibiPlugin.id,
      version,
    ]);
    for (const fallback of [5, " ", undefined])
      expect(await load(fallback)).toStrictEqual([
        builtin.kibiPlugin.id,
        version,
      ]);
    expect(await load("9.9.9")).toBe(
      `kibi-plugin-builtin export version '${version}' does not match package.json version '9.9.9'`,
    );
  });
});

describe("CapabilityRegistry", () => {
  test("builds and validates the builtin plugin once", async () => {
    let calls = 0;
    const registry = new CapabilityRegistry({
      workspaceRoot: ROOT,
      builtinFactory: () => {
        calls += 1;
        return createStubBuiltinPlugin();
      },
    });
    const first = await registry.getBuiltinPlugin();
    expect(await registry.getBuiltinPlugin()).toBe(first);
    expect(calls).toBe(1);
    expect(registry.workspaceRoot).toBe(ROOT);
    const invalid = new CapabilityRegistry({
      workspaceRoot: ROOT,
      builtinFactory: () => ({}) as KibiPluginV1,
    });
    expect(await failure(() => invalid.getBuiltinPlugin())).toBe(
      "INVALID_PLUGIN: apiVersion must be a non-empty string",
    );
  });

  test("reads the project config once unless one is injected", async () => {
    const roots: string[] = [];
    const read = (workspaceRoot: string) => {
      roots.push(workspaceRoot);
      return config(["a", {}]);
    };
    const registry = new CapabilityRegistry({
      workspaceRoot: ROOT,
      readConfig: read,
    });
    const first = await registry.getProjectConfig();
    expect(first).toStrictEqual(config(["a", {}]));
    expect(await registry.getProjectConfig()).toBe(first);
    expect(roots).toStrictEqual([ROOT]);
    const injected = config();
    const withConfig = new CapabilityRegistry({
      workspaceRoot: ROOT,
      projectConfig: injected,
      readConfig: read,
    });
    expect(await withConfig.getProjectConfig()).toBe(injected);
    expect(roots).toStrictEqual([ROOT]);
  });

  test("binds the builtin provider when nothing is configured", async () => {
    const { registry } = setup({});
    const resolution = await registry.resolveSemanticClassifiers();
    expect(resolution.builtin.capability.id).toBe(
      "kibi-plugin-builtin-stub.classifier",
    );
    expect(resolution).toStrictEqual({
      builtin: {
        pluginId: "kibi-plugin-builtin-stub",
        pluginVersion: "0.0.0-stub",
        packageName: null,
        mode: "builtin",
        permissions,
        external: false,
        capability: resolution.builtin.capability,
        stamp: {
          pluginId: "kibi-plugin-builtin-stub",
          pluginVersion: "0.0.0-stub",
          capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
          mode: "augment",
          external: false,
          network: false,
          metered: false,
        },
      },
      replace: null,
      augment: [],
      shadow: [],
    });
    expect(registry.canonicalProviders(resolution)).toStrictEqual([
      resolution.builtin,
    ]);
  });

  test("resolves each capability through its slot", async () => {
    const { registry } = setup(config());
    expect((await registry.resolveOntologyPacks()).builtin.capability.id).toBe(
      "kibi-plugin-builtin-stub.ontology",
    );
    expect(
      (await registry.resolveSymbolExtractors()).builtin.capability.id,
    ).toBe("kibi-plugin-builtin-stub.symbols");
    expect(
      (await registry.resolveVocabularyAlignment()).builtin.capability.id,
    ).toBe("kibi-plugin-builtin-stub.vocabulary");
    const hints = await registry.resolveSearchHints();
    expect(hints.builtin.capability).toBe(NO_SEARCH_HINTS);
    expect(hints.builtin.stamp.model).toBe("none");
    expect(await failure(() => registry.resolveSymbolExtractorsV2())).toBe(
      `BUILTIN_MISSING_CAPABILITY: Builtin plugin 'kibi-plugin-builtin-stub' does not provide ${SYMBOL_EXTRACTOR_V2_CAPABILITY_ID}`,
    );
    expect(
      await failure(() =>
        registry.resolveCapability(REFERENCE_EXTRACTOR_CAPABILITY_ID),
      ),
    ).toBe(
      `BUILTIN_MISSING_CAPABILITY: Builtin plugin 'kibi-plugin-builtin-stub' does not provide ${REFERENCE_EXTRACTOR_CAPABILITY_ID}`,
    );
  });

  test("orders replace, augment and shadow providers", async () => {
    const a = classifierPlugin("plugin-a", { model: "  gpt-x  " });
    const b = classifierPlugin("plugin-b", { model: " " });
    const c = classifierPlugin("plugin-c", { model: 7 });
    const d = classifierPlugin("plugin-d", {}, {
      permissions: { network: true, metered: true, secrets: ["K"] },
    } as Partial<KibiPluginV1>);
    const e = classifierPlugin("plugin-e");
    const { registry, calls } = setup(
      config(
        ["pkg-b", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "augment" }],
        ["pkg-other", { [ONTOLOGY_PACK_CAPABILITY_ID]: "augment" }],
        ["pkg-d", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "shadow" }],
        ["pkg-a", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "replace" }],
        ["pkg-c", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "augment" }],
        ["pkg-e", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "shadow" }],
      ),
      { "pkg-a": a, "pkg-b": b, "pkg-c": c, "pkg-d": d, "pkg-e": e },
    );
    const resolution = await registry.resolveSemanticClassifiers();
    const binding = (
      plugin: KibiPluginV1,
      pkg: string,
      mode: "replace" | "augment" | "shadow",
      model?: string,
    ) => ({
      pluginId: plugin.id,
      pluginVersion: "1.0.0",
      packageName: pkg,
      mode,
      permissions: plugin.permissions,
      external: true,
      capability: plugin.capabilities
        .semanticClassifier as SemanticClassifierV1,
      stamp: {
        pluginId: plugin.id,
        pluginVersion: "1.0.0",
        capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
        mode,
        external: true,
        network: plugin.permissions.network,
        metered: plugin.permissions.metered,
        ...(model === undefined ? {} : { model }),
      },
    });
    expect(resolution.replace).toStrictEqual(
      binding(a, "pkg-a", "replace", "gpt-x"),
    );
    expect(resolution.augment).toStrictEqual([
      binding(b, "pkg-b", "augment"),
      binding(c, "pkg-c", "augment"),
    ]);
    expect(resolution.shadow).toStrictEqual([
      binding(d, "pkg-d", "shadow"),
      binding(e, "pkg-e", "shadow"),
    ]);
    expect(registry.canonicalProviders(resolution)).toStrictEqual([
      binding(a, "pkg-a", "replace", "gpt-x"),
      ...resolution.augment,
    ]);
    expect(calls.map((call) => call[1])).toStrictEqual([
      "pkg-b",
      "pkg-d",
      "pkg-a",
      "pkg-c",
      "pkg-e",
    ]);
    expect(calls[0]?.[0]).toBe(ROOT);
    expect(await registry.resolveSemanticClassifiers()).toBe(resolution);
    expect(calls).toHaveLength(5);
  });

  test("loads each package once across capabilities", async () => {
    const plugin = validateKibiPlugin(
      defineKibiPlugin({
        apiVersion: KIBI_PLUGIN_API_VERSION,
        id: "multi",
        version: "1.0.0",
        permissions,
        capabilities: {
          semanticClassifier: {
            id: "multi.classifier",
            classify: () => ({ decisions: [] }),
          },
          ontologyPack: {
            id: "multi.ontology",
            schemas: () => [],
            match: () => [],
          },
        },
      }),
    );
    const { registry, calls } = setup(
      config([
        "pkg-m",
        {
          [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "augment",
          [ONTOLOGY_PACK_CAPABILITY_ID]: "augment",
        },
      ]),
      { "pkg-m": plugin },
    );
    await registry.resolveSemanticClassifiers();
    await registry.resolveOntologyPacks();
    expect(calls).toStrictEqual([
      [ROOT, "pkg-m", { importModule: expect.any(Function) }],
    ]);
  });

  test("rejects conflicting providers", async () => {
    const classifier = {
      [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "augment" as const,
    };
    const cases: Array<
      [ProjectKibiConfig, Record<string, KibiPluginV1>, string]
    > = [
      [
        config(["pkg-a", classifier]),
        { "pkg-a": classifierPlugin("kibi-plugin-builtin-stub") },
        "DUPLICATE_PLUGIN_ID: Plugin id 'kibi-plugin-builtin-stub' is claimed by both 'kibi-plugin-builtin' and 'pkg-a'",
      ],
      [
        config(["pkg-a", classifier], ["pkg-b", classifier]),
        {
          "pkg-a": classifierPlugin("same"),
          "pkg-b": classifierPlugin("same"),
        },
        "DUPLICATE_PLUGIN_ID: Plugin id 'same' is claimed by both 'pkg-a' and 'pkg-b'",
      ],
      [
        config(["pkg-a", classifier], ["pkg-a", classifier]),
        { "pkg-a": classifierPlugin("same") },
        `DUPLICATE_PROVIDER_ID: Provider id 'same.classifier' for ${SEMANTIC_CLASSIFIER_CAPABILITY_ID} is not unique`,
      ],
      [
        config(["pkg-a", classifier]),
        {
          "pkg-a": classifierPlugin("other", {
            id: "kibi-plugin-builtin-stub.classifier",
          }),
        },
        `DUPLICATE_PROVIDER_ID: Provider id 'kibi-plugin-builtin-stub.classifier' for ${SEMANTIC_CLASSIFIER_CAPABILITY_ID} is not unique`,
      ],
      [
        config(["pkg-a", { [ONTOLOGY_PACK_CAPABILITY_ID]: "augment" }]),
        { "pkg-a": classifierPlugin("a") },
        `PLUGIN_MISSING_CAPABILITY: Plugin package 'pkg-a' is activated for ${ONTOLOGY_PACK_CAPABILITY_ID} but does not export that capability`,
      ],
      [
        config(
          ["pkg-a", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "replace" }],
          ["pkg-b", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "replace" }],
        ),
        { "pkg-a": classifierPlugin("a"), "pkg-b": classifierPlugin("b") },
        `MULTIPLE_REPLACE_PROVIDERS: At most one replace provider is allowed for ${SEMANTIC_CLASSIFIER_CAPABILITY_ID}; both 'pkg-a' and 'pkg-b' requested replace`,
      ],
    ];
    for (const [projectConfig, plugins, message] of cases) {
      const capability = Object.keys(
        projectConfig.plugins?.[0]?.capabilities ?? {},
      )[0] as typeof SEMANTIC_CLASSIFIER_CAPABILITY_ID;
      const { registry } = setup(projectConfig, plugins);
      expect(await failure(() => registry.resolveCapability(capability))).toBe(
        message,
      );
    }
  });

  test("retries a resolution and a package load after a failure", async () => {
    const plugins: Record<string, KibiPluginV1 | Error> = {
      "pkg-a": new Error("not installed"),
    };
    const { registry, calls } = setup(
      config(["pkg-a", { [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: "augment" }]),
      plugins,
    );
    expect(await failure(() => registry.resolveSemanticClassifiers())).toBe(
      "undefined: not installed",
    );
    plugins["pkg-a"] = classifierPlugin("a");
    const resolution = await registry.resolveSemanticClassifiers();
    expect(resolution.augment.map((entry) => entry.pluginId)).toStrictEqual([
      "a",
    ]);
    expect(calls).toHaveLength(2);
  });

  test("shares one pending resolution", async () => {
    const { registry } = setup(config());
    const [first, second] = await Promise.all([
      registry.resolveSearchHints(),
      registry.resolveSearchHints(),
    ]);
    expect(second).toBe(first);
  });

  test("reads the check policy, search hints and reference extractor slots", async () => {
    const stub = createStubBuiltinPlugin();
    const builtin = validateKibiPlugin(
      defineKibiPlugin({
        ...stub,
        capabilities: {
          ...stub.capabilities,
          searchHints: {
            id: "stub.hints",
            model: "m",
            hint: () => ({ hints: [] }),
          },
          referenceExtractor: {
            id: "stub.references",
            supports: () => true,
            extract: () => ({}) as never,
          },
        },
      } as KibiPluginV1),
    );
    const registry = new CapabilityRegistry({
      workspaceRoot: ROOT,
      builtinFactory: () => builtin,
      projectConfig: config(),
    });
    const id = async (capability: string) =>
      (
        await registry.resolveCapability(
          capability as typeof SEARCH_HINTS_CAPABILITY_ID,
        )
      ).builtin.capability as { id: string };
    expect((await id(CHECK_POLICY_CAPABILITY_ID)).id).toBe(
      "kibi-plugin-builtin-stub.check-policy",
    );
    expect((await id(SEARCH_HINTS_CAPABILITY_ID)).id).toBe("stub.hints");
    expect((await id(REFERENCE_EXTRACTOR_CAPABILITY_ID)).id).toBe(
      "stub.references",
    );
  });

  test("uses the symbol extractor and v2 slots of a configured package", async () => {
    const analyze = () => ({}) as never;
    const plugin = {
      ...createStubBuiltinPlugin(),
      id: "v2",
      capabilities: {
        ...createStubBuiltinPlugin().capabilities,
        symbolExtractorV2: { id: "v2.symbols", supports: () => true, analyze },
      },
    } as unknown as KibiPluginV1;
    const builtin = {
      ...createStubBuiltinPlugin(),
      capabilities: {
        ...createStubBuiltinPlugin().capabilities,
        symbolExtractorV2: { id: "stub.v2", supports: () => true, analyze },
      },
    } as unknown as KibiPluginV1;
    const { loadPlugin } = loader({ "pkg-v2": plugin });
    const registry = new CapabilityRegistry({
      workspaceRoot: ROOT,
      builtinFactory: () => builtin,
      projectConfig: config([
        "pkg-v2",
        { [SYMBOL_EXTRACTOR_V2_CAPABILITY_ID]: "replace" },
      ]),
      loadPlugin,
    });
    const resolution = await registry.resolveSymbolExtractorsV2();
    expect(resolution.builtin.capability.id).toBe("stub.v2");
    expect(resolution.replace?.capability).toBe(
      plugin.capabilities.symbolExtractorV2,
    );
    expect(
      (await registry.resolveCapability(SYMBOL_EXTRACTOR_CAPABILITY_ID))
        .augment,
    ).toStrictEqual([]);
    expect(
      (await registry.resolveCapability(VOCABULARY_ALIGNMENT_CAPABILITY_ID))
        .builtin.pluginId,
    ).toBe("kibi-plugin-builtin-stub");
    expect(
      (await registry.resolveCapability(SEARCH_HINTS_CAPABILITY_ID)).builtin
        .capability,
    ).toBe(NO_SEARCH_HINTS);
  });
});

describe("registry caches", () => {
  test("keep one registry per workspace root", () => {
    const cache = createCapabilityRegistryCache();
    expect(cache).toBeInstanceOf(CapabilityRegistryCache);
    expect(cache.get(ROOT)).toBeUndefined();
    const created = cache.getOrCreate(ROOT, { projectConfig: config() });
    expect(created.workspaceRoot).toBe(ROOT);
    expect(cache.get(ROOT)).toBe(created);
    expect(cache.getOrCreate(ROOT)).toBe(created);
    const other = createCapabilityRegistry({ workspaceRoot: "/other" });
    expect(other).toBeInstanceOf(CapabilityRegistry);
    expect(other.workspaceRoot).toBe("/other");
    cache.set(ROOT, other);
    expect(cache.get(ROOT)).toBe(other);
    cache.clear();
    expect(cache.get(ROOT)).toBeUndefined();
  });

  test("ensureCapabilityRegistry reuses a cached registry when given a cache", async () => {
    const injected = config(["pkg", {}]);
    const fromString = ensureCapabilityRegistry(ROOT, {
      projectConfig: injected,
    });
    expect(fromString.workspaceRoot).toBe(ROOT);
    expect(await fromString.getProjectConfig()).toBe(injected);
    expect(ensureCapabilityRegistry(ROOT)).not.toBe(fromString);
    expect(ensureCapabilityRegistry(ROOT).workspaceRoot).toBe(ROOT);

    const cache = createCapabilityRegistryCache();
    const cached = ensureCapabilityRegistry(ROOT, {
      cache,
      projectConfig: injected,
    });
    expect(cache.get(ROOT)).toBe(cached);
    expect(await cached.getProjectConfig()).toBe(injected);
    expect(ensureCapabilityRegistry(ROOT, { cache })).toBe(cached);

    const fromOptions = ensureCapabilityRegistry({
      workspaceRoot: "/opts",
      projectConfig: injected,
    });
    expect(fromOptions.workspaceRoot).toBe("/opts");
    expect(await fromOptions.getProjectConfig()).toBe(injected);
    const cachedOptions = ensureCapabilityRegistry({
      workspaceRoot: "/opts",
      cache,
      projectConfig: injected,
    });
    expect(cache.get("/opts")).toBe(cachedOptions);
    expect(await cachedOptions.getProjectConfig()).toBe(injected);
    expect(ensureCapabilityRegistry({ workspaceRoot: "/opts", cache })).toBe(
      cachedOptions,
    );
  });
});

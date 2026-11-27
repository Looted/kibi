import { afterEach, describe, expect, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  type KibiPluginV1,
  type ProjectKibiConfig,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import type { LoadedPlugin } from "../../src/plugins/load-plugin.js";
import {
  BUNDLED_SEARCH_HINTS_PACKAGE,
  CapabilityRegistry,
} from "../../src/plugins/registry.js";

const ROOT = "/workspace";
const permissions = { network: false, metered: false, secrets: [] };
const HINTS = "kibi.search-hints.v1";

function hintsPlugin(id: string): KibiPluginV1 {
  return defineKibiPlugin({
    apiVersion: KIBI_PLUGIN_API_VERSION,
    id,
    version: "1.0.0",
    permissions,
    capabilities: {
      searchHints: {
        id: `${id}.hints`,
        model: "m",
        hint: () => ({ hints: [] }),
      },
    },
  } as KibiPluginV1);
}

function registry(
  projectConfig: ProjectKibiConfig,
  plugins: Record<string, KibiPluginV1> = {},
  bundled: () => KibiPluginV1 | Promise<KibiPluginV1> = () =>
    hintsPlugin("bundled"),
) {
  return new CapabilityRegistry({
    workspaceRoot: ROOT,
    projectConfig,
    bundledSearchHints: bundled,
    loadPlugin: async (_root, packageName) =>
      ({
        packageName,
        plugin: plugins[packageName],
      }) as unknown as LoadedPlugin,
  });
}

const saved = process.env.KIBI_KB_DEPENDENCY;
afterEach(() => {
  if (saved === undefined) {
    // biome-ignore lint/performance/noDelete: an env var must be unset, not "undefined"
    delete process.env.KIBI_KB_DEPENDENCY;
  } else process.env.KIBI_KB_DEPENDENCY = saved;
});

describe("the bundled search hints provider", () => {
  test("answers when the project names no provider", async () => {
    for (const config of [
      {},
      { plugins: [] },
      { declinedPlugins: ["other"] },
    ]) {
      const { replace, augment, shadow, builtin } =
        await registry(config).resolveSearchHints();
      expect(replace?.pluginId).toBe("bundled");
      expect(replace?.packageName).toBe(BUNDLED_SEARCH_HINTS_PACKAGE);
      expect(replace?.mode).toBe("replace");
      // Kibi's own dependency: the stamp reads as not external.
      expect(replace?.external).toBe(false);
      expect(replace?.packageName).toBe("kibi-plugin-search-hints");
      expect(BUNDLED_SEARCH_HINTS_PACKAGE).toBe("kibi-plugin-search-hints");
      expect(replace?.stamp).toStrictEqual({
        pluginId: "bundled",
        pluginVersion: "1.0.0",
        capability: HINTS,
        mode: "replace",
        external: false,
        network: false,
        metered: false,
        model: "m",
      });
      expect(augment).toStrictEqual([]);
      expect(shadow).toStrictEqual([]);
      expect(builtin.capability.id).toBe("kibi-host.search-hints.none");
    }
  });

  test("is the shipped kibi-plugin-search-hints package by default", async () => {
    const { replace } = await new CapabilityRegistry({
      workspaceRoot: ROOT,
      projectConfig: {},
    }).resolveSearchHints();
    expect(replace?.pluginId).toBe("kibi-plugin-search-hints");
    expect(replace?.external).toBe(false);
    expect(replace?.stamp.model).toContain("potion-retrieval-32M");
  });

  test("stays off for a project that declined the plugin", async () => {
    const resolution = await registry({
      declinedPlugins: [BUNDLED_SEARCH_HINTS_PACKAGE],
    }).resolveSearchHints();
    expect(resolution.replace).toBeNull();
  });

  test("gives way to any provider the project configured, in any mode", async () => {
    const other = hintsPlugin("other");
    for (const mode of ["replace", "shadow"] as const) {
      const resolution = await registry(
        {
          plugins: [
            { package: "pkg-other", capabilities: { [HINTS]: { mode } } },
          ],
        },
        { "pkg-other": other },
      ).resolveSearchHints();
      const provider =
        mode === "replace" ? resolution.replace : resolution.shadow[0];
      expect(provider?.pluginId).toBe("other");
      expect(provider?.external).toBe(true);
      if (mode === "shadow") expect(resolution.replace).toBeNull();
    }
    // The bundled plugin itself, configured at the workspace's version.
    const explicit = await registry(
      {
        plugins: [
          {
            package: BUNDLED_SEARCH_HINTS_PACKAGE,
            capabilities: { [HINTS]: { mode: "replace" } },
          },
        ],
      },
      { [BUNDLED_SEARCH_HINTS_PACKAGE]: hintsPlugin("workspace-copy") },
    ).resolveSearchHints();
    expect(explicit.replace?.pluginId).toBe("workspace-copy");
    expect(explicit.replace?.external).toBe(true);
  });

  test("is not asked of a plugin configured for another capability only", async () => {
    const resolution = await registry(
      {
        plugins: [
          {
            package: "pkg-other",
            capabilities: { "kibi.semantic-classifier.v1": { mode: "shadow" } },
          },
        ],
      },
      { "pkg-other": hintsPlugin("other") },
    ).resolveSearchHints();
    expect(resolution.replace?.pluginId).toBe("bundled");
  });

  test("is never added to another capability", async () => {
    const resolution = await registry({}).resolveSemanticClassifiers();
    expect(resolution.replace).toBeNull();
  });

  test("is not used when the process serves a KB dependency", async () => {
    process.env.KIBI_KB_DEPENDENCY = "some-dependency";
    expect((await registry({}).resolveSearchHints()).replace).toBeNull();
  });

  test("fails when the bundled plugin lacks the capability", async () => {
    const without = defineKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "empty",
      version: "1.0.0",
      permissions,
      capabilities: {
        semanticClassifier: {
          id: "empty.classifier",
          classify: () => ({ decisions: [] }),
        },
      },
    } as KibiPluginV1);
    const failure = await registry({}, {}, () => without)
      .resolveSearchHints()
      .catch((error: unknown) => error);
    expect((failure as { code?: string }).code).toBe(
      "PLUGIN_MISSING_CAPABILITY",
    );
    expect((failure as Error).message).toBe(
      `Bundled plugin 'empty' does not export ${HINTS}`,
    );
  });
});

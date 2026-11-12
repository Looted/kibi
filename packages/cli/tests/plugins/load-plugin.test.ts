import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadPluginPackage } from "../../src/plugins/load-plugin.js";
import type { ResolvedProjectPackage } from "../../src/plugins/resolve-package.js";

function resolved(version?: unknown): ResolvedProjectPackage {
  return {
    packageName: "demo-plugin",
    packageRoot: "/ws/node_modules/demo-plugin",
    packageJsonPath: "/ws/node_modules/demo-plugin/package.json",
    packageJson: {
      name: "demo-plugin",
      ...(version === null ? {} : { version }),
    } as ResolvedProjectPackage["packageJson"],
    entryPath: "/ws/node_modules/demo-plugin/index.js",
    entryUrl: "file:///ws/node_modules/demo-plugin/index.js",
  };
}

const plugin = (version = "1.2.3") => ({
  apiVersion: "kibi.plugin.v1",
  id: "demo",
  version,
  permissions: { network: false, metered: false, secrets: [] },
  capabilities: {
    semanticClassifier: { id: "c", classify: () => ({ decisions: [] }) },
  },
});

async function load(exports: unknown, version: unknown = "1.2.3") {
  const calls: unknown[] = [];
  const result = await loadPluginPackage("/ws", "demo-plugin", {
    resolvePackage: (root, name) => {
      calls.push(["resolve", root, name]);
      return resolved(version);
    },
    importModule: async (url) => {
      calls.push(["import", url]);
      if (exports instanceof Error) throw exports;
      if (typeof exports === "string") throw exports;
      return exports;
    },
  });
  return { result, calls };
}

async function failure(exports: unknown, version: unknown = "1.2.3") {
  try {
    await load(exports, version);
  } catch (error) {
    const e = error as Error & { code?: string };
    return { name: e.name, code: e.code, message: e.message };
  }
  throw new Error("expected a failure");
}

describe("loadPluginPackage", () => {
  test("resolves, imports and stamps the manifest version", async () => {
    const { result, calls } = await load({ kibiPlugin: plugin() }, "1.2.3");
    expect(calls).toStrictEqual([
      ["resolve", "/ws", "demo-plugin"],
      ["import", "file:///ws/node_modules/demo-plugin/index.js"],
    ]);
    expect(result.packageName).toBe("demo-plugin");
    expect(result.resolved).toStrictEqual(resolved("1.2.3"));
    expect(result.plugin.id).toBe("demo");
    expect(result.plugin.version).toBe("1.2.3");
  });

  test("trims the manifest version before comparing", async () => {
    const { result } = await load({ kibiPlugin: plugin() }, " 1.2.3 ");
    expect(result.plugin.version).toBe("1.2.3");
  });

  test("wraps import failures", async () => {
    expect(await failure(new Error("boom"))).toStrictEqual({
      name: "PluginResolutionError",
      code: "PLUGIN_IMPORT_FAILED",
      message: "Failed to import plugin package 'demo-plugin': boom",
    });
    expect(await failure("plain")).toStrictEqual({
      name: "PluginResolutionError",
      code: "PLUGIN_IMPORT_FAILED",
      message: "Failed to import plugin package 'demo-plugin': plain",
    });
  });

  test("requires a record with a named kibiPlugin export", async () => {
    const missing = {
      name: "PluginValidationError",
      code: "MISSING_KIBI_PLUGIN_EXPORT",
      message: "Package 'demo-plugin' must export a named 'kibiPlugin' binding",
    };
    const fn = Object.assign(() => {}, { kibiPlugin: plugin() });
    const array = Object.assign([], { kibiPlugin: plugin() });
    for (const exports of [null, undefined, 3, fn, array, {}]) {
      expect(await failure(exports)).toStrictEqual(missing);
    }
  });

  test("requires a package.json version", async () => {
    const missing = {
      name: "PluginValidationError",
      code: "MISSING_PACKAGE_VERSION",
      message:
        "Package 'demo-plugin' package.json must declare a version for provider provenance",
    };
    for (const version of [null, 1, "   ", ""]) {
      expect(await failure({ kibiPlugin: plugin() }, version)).toStrictEqual(
        missing,
      );
    }
  });

  test("requires the export version to match the manifest", async () => {
    expect(
      await failure({ kibiPlugin: plugin("2.0.0") }, "1.2.3"),
    ).toStrictEqual({
      name: "PluginValidationError",
      code: "PLUGIN_VERSION_MISMATCH",
      message:
        "Plugin 'demo' export version '2.0.0' does not match resolved package.json version '1.2.3'",
    });
  });

  test("imports the resolved entry by default", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-load-plugin-"));
    try {
      const entry = path.join(root, "index.mjs");
      writeFileSync(
        entry,
        `const p = ${JSON.stringify(plugin())};\np.capabilities.semanticClassifier.classify = () => ({ decisions: [] });\nexport const kibiPlugin = p;\n`,
      );
      const loaded = await loadPluginPackage(root, "demo-plugin", {
        resolvePackage: () => ({
          ...resolved("1.2.3"),
          entryPath: entry,
          entryUrl: pathToFileURL(entry).href,
        }),
      });
      expect([loaded.plugin.id, loaded.plugin.version]).toStrictEqual([
        "demo",
        "1.2.3",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

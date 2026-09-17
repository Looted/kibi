import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "bun:test";

import { buildZcodePackageOnce } from "./build-once";

const testRoot = import.meta.dir;
const packageRoot = (() => {
  let current = testRoot;

  for (let level = 0; level < 8; level++) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) {
      const packageData = JSON.parse(fs.readFileSync(candidate, "utf8")) as {
        name?: string;
      };

      if (packageData.name === "kibi-zcode") {
        return current;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return process.cwd();
})();
const packageJsonPath = path.join(packageRoot, "package.json");
const manifestPath = path.join(packageRoot, ".zcode-plugin", "plugin.json");
const scriptPath = path.join(packageRoot, "scripts", "copy-plugin-assets.ts");

/**
 * ZCode validates the plugin manifest strictly: component paths must stay
 * relative and inside the plugin root, and stdio `mcpServers` entries accept
 * only a known key set — unknown keys silently drop the server.
 */
const MANIFEST_KEYS = new Set([
  "name",
  "version",
  "description",
  "description_i18n",
  "author",
  "license",
  "commands",
  "skills",
  "hooks",
  "mcpServers",
  "userConfig",
]);

const STDIO_MCP_SERVER_KEYS = new Set([
  "command",
  "args",
  "cwd",
  "env",
  "enabled",
  "timeoutMs",
  "type",
]);

const PLUGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;

const manifestAssets = [
  path.join(".zcode-plugin", "plugin.json"),
  path.join("hooks", "hooks.json"),
  path.join("bin", "mcp-launcher.cjs"),
  "skills",
  "commands",
];

describe("kibi-zcode plugin manifest", () => {
  test("has required keys and metadata", () => {
    const packageRaw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageRaw) as {
      version?: string;
    };

    const manifestRaw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw) as {
      name?: string;
      version?: string;
      description?: string;
      skills?: string;
      commands?: string;
      hooks?: string;
      mcpServers?: Record<string, Record<string, unknown>>;
    };

    expect(manifest.name).toBe("kibi-zcode");
    expect(manifest.name).toMatch(PLUGIN_NAME_PATTERN);
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.description).toEqual(expect.stringContaining("Kibi"));
    expect(manifest.skills).toBe("skills");
    expect(manifest.commands).toBe("commands");
    expect(manifest.hooks).toBe("hooks");

    const server = manifest.mcpServers?.kibi;
    expect(server).toBeDefined();
    expect(server?.command).toBe("node");
    expect(server?.args).toEqual(["${ZCODE_PLUGIN_ROOT}/bin/mcp-launcher.cjs"]);
    expect(server?.cwd).toBe("${ZCODE_PROJECT_DIR}");
    expect(server?.enabled).toBe(true);
    expect(typeof server?.timeoutMs).toBe("number");
  });

  test("uses only keys the ZCode manifest and stdio MCP schemas accept", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      mcpServers?: Record<string, Record<string, unknown>>;
      [key: string]: unknown;
    };

    for (const key of Object.keys(manifest)) {
      expect(MANIFEST_KEYS.has(key), `unexpected manifest key: ${key}`).toBe(
        true,
      );
    }

    for (const [serverName, server] of Object.entries(
      manifest.mcpServers ?? {},
    )) {
      for (const key of Object.keys(server)) {
        expect(
          STDIO_MCP_SERVER_KEYS.has(key),
          `unexpected key ${key} in MCP server ${serverName}`,
        ).toBe(true);
      }
    }
  });

  test("component paths stay relative and inside the plugin root", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
      skills?: string;
      commands?: string;
      hooks?: string;
    };

    for (const component of [
      manifest.skills,
      manifest.commands,
      manifest.hooks,
    ]) {
      expect(typeof component).toBe("string");
      const value = component as string;
      expect(path.isAbsolute(value)).toBe(false);
      const resolved = path.resolve(packageRoot, value);
      expect(resolved.startsWith(packageRoot + path.sep)).toBe(true);
      expect(fs.existsSync(resolved)).toBe(true);
    }
  });

  test("manifests references existing source assets", () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, asset))).toBe(true);
    }
  });

  test("build copies manifest-referenced assets into dist", () => {
    buildZcodePackageOnce(packageRoot);

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, "dist", asset))).toBe(true);
    }
  });
});

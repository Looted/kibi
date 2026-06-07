import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repoRoot = path.resolve(packageRoot, "..", "..");

describe("kibi-codex local marketplace fixture", () => {
  test("defines the expected local marketplace fields", () => {
    const fixturePath = path.join(
      packageRoot,
      "marketplace",
      "marketplace.json",
    );
    const raw = fs.readFileSync(fixturePath, "utf8");
    const fixture = JSON.parse(raw) as {
      name?: string;
      plugins?: Array<{
        name?: string;
        source?: { source?: string; path?: string };
        policy?: {
          installation?: string;
          authentication?: string;
        };
        category?: string;
      }>;
      interface?: {
        displayName?: string;
      };
    };

    expect(fixture.name).toBe("kibi-local");
    expect(fixture.interface?.displayName).toBe("Kibi Local Marketplace");

    const plugin = fixture.plugins?.[0];
    expect(plugin?.name).toBe("kibi-codex");
    expect(plugin?.source?.source).toBe("local");
    expect(plugin?.source?.path).toBe("./plugins/kibi-codex");
    expect(plugin?.policy?.installation).toBe("AVAILABLE");
    expect(plugin?.policy?.authentication).toBe("ON_INSTALL");
    expect(plugin?.category).toBe("Productivity");
  });

  test("is not published via package.json files and supports local marketplace layout", () => {
    const packageJsonPath = path.join(packageRoot, "package.json");
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8"),
    ) as {
      files?: string[];
    };

    expect(packageJson.files).not.toContain("marketplace");
    expect(packageJson.files).not.toContain("marketplace/");

    const fixturePath = path.join(
      packageRoot,
      "marketplace",
      "marketplace.json",
    );
    const raw = fs.readFileSync(fixturePath, "utf8");
    const fixture = JSON.parse(raw) as {
      plugins?: Array<{ name?: string; source?: { path?: string } }>;
    };
    const plugin = fixture.plugins?.[0];
    const pluginPath = plugin?.source?.path;

    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-marketplace-"),
    );
    try {
      const marketplaceRoot = tempRoot;
      const relativePluginPath = pluginPath
        ? pluginPath.replace(/^\.\//, "")
        : "plugins/kibi-codex";
      const simulatedPluginRoot = path.join(
        marketplaceRoot,
        relativePluginPath,
      );

      const pluginSourceRoot = packageRoot;

      fs.mkdirSync(path.join(simulatedPluginRoot, "hooks"), {
        recursive: true,
      });

      for (const source of [
        [
          ".codex-plugin/plugin.json",
          "plugins/kibi-codex/.codex-plugin/plugin.json",
        ],
        [".mcp.json", "plugins/kibi-codex/.mcp.json"],
        ["hooks/hooks.json", "plugins/kibi-codex/hooks/hooks.json"],
        ["skills", "plugins/kibi-codex/skills"],
      ] as const) {
        const sourcePath = path.join(pluginSourceRoot, source[0]);
        const targetPath = path.join(marketplaceRoot, source[1]);
        if (fs.statSync(sourcePath).isDirectory()) {
          fs.cpSync(sourcePath, targetPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.copyFileSync(sourcePath, targetPath);
        }
      }

      expect(path.basename(simulatedPluginRoot)).toBe("kibi-codex");
      expect(fs.existsSync(simulatedPluginRoot)).toBe(true);
      expect(
        fs.existsSync(
          path.join(simulatedPluginRoot, ".codex-plugin", "plugin.json"),
        ),
      ).toBe(true);
      expect(fs.existsSync(path.join(simulatedPluginRoot, ".mcp.json"))).toBe(
        true,
      );
      expect(
        fs.existsSync(path.join(simulatedPluginRoot, "hooks", "hooks.json")),
      ).toBe(true);
      expect(fs.existsSync(path.join(simulatedPluginRoot, "skills"))).toBe(
        true,
      );
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test("repo marketplace exposes kibi-codex from the package directory", () => {
    const marketplacePath = path.join(
      repoRoot,
      ".agents",
      "plugins",
      "marketplace.json",
    );
    const raw = fs.readFileSync(marketplacePath, "utf8");
    const marketplace = JSON.parse(raw) as {
      name?: string;
      interface?: { displayName?: string; description?: string };
      plugins?: Array<{
        name?: string;
        source?: { source?: string; path?: string };
        policy?: { installation?: string; authentication?: string };
        category?: string;
      }>;
    };

    expect(marketplace.name).toBe("kibi");
    expect(marketplace.interface?.displayName).toBe("Kibi Plugins");

    const plugin = marketplace.plugins?.find(
      (entry) => entry.name === "kibi-codex",
    );
    expect(plugin).toBeTruthy();
    expect(plugin?.source).toEqual({
      source: "local",
      path: "./packages/codex",
    });
    expect(plugin?.policy).toEqual({
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    });
    expect(plugin?.category).toBe("Productivity");

    const pluginRoot = path.join(repoRoot, "packages", "codex");
    expect(
      fs.existsSync(path.join(pluginRoot, ".codex-plugin", "plugin.json")),
    ).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, ".mcp.json"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "hooks", "hooks.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(pluginRoot, "skills"))).toBe(true);
  });
});

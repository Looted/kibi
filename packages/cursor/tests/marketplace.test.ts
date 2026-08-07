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

describe("kibi-cursor local marketplace fixture", () => {
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
        source?: string;
        description?: string;
      }>;
      metadata?: {
        description?: string;
      };
    };

    expect(fixture.name).toBe("kibi-local");
    expect(fixture.metadata?.description).toContain("kibi-cursor");

    const plugin = fixture.plugins?.find(
      (entry) => entry.name === "kibi-cursor",
    );
    expect(plugin).toBeTruthy();
    expect(plugin?.source).toBe("plugins/kibi-cursor");
    expect(plugin?.description).toContain("Kibi");

    const agentPlugin = fixture.plugins?.find(
      (entry) => entry.name === "kibi-agent-plugin",
    );
    expect(agentPlugin).toBeTruthy();
    expect(agentPlugin?.source).toBe("plugins/kibi-agent-plugin");
    expect(agentPlugin?.description).toContain("Kibi");
  });

  test("repo marketplace exposes kibi-cursor from the plugins directory", () => {
    const marketplacePath = path.join(
      repoRoot,
      ".cursor-plugin",
      "marketplace.json",
    );
    const raw = fs.readFileSync(marketplacePath, "utf8");
    const marketplace = JSON.parse(raw) as {
      name?: string;
      metadata?: { pluginRoot?: string; description?: string };
      plugins?: Array<{
        name?: string;
        source?: string;
        description?: string;
      }>;
    };

    expect(marketplace.name).toBe("kibi");
    expect(marketplace.metadata?.pluginRoot).toBe("plugins");

    const plugin = marketplace.plugins?.find(
      (entry) => entry.name === "kibi-cursor",
    );
    expect(plugin).toBeTruthy();
    expect(plugin?.source).toBe("kibi-cursor");
    expect(plugin?.description).toContain("Kibi");

    const agentPlugin = marketplace.plugins?.find(
      (entry) => entry.name === "kibi-agent-plugin",
    );
    expect(agentPlugin).toBeTruthy();
    expect(agentPlugin?.source).toBe("kibi-agent-plugin");
    expect(agentPlugin?.description).toContain("Kibi");

    const pluginRoot = path.join(repoRoot, "plugins", "kibi-cursor");
    expect(
      fs.existsSync(path.join(pluginRoot, ".cursor-plugin", "plugin.json")),
    ).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "mcp.json"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "hooks", "hooks.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(pluginRoot, "skills"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "rules"))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, "commands"))).toBe(true);

    const agentPluginRoot = path.join(repoRoot, "plugins", "kibi-agent-plugin");
    expect(fs.existsSync(path.join(agentPluginRoot, "plugin.json"))).toBe(true);
    expect(fs.existsSync(path.join(agentPluginRoot, "mcp.json"))).toBe(true);
    expect(fs.existsSync(path.join(agentPluginRoot, "skills"))).toBe(true);
  });

  test("is not published via package.json files", () => {
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
      plugins?: Array<{ source?: string }>;
    };
    const plugin = fixture.plugins?.[0];
    const pluginPath = plugin?.source ?? "plugins/kibi-cursor";

    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-cursor-marketplace-"),
    );
    try {
      const marketplaceRoot = tempRoot;
      const simulatedPluginRoot = path.join(marketplaceRoot, pluginPath);
      const pluginSourceRoot = packageRoot;

      for (const source of [
        [
          ".cursor-plugin/plugin.json",
          "plugins/kibi-cursor/.cursor-plugin/plugin.json",
        ],
        ["mcp.json", "plugins/kibi-cursor/mcp.json"],
        ["hooks/hooks.json", "plugins/kibi-cursor/hooks/hooks.json"],
        ["skills", "plugins/kibi-cursor/skills"],
        ["rules", "plugins/kibi-cursor/rules"],
        ["commands", "plugins/kibi-cursor/commands"],
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

      expect(path.basename(simulatedPluginRoot)).toBe("kibi-cursor");
      expect(fs.existsSync(simulatedPluginRoot)).toBe(true);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});

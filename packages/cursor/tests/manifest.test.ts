import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "bun:test";

const testRoot = import.meta.dir;
const packageRoot = (() => {
  let current = testRoot;

  for (let level = 0; level < 8; level++) {
    const candidate = path.join(current, "package.json");
    if (fs.existsSync(candidate)) {
      const packageData = JSON.parse(fs.readFileSync(candidate, "utf8")) as {
        name?: string;
      };

      if (packageData.name === "kibi-cursor") {
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
const manifestPath = path.join(packageRoot, ".cursor-plugin", "plugin.json");
const scriptPath = path.join(packageRoot, "scripts", "copy-plugin-assets.ts");

const manifestAssets = [
  path.join(".cursor-plugin", "plugin.json"),
  "bin",
  path.join("hooks", "hooks.json"),
  "skills",
  "rules",
  "commands",
  "mcp.json",
];

describe("kibi-cursor plugin manifest", () => {
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
      rules?: string;
      commands?: string;
      hooks?: string;
      mcpServers?: string;
    };

    expect(manifest.name).toBe("kibi-cursor");
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.description).toEqual(expect.stringContaining("Kibi"));
    expect(manifest.skills).toBe("./skills/");
    expect(manifest.rules).toBe("./rules/");
    expect(manifest.commands).toBe("./commands/");
    expect(manifest.hooks).toBe("./hooks/hooks.json");
    expect(manifest.mcpServers).toBe("./mcp.json");
  });

  test("manifest references existing source assets", () => {
    expect(fs.existsSync(scriptPath)).toBe(true);

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, asset))).toBe(true);
    }
  });

  test("build copies manifest-referenced assets into dist", () => {
    execSync("bun run build", { cwd: packageRoot, stdio: "ignore" });

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, "dist", asset))).toBe(true);
    }
  });
});

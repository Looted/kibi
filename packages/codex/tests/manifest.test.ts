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

      if (packageData.name === "kibi-codex") {
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
const manifestPath = path.join(packageRoot, "plugin.json");
const scriptPath = path.join(packageRoot, "scripts", "copy-plugin-assets.ts");
const hookBundlePath = path.join(packageRoot, "bin", "hook-runner.mjs");

const manifestAssets = [
  "plugin.json",
  "assets",
  path.join("hooks", "hooks.json"),
  "skills",
  ".mcp.json",
];

describe("kibi-codex plugin manifest", () => {
  test("has required keys and metadata", () => {
    const packageRaw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageRaw) as {
      version?: string;
    };

    const manifestRaw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw) as {
      $schema?: string;
      name?: string;
      version?: string;
      description?: string;
      extensions?: {
        "com.openai"?: {
          hooks?: string;
          mcpServers?: string;
          interface?: {
            displayName?: string;
            shortDescription?: string;
            defaultPrompt?: string[];
            composerIcon?: string;
            logo?: string;
            brandColor?: string;
          };
        };
      };
    };

    expect(manifest.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    );
    expect(manifest.name).toBe("kibi-codex");
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.description).toEqual(expect.stringContaining("Kibi"));

    const openai = manifest.extensions?.["com.openai"];
    expect(openai?.hooks).toBe("./hooks/hooks.json");
    expect(openai?.mcpServers).toBe("./.mcp.json");

    const ui = openai?.interface;
    expect(ui?.displayName).toBe("Kibi");
    expect((ui?.displayName ?? "").length).toBeLessThanOrEqual(30);
    expect((ui?.shortDescription ?? "").length).toBeGreaterThan(0);
    expect((ui?.shortDescription ?? "").length).toBeLessThanOrEqual(30);
    expect(ui?.defaultPrompt?.length).toBeLessThanOrEqual(3);
    for (const prompt of ui?.defaultPrompt ?? []) {
      expect(prompt.length).toBeLessThanOrEqual(128);
    }
    expect(ui?.logo).toBe("./assets/logo.png");
    expect(ui?.composerIcon).toBe("./assets/composer-icon.svg");
    expect(fs.existsSync(path.join(packageRoot, "assets", "logo.png"))).toBe(
      true,
    );
    expect(
      fs.existsSync(path.join(packageRoot, "assets", "composer-icon.svg")),
    ).toBe(true);
  });

  test("manifests references existing source assets", () => {
    expect(fs.existsSync(scriptPath)).toBe(true);
    expect(fs.existsSync(hookBundlePath)).toBe(true);
    expect(fs.statSync(hookBundlePath).size).toBeGreaterThan(0);

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, asset))).toBe(true);
    }
  });

  // Rebuilding the package can take well past the 5s default when other test
  // runners share the machine, as in the mutation dry run.
  test("build copies manifest-referenced assets into dist", () => {
    execSync("bun run build", { cwd: packageRoot, stdio: "ignore" });

    for (const asset of manifestAssets) {
      expect(fs.existsSync(path.join(packageRoot, "dist", asset))).toBe(true);
    }
  }, 60_000);
});

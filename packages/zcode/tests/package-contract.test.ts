import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJsonPath = path.join(packageRoot, "package.json");
const readmePath = path.join(packageRoot, "README.md");

describe("kibi-zcode package contract", () => {
  test("package.json contains the required public package contract metadata", () => {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(raw) as {
      name?: string;
      type?: string;
      main?: string;
      types?: string;
      files?: unknown;
      publishConfig?: { access?: unknown };
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean | undefined }>;
      exports?: Record<
        string,
        { types?: string; import?: string; default?: string }
      >;
    };

    expect(packageJson.name).toBe("kibi-zcode");
    expect(packageJson.type).toBe("module");
    expect(packageJson.main).toBe("dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.files).toEqual([
      ".zcode-plugin",
      "bin",
      "hooks",
      "skills",
      "commands",
      "dist",
      "CHANGELOG.md",
    ]);
    expect(packageJson.publishConfig?.access).toBe("public");
    expect(packageJson.peerDependencies).toMatchObject({
      "kibi-cli": ">=1.0.0",
      "kibi-mcp": ">=1.0.0",
    });
    expect(packageJson.peerDependenciesMeta).toStrictEqual({
      "kibi-cli": { optional: true },
      "kibi-mcp": { optional: true },
    });

    const exportsTypes = packageJson.exports?.["."]?.types;
    const declaredTypes = packageJson.types;
    expect(exportsTypes).toBe(declaredTypes);
    expect(declaredTypes).toBe("./dist/index.d.ts");
  });

  test("optional package contract has no install lifecycle or core runtime mutation", () => {
    const raw = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(raw) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
    };
    const installLifecycleNames = [
      "preinstall",
      "install",
      "postinstall",
      "prepare",
    ];

    for (const lifecycleName of installLifecycleNames) {
      expect(packageJson.scripts?.[lifecycleName]).toBeUndefined();
    }
    expect(packageJson.dependencies).toBeUndefined();
  });

  test("README declares the ZCode adapter optional", () => {
    const readme = fs.readFileSync(readmePath, "utf8");

    expect(readme).toContain(
      "The ZCode adapter is optional: installing `kibi-zcode` does not install or modify Kibi core/runtime packages.",
    );
  });

  test("manual MCP fallback is only for unused marketplace installs and invokes kibi-mcp", () => {
    const readme = fs.readFileSync(readmePath, "utf8");

    expect(readme).toContain("marketplace plugin install path is unused");
    expect(readme).toContain('"command": "npx"');
    expect(readme).toContain('"args": ["--no-install", "kibi-mcp"]');
  });

  test("package exports adapter entrypoint", async () => {
    const moduleExports = await import("../src/index");

    expect(moduleExports).toHaveProperty("default");
    expect(moduleExports).toHaveProperty("packageName", "kibi-zcode");
    expect(moduleExports).toHaveProperty("adapterKind", "zcode-plugin");
  });
});

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packageJsonPath = path.join(packageRoot, "package.json");

describe("kibi-codex package contract", () => {
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

    expect(packageJson.name).toBe("kibi-codex");
    expect(packageJson.type).toBe("module");
    expect(packageJson.main).toBe("dist/index.js");
    expect(packageJson.types).toBe("./dist/index.d.ts");
    expect(packageJson.files).toEqual([
      ".codex-plugin",
      ".mcp.json",
      "hooks",
      "skills",
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

  test("package exports adapter entrypoint", async () => {
    const moduleExports = await import("../src/index");

    expect(moduleExports).toHaveProperty("default");
    expect(moduleExports).toHaveProperty("packageName", "kibi-codex");
    expect(moduleExports).toHaveProperty("adapterKind", "codex-plugin");
  });
});

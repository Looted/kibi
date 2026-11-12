import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  describeConfiguredCapabilityPlugins,
  readProjectKibiConfig,
  readProjectPackageJson,
} from "../../src/plugins/project-config.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function workspace(packageJson?: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-project-config-"));
  roots.push(root);
  if (packageJson !== undefined)
    writeFileSync(path.join(root, "package.json"), packageJson);
  return root;
}

function failure(run: () => unknown) {
  try {
    run();
  } catch (error) {
    const e = error as Error & { code?: string };
    return { name: e.name, code: e.code, message: e.message };
  }
  throw new Error("expected a failure");
}

describe("readProjectPackageJson", () => {
  test("reads the package.json object", () => {
    const root = workspace('{"name":"app","kibi":{"plugins":[]}}');
    expect(readProjectPackageJson(root)).toStrictEqual({
      name: "app",
      kibi: { plugins: [] },
    });
  });

  test("requires a package.json", () => {
    const root = workspace();
    expect(failure(() => readProjectPackageJson(root))).toStrictEqual({
      name: "PluginValidationError",
      code: "MISSING_PACKAGE_JSON",
      message: `No package.json found at ${path.join(root, "package.json")}`,
    });
  });

  test("rejects malformed JSON with the parser message", () => {
    const root = workspace("{oops");
    let parserMessage = "";
    try {
      JSON.parse("{oops");
    } catch (error) {
      parserMessage = (error as Error).message;
    }
    expect(failure(() => readProjectPackageJson(root))).toStrictEqual({
      name: "PluginValidationError",
      code: "INVALID_PACKAGE_JSON",
      message: `Failed to parse package.json: ${parserMessage}`,
    });
  });

  test("rejects JSON that is not an object", () => {
    for (const text of ["null", "[]", "3", '"x"']) {
      const root = workspace(text);
      expect(failure(() => readProjectPackageJson(root))).toStrictEqual({
        name: "PluginValidationError",
        code: "INVALID_PACKAGE_JSON",
        message: "package.json must be a JSON object",
      });
    }
  });
});

describe("readProjectKibiConfig", () => {
  test("is empty without a package.json or kibi field", () => {
    expect(readProjectKibiConfig(workspace())).toStrictEqual({});
    expect(readProjectKibiConfig(workspace('{"name":"a"}'))).toStrictEqual({});
  });

  test("validates package.json#kibi", () => {
    const root = workspace(
      JSON.stringify({
        kibi: {
          plugins: [
            {
              package: "p",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "augment" },
              },
            },
          ],
        },
      }),
    );
    expect(readProjectKibiConfig(root)).toStrictEqual({
      plugins: [
        {
          package: "p",
          capabilities: { "kibi.semantic-classifier.v1": { mode: "augment" } },
        },
      ],
    });
    expect(
      failure(() => readProjectKibiConfig(workspace('{"kibi":3}'))).code,
    ).toBe("INVALID_PROJECT_CONFIG");
  });
});

describe("describeConfiguredCapabilityPlugins", () => {
  test("is empty without plugins, even without a package.json", () => {
    expect(describeConfiguredCapabilityPlugins(workspace())).toStrictEqual([]);
    expect(
      describeConfiguredCapabilityPlugins(workspace('{"kibi":{"plugins":[]}}')),
    ).toStrictEqual([]);
  });

  test("lists every capability row with its declaration state", () => {
    const root = workspace(
      JSON.stringify({
        dependencies: { dep: "1" },
        devDependencies: { dev: "1" },
        optionalDependencies: { opt: "1" },
        peerDependencies: { peer: "1" },
        kibi: {
          plugins: ["dep", "dev", "opt", "peer", "toString"].map((name) => ({
            package: name,
            capabilities: {
              "kibi.semantic-classifier.v1": { mode: "augment" },
              ...(name === "dep"
                ? { "kibi.ontology-pack.v1": { mode: "replace" } }
                : {}),
            },
          })),
        },
      }),
    );
    expect(describeConfiguredCapabilityPlugins(root)).toStrictEqual([
      {
        package: "dep",
        capability: "kibi.semantic-classifier.v1",
        mode: "augment",
        declared: true,
      },
      {
        package: "dep",
        capability: "kibi.ontology-pack.v1",
        mode: "replace",
        declared: true,
      },
      {
        package: "dev",
        capability: "kibi.semantic-classifier.v1",
        mode: "augment",
        declared: true,
      },
      {
        package: "opt",
        capability: "kibi.semantic-classifier.v1",
        mode: "augment",
        declared: true,
      },
      {
        package: "peer",
        capability: "kibi.semantic-classifier.v1",
        mode: "augment",
        declared: false,
      },
      {
        package: "toString",
        capability: "kibi.semantic-classifier.v1",
        mode: "augment",
        declared: false,
      },
    ]);
  });

  test("a manifest without dependency maps declares nothing", () => {
    const root = workspace(
      JSON.stringify({
        kibi: {
          plugins: [
            {
              package: "x",
              capabilities: {
                "kibi.semantic-classifier.v1": { mode: "shadow" },
              },
            },
          ],
        },
      }),
    );
    expect(describeConfiguredCapabilityPlugins(root)).toStrictEqual([
      {
        package: "x",
        capability: "kibi.semantic-classifier.v1",
        mode: "shadow",
        declared: false,
      },
    ]);
  });
});

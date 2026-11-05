import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { PluginValidationError as SdkPluginValidationError } from "kibi-plugin-sdk";
import {
  PluginResolutionError,
  PluginValidationError,
  assertBarePackageName,
  assertResolvedEntryInsidePackageRoot,
  hasConsumerNodeModulesLink,
  hasDeclaredProjectDependency,
  isBarePackageName,
  isProjectScopedPackage,
  packageJsonForResolvedFile,
  resolveProjectLocalPackage,
} from "../../src/plugins/resolve-package.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

function temporary(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "kibi-resolve-pkg-")));
  roots.push(root);
  return root;
}

function write(file: string, content: unknown): string {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(
    file,
    typeof content === "string" ? content : JSON.stringify(content),
  );
  return file;
}

function failure(run: () => unknown): {
  name: string;
  code: string | undefined;
  message: string;
} {
  try {
    run();
  } catch (error) {
    const e = error as Error & { code?: string };
    return { name: e.name, code: e.code, message: e.message };
  }
  throw new Error("expected a failure");
}

/** A workspace declaring `deps` with packages installed under node_modules. */
function workspace(
  deps: Record<string, string>,
  packages: Record<string, Record<string, unknown>> = {},
): string {
  const root = join(temporary(), "ws");
  write(join(root, "package.json"), { name: "ws", dependencies: deps });
  for (const [name, manifest] of Object.entries(packages)) {
    write(join(root, "node_modules", name, "package.json"), {
      name,
      ...manifest,
    });
  }
  return root;
}

describe("PluginResolutionError", () => {
  test("carries a name, code and message", () => {
    const error = new PluginResolutionError("SOME_CODE", "some message");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("PluginResolutionError");
    expect(error.code).toBe("SOME_CODE");
    expect(error.message).toBe("some message");
  });

  test("re-exports the SDK validation error", () => {
    expect(PluginValidationError).toBe(SdkPluginValidationError);
  });
});

describe("isBarePackageName", () => {
  test("accepts plain and scoped names", () => {
    expect(isBarePackageName("kibi-plugin")).toBe(true);
    expect(isBarePackageName("@scope/pkg")).toBe(true);
    expect(isBarePackageName("a.b")).toBe(true);
  });

  test("rejects empty and padded names", () => {
    expect(isBarePackageName("")).toBe(false);
    expect(isBarePackageName("  ")).toBe(false);
    expect(isBarePackageName(" pkg")).toBe(false);
    expect(isBarePackageName("pkg ")).toBe(false);
  });

  test("rejects paths, URLs and traversal", () => {
    expect(isBarePackageName(".pkg")).toBe(false);
    expect(isBarePackageName("/pkg")).toBe(false);
    expect(isBarePackageName("npm:pkg")).toBe(false);
    expect(isBarePackageName("pkg\\sub")).toBe(false);
    expect(isBarePackageName("pkg..x")).toBe(false);
  });

  test("rejects subpaths and malformed scopes", () => {
    expect(isBarePackageName("pkg/sub")).toBe(false);
    expect(isBarePackageName("@scope")).toBe(false);
    expect(isBarePackageName("@scope/")).toBe(false);
    expect(isBarePackageName("@scope/pkg/sub")).toBe(false);
  });
});

describe("assertBarePackageName", () => {
  test("passes bare names and rejects others with a coded error", () => {
    expect(assertBarePackageName("pkg")).toBeUndefined();
    expect(failure(() => assertBarePackageName("./pkg"))).toStrictEqual({
      name: "PluginResolutionError",
      code: "INVALID_PACKAGE_REFERENCE",
      message:
        "Plugin package './pkg' must be a bare package name; paths, URLs, and subpaths are rejected",
    });
  });
});

describe("hasDeclaredProjectDependency", () => {
  test("finds the package in any dependency section", () => {
    expect(
      hasDeclaredProjectDependency("/none", "p", { dependencies: { p: "1" } }),
    ).toBe(true);
    expect(
      hasDeclaredProjectDependency("/none", "p", {
        devDependencies: { p: "1" },
      }),
    ).toBe(true);
    expect(
      hasDeclaredProjectDependency("/none", "p", {
        optionalDependencies: { p: "1" },
      }),
    ).toBe(true);
  });

  test("is false for absent, empty or non-object sections", () => {
    expect(hasDeclaredProjectDependency("/none", "p", {})).toBe(false);
    expect(
      hasDeclaredProjectDependency("/none", "p", {
        dependencies: { q: "1" },
        devDependencies: { p: "" },
      }),
    ).toBe(false);
    expect(
      hasDeclaredProjectDependency("/none", "p", {
        dependencies: null,
      } as never),
    ).toBe(false);
    // A string section has a truthy `length` but declares nothing.
    expect(
      hasDeclaredProjectDependency("/none", "length", {
        dependencies: "abc",
      } as never),
    ).toBe(false);
  });

  test("reads the workspace package.json without a manifest", () => {
    const root = workspace({ p: "1" });
    expect(hasDeclaredProjectDependency(root, "p")).toBe(true);
    expect(hasDeclaredProjectDependency(root, "q")).toBe(false);
  });
});

describe("hasConsumerNodeModulesLink", () => {
  test("accepts a linked package root in either direction", () => {
    const base = temporary();
    const ws = join(base, "ws");
    const real = join(base, "real", "pkg");
    mkdirSync(join(real, "dist"), { recursive: true });
    mkdirSync(join(ws, "node_modules", "@s"), { recursive: true });
    symlinkSync(real, join(ws, "node_modules", "@s", "pkg"));
    expect(hasConsumerNodeModulesLink(ws, "@s/pkg", real)).toBe(true);
    expect(hasConsumerNodeModulesLink(ws, "@s/pkg", join(real, "dist"))).toBe(
      true,
    );
    expect(hasConsumerNodeModulesLink(ws, "@s/pkg", join(base, "real"))).toBe(
      true,
    );
    expect(hasConsumerNodeModulesLink(ws, "@s/pkg", join(base, "other"))).toBe(
      false,
    );
    expect(hasConsumerNodeModulesLink(ws, "@s/pkg", join(base, "real2"))).toBe(
      false,
    );
  });

  test("is false without a link", () => {
    const ws = temporary();
    expect(hasConsumerNodeModulesLink(ws, "pkg", ws)).toBe(false);
  });
});

describe("isProjectScopedPackage", () => {
  test("accepts packages inside the workspace or linked into it", () => {
    const base = temporary();
    const ws = join(base, "ws");
    mkdirSync(join(ws, "node_modules"), { recursive: true });
    const outside = join(base, "outside");
    mkdirSync(outside);
    expect(isProjectScopedPackage(ws, "pkg", ws)).toBe(true);
    expect(isProjectScopedPackage(ws, "pkg", join(ws, "node_modules/p"))).toBe(
      true,
    );
    expect(isProjectScopedPackage(ws, "pkg", join(base, "ws-x"))).toBe(false);
    expect(isProjectScopedPackage(ws, "pkg", outside)).toBe(false);
    symlinkSync(outside, join(ws, "node_modules", "pkg"));
    expect(isProjectScopedPackage(ws, "pkg", outside)).toBe(true);
  });

  test("trusts the Yarn PnP resolver when it is active", () => {
    const ws = temporary();
    const versions = process.versions as Record<string, string | undefined>;
    const had = Object.hasOwn(versions, "pnp");
    const previous = versions.pnp;
    versions.pnp = "3";
    try {
      expect(isProjectScopedPackage(ws, "pkg", "/elsewhere/pkg")).toBe(true);
    } finally {
      if (had) versions.pnp = previous;
      else Reflect.deleteProperty(versions, "pnp");
    }
    expect(isProjectScopedPackage(ws, "pkg", "/elsewhere/pkg")).toBe(false);
  });
});

describe("packageJsonForResolvedFile", () => {
  test("walks up from a file, a directory or a missing path", () => {
    const root = temporary();
    const pkg = join(root, "node_modules", "pkg");
    const packageJsonPath = write(join(pkg, "package.json"), {
      name: "pkg",
      version: "1.0.0",
    });
    write(join(pkg, "dist", "index.js"), "");
    const expected = {
      packageJsonPath,
      packageRoot: pkg,
      packageJson: { name: "pkg", version: "1.0.0" },
    };
    expect(
      packageJsonForResolvedFile(join(pkg, "dist", "index.js"), "pkg"),
    ).toStrictEqual(expected);
    expect(packageJsonForResolvedFile(join(pkg, "dist"), "pkg")).toStrictEqual(
      expected,
    );
    expect(packageJsonForResolvedFile(pkg, "pkg")).toStrictEqual(expected);
    expect(
      packageJsonForResolvedFile(join(pkg, "missing", "x.js"), "pkg"),
    ).toStrictEqual(expected);
  });

  test("skips malformed and differently named manifests", () => {
    const root = temporary();
    const pkg = join(root, "pkg");
    write(join(pkg, "package.json"), { name: "pkg" });
    write(join(pkg, "a", "package.json"), "{not json");
    write(join(pkg, "a", "b", "package.json"), { name: "other" });
    expect(
      packageJsonForResolvedFile(join(pkg, "a", "b", "c.js"), "pkg"),
    ).toStrictEqual({
      packageJsonPath: join(pkg, "package.json"),
      packageRoot: pkg,
      packageJson: { name: "pkg" },
    });
  });

  test("is null when no ancestor has the package name", () => {
    const root = temporary();
    expect(
      packageJsonForResolvedFile(join(root, "x.js"), "kibi-no-such-pkg-x"),
    ).toBeNull();
  });
});

describe("assertResolvedEntryInsidePackageRoot", () => {
  test("returns the real path of an entry inside the root", () => {
    const root = temporary();
    const entry = write(join(root, "pkg", "index.js"), "");
    symlinkSync(entry, join(root, "pkg", "alias.js"));
    expect(assertResolvedEntryInsidePackageRoot(join(root, "pkg"), entry)).toBe(
      entry,
    );
    expect(
      assertResolvedEntryInsidePackageRoot(
        join(root, "pkg"),
        join(root, "pkg", "alias.js"),
      ),
    ).toBe(entry);
  });

  test("rejects an unreadable root", () => {
    const root = temporary();
    expect(
      failure(() =>
        assertResolvedEntryInsidePackageRoot(join(root, "none"), "x"),
      ),
    ).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_NOT_FOUND",
      message: `Plugin package root '${join(root, "none")}' is not readable`,
    });
  });

  test("rejects a directory, a missing entry and an escaping link", () => {
    const root = temporary();
    const pkg = join(root, "pkg");
    mkdirSync(join(pkg, "dir"), { recursive: true });
    const outside = write(join(root, "outside.js"), "");
    symlinkSync(outside, join(pkg, "escape.js"));
    expect(
      failure(() =>
        assertResolvedEntryInsidePackageRoot(pkg, join(pkg, "dir")),
      ),
    ).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_ENTRY_NOT_FILE",
      message: `Plugin package entry '${join(pkg, "dir")}' is not a regular file`,
    });
    expect(
      failure(() =>
        assertResolvedEntryInsidePackageRoot(pkg, join(pkg, "none.js")),
      ),
    ).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_ENTRY_NOT_FOUND",
      message: `Plugin package entry '${join(pkg, "none.js")}' does not exist`,
    });
    expect(
      failure(() =>
        assertResolvedEntryInsidePackageRoot(pkg, join(pkg, "escape.js")),
      ),
    ).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_ENTRY_OUTSIDE_ROOT",
      message: `Resolved plugin entry '${outside}' is outside package root '${pkg}'`,
    });
  });
});

describe("resolveProjectLocalPackage", () => {
  test("resolves a declared package through Node resolution", () => {
    // Node resolves `main`; the manifest fallback would prefer `module`.
    const ws = workspace(
      { pkg: "1" },
      { pkg: { version: "2.0.0", main: "lib.js", module: "mod.js" } },
    );
    const pkg = join(ws, "node_modules", "pkg");
    const entry = write(join(pkg, "lib.js"), "");
    write(join(pkg, "mod.js"), "");
    expect(resolveProjectLocalPackage(ws, "pkg")).toStrictEqual({
      packageName: "pkg",
      packageRoot: pkg,
      packageJsonPath: join(pkg, "package.json"),
      packageJson: {
        name: "pkg",
        version: "2.0.0",
        main: "lib.js",
        module: "mod.js",
      },
      entryPath: entry,
      entryUrl: pathToFileURL(entry).href,
    });
  });

  test("rejects references that are not bare names", () => {
    expect(
      failure(() => resolveProjectLocalPackage("/none", "../x")).code,
    ).toBe("INVALID_PACKAGE_REFERENCE");
  });

  test("rejects an undeclared package", () => {
    const ws = workspace({}, { pkg: { main: "lib.js" } });
    expect(failure(() => resolveProjectLocalPackage(ws, "pkg"))).toStrictEqual({
      name: "PluginResolutionError",
      code: "UNDECLARED_DEPENDENCY",
      message: `Plugin package 'pkg' must be listed in dependencies, devDependencies, or optionalDependencies of ${join(ws, "package.json")}`,
    });
  });

  test("rejects a declared package that is not installed", () => {
    const ws = workspace({ "kibi-no-such-pkg-y": "1" });
    expect(
      failure(() => resolveProjectLocalPackage(ws, "kibi-no-such-pkg-y")),
    ).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_NOT_FOUND",
      message: `No project-local package 'kibi-no-such-pkg-y' was found for ${ws}. Install it in that workspace and retry.`,
    });
  });

  test("rejects an installed directory whose manifest names another package", () => {
    const ws = workspace({ pkg: "1" });
    write(join(ws, "node_modules", "pkg", "package.json"), {
      name: "impostor",
      main: "lib.js",
    });
    write(join(ws, "node_modules", "pkg", "lib.js"), "");
    expect(failure(() => resolveProjectLocalPackage(ws, "pkg")).code).toBe(
      "PACKAGE_NOT_FOUND",
    );
  });

  test("falls back to the entry when the package has no manifest of its own", () => {
    const ws = workspace({ pkg: "1" });
    const modules = join(ws, "node_modules");
    write(join(modules, "package.json"), { name: "pkg" });
    const entry = write(join(modules, "pkg", "index.js"), "");
    const resolved = resolveProjectLocalPackage(ws, "pkg");
    expect(resolved.packageRoot).toBe(modules);
    expect(resolved.packageJsonPath).toBe(join(modules, "package.json"));
    expect(resolved.entryPath).toBe(entry);
  });

  test("rejects a package resolved from outside the workspace", () => {
    const ws = workspace({ pkg: "1" });
    const outer = join(dirname(ws), "node_modules", "pkg");
    write(join(outer, "package.json"), { name: "pkg", main: "lib.js" });
    write(join(outer, "lib.js"), "");
    expect(failure(() => resolveProjectLocalPackage(ws, "pkg"))).toStrictEqual({
      name: "PluginResolutionError",
      code: "PACKAGE_OUTSIDE_WORKSPACE",
      message: `Resolved 'pkg' outside the consumer workspace: ${outer}. Install it in ${ws}; global, NODE_PATH, and ambient packages are not supported.`,
    });
  });

  describe("manifest entry fallback when Node cannot resolve the root export", () => {
    function entryFailure(manifest: Record<string, unknown>) {
      const ws = workspace({ pkg: "1" }, { pkg: manifest });
      return {
        pkg: join(ws, "node_modules", "pkg"),
        error: failure(() => resolveProjectLocalPackage(ws, "pkg")),
      };
    }
    function missingEntry(manifest: Record<string, unknown>, file: string) {
      const { pkg, error } = entryFailure(manifest);
      expect(error).toStrictEqual({
        name: "PluginResolutionError",
        code: "PACKAGE_ENTRY_NOT_FOUND",
        message: `Plugin package entry '${join(pkg, file)}' does not exist`,
      });
    }

    test("uses a string export", () => {
      missingEntry({ exports: "./str.js", main: "./main.js" }, "str.js");
    });

    test("uses a string root export", () => {
      missingEntry(
        { exports: { ".": "./root.js" }, main: "./m.js" },
        "root.js",
      );
    });

    test("prefers the import, then default, then require condition", () => {
      missingEntry(
        {
          exports: {
            ".": { import: "./i.js", default: "./d.js", require: "./r.js" },
          },
        },
        "i.js",
      );
      missingEntry(
        { exports: { ".": { default: "./d.js", require: "./r.js" } } },
        "d.js",
      );
      missingEntry({ exports: { ".": { require: "./r.js" } } }, "r.js");
    });

    test("skips non-string conditions and unusable exports", () => {
      missingEntry(
        {
          exports: { ".": { import: 1, default: 2, require: 3 } },
          main: "./main.js",
        },
        "main.js",
      );
      missingEntry(
        { exports: { ".": ["./a.js"] }, module: "./mod.js", main: "./m.js" },
        "mod.js",
      );
      missingEntry({ exports: ["./a.js"], main: "./main.js" }, "main.js");
      missingEntry({ exports: { ".": null }, main: "./main.js" }, "main.js");
      missingEntry({ exports: null, module: 5, main: "./main.js" }, "main.js");
    });

    test("fails when the manifest names no entry", () => {
      const { pkg, error } = entryFailure({
        exports: { ".": { import: 1 } },
        main: 7,
      });
      expect(error).toStrictEqual({
        name: "PluginResolutionError",
        code: "PACKAGE_ENTRY_NOT_FOUND",
        message: `Node could not resolve the root export of 'pkg' from ${pkg}`,
      });
    });

    test("resolves an import-only export to its file", () => {
      const ws = workspace(
        { pkg: "1" },
        { pkg: { exports: { ".": { import: "./esm.js" } } } },
      );
      const entry = write(join(ws, "node_modules", "pkg", "esm.js"), "");
      expect(resolveProjectLocalPackage(ws, "pkg").entryPath).toBe(entry);
    });
  });
});

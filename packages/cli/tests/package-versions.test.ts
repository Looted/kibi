import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KIBI_BUILT_PACKAGE_VERSIONS,
  cliVersion,
  coreVersion,
  kibiPackageVersions,
  manifestVersion,
} from "../src/package-versions.js";

const packageRoot = path.join(import.meta.dir, "..");
const readVersion = (file: string): string =>
  JSON.parse(fs.readFileSync(file, "utf8")).version;
const CLI = readVersion(path.join(packageRoot, "package.json"));
const CORE = readVersion(path.join(packageRoot, "..", "core", "package.json"));

const roots: string[] = [];
const savedOverride = process.env.KIBI_PACKAGE_VERSIONS;
const globals = globalThis as { __KIBI_CLI_VERSION__?: unknown };

afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
  if (savedOverride === undefined)
    Reflect.deleteProperty(process.env, "KIBI_PACKAGE_VERSIONS");
  else process.env.KIBI_PACKAGE_VERSIONS = savedOverride;
  Reflect.deleteProperty(globals, "__KIBI_CLI_VERSION__");
});

/** A tree root/pkg/src (the module directory) plus root/core/package.json. */
function layout(
  cli: unknown,
  core: unknown,
): { root: string; directory: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-versions-"));
  roots.push(root);
  const directory = path.join(root, "pkg", "src");
  fs.mkdirSync(directory, { recursive: true });
  fs.mkdirSync(path.join(root, "core"));
  if (cli !== undefined)
    fs.writeFileSync(
      path.join(root, "pkg", "package.json"),
      JSON.stringify(cli),
    );
  if (core !== undefined)
    fs.writeFileSync(
      path.join(root, "core", "package.json"),
      JSON.stringify(core),
    );
  return { root, directory };
}

describe("manifestVersion", () => {
  test("reads the version of a manifest with the expected name", () => {
    const { root } = layout({ name: "kibi-cli", version: "1.2.3" }, undefined);
    const file = path.join(root, "pkg", "package.json");
    expect(manifestVersion(file, "kibi-cli")).toBe("1.2.3");
    expect(manifestVersion(file, "kibi-core")).toBeUndefined();
  });

  test("a missing, broken or versionless manifest has no version", () => {
    const { root } = layout({ name: "kibi-cli", version: 3 }, undefined);
    expect(
      manifestVersion(path.join(root, "pkg", "package.json"), "kibi-cli"),
    ).toBeUndefined();
    expect(manifestVersion(path.join(root, "absent.json"), "kibi-cli")).toBe(
      undefined,
    );
    fs.writeFileSync(path.join(root, "broken.json"), "{");
    expect(
      manifestVersion(path.join(root, "broken.json"), "kibi-cli"),
    ).toBeUndefined();
  });
});

describe("cliVersion", () => {
  test("reads the package manifest above the module directory", () => {
    expect(cliVersion()).toBe(CLI);
    const { directory } = layout(
      { name: "kibi-cli", version: "4.5.6" },
      undefined,
    );
    expect(cliVersion(directory)).toBe("4.5.6");
  });

  test("a missing manifest is unknown", () => {
    expect(cliVersion(layout(undefined, undefined).directory)).toBe("unknown");
  });

  test("a bundled version constant wins when it is a string", () => {
    const { directory } = layout(
      { name: "kibi-cli", version: "4.5.6" },
      undefined,
    );
    globals.__KIBI_CLI_VERSION__ = 7;
    expect(cliVersion(directory)).toBe("4.5.6");
    globals.__KIBI_CLI_VERSION__ = "9.0.0";
    expect(cliVersion(directory)).toBe("9.0.0");
  });
});

describe("coreVersion", () => {
  test("prefers the installed kibi-core package", () => {
    expect(coreVersion()).toBe(CORE);
    const installed = layout(undefined, {
      name: "kibi-core",
      version: "0.1.0",
    });
    const sibling = layout(undefined, { name: "kibi-core", version: "0.2.0" });
    const ids: string[] = [];
    expect(
      coreVersion((id) => {
        ids.push(id);
        return path.join(installed.root, "core", "package.json");
      }, sibling.directory),
    ).toBe("0.1.0");
    expect(ids).toStrictEqual(["kibi-core/package.json"]);
  });

  test("falls back to the monorepo sibling, else unknown", () => {
    const sibling = layout(undefined, { name: "kibi-core", version: "0.2.0" });
    const wrong = layout(undefined, { name: "other", version: "0.1.0" });
    const fail = (): string => {
      throw new Error("not installed");
    };
    expect(coreVersion(fail, sibling.directory)).toBe("0.2.0");
    expect(
      coreVersion(
        () => path.join(wrong.root, "core", "package.json"),
        sibling.directory,
      ),
    ).toBe("0.2.0");
    expect(coreVersion(fail, wrong.directory)).toBe("unknown");
  });
});

describe("package version strings", () => {
  test("the built versions name both packages", () => {
    expect(KIBI_BUILT_PACKAGE_VERSIONS).toBe(
      `kibi-cli@${CLI},kibi-core@${CORE}`,
    );
  });

  test("a non-empty KIBI_PACKAGE_VERSIONS overrides them", () => {
    Reflect.deleteProperty(process.env, "KIBI_PACKAGE_VERSIONS");
    expect(kibiPackageVersions()).toBe(KIBI_BUILT_PACKAGE_VERSIONS);
    process.env.KIBI_PACKAGE_VERSIONS = "";
    expect(kibiPackageVersions()).toBe(KIBI_BUILT_PACKAGE_VERSIONS);
    process.env.KIBI_PACKAGE_VERSIONS = "kibi-cli@0,kibi-core@0";
    expect(kibiPackageVersions()).toBe("kibi-cli@0,kibi-core@0");
  });
});

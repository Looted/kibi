import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  KIBI_BUILT_PACKAGE_VERSIONS,
  builtPackageVersions,
  cliVersion,
  coreSourcesDirectory,
  coreVersion,
  kibiPackageVersions,
  manifestVersion,
  prologSourcesDigest,
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
  test("the built versions name both packages and the core sources", () => {
    expect(KIBI_BUILT_PACKAGE_VERSIONS).toBe(
      `kibi-cli@${CLI},kibi-core@${CORE},core-sources@${prologSourcesDigest(
        path.join(packageRoot, "..", "core", "src"),
      )}`,
    );
    expect(builtPackageVersions("1", "2", "abc")).toBe(
      "kibi-cli@1,kibi-core@2,core-sources@abc",
    );
    expect(builtPackageVersions("1", "2", null)).toBe("kibi-cli@1,kibi-core@2");
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

describe("prologSourcesDigest", () => {
  function sources(files: Record<string, string>): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-sources-"));
    roots.push(root);
    for (const [file, content] of Object.entries(files))
      fs.writeFileSync(path.join(root, file), content);
    return root;
  }

  test("changes with any Prolog source's name or content, not other files", () => {
    const base = prologSourcesDigest(sources({ "a.pl": "a.", "b.pl": "b." }));
    expect(base).toMatch(/^[0-9a-f]{12}$/);
    expect(
      prologSourcesDigest(
        sources({ "b.pl": "b.", "a.pl": "a.", "notes.md": "x" }),
      ),
    ).toBe(base);
    expect(
      prologSourcesDigest(sources({ "a.pl": "a.", "b.pl": "b2." })),
    ).not.toBe(base);
    expect(
      prologSourcesDigest(sources({ "a.pl": "a.", "c.pl": "b." })),
    ).not.toBe(base);
    // File boundaries count: moving text between files changes the digest.
    expect(
      prologSourcesDigest(sources({ "a.pl": "a.b", "b.pl": "." })),
    ).not.toBe(prologSourcesDigest(sources({ "a.pl": "a.", "b.pl": "b." })));
  });

  test("file boundaries count, not only the joined text", () => {
    expect(prologSourcesDigest(sources({ "a.pl": "x", "b.pl": "y" }))).not.toBe(
      prologSourcesDigest(sources({ "a.pl": "xb.ply" })),
    );
  });

  test("does not depend on the order the directory lists its files", () => {
    const directory = sources({ "a.pl": "a.", "b.pl": "b." });
    const sorted = prologSourcesDigest(directory);
    expect(prologSourcesDigest(directory, () => ["b.pl", "a.pl"])).toBe(sorted);
  });

  test("an unreadable source has no digest", () => {
    const directory = sources({ "a.pl": "a." });
    fs.mkdirSync(path.join(directory, "b.pl"));
    expect(prologSourcesDigest(directory)).toBeUndefined();
  });

  test("a directory without Prolog sources, or none at all, has no digest", () => {
    expect(prologSourcesDigest(sources({ "a.txt": "a" }))).toBeUndefined();
    expect(
      prologSourcesDigest(path.join(os.tmpdir(), "kibi-no-such-dir-x")),
    ).toBeUndefined();
  });
});

describe("coreSourcesDirectory", () => {
  test("prefers KIBI_KB_PL_PATH, then the installed kibi-core, then the sibling", () => {
    const fail = (): string => {
      throw new Error("not installed");
    };
    expect(
      coreSourcesDirectory(fail, "/x/pkg/src", "/opt/core/src/kb.pl"),
    ).toBe("/opt/core/src");
    expect(
      coreSourcesDirectory(
        () => "/inst/kibi-core/package.json",
        "/x/pkg/src",
        "",
      ),
    ).toBe("/inst/kibi-core/src");
    expect(coreSourcesDirectory(fail, "/x/pkg/src", undefined)).toBe(
      "/x/core/src",
    );
    expect(coreSourcesDirectory()).toBe(
      path.join(path.dirname(require.resolve("kibi-core/package.json")), "src"),
    );
  });
});

import { describe, expect, test } from "bun:test";
import { readKibiPackageVersions } from "../src/version-metadata";

const BASE = "file:///pkg/opencode/dist/";

type Files = Record<string, string>;

function reader(files: Files, encodings: string[] = []) {
  return (target: string | URL, encoding: "utf-8") => {
    encodings.push(encoding);
    const content = files[String(target)];
    if (content === undefined) throw new Error(`ENOENT ${String(target)}`);
    return content;
  };
}

const DIST = `${BASE}version-metadata.json`;
const PKG = {
  opencode: "file:///pkg/opencode/package.json",
  mcp: "file:///pkg/mcp/package.json",
  cli: "file:///pkg/cli/package.json",
  core: "file:///pkg/core/package.json",
};

const ALL_DIST = { opencode: "1", mcp: "2", cli: "3", core: "4" };

describe("readKibiPackageVersions tiers", () => {
  test("reads the generated dist JSON as utf-8", () => {
    const encodings: string[] = [];
    expect(
      readKibiPackageVersions({
        baseUrl: BASE,
        readFileSync: reader({ [DIST]: JSON.stringify(ALL_DIST) }, encodings),
      }),
    ).toStrictEqual({ ...ALL_DIST, source: "generated-dist", missing: [] });
    expect(encodings).toStrictEqual(["utf-8"]);
  });

  test.each(["opencode", "mcp", "cli", "core"])(
    "dist JSON without a string %s falls through to the workspace packages",
    (key) => {
      const dist: Record<string, unknown> = { ...ALL_DIST, [key]: 5 };
      const encodings: string[] = [];
      expect(
        readKibiPackageVersions({
          baseUrl: BASE,
          readFileSync: reader(
            {
              [DIST]: JSON.stringify(dist),
              [PKG.opencode]: JSON.stringify({ version: "9.0.0" }),
            },
            encodings,
          ),
        }),
      ).toStrictEqual({
        opencode: "9.0.0",
        mcp: "unknown",
        cli: "unknown",
        core: "unknown",
        source: "workspace-packages",
        missing: ["mcp", "cli", "core"],
      });
      expect(encodings).toStrictEqual([
        "utf-8",
        "utf-8",
        "utf-8",
        "utf-8",
        "utf-8",
      ]);
    },
  );

  test("all workspace packages resolve: nothing missing", () => {
    expect(
      readKibiPackageVersions({
        baseUrl: BASE,
        readFileSync: reader({
          [PKG.opencode]: JSON.stringify({ version: "1.0.0" }),
          [PKG.mcp]: JSON.stringify({ version: "2.0.0" }),
          [PKG.cli]: JSON.stringify({ version: "3.0.0" }),
          [PKG.core]: JSON.stringify({ version: "4.0.0" }),
        }),
      }),
    ).toStrictEqual({
      opencode: "1.0.0",
      mcp: "2.0.0",
      cli: "3.0.0",
      core: "4.0.0",
      source: "workspace-packages",
      missing: [],
    });
  });

  test("a package without a string version counts as missing", () => {
    expect(
      readKibiPackageVersions({
        baseUrl: BASE,
        readFileSync: reader({
          [PKG.opencode]: JSON.stringify({ version: 1 }),
          [PKG.mcp]: "null",
          [PKG.cli]: JSON.stringify({}),
          [PKG.core]: JSON.stringify({ version: "4.0.0" }),
        }),
      }),
    ).toStrictEqual({
      opencode: "unknown",
      mcp: "unknown",
      cli: "unknown",
      core: "4.0.0",
      source: "workspace-packages",
      missing: ["opencode", "mcp", "cli"],
    });
  });

  test("nothing resolves: all unknown", () => {
    expect(
      readKibiPackageVersions({ baseUrl: BASE, readFileSync: reader({}) }),
    ).toStrictEqual({
      opencode: "unknown",
      mcp: "unknown",
      cli: "unknown",
      core: "unknown",
      source: "unknown",
      missing: ["opencode", "mcp", "cli", "core"],
    });
  });
});

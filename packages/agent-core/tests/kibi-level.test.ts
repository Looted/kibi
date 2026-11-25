import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  DEFAULT_KIBI_LEVEL,
  KIBI_LEVELS,
  isKibiLevel,
  kibiLevelSettingName,
  readKibiLevel,
} from "../src/kibi-level";

const roots: string[] = [];

function workspace(files: Record<string, string>): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-level-"));
  roots.push(root);
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("Kibi level", () => {
  test("the levels are remember and test, and test is the default", () => {
    expect(KIBI_LEVELS).toEqual(["remember", "test"]);
    expect(DEFAULT_KIBI_LEVEL).toBe("test");
    expect(isKibiLevel("remember")).toBe(true);
    expect(isKibiLevel("test")).toBe(true);
    expect(isKibiLevel("prove")).toBe(false);
    expect(isKibiLevel(undefined)).toBe(false);
  });

  test("a project that sets no level is at test", () => {
    expect(readKibiLevel(workspace({}))).toEqual({
      level: "test",
      source: "default",
    });
    expect(
      readKibiLevel(workspace({ "package.json": '{"name":"app"}' })),
    ).toEqual({ level: "test", source: "default" });
    expect(
      readKibiLevel(workspace({ "package.json": '{"kibi":["remember"]}' })),
    ).toEqual({ level: "test", source: "default" });
    expect(readKibiLevel(workspace({ "package.json": "[]" }))).toEqual({
      level: "test",
      source: "default",
    });
  });

  test("the root package.json records the level in kibi.level", () => {
    const root = workspace({
      "package.json": JSON.stringify({ kibi: { level: "remember" } }),
      ".kb/setup.json": JSON.stringify({ level: "test" }),
    });
    expect(readKibiLevel(root)).toEqual({
      level: "remember",
      source: "package.json",
    });
    expect(kibiLevelSettingName(root)).toBe("kibi.level in package.json");
  });

  test("with a root package.json, .kb/setup.json is not read", () => {
    const root = workspace({
      "package.json": JSON.stringify({ name: "app" }),
      ".kb/setup.json": JSON.stringify({ level: "remember" }),
    });
    expect(readKibiLevel(root).level).toBe("test");
  });

  test("without a root package.json, .kb/setup.json records it in level", () => {
    const root = workspace({
      ".kb/setup.json": JSON.stringify({ level: "remember" }),
    });
    expect(readKibiLevel(root)).toEqual({
      level: "remember",
      source: "setup.json",
    });
    expect(kibiLevelSettingName(root)).toBe("level in .kb/setup.json");
    expect(readKibiLevel(workspace({ ".kb/setup.json": "not json" }))).toEqual({
      level: "test",
      source: "default",
    });
  });

  test("a value that is not a level is reported and read as test", () => {
    expect(
      readKibiLevel(
        workspace({
          "package.json": JSON.stringify({ kibi: { level: "prove" } }),
        }),
      ),
    ).toEqual({ level: "test", source: "package.json", invalid: "prove" });
    expect(
      readKibiLevel(
        workspace({ ".kb/setup.json": JSON.stringify({ level: 3 }) }),
      ),
    ).toEqual({ level: "test", source: "setup.json", invalid: 3 });
  });
});

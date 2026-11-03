import { afterAll, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LEGACY_KB_MIGRATION_COMMAND,
  LEGACY_KB_MIGRATION_NOTE,
  legacyConfigExists,
  loadEntityPaths,
  readLegacyKbConfig,
  resolveLegacyEntityPaths,
} from "../../src/utils/config.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-legacy-config-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
function workspace(config?: string): string {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  if (config !== undefined) {
    writeFileSync(path.join(dir, ".kb", "config.json"), config);
  }
  return dir;
}
const read = (config: unknown) =>
  readLegacyKbConfig(workspace(JSON.stringify(config)));

const LEGACY_DEFAULTS = {
  requirements: "documentation/requirements",
  scenarios: "documentation/scenarios",
  tests: "documentation/tests",
  adr: "documentation/adr",
  flags: "documentation/flags",
  events: "documentation/events",
  facts: "documentation/facts",
  symbols: "documentation/symbols.yaml",
};

describe("legacy config recognition", () => {
  test("names the migration first step", () => {
    expect(LEGACY_KB_MIGRATION_COMMAND).toBe("kibi migrate --yes");
    expect(LEGACY_KB_MIGRATION_NOTE).toBe(
      "it creates the manifest from the legacy .kb/config.json; do not run kibi init first",
    );
  });

  test("legacyConfigExists looks only at .kb/config.json", () => {
    expect(legacyConfigExists(workspace("{}"))).toBe(true);
    const other = workspace();
    writeFileSync(path.join(other, ".kb", "other.json"), "{}");
    writeFileSync(path.join(other, "config.json"), "{}");
    expect(legacyConfigExists(other)).toBe(false);
  });

  test("no legacy config reads as none; entity paths stay canonical", () => {
    expect(readLegacyKbConfig(workspace())).toStrictEqual({ kind: "none" });
    expect(loadEntityPaths(workspace("{}")).requirements).toBe(
      ".kb/requirements",
    );
    expect(loadEntityPaths().symbols).toBe(".kb/symbols.yaml");
  });

  test("a non-object document is malformed", () => {
    for (const value of [null, [1], "text", 5]) {
      expect(read(value)).toStrictEqual({
        kind: "malformed",
        error: "config.json must contain a JSON object",
      });
    }
  });

  test("an unreadable config path is malformed with the read error", () => {
    const dir = workspace();
    mkdirSync(path.join(dir, ".kb", "config.json"));
    const result = readLegacyKbConfig(dir);
    expect(result.kind).toBe("malformed");
    expect(result).toStrictEqual({
      kind: "malformed",
      error: (result as { error: string }).error,
    });
    expect((result as { error: string }).error).toStartWith("EISDIR");
  });

  test("a non-Error read failure is malformed with its string form", () => {
    const dir = workspace("{}");
    const read = spyOn(fs, "readFileSync").mockImplementation(() => {
      throw "read-failed";
    });
    try {
      expect(readLegacyKbConfig(dir)).toStrictEqual({
        kind: "malformed",
        error: "read-failed",
      });
    } finally {
      read.mockRestore();
    }
  });

  test("an empty object yields an empty config", () => {
    expect(read({})).toStrictEqual({ kind: "present", config: {} });
  });

  test("keeps only string path values and drops an empty paths object", () => {
    expect(read({ paths: { requirements: "reqs", tests: 5 } })).toStrictEqual({
      kind: "present",
      config: { paths: { requirements: "reqs" } },
    });
    for (const paths of [{}, { tests: 5 }, null, ["reqs"], "reqs"]) {
      expect(read({ paths })).toStrictEqual({ kind: "present", config: {} });
    }
  });

  test("reads every legacy path key", () => {
    const paths = {
      requirements: "r",
      scenarios: "s",
      tests: "t",
      adr: "a",
      flags: "f",
      events: "e",
      facts: "x",
      symbols: "y.yaml",
    };
    expect(read({ paths })).toStrictEqual({
      kind: "present",
      config: { paths },
    });
  });

  test("keeps recognised optional fields of the right type only", () => {
    expect(
      read({
        schemaVersion: 2,
        symbolsManifest: "s.yaml",
        defaultBranch: "main",
        checks: false,
      }),
    ).toStrictEqual({
      kind: "present",
      config: {
        schemaVersion: 2,
        symbolsManifest: "s.yaml",
        defaultBranch: "main",
        checks: false,
      },
    });
    expect(read({ schemaVersion: "1" })).toStrictEqual({
      kind: "present",
      config: { schemaVersion: "1" },
    });
    expect(
      read({ schemaVersion: true, symbolsManifest: 1, defaultBranch: 1 }),
    ).toStrictEqual({ kind: "present", config: {} });
    for (const value of ["pending", "completed", "not_applicable"]) {
      expect(read({ semanticAdvisorBackfill: value })).toStrictEqual({
        kind: "present",
        config: { semanticAdvisorBackfill: value },
      });
    }
    expect(read({ semanticAdvisorBackfill: "done" })).toStrictEqual({
      kind: "present",
      config: {},
    });
  });
});

describe("resolveLegacyEntityPaths", () => {
  test("falls back to the documentation/ defaults", () => {
    expect(resolveLegacyEntityPaths(undefined)).toStrictEqual(LEGACY_DEFAULTS);
    expect(resolveLegacyEntityPaths({})).toStrictEqual(LEGACY_DEFAULTS);
    expect(
      resolveLegacyEntityPaths({ paths: { requirements: "  ", symbols: " " } }),
    ).toStrictEqual(LEGACY_DEFAULTS);
  });

  test("trims configured values and prefers paths.symbols", () => {
    expect(
      resolveLegacyEntityPaths({
        paths: { tests: " qa ", symbols: " a.yaml " },
        symbolsManifest: "b.yaml",
      }),
    ).toStrictEqual({ ...LEGACY_DEFAULTS, tests: "qa", symbols: "a.yaml" });
    expect(
      resolveLegacyEntityPaths({ symbolsManifest: " b.yaml " }),
    ).toStrictEqual({ ...LEGACY_DEFAULTS, symbols: "b.yaml" });
  });
});

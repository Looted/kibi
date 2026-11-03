import { describe, expect, test } from "bun:test";
import { stagedCommitCarriesMigration } from "../../src/traceability/staged-migration.js";

// implements REQ-cli-migration-first-commit

type Tree = Record<string, string>;

function carries(base: Tree, staged: Tree): boolean {
  return stagedCommitCarriesMigration(
    (filePath) => base[filePath] ?? null,
    (filePath) => staged[filePath] ?? null,
  );
}

const manifest = (schemaVersion: unknown) => JSON.stringify({ schemaVersion });

describe("stagedCommitCarriesMigration", () => {
  test("needs a staged manifest with a schema version", () => {
    expect(carries({}, {})).toBe(false);
    expect(carries({}, { ".kb/manifest.json": "{not json" })).toBe(false);
    expect(carries({}, { ".kb/manifest.json": "null" })).toBe(false);
    expect(carries({}, { ".kb/manifest.json": "{}" })).toBe(false);
    expect(carries({}, { ".kb/manifest.json": manifest(true) })).toBe(false);
    expect(carries({}, { ".kb/manifest.json": manifest({ v: 3 }) })).toBe(
      false,
    );
    expect(carries({}, { ".kb/manifest.json": manifest(2.5) })).toBe(false);
  });

  test("a staged manifest with no base version is a migration", () => {
    expect(carries({}, { ".kb/manifest.json": manifest(3) })).toBe(true);
    expect(carries({}, { ".kb/manifest.json": manifest("3") })).toBe(true);
    expect(
      carries(
        { ".kb/manifest.json": "{oops" },
        { ".kb/manifest.json": manifest(3) },
      ),
    ).toBe(true);
  });

  test("retiring the legacy config is a migration", () => {
    expect(
      carries(
        {
          ".kb/config.json": manifest(9),
          ".kb/manifest.json": manifest(9),
        },
        { ".kb/manifest.json": manifest(9) },
      ),
    ).toBe(true);
  });

  test("keeping the legacy config compares versions", () => {
    const base = {
      ".kb/config.json": manifest(9),
      ".kb/manifest.json": manifest(9),
    };
    expect(
      carries(base, {
        ".kb/config.json": manifest(9),
        ".kb/manifest.json": manifest(9),
      }),
    ).toBe(false);
    expect(
      carries(base, {
        ".kb/config.json": manifest(9),
        ".kb/manifest.json": manifest(10),
      }),
    ).toBe(true);
  });

  test("the oldest base version must be older than the staged one", () => {
    const staged = (v: number) => ({
      ".kb/config.json": "{}",
      ".kb/manifest.json": manifest(v),
    });
    const base = {
      ".kb/config.json": manifest(2),
      ".kb/manifest.json": manifest(4),
    };
    expect(carries(base, staged(3))).toBe(true);
    expect(carries(base, staged(2))).toBe(false);
    expect(carries(base, staged(1))).toBe(false);
    expect(carries({ ".kb/manifest.json": manifest(4) }, staged(4))).toBe(
      false,
    );
    expect(carries({ ".kb/manifest.json": manifest(4) }, staged(5))).toBe(true);
  });

  test("an unchanged manifest without any legacy config is no migration", () => {
    expect(
      carries(
        { ".kb/manifest.json": manifest(4) },
        { ".kb/manifest.json": manifest(4) },
      ),
    ).toBe(false);
  });

  test("a base legacy config alone sets the base version", () => {
    expect(
      carries(
        { ".kb/config.json": manifest(5) },
        { ".kb/config.json": manifest(5), ".kb/manifest.json": manifest(5) },
      ),
    ).toBe(false);
  });
});

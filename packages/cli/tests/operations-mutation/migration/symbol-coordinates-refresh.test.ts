import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  coordinateRefreshFailureMessage,
  readGeneratedManifestBytes,
  refreshCoordinatesAfterMigration,
} from "../../../src/operations/migration/symbol-coordinates-refresh.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const SYMBOLS =
  "symbols:\n  - id: SYM-EXAMPLE\n    title: example\n    sourceFile: src/example.ts\n";
const SOURCE = "export function example() { return 1; }\n";
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

function receiptPath(root: string, relative: string): string {
  return path.join(
    root,
    ".kb/recovery/pending-sources",
    `${sha(relative)}.json`,
  );
}

function writeReceipt(root: string, relative: string): void {
  const file = receiptPath(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(
    file,
    JSON.stringify({ version: 1, path: relative, afterHash: "stale" }),
  );
}

function readReceipt(root: string, relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(receiptPath(root, relative), "utf8"));
}

describe("readGeneratedManifestBytes", () => {
  test("reads both generated files or null", () => {
    expect(readGeneratedManifestBytes(tempWorkspace())).toStrictEqual({
      symbols: null,
      coordinates: null,
    });
    const root = tempWorkspace({
      ".kb/symbols.yaml": "a",
      ".kb/symbol-coordinates.yaml": "b",
    });
    expect(readGeneratedManifestBytes(root)).toStrictEqual({
      symbols: "a",
      coordinates: "b",
    });
  });
});

describe("refreshCoordinatesAfterMigration", () => {
  test("skips without a manifest or without symbols", async () => {
    for (const files of [
      {},
      { ".kb/symbols.yaml": "symbols: []\n" },
      { ".kb/symbols.yaml": "symbols: x\n" },
      { ".kb/symbols.yaml": "~\n" },
      { ".kb/symbols.yaml": "" },
    ]) {
      const root = tempWorkspace(files as Record<string, string>);
      expect(await refreshCoordinatesAfterMigration(root)).toStrictEqual({
        outcome: "skipped",
      });
      expect(existsSync(path.join(root, ".kb/symbol-coordinates.yaml"))).toBe(
        false,
      );
    }
  });

  test("skips when the migration left both generated files untouched", async () => {
    const root = tempWorkspace({
      ".kb/symbols.yaml": SYMBOLS,
      "src/example.ts": SOURCE,
    });
    const before = readGeneratedManifestBytes(root);
    expect(await refreshCoordinatesAfterMigration(root, before)).toStrictEqual({
      outcome: "skipped",
    });
    expect(readFileSync(path.join(root, ".kb/symbols.yaml"), "utf8")).toBe(
      SYMBOLS,
    );
  });

  test("refreshes when either generated file changed, rebinding pending receipts", async () => {
    const root = tempWorkspace({
      ".kb/symbols.yaml": SYMBOLS,
      "src/example.ts": SOURCE,
    });
    writeReceipt(root, ".kb/symbols.yaml");
    writeReceipt(root, ".kb/symbol-coordinates.yaml");
    expect(
      await refreshCoordinatesAfterMigration(root, {
        symbols: SYMBOLS,
        coordinates: "old",
      }),
    ).toStrictEqual({ outcome: "refreshed" });
    const symbols = readFileSync(path.join(root, ".kb/symbols.yaml"), "utf8");
    const coordinates = readFileSync(
      path.join(root, ".kb/symbol-coordinates.yaml"),
      "utf8",
    );
    expect(symbols).toContain("SYM-EXAMPLE");
    expect(coordinates).toContain("sourceFile: src/example.ts");
    expect(readReceipt(root, ".kb/symbols.yaml")).toMatchObject({
      version: 1,
      path: ".kb/symbols.yaml",
      afterHash: sha(symbols),
    });
    expect(readReceipt(root, ".kb/symbol-coordinates.yaml")).toMatchObject({
      path: ".kb/symbol-coordinates.yaml",
      afterHash: sha(coordinates),
    });

    const other = tempWorkspace({
      ".kb/symbols.yaml": SYMBOLS,
      "src/example.ts": SOURCE,
    });
    expect(
      await refreshCoordinatesAfterMigration(other, {
        symbols: "old",
        coordinates: null,
      }),
    ).toStrictEqual({ outcome: "refreshed" });
    expect(
      await refreshCoordinatesAfterMigration(
        tempWorkspace({
          ".kb/symbols.yaml": SYMBOLS,
          "src/example.ts": SOURCE,
        }),
      ),
    ).toStrictEqual({
      outcome: "refreshed",
    });
  });

  test("leaves files without a receipt alone", async () => {
    const root = tempWorkspace({
      ".kb/symbols.yaml": SYMBOLS,
      "src/example.ts": SOURCE,
    });
    expect(await refreshCoordinatesAfterMigration(root)).toStrictEqual({
      outcome: "refreshed",
    });
    expect(existsSync(path.join(root, ".kb/recovery"))).toBe(false);
  });

  test("returns a refresh failure instead of throwing", async () => {
    const root = tempWorkspace({ ".kb/symbols.yaml": "symbols: [unclosed\n" });
    const refresh = await refreshCoordinatesAfterMigration(root);
    expect(refresh).toStrictEqual({
      outcome: "failed",
      reason:
        "unexpected end of the stream within a flow collection (2:1)\n\n 1 | symbols: [unclosed\n 2 | \n-----^",
    });
  });
});

describe("coordinateRefreshFailureMessage", () => {
  test("tells the user how to refresh by hand", () => {
    expect(coordinateRefreshFailureMessage("boom")).toBe(
      "Could not refresh symbol coordinates after the migration (boom). Run 'kibi sync --refresh-symbol-coordinates' and stage .kb/symbols.yaml before the first commit, or the pre-commit hook reports generated manifest drift.",
    );
  });
});

// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  refreshSymbolCoordinates,
  refreshSymbolCoordinatesForManifest,
  refreshSymbolCoordinatesUnlocked,
  setSymbolRefreshForTests,
} from "../../src/operations/mutation/symbol-refresh.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(() => {
  setSymbolRefreshForTests(undefined);
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function context(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    fs: nodeFilesystem,
  };
}

describe("symbol refresh remaining branches", () => {
  test("setSymbolRefreshForTests bypasses the compiler lock for all wrappers", async () => {
    setSymbolRefreshForTests(async () => ({
      refreshed: true,
      found: true,
      outcome: "updated",
    }));
    const ctx = context("/tmp");
    expect(await refreshSymbolCoordinates("SYM-1", ctx)).toMatchObject({
      outcome: "updated",
    });
    expect(await refreshSymbolCoordinatesUnlocked("SYM-1", ctx)).toMatchObject({
      outcome: "updated",
    });
    expect(
      await refreshSymbolCoordinatesForManifest("SYM-1", "/tmp/symbols.yaml", ctx),
    ).toMatchObject({ outcome: "updated" });
    setSymbolRefreshForTests(undefined);
    expect(await refreshSymbolCoordinates("SYM-1", { ...ctx, fs: undefined })).toEqual({
      refreshed: false,
      found: false,
    });
  });

  test("rejects unreadable manifests, missing symbols arrays, and invalid artifacts", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-refresh-bad-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    const ctx = context(workspace);
    await expect(refreshSymbolCoordinatesUnlocked("SYM-1", ctx)).rejects.toThrow(
      /could not be parsed/,
    );
    writeFileSync(join(workspace, ".kb", "symbols.yaml"), "title: none\n");
    await expect(refreshSymbolCoordinatesUnlocked("SYM-1", ctx)).rejects.toThrow(
      /no symbols array/,
    );
    writeFileSync(join(workspace, ".kb", "symbols.yaml"), "symbols:\n  - id: SYM-1\n");
    writeFileSync(join(workspace, ".kb", "symbol-coordinates.yaml"), "coordinates: [\n");
    await expect(refreshSymbolCoordinatesUnlocked("SYM-1", ctx)).rejects.toThrow(
      /coordinate/,
    );
  });

  test("returns not_found, unchanged, and rollback-safe publications", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-refresh-nf-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });
    writeFileSync(
      join(workspace, ".kb", "symbols.yaml"),
      "symbols:\n  - id: SYM-KEEP\n    title: keep\n    sourceFile: src/keep.ts\n",
    );
    writeFileSync(join(workspace, "src", "keep.ts"), "export function keep() {}\n");
    const missing = await refreshSymbolCoordinatesUnlocked("SYM-MISSING", context(workspace));
    expect(missing).toMatchObject({ refreshed: false, found: false, outcome: "not_found" });

    const first = await refreshSymbolCoordinatesUnlocked("SYM-KEEP", context(workspace));
    expect(first.found).toBe(true);
    const second = await refreshSymbolCoordinatesUnlocked("SYM-KEEP", context(workspace));
    expect(second.outcome).toBe("unchanged");
    writeFileSync(join(workspace, ".kb", "symbol-coordinates.yaml"), "changed\n");
    expect(() => first.publication?.rollback()).toThrow(/changed after publication/);
    expect(existsSync(join(workspace, ".kb", "symbol-coordinates.yaml"))).toBe(true);
  });

  test("refreshSymbolCoordinates acquires the lock when no test substitute is set", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-refresh-lock-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    writeFileSync(join(workspace, ".kb", "symbols.yaml"), "symbols: []\n");
    const result = await refreshSymbolCoordinates("SYM-NONE", context(workspace));
    expect(result).toMatchObject({ refreshed: false, found: false, outcome: "not_found" });
    expect(readFileSync(join(workspace, ".kb", "symbols.yaml"), "utf8")).toContain("symbols");
  });
});

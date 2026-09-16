import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  branchStoreKey,
  branchStoreManifestPath,
  branchStorePath,
  ensureBranchStoreManifest,
  isDirectory,
  readBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";

const roots: string[] = [];
let previousExitCode: string | number | undefined | null;

afterEach(() => {
  process.exitCode = previousExitCode ?? 0;
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  previousExitCode = process.exitCode;
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-branch-store-loc-"));
  roots.push(root);
  return root;
}

describe("branch-store-locator remaining identity fence branches", () => {
  test("returns null for invalid JSON manifests and fences mismatched stores", () => {
    const root = tempRoot();
    const store = branchStorePath(root, "trunk");
    mkdirSync(store, { recursive: true });
    writeFileSync(branchStoreManifestPath(store), "{not-json", "utf8");
    expect(readBranchStoreManifest(store)).toBeNull();

    writeFileSync(
      branchStoreManifestPath(store),
      `${JSON.stringify(
        {
          version: 1,
          branch: "other",
          key: branchStoreKey("other"),
        },
        null,
        2,
      )}\n`,
    );
    expect(() => ensureBranchStoreManifest(root, "trunk")).toThrow(
      /identity mismatch/,
    );
  });

  test("refuses to overwrite an invalid manifest or adopt compiled data without one", () => {
    const root = tempRoot();
    const store = branchStorePath(root, "trunk");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      branchStoreManifestPath(store),
      `${JSON.stringify({ version: 99, branch: "trunk" })}\n`,
    );
    expect(() => ensureBranchStoreManifest(root, "trunk")).toThrow(
      /manifest is invalid/,
    );

    const other = tempRoot();
    const otherStore = branchStorePath(other, "trunk");
    mkdirSync(otherStore, { recursive: true });
    writeFileSync(path.join(otherStore, "kb.rdf"), "<rdf />\n");
    expect(() => ensureBranchStoreManifest(other, "trunk")).toThrow(
      /compiled data but no valid identity manifest/,
    );
  });

  test("isDirectory reports real directories and missing paths", () => {
    const root = tempRoot();
    expect(isDirectory(root)).toBe(true);
    expect(isDirectory(path.join(root, "missing-dir"))).toBe(false);
  });
});

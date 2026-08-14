import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { inspectBranchStore } from "../../src/utils/branch-store.js";

describe("inspectBranchStore", () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("distinguishes a missing exact store from a damaged journal pointer", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-branch-store-"));
    roots.push(root);

    expect(inspectBranchStore(root, "trunk")).toMatchObject({
      state: "missing",
      errorCode: "branch_store_missing",
      recoveryRequired: false,
    });

    const store = path.join(root, ".kb", "branches", "trunk");
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "storage.json"), "{}\n");
    writeFileSync(path.join(store, "CURRENT"), "not-a-generation\n");

    expect(inspectBranchStore(root, "trunk")).toMatchObject({
      state: "unreadable",
      errorCode: "branch_store_invalid_current",
      recoveryRequired: true,
    });
  });
});

import { afterAll, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  branchStoreKey,
  branchStoreManifestMatches,
  branchStoreManifestPath,
  branchStorePath,
  branchStoresRoot,
  ensureBranchStoreManifest,
  expectedBranchStoreManifest,
  isDirectory,
  legacyBranchStorePath,
  readBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";

const base = mkdtempSync(path.join(os.tmpdir(), "kibi-bsl-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));
let counter = 0;
const fresh = () => {
  const dir = path.join(base, `w${counter++}`);
  mkdirSync(dir);
  return dir;
};
describe("branch store locations", () => {
  test("the key is the hex SHA-256 of the branch name", () => {
    expect(branchStoreKey("main")).toBe(
      "0d6e4079e36703ebd37c00722f5891d28b0e2811dc114b129215123adcce3605",
    );
  });

  test("stores live under .kb/branches of the resolved workspace", () => {
    expect(branchStoresRoot("/repo/x/..")).toBe("/repo/.kb/branches");
    expect(branchStorePath("/repo", "main")).toBe(
      `/repo/.kb/branches/${branchStoreKey("main")}`,
    );
    expect(legacyBranchStorePath("/repo", "feature/a")).toBe(
      "/repo/.kb/branches/feature/a",
    );
    expect(branchStoreManifestPath("/s")).toBe("/s/branch.json");
  });

  test("the expected manifest names version, branch and key", () => {
    expect(expectedBranchStoreManifest("main")).toStrictEqual({
      version: 1,
      branch: "main",
      key: branchStoreKey("main"),
    });
  });
});

describe("readBranchStoreManifest", () => {
  const write = (store: string, value: unknown) => {
    mkdirSync(store, { recursive: true });
    writeFileSync(path.join(store, "branch.json"), JSON.stringify(value));
  };

  test("returns only version, branch and key of a valid manifest", () => {
    const store = fresh();
    write(store, { version: 1, branch: "main", key: "k", extra: true });
    expect(readBranchStoreManifest(store)).toStrictEqual({
      version: 1,
      branch: "main",
      key: "k",
    });
  });

  test("rejects a missing, unparsable or malformed manifest", () => {
    expect(readBranchStoreManifest(fresh())).toBeNull();
    const broken = fresh();
    writeFileSync(path.join(broken, "branch.json"), "{");
    expect(readBranchStoreManifest(broken)).toBeNull();
    for (const value of [
      { version: 2, branch: "main", key: "k" },
      { version: 1, branch: 3, key: "k" },
      { version: 1, branch: "main", key: 3 },
    ]) {
      const store = fresh();
      write(store, value);
      expect(readBranchStoreManifest(store)).toBeNull();
    }
  });

  test("a store matches only its own branch, key and directory name", () => {
    const root = fresh();
    const key = branchStoreKey("main");
    const store = path.join(root, key);
    write(store, { version: 1, branch: "main", key });
    expect(branchStoreManifestMatches(store, "main")).toBe(true);
    expect(branchStoreManifestMatches(store, "dev")).toBe(false);
    const otherBranch = path.join(root, "other", key);
    write(otherBranch, { version: 1, branch: "dev", key });
    expect(branchStoreManifestMatches(otherBranch, "main")).toBe(false);
    const wrongKey = path.join(root, "wrong-key", key);
    write(wrongKey, { version: 1, branch: "main", key: "other" });
    expect(branchStoreManifestMatches(wrongKey, "main")).toBe(false);
    const wrongDir = path.join(root, "elsewhere");
    write(wrongDir, { version: 1, branch: "main", key });
    expect(branchStoreManifestMatches(wrongDir, "main")).toBe(false);
    expect(branchStoreManifestMatches(fresh(), "main")).toBe(false);
  });
});

describe("ensureBranchStoreManifest", () => {
  test("writes a private manifest into an empty new store", () => {
    const root = fresh();
    const store = ensureBranchStoreManifest(root, "main");
    expect(store).toBe(branchStorePath(root, "main"));
    const manifestPath = path.join(store, "branch.json");
    expect(readFileSync(manifestPath, "utf8")).toBe(
      `${JSON.stringify(expectedBranchStoreManifest("main"), null, 2)}\n`,
    );
    expect(statSync(manifestPath).mode & 0o777).toBe(0o600);
    expect(ensureBranchStoreManifest(root, "main")).toBe(store);
  });

  test("refuses a store whose manifest names another branch", () => {
    const root = fresh();
    const store = branchStorePath(root, "main");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "branch.json"),
      JSON.stringify({ version: 1, branch: "dev", key: branchStoreKey("dev") }),
    );
    expect(() => ensureBranchStoreManifest(root, "main")).toThrow(
      `Branch store identity mismatch at ${store}; refusing to attach it to 'main'.`,
    );
  });

  test("refuses to overwrite an invalid manifest", () => {
    const root = fresh();
    const store = branchStorePath(root, "main");
    mkdirSync(store, { recursive: true });
    writeFileSync(path.join(store, "branch.json"), "not json");
    expect(() => ensureBranchStoreManifest(root, "main")).toThrow(
      `Branch store manifest is invalid at ${path.join(store, "branch.json")}; refusing to overwrite it.`,
    );
  });

  test("refuses to adopt compiled data without a manifest", () => {
    const root = fresh();
    const store = branchStorePath(root, "main");
    mkdirSync(store, { recursive: true });
    writeFileSync(path.join(store, "kb.rdf"), "data");
    expect(() => ensureBranchStoreManifest(root, "main")).toThrow(
      `Branch store at ${store} has compiled data but no valid identity manifest; refusing to adopt it.`,
    );
  });
});

describe("isDirectory", () => {
  test("is true only for an existing directory", () => {
    const dir = fresh();
    writeFileSync(path.join(dir, "f"), "");
    expect(isDirectory(dir)).toBe(true);
    expect(isDirectory(path.join(dir, "f"))).toBe(false);
    expect(isDirectory(path.join(dir, "missing"))).toBe(false);
  });
});

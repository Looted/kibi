import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type BranchKbStamp,
  KbRefreshError,
  describeBranchKbStamp,
  readBranchKbStamp,
  sameBranchKbStamp,
} from "../../src/server/kb-freshness.js";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function makeBranchPath(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "kibi-kb-freshness-"));
  tempRoots.push(root);
  const branchPath = path.join(root, ".kb", "branches", "main");
  await mkdir(branchPath, { recursive: true });
  return branchPath;
}

function stamp(overrides: Partial<BranchKbStamp> = {}): BranchKbStamp {
  return {
    branchPath: "/repo/.kb/branches/main",
    rdfDev: 1,
    rdfIno: 10,
    rdfSize: 100,
    rdfMtimeMs: 1000,
    rdfCtimeMs: 2000,
    dirDev: 1,
    dirIno: 20,
    dirMtimeMs: 3000,
    dirCtimeMs: 4000,
    rdfMissing: false,
    dirMissing: false,
    errorMessage: null,
    ...overrides,
  };
}

describe("sameBranchKbStamp", () => {
  test("returns true when the same file and directory are unchanged", () => {
    const first = stamp();
    const second = stamp();

    expect(sameBranchKbStamp(first, second)).toBe(true);
  });

  test("returns false when kb.rdf inode changed", () => {
    const first = stamp({ rdfMtimeMs: 1234 });
    const second = stamp({ rdfMtimeMs: 1234, rdfIno: 11 });

    expect(sameBranchKbStamp(first, second)).toBe(false);
  });

  test("returns false when branch directory inode changed independent of kb.rdf", () => {
    const first = stamp();
    const second = stamp({ dirIno: 21 });

    expect(sameBranchKbStamp(first, second)).toBe(false);
  });

  test("detects low-resolution mtime replacements with same mtime but different size, ctime, and inode", () => {
    const first = stamp({ rdfMtimeMs: 5000 });
    const second = stamp({ rdfMtimeMs: 5000, rdfSize: 101, rdfCtimeMs: 2001, rdfIno: 11 });

    expect(sameBranchKbStamp(first, second)).toBe(false);
  });
});

describe("readBranchKbStamp", () => {
  test("reads file and directory metadata without reading kb.rdf contents", async () => {
    const branchPath = await makeBranchPath();
    await writeFile(path.join(branchPath, "kb.rdf"), "rdf data", { flag: "wx" });

    const result = await readBranchKbStamp(branchPath);

    expect(result.branchPath).toBe(branchPath);
    expect(result.rdfMissing).toBe(false);
    expect(result.dirMissing).toBe(false);
    expect(result.errorMessage).toBeNull();
    expect(result.rdfIno).toBeNumber();
    expect(result.rdfSize).toBe(8);
    expect(result.dirIno).toBeNumber();
  });

  test("marks missing kb.rdf and captures the path-not-found error", async () => {
    const branchPath = await makeBranchPath();
    await writeFile(path.join(branchPath, ".keep"), "", { flag: "wx" });

    const result = await readBranchKbStamp(branchPath);

    expect(result.rdfMissing).toBe(true);
    expect(result.dirMissing).toBe(false);
    expect(result.rdfDev).toBeNull();
    expect(result.rdfIno).toBeNull();
    expect(result.errorMessage).toContain("kb.rdf");
  });

  test("captures stat errors on the stamp instead of throwing", async () => {
    const missingBranchPath = path.join(tmpdir(), "kibi-kb-freshness-missing", String(Date.now()));

    const result = await readBranchKbStamp(missingBranchPath);

    expect(result.branchPath).toBe(missingBranchPath);
    expect(result.dirMissing).toBe(true);
    expect(result.rdfMissing).toBe(true);
    expect(result.errorMessage).toBeString();
  });
});

describe("describeBranchKbStamp", () => {
  test("includes branch path, missing flags, and error diagnostics", () => {
    const description = describeBranchKbStamp(
      stamp({ rdfMissing: true, rdfDev: null, rdfIno: null, errorMessage: "ENOENT: no such file" }),
    );

    expect(description).toContain("/repo/.kb/branches/main");
    expect(description).toContain("rdfMissing=true");
    expect(description).toContain("dirMissing=false");
    expect(description).toContain("ENOENT: no such file");
  });

  test("exports KbRefreshError with the expected error name", () => {
    const error = new KbRefreshError("refresh failed");

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("KbRefreshError");
    expect(error.message).toBe("refresh failed");
  });
});

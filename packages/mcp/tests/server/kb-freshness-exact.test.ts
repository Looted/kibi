import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdtempSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  type BranchKbStamp,
  describeBranchKbStamp,
  readBranchKbStamp,
  sameBranchKbStamp,
} from "../../src/server/kb-freshness.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function branchDir(): string {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "kibi-stamp-")));
  dirs.push(dir);
  return dir;
}

function statMessage(target: string): string {
  try {
    statSync(target);
  } catch (error) {
    return `${target}: ${(error as Error).message.replace("statSync", "stat")}`;
  }
  throw new Error(`${target} exists`);
}

function expectedStamp(dir: string, rdf: string): BranchKbStamp {
  const d = statSync(dir);
  const r = statSync(rdf);
  return {
    branchPath: dir,
    rdfDev: r.dev,
    rdfIno: r.ino,
    rdfSize: r.size,
    rdfMtimeMs: r.mtimeMs,
    rdfCtimeMs: r.ctimeMs,
    dirDev: d.dev,
    dirIno: d.ino,
    dirMtimeMs: d.mtimeMs,
    dirCtimeMs: d.ctimeMs,
    rdfMissing: false,
    dirMissing: false,
    errorMessage: null,
  };
}

describe("readBranchKbStamp, exact", () => {
  test("a legacy store is stamped from kb.rdf", async () => {
    const dir = branchDir();
    writeFileSync(path.join(dir, "kb.rdf"), "abc");
    writeFileSync(path.join(dir, "CURRENT"), "longer current");
    writeFileSync(path.join(dir, "storage.json"), '{"format":"other"}');
    const stamp = await readBranchKbStamp(dir);
    expect(stamp).toStrictEqual(expectedStamp(dir, path.join(dir, "kb.rdf")));
    expect(stamp.rdfSize).toBe(3);
  });

  test("a store without a marker is a legacy store", async () => {
    const dir = branchDir();
    writeFileSync(path.join(dir, "kb.rdf"), "abc");
    expect(await readBranchKbStamp(dir)).toStrictEqual(
      expectedStamp(dir, path.join(dir, "kb.rdf")),
    );
  });

  test("a journaled store is stamped from CURRENT", async () => {
    const dir = branchDir();
    writeFileSync(path.join(dir, "CURRENT"), "12345");
    writeFileSync(
      path.join(dir, "storage.json"),
      '{"format":"kibi.rdf-journal.v1"}',
    );
    const stamp = await readBranchKbStamp(dir);
    expect(stamp).toStrictEqual(expectedStamp(dir, path.join(dir, "CURRENT")));
    expect(stamp.rdfSize).toBe(5);
  });

  test("a missing marker target is reported with its path", async () => {
    const dir = branchDir();
    writeFileSync(path.join(dir, "storage.json"), "kibi.rdf-journal.v1");
    const stamp = await readBranchKbStamp(dir);
    expect(stamp.dirMissing).toBe(false);
    expect(stamp.rdfMissing).toBe(true);
    expect(stamp.rdfSize).toBeNull();
    expect(stamp.errorMessage).toBe(statMessage(path.join(dir, "CURRENT")));
  });

  test("a missing branch reports both stat errors", async () => {
    const dir = path.join(branchDir(), "gone");
    const stamp = await readBranchKbStamp(dir);
    expect(stamp).toStrictEqual({
      branchPath: dir,
      rdfDev: null,
      rdfIno: null,
      rdfSize: null,
      rdfMtimeMs: null,
      rdfCtimeMs: null,
      dirDev: null,
      dirIno: null,
      dirMtimeMs: null,
      dirCtimeMs: null,
      rdfMissing: true,
      dirMissing: true,
      errorMessage: `${statMessage(dir)}; ${statMessage(path.join(dir, "kb.rdf"))}`,
    });
  });
});

describe("sameBranchKbStamp and describeBranchKbStamp, exact", () => {
  const base: BranchKbStamp = {
    branchPath: "/kb",
    rdfDev: 1,
    rdfIno: 2,
    rdfSize: 3,
    rdfMtimeMs: 4,
    rdfCtimeMs: 5,
    dirDev: 6,
    dirIno: 7,
    dirMtimeMs: 8,
    dirCtimeMs: 9,
    rdfMissing: false,
    dirMissing: false,
    errorMessage: null,
  };

  test("every field takes part in the comparison", () => {
    expect(sameBranchKbStamp(base, { ...base })).toBe(true);
    const changes: Partial<BranchKbStamp>[] = [
      { branchPath: "/other" },
      { rdfDev: 10 },
      { rdfIno: 10 },
      { rdfSize: 10 },
      { rdfMtimeMs: 10 },
      { rdfCtimeMs: 10 },
      { dirDev: 10 },
      { dirIno: 10 },
      { dirMtimeMs: 10 },
      { dirCtimeMs: 10 },
      { rdfMissing: true },
      { dirMissing: true },
      { errorMessage: "e" },
    ];
    for (const change of changes) {
      expect(sameBranchKbStamp(base, { ...base, ...change })).toBe(false);
      expect(sameBranchKbStamp({ ...base, ...change }, base)).toBe(false);
    }
  });

  test("the description lists every field", () => {
    expect(describeBranchKbStamp(base)).toBe(
      "branchPath=/kb rdf(dev=1, ino=2, size=3, mtimeMs=4, ctimeMs=5) dir(dev=6, ino=7, mtimeMs=8, ctimeMs=9) rdfMissing=false dirMissing=false errorMessage=null",
    );
    expect(
      describeBranchKbStamp({
        ...base,
        rdfMissing: true,
        dirMissing: true,
        errorMessage: "boom",
      }),
    ).toBe(
      "branchPath=/kb rdf(dev=1, ino=2, size=3, mtimeMs=4, ctimeMs=5) dir(dev=6, ino=7, mtimeMs=8, ctimeMs=9) rdfMissing=true dirMissing=true errorMessage=boom",
    );
  });
});

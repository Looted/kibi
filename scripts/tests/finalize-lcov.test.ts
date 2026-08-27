/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { finalizeLcov } from "../finalize-lcov.ts";
import { mergeLcovContents } from "../merge-lcov.ts";

describe("finalizeLcov", () => {
  test("keeps an existing lcov.info file", async () => {
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-finalize-"));
    const lcovPath = join(coverageDir, "lcov.info");
    writeFileSync(lcovPath, "TN:\n", "utf8");

    expect(await finalizeLcov(coverageDir)).toBe(lcovPath);
    expect(readFileSync(lcovPath, "utf8")).toBe("TN:\n");
  });

  test("renames Bun temporary LCOV output to lcov.info", async () => {
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-finalize-"));
    const temporaryPath = join(coverageDir, ".lcov.info.abc123.tmp");
    writeFileSync(temporaryPath, "TN:\nSF:example.ts\n", "utf8");

    const lcovPath = await finalizeLcov(coverageDir);

    expect(lcovPath).toBe(join(coverageDir, "lcov.info"));
    expect(existsSync(temporaryPath)).toBe(false);
    expect(readFileSync(lcovPath, "utf8")).toBe("TN:\nSF:example.ts\n");
  });
});

describe("mergeLcovContents", () => {
  test("merges duplicate source records by taking line-level coverage union", () => {
    const merged = mergeLcovContents([
      [
        "TN:",
        "SF:src/example.ts",
        "FNF:2",
        "FNH:1",
        "DA:1,0",
        "DA:2,3",
        "LF:2",
        "LH:1",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/example.ts",
        "FNF:2",
        "FNH:2",
        "DA:1,4",
        "DA:2,0",
        "LF:2",
        "LH:1",
        "end_of_record",
      ].join("\n"),
    ]);

    expect(merged).toContain("SF:src/example.ts");
    expect(merged).toContain("FNF:2\nFNH:2");
    expect(merged).toContain("DA:1,4\nDA:2,3");
    expect(merged).toContain("LF:2\nLH:2");
    expect(merged.match(/SF:src\/example\.ts/g)).toHaveLength(1);
  });

  test("keeps distinct source records in deterministic first-seen order", () => {
    const merged = mergeLcovContents([
      "TN:\nSF:src/b.ts\nDA:2,1\nLF:1\nLH:1\nend_of_record",
      "TN:\nSF:src/a.ts\nDA:1,1\nLF:1\nLH:1\nend_of_record",
    ]);

    expect(merged.indexOf("SF:src/b.ts")).toBeLessThan(
      merged.indexOf("SF:src/a.ts"),
    );
    expect(merged.match(/end_of_record/g)).toHaveLength(2);
  });

  test("merges branch records and function identities across shards", () => {
    const merged = mergeLcovContents([
      [
        "TN:",
        "SF:src/branch.ts",
        "FN:1,first",
        "FNDA:0,first",
        "FNF:1",
        "FNH:0",
        "BRDA:2,0,0,0",
        "BRDA:2,0,1,-",
        "BRF:2",
        "BRH:1",
        "DA:1,0",
        "DA:2,1",
        "LF:2",
        "LH:1",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/branch.ts",
        "FN:1,first",
        "FNDA:3,first",
        "FN:4,second",
        "FNDA:1,second",
        "FNF:2",
        "FNH:2",
        "BRDA:2,0,0,4",
        "BRDA:2,0,1,2",
        "BRF:2",
        "BRH:2",
        "DA:1,2",
        "DA:2,0",
        "LF:2",
        "LH:1",
        "end_of_record",
      ].join("\n"),
    ]);

    expect(merged).toContain("FN:1,first");
    expect(merged).toContain("FN:4,second");
    expect(merged).toContain("FNF:2\nFNH:2");
    expect(merged).toContain("BRDA:2,0,0,4");
    expect(merged).toContain("BRDA:2,0,1,2");
    expect(merged).toContain("BRF:2\nBRH:2");
  });
});

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
import { finalizeLcov, finalizeLcovIfMain } from "../finalize-lcov.ts";
import {
  mergeLcovContents,
  mergeLcovContentsWithDiagnostics,
} from "../merge-lcov.ts";

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

  test("throws when neither lcov.info nor a temporary file exists", async () => {
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-finalize-"));
    await expect(finalizeLcov(coverageDir)).rejects.toThrow(/No lcov.info/);
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

  test("retains zero-hit lines from every valid map", () => {
    const completeLines = Array.from(
      { length: 20 },
      (_, index) => `DA:${index + 1},1`,
    );
    const poisonedLines = [
      ...completeLines.map((line) => line.replace(",1", ",0")),
      "DA:154,0",
      "DA:202,0",
    ];
    const merged = mergeLcovContents([
      [
        "TN:",
        "SF:src/tree.ts",
        ...poisonedLines,
        "LF:22",
        "LH:0",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/tree.ts",
        ...completeLines,
        "LF:20",
        "LH:20",
        "end_of_record",
      ].join("\n"),
    ]);
    expect(merged).toContain("LF:22\nLH:20");
    expect(merged).toContain("DA:154,0");
    expect(merged).toContain("DA:202,0");
  });

  test("retains zero-hit lines even when another map has a higher hit rate", () => {
    const betterLines = [
      ...Array.from({ length: 12 }, (_, index) => `DA:${index + 1},1`),
      ...Array.from({ length: 4 }, (_, index) => `DA:${index + 13},0`),
    ];
    const poisonedLines = [
      ...Array.from({ length: 16 }, (_, index) => `DA:${index + 1},0`),
      "DA:80,0",
      "DA:81,0",
    ];
    const merged = mergeLcovContents([
      [
        "TN:",
        "SF:src/runtime.ts",
        ...poisonedLines,
        "LF:18",
        "LH:0",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/runtime.ts",
        ...betterLines,
        "LF:16",
        "LH:12",
        "end_of_record",
      ].join("\n"),
    ]);
    expect(merged).toContain("LF:18\nLH:12");
    expect(merged).toContain("DA:80,0");
    expect(merged).toContain("DA:81,0");
  });

  test("keeps distinct source records in deterministic source order", () => {
    const merged = mergeLcovContents([
      "TN:\nSF:src/b.ts\nDA:2,1\nLF:1\nLH:1\nend_of_record",
      "TN:\nSF:src/a.ts\nDA:1,1\nLF:1\nLH:1\nend_of_record",
    ]);

    expect(merged.indexOf("SF:src/a.ts")).toBeLessThan(
      merged.indexOf("SF:src/b.ts"),
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

  test("keeps both unparsed branch-taken marks and reports line-map conflicts", () => {
    const mergedBranches = mergeLcovContents([
      [
        "TN:",
        "SF:src/nan.ts",
        "BRDA:1,0,0,-",
        "BRDA:1,0,1,-",
        "DA:1,1",
        "LF:1",
        "LH:1",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/nan.ts",
        "BRDA:1,0,0,-",
        "BRDA:1,0,1,-",
        "DA:1,1",
        "LF:1",
        "LH:1",
        "end_of_record",
      ].join("\n"),
    ]);
    expect(mergedBranches).toContain("BRDA:1,0,0,-");

    const completeLines = Array.from(
      { length: 20 },
      (_, index) => `DA:${index + 1},1`,
    );
    const mergedAuthority = mergeLcovContents([
      [
        "TN:",
        "SF:src/auth.ts",
        ...completeLines,
        "LF:20",
        "LH:20",
        "end_of_record",
      ].join("\n"),
      [
        "TN:",
        "SF:src/auth.ts",
        ...completeLines.map((line) => line.replace(",1", ",0")),
        "DA:21,0",
        "DA:22,3",
        "LF:22",
        "LH:1",
        "end_of_record",
      ].join("\n"),
    ]);
    expect(mergedAuthority).toContain("DA:21,0");
    expect(mergedAuthority).toContain("DA:22,3");
  });

  test("reports source-map metadata conflicts without shrinking the denominator", () => {
    const merged = mergeLcovContentsWithDiagnostics([
      "TN:\nSF:src/conflict.ts\nDA:1,0,hash-a\nLF:1\nLH:0\nend_of_record",
      "TN:\nSF:src/conflict.ts\nDA:1,1,hash-b\nDA:2,0\nLF:2\nLH:1\nend_of_record",
    ]);
    expect(merged.lcov).toContain("DA:1,1,hash-b");
    expect(merged.lcov).toContain("DA:2,0");
    expect(merged.diagnostics.join("\n")).toContain("metadata conflict");
  });
});

describe("finalizeLcovIfMain leftover entry guard", () => {
  test("skips when not main and finalizes when main is injected", async () => {
    await finalizeLcovIfMain(false);
    const coverageDir = mkdtempSync(join(tmpdir(), "kibi-lcov-ifmain-"));
    writeFileSync(join(coverageDir, "lcov.info"), "TN:\nend_of_record\n");
    await finalizeLcovIfMain(true, ["bun", "finalize-lcov.ts", coverageDir]);
  });
});

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectProductionSourceFiles,
  runCoverageManifestCli,
  sourceFilesInLcov,
  writeCoverageManifestAudit,
} from "../coverage-manifest.ts";

describe("coverage manifest", () => {
  test("enumerates package source files without declarations", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-coverage-manifest-"));
    try {
      mkdirSync(join(root, "packages", "demo", "src", "nested"), {
        recursive: true,
      });
      writeFileSync(join(root, "packages", "demo", "src", "main.ts"), "");
      writeFileSync(join(root, "packages", "demo", "src", "main.test.ts"), "");
      writeFileSync(join(root, "packages", "demo", "src", "view.test.tsx"), "");
      writeFileSync(
        join(root, "packages", "demo", "src", "nested", "types.d.ts"),
        "",
      );
      expect(collectProductionSourceFiles(root)).toEqual([
        "packages/demo/src/main.ts",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("writes an auditable list of source files missing from LCOV", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-coverage-manifest-"));
    const coverageDir = join(root, "coverage");
    try {
      mkdirSync(join(root, "packages", "demo", "src"), { recursive: true });
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(join(root, "packages", "demo", "src", "main.ts"), "");
      writeFileSync(join(root, "packages", "demo", "src", "missing.ts"), "");

      const lcov = "TN:\nSF:packages/demo/src/main.ts\nend_of_record\n";
      expect(sourceFilesInLcov(lcov)).toEqual(
        new Set(["packages/demo/src/main.ts"]),
      );
      expect(writeCoverageManifestAudit(root, coverageDir, lcov)).toEqual([
        "packages/demo/src/missing.ts",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("skips missing package trees and records a complete LCOV audit", async () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-coverage-manifest-"));
    const coverageDir = join(root, "coverage");
    try {
      expect(collectProductionSourceFiles(root)).toEqual([]);
      mkdirSync(join(root, "packages"), { recursive: true });
      writeFileSync(join(root, "packages", "not-a-package"), "");
      mkdirSync(join(root, "packages", "empty-src"), { recursive: true });
      mkdirSync(join(root, "packages", "file-src"), { recursive: true });
      writeFileSync(join(root, "packages", "file-src", "src"), "not-a-dir");
      mkdirSync(join(root, "packages", "demo", "src"), { recursive: true });
      writeFileSync(join(root, "packages", "demo", "src", "main.ts"), "");
      mkdirSync(coverageDir, { recursive: true });
      expect(collectProductionSourceFiles(root)).toEqual([
        "packages/demo/src/main.ts",
      ]);
      expect(
        writeCoverageManifestAudit(
          root,
          coverageDir,
          "TN:\nSF:packages/demo/src/main.ts\nend_of_record\n",
        ),
      ).toEqual([]);
      writeFileSync(
        join(coverageDir, "lcov.info"),
        "TN:\nSF:packages/demo/src/other.ts\nend_of_record\n",
      );
      const previousExit = process.exitCode;
      try {
        await runCoverageManifestCli([
          "bun",
          "coverage-manifest.ts",
          root,
          coverageDir,
        ]);
        expect(process.exitCode).toBe(1);
      } finally {
        process.exitCode = previousExit;
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  collectProductionSourceFiles,
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
});

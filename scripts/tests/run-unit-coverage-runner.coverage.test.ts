// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  UnitCoverageFailure,
  runUnitCoverage,
  runUnitCoverageIfMain,
  summarizeBranchCoverage,
} from "../run-unit-coverage.ts";

const roots: string[] = [];

afterEach(() => {
  process.exitCode = 0;
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) rmSync(root, { recursive: true, force: true });
  }
});

function lcovRecord(file: string, hit: number): string {
  return [
    "TN:",
    `SF:${file}`,
    `DA:1,${hit}`,
    "LF:1",
    `LH:${hit > 0 ? 1 : 0}`,
    "end_of_record",
    "",
  ].join("\n");
}

function isolatedCoverageOptions(root: string): {
  coverageDir: string;
  shardDir: string;
} {
  const coverageRoot = path.join(root, "nested-coverage");
  return {
    coverageDir: path.join(coverageRoot, "unit"),
    shardDir: path.join(coverageRoot, ".unit-shards"),
  };
}

describe("runUnitCoverage mocked shards", () => {
  test("captures Bun fallback LCOV and preserves outer shard snapshots", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    const previousCwd = process.cwd();
    const nestedCoverage = {
      ...isolatedCoverageOptions(root),
      // Deliberately share the outer base to exercise nested cleanup order.
      shardDir: path.join(root, "coverage", ".unit-shards"),
    };
    const outerShardArtifact = path.join(
      root,
      "coverage",
      ".unit-shards",
      "outer",
      "lcov.info",
    );
    mkdirSync(path.dirname(outerShardArtifact), { recursive: true });
    writeFileSync(outerShardArtifact, "outer shard must survive\n");
    const spawnTimeouts: number[] = [];
    const errors: string[] = [];
    const bunFallbackLcov = path.join(root, "coverage", "unit", "lcov.info");
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(((
      _command,
      args,
      options,
    ) => {
      if (options?.timeout !== undefined) spawnTimeouts.push(options.timeout);
      const list = (args ?? []) as string[];
      const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
      const selected = list.find((value) => value.startsWith("./")) ?? "";
      mkdirSync(coverageDir, { recursive: true });
      if (selected.includes("runtime")) {
        return {
          status: null,
          error: Object.assign(new Error("timed out"), { code: "ETIMEDOUT" }),
        } as unknown as ReturnType<typeof childProcess.spawnSync>;
      }
      if (selected.includes("vscode")) {
        mkdirSync(nestedCoverage.coverageDir, { recursive: true });
        writeFileSync(
          path.join(nestedCoverage.coverageDir, "lcov.info"),
          lcovRecord("packages/demo/src/fallback.ts", 0),
        );
        return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
      }
      mkdirSync(path.dirname(bunFallbackLcov), { recursive: true });
      writeFileSync(
        bunFallbackLcov,
        lcovRecord(
          "packages/demo/src/main.ts",
          selected.includes("skillopt") ? 0 : 1,
        ),
      );
      return {
        status: selected.includes("skillopt") ? 1 : 0,
      } as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    process.chdir(root);
    try {
      await expect(runUnitCoverage(nestedCoverage)).rejects.toBeInstanceOf(
        UnitCoverageFailure,
      );
      const merged = readFileSync(
        path.join(nestedCoverage.coverageDir, "lcov.info"),
        "utf8",
      );
      expect(merged).toContain("SF:packages/demo/src/main.ts");
      expect(
        readFileSync(
          path.join(
            nestedCoverage.coverageDir,
            "lcov.cli.discovery-remaining.info",
          ),
          "utf8",
        ),
      ).toContain("SF:packages/demo/src/main.ts");
      expect(
        readFileSync(
          path.join(
            nestedCoverage.coverageDir,
            "lcov.skillopt.fixture-kb.info",
          ),
          "utf8",
        ),
      ).toContain("SF:packages/demo/src/main.ts");
      expect(readFileSync(outerShardArtifact, "utf8")).toBe(
        "outer shard must survive\n",
      );
      const failed = readFileSync(
        path.join(nestedCoverage.coverageDir, "failed-shards.txt"),
        "utf8",
      );
      expect(failed).toContain("skillopt");
      expect(failed).toContain("runtime (exit 1,");
      expect(failed).toContain("coverage artifact missing");
      expect(errors.join("\n")).toContain(
        "Unit coverage shard runtime timed out after 900000ms",
      );
      expect(
        readFileSync(
          path.join(nestedCoverage.coverageDir, "coverage-summary.txt"),
          "utf8",
        ),
      ).toContain("branch coverage: unavailable");
      expect(spawnTimeouts).toContain(900_000);
    } finally {
      process.chdir(previousCwd);
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 20_000);

  test("fails the coverage floor, warns about missing sources, and honors the main guard", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-floor-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    writeFileSync(
      path.join(root, "packages", "demo", "src", "other.ts"),
      "y\n",
    );
    const previousCwd = process.cwd();
    const errors: string[] = [];
    const warnings: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const warnSpy = spyOn(console, "warn").mockImplementation((message) => {
      warnings.push(String(message));
    });
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(((
      _command,
      args,
    ) => {
      const list = (args ?? []) as string[];
      const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(
        path.join(coverageDir, "lcov.info"),
        lcovRecord("packages/demo/src/main.ts", 0),
      );
      return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    process.chdir(root);
    try {
      await runUnitCoverageIfMain(false);
      expect(spawnSpy).not.toHaveBeenCalled();
      await runUnitCoverageIfMain(true, isolatedCoverageOptions(root));
      expect(errors.join("\n")).toMatch(/below the 50% floor/);
      expect(errors.join("\n")).toMatch(/absent from LCOV/);
      expect(process.exitCode).toBe(1);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = 0;
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  }, 20_000);

  test("fails when the coverage floor passes but a production source is absent", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-unit-cov-missing-source-"),
    );
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    writeFileSync(
      path.join(root, "packages", "demo", "src", "unmeasured.ts"),
      "y\n",
    );
    const previousCwd = process.cwd();
    const errors: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(((
      _command,
      args,
    ) => {
      const list = (args ?? []) as string[];
      const coverageDir = list[list.indexOf("--coverage-dir") + 1] ?? "";
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(
        path.join(coverageDir, "lcov.info"),
        lcovRecord("packages/demo/src/main.ts", 1),
      );
      return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    process.chdir(root);
    try {
      await expect(
        runUnitCoverage(isolatedCoverageOptions(root)),
      ).rejects.toBeInstanceOf(UnitCoverageFailure);
      expect(errors.join("\n")).toContain("Coverage manifest audit failed");
      expect(errors.join("\n")).not.toContain("below the 50% floor");
    } finally {
      process.chdir(previousCwd);
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 20_000);
});

describe("summarizeBranchCoverage", () => {
  test("reports measured branch counts when BRDA records exist", () => {
    expect(
      summarizeBranchCoverage(
        [
          "SF:src/branch.ts",
          "BRDA:4,0,0,3",
          "BRDA:4,0,1,0",
          "BRDA:8,1,0,-",
        ].join("\n"),
      ),
    ).toEqual({ available: true, found: 3, hit: 1 });
  });

  test("keeps branch coverage unavailable when LCOV has no valid BRDA records", () => {
    expect(
      summarizeBranchCoverage(
        ["SF:src/line-only.ts", "DA:1,1", "LF:1", "LH:1"].join("\n"),
      ),
    ).toEqual({ available: false, found: 0, hit: 0 });
  });
});

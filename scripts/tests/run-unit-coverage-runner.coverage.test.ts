// implements REQ-014
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  COVERAGE_SHARDS,
  UnitCoverageFailure,
  mergeUnitCoveragePartitions,
  partitionShards,
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

// The Node parser shard writes directly to its explicit private directory;
// Bun shards still use the --coverage-dir flag and fallback lifecycle.
function mockedCoverageDirectory(args: readonly string[]): string {
  if (args[0]?.endsWith("parser-unit-coverage.mjs")) return args[2] ?? "";
  return args[args.indexOf("--coverage-dir") + 1] ?? "";
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
      const coverageDir = mockedCoverageDirectory(list);
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
      const coverageDir = mockedCoverageDirectory(list);
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
      const coverageDir = mockedCoverageDirectory(list);
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

  test("partial shardLabels still fail the repository manifest audit closed", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-unit-cov-partial-audit-"),
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
      const coverageDir = mockedCoverageDirectory(list);
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
        runUnitCoverage({
          ...isolatedCoverageOptions(root),
          shardLabels: ["runtime"],
        }),
      ).rejects.toBeInstanceOf(UnitCoverageFailure);
      expect(errors.join("\n")).toContain("Coverage manifest audit failed");
      expect(process.exitCode ?? 0).not.toBe(1);
    } finally {
      process.chdir(previousCwd);
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 20_000);

  test("CLI --shards skips repo-wide gates for local shard iteration", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-unit-cov-skip-gates-"),
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
      const coverageDir = mockedCoverageDirectory(list);
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(
        path.join(coverageDir, "lcov.info"),
        lcovRecord("packages/demo/src/main.ts", 1),
      );
      return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    process.chdir(root);
    try {
      await runUnitCoverageIfMain(true, isolatedCoverageOptions(root), [
        "--shards=runtime",
      ]);
      expect(errors.join("\n")).not.toContain("Coverage manifest audit failed");
      expect(process.exitCode ?? 0).not.toBe(1);
    } finally {
      process.chdir(previousCwd);
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 20_000);

  test("runs the in-process engine daemon file once more after a coverage pipe stall", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-unit-cov-retry-"));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    const previousCwd = process.cwd();
    const errors: string[] = [];
    const warnings: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const warnSpy = spyOn(console, "warn").mockImplementation((message) => {
      warnings.push(String(message));
    });
    const infoSpy = spyOn(console, "info").mockImplementation(() => {});
    const daemonFile = "./packages/cli/tests/engine-daemon-inprocess.test.ts";
    const otherFile = "./packages/cli/tests/engine-limits.test.ts";
    const runs = new Map<string, number>();
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(((
      _command,
      args,
    ) => {
      const list = (args ?? []) as string[];
      const file = list.at(-1) ?? "";
      const run = (runs.get(file) ?? 0) + 1;
      runs.set(file, run);
      const coverageDir = mockedCoverageDirectory(list);
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(
        path.join(coverageDir, "lcov.info"),
        lcovRecord("packages/demo/src/main.ts", 1),
      );
      const failed = (file === daemonFile && run === 1) || file === otherFile;
      return {
        status: failed ? 1 : 0,
        stdout: "",
        stderr: "",
      } as unknown as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    process.chdir(root);
    try {
      await runUnitCoverageIfMain(true, isolatedCoverageOptions(root), [
        "--shards=cli.engine",
      ]);
      expect(runs.get(daemonFile)).toBe(2);
      expect(warnings.join("\n")).toContain(
        "running it once more for the Bun coverage pipe stall",
      );
      // A failure in any other file is reported, never run again.
      expect(runs.get(otherFile)).toBe(1);
      expect(errors.join("\n")).toContain(`file=${otherFile}`);
      expect(errors.join("\n")).not.toContain(`file=${daemonFile}`);
    } finally {
      process.chdir(previousCwd);
      process.exitCode = 0;
      spawnSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
      infoSpy.mockRestore();
    }
  }, 20_000);

  test("CLI --partition runs only its slice and leaves repo gates to the merge", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-unit-cov-partition-"),
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
    const infoSpy = spyOn(console, "info").mockImplementation(() => {});
    const spawnSpy = spyOn(childProcess, "spawnSync").mockImplementation(((
      _command,
      args,
    ) => {
      const list = (args ?? []) as string[];
      const coverageDir = mockedCoverageDirectory(list);
      mkdirSync(coverageDir, { recursive: true });
      writeFileSync(
        path.join(coverageDir, "lcov.info"),
        lcovRecord("packages/demo/src/main.ts", 1),
      );
      const outfile = list[list.indexOf("--reporter-outfile") + 1];
      if (outfile !== undefined) {
        const suites = list
          .filter((value) => value.startsWith("./"))
          .map(
            (file) =>
              `<testsuite file="${file.slice(2)}" tests="1" failures="0" skipped="0" />`,
          );
        writeFileSync(outfile, `<testsuites>${suites.join("")}</testsuites>`);
      }
      return { status: 0 } as ReturnType<typeof childProcess.spawnSync>;
    }) as typeof childProcess.spawnSync);
    const options = isolatedCoverageOptions(root);
    process.chdir(root);
    try {
      await runUnitCoverageIfMain(true, options, ["--partition=3/30"]);
      // Each shard publishes its per-file results; outside a git checkout
      // they bind to no commit, and a partition leaves the ledger to --merge.
      for (const shard of partitionShards({ index: 3, count: 30 })) {
        if (shard.runtime === "node-parser") continue;
        const results = JSON.parse(
          readFileSync(
            path.join(options.coverageDir, `results.${shard.label}.json`),
            "utf8",
          ),
        );
        expect(results.commit).toBeNull();
        expect(results.dirty).toBe(true);
        expect(Object.keys(results.files).length).toBeGreaterThan(0);
      }
      expect(
        existsSync(path.join(options.coverageDir, "test-results.json")),
      ).toBe(false);
      expect(errors.join("\n")).not.toContain("Coverage manifest audit failed");
      expect(process.exitCode ?? 0).not.toBe(1);
      const published = readdirSync(options.coverageDir)
        .filter((name) => /^lcov\..+\.info$/.test(name))
        .sort();
      const expected = partitionShards({ index: 3, count: 30 })
        .map((shard) => `lcov.${shard.label}.info`)
        .sort();
      expect(expected.length).toBeGreaterThan(0);
      expect(published).toEqual(expected);
    } finally {
      process.chdir(previousCwd);
      spawnSpy.mockRestore();
      infoSpy.mockRestore();
      errorSpy.mockRestore();
    }
  }, 20_000);
});

describe("mergeUnitCoveragePartitions", () => {
  function partitionFixture(prefix: string): {
    root: string;
    fromDir: string;
    coverageDir: string;
  } {
    const root = mkdtempSync(path.join(os.tmpdir(), prefix));
    roots.push(root);
    mkdirSync(path.join(root, "packages", "demo", "src"), { recursive: true });
    writeFileSync(path.join(root, "packages", "demo", "src", "main.ts"), "x\n");
    writeFileSync(
      path.join(root, "packages", "demo", "src", "other.ts"),
      "y\n",
    );
    const fromDir = path.join(root, "partitions");
    // One directory per partition job, as actions/download-artifact lays out.
    COVERAGE_SHARDS.forEach((shard, index) => {
      const dir = path.join(fromDir, `unit-coverage-partition-${index % 4}`);
      mkdirSync(dir, { recursive: true });
      const file =
        index % 2 === 0
          ? "packages/demo/src/main.ts"
          : "packages/demo/src/other.ts";
      writeFileSync(
        path.join(dir, `lcov.${shard.label}.info`),
        lcovRecord(file, 1),
      );
      writeFileSync(path.join(dir, "failed-shards.txt"), "");
      writeFileSync(
        path.join(dir, `results.${shard.label}.json`),
        JSON.stringify({
          version: "kibi.unit-test-results.v1",
          shard: shard.label,
          commit: "c".repeat(40),
          dirty: false,
          files: {
            [`${shard.label}.test.ts`]: { tests: 1, failures: 0, skipped: 0 },
          },
        }),
      );
    });
    return { root, fromDir, coverageDir: path.join(root, "coverage", "unit") };
  }

  function withCwd(root: string, run: () => void): string[] {
    const previousCwd = process.cwd();
    const errors: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation((message) => {
      errors.push(String(message));
    });
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    process.chdir(root);
    try {
      run();
    } finally {
      process.chdir(previousCwd);
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
    return errors;
  }

  test("merges every partition snapshot into one gated report", () => {
    const fixture = partitionFixture("kibi-unit-cov-merge-");
    withCwd(fixture.root, () =>
      mergeUnitCoveragePartitions({
        fromDir: fixture.fromDir,
        coverageDir: fixture.coverageDir,
      }),
    );
    const merged = readFileSync(
      path.join(fixture.coverageDir, "lcov.info"),
      "utf8",
    );
    expect(merged).toContain("SF:packages/demo/src/main.ts");
    expect(merged).toContain("SF:packages/demo/src/other.ts");
    const ledger = JSON.parse(
      readFileSync(path.join(fixture.coverageDir, "test-results.json"), "utf8"),
    );
    expect(ledger.commit).toBe("c".repeat(40));
    expect(ledger.shards).toHaveLength(COVERAGE_SHARDS.length);
    expect(ledger.files["mcp.test.ts"]).toEqual({
      tests: 1,
      failures: 0,
      skipped: 0,
    });
    expect(
      readFileSync(
        path.join(fixture.coverageDir, "coverage-summary.txt"),
        "utf8",
      ),
    ).toContain("Merged unit line coverage: 100.00%");
    expect(
      readFileSync(path.join(fixture.coverageDir, "failed-shards.txt"), "utf8"),
    ).toBe("");
    for (const shard of COVERAGE_SHARDS) {
      expect(
        readFileSync(
          path.join(fixture.coverageDir, `lcov.${shard.label}.info`),
          "utf8",
        ),
      ).toContain("end_of_record");
    }
  });

  test("CLI --merge combines the partition artifacts", async () => {
    const fixture = partitionFixture("kibi-unit-cov-merge-cli-");
    const previousCwd = process.cwd();
    const logSpy = spyOn(console, "log").mockImplementation(() => {});
    process.chdir(fixture.root);
    try {
      await runUnitCoverageIfMain(true, { coverageDir: fixture.coverageDir }, [
        `--merge=${fixture.fromDir}`,
      ]);
    } finally {
      process.chdir(previousCwd);
      logSpy.mockRestore();
    }
    expect(process.exitCode ?? 0).toBe(0);
    expect(
      readFileSync(path.join(fixture.coverageDir, "lcov.info"), "utf8"),
    ).toContain("SF:packages/demo/src/other.ts");
  });

  test("still applies the manifest audit after merging", () => {
    const fixture = partitionFixture("kibi-unit-cov-merge-audit-");
    writeFileSync(
      path.join(fixture.root, "packages", "demo", "src", "unmeasured.ts"),
      "z\n",
    );
    let thrown: unknown;
    const errors = withCwd(fixture.root, () => {
      try {
        mergeUnitCoveragePartitions({
          fromDir: fixture.fromDir,
          coverageDir: fixture.coverageDir,
        });
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(UnitCoverageFailure);
    expect(errors.join("\n")).toContain("Coverage manifest audit failed");
  });

  test("fails closed on a missing, duplicated or unknown shard snapshot", () => {
    const fixture = partitionFixture("kibi-unit-cov-merge-incomplete-");
    const [first, second] = COVERAGE_SHARDS;
    if (first === undefined || second === undefined)
      throw new Error("no shards");
    rmSync(
      path.join(
        fixture.fromDir,
        "unit-coverage-partition-0",
        `lcov.${first.label}.info`,
      ),
    );
    writeFileSync(
      path.join(
        fixture.fromDir,
        "unit-coverage-partition-0",
        `lcov.${second.label}.info`,
      ),
      lcovRecord("packages/demo/src/main.ts", 1),
    );
    writeFileSync(
      path.join(
        fixture.fromDir,
        "unit-coverage-partition-0",
        "lcov.retired-shard.info",
      ),
      lcovRecord("packages/demo/src/main.ts", 1),
    );
    let thrown: unknown;
    const errors = withCwd(fixture.root, () => {
      try {
        mergeUnitCoveragePartitions({
          fromDir: fixture.fromDir,
          coverageDir: fixture.coverageDir,
        });
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(UnitCoverageFailure);
    const message = errors.join("\n");
    expect(message).toContain(`missing shard snapshot ${first.label}`);
    expect(message).toContain(`shard ${second.label} was published 2 times`);
    expect(message).toContain("unknown shard snapshot retired-shard");
  });

  test("carries failed shards from any partition into the merged result", () => {
    const fixture = partitionFixture("kibi-unit-cov-merge-failed-");
    writeFileSync(
      path.join(
        fixture.fromDir,
        "unit-coverage-partition-2",
        "failed-shards.txt",
      ),
      "mcp (exit 1, 10ms, timeout=120000ms)\n",
    );
    let thrown: unknown;
    const errors = withCwd(fixture.root, () => {
      try {
        mergeUnitCoveragePartitions(fixture);
      } catch (error) {
        thrown = error;
      }
    });
    expect(thrown).toBeInstanceOf(UnitCoverageFailure);
    expect(errors.join("\n")).toContain("Coverage shards failed:\nmcp (exit 1");
    expect(
      readFileSync(path.join(fixture.coverageDir, "failed-shards.txt"), "utf8"),
    ).toContain("mcp (exit 1");
  });
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

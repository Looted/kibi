import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COVERAGE_SHARDS,
  formatCoverageFailure,
  mergeDirFromArgv,
  partitionFromArgv,
  partitionShards,
  selectedShards,
  shardLabelsFromArgv,
  testFailureOutput,
} from "../run-unit-coverage";

const runnerSource = readFileSync(
  join(import.meta.dir, "..", "run-unit-coverage.ts"),
  "utf8",
);

describe("unit coverage runner contract", () => {
  test("isolates each shard engine runtime away from /tmp/kibi-runtime", () => {
    expect(runnerSource).toContain("isolatedUnitBatchEnv(runtimeDirectory)");
    expect(runnerSource).toContain("kibi-unit-coverage-runtime-");
    expect(runnerSource).toContain("stopTestEngines(runtimeDirectory)");
    const rootSource = readFileSync(
      join(import.meta.dir, "..", "..", "test", "root.test.ts"),
      "utf8",
    );
    expect(rootSource).toContain("KIBI_KB_PL_PATH");
    expect(rootSource).toContain("/^KIBI_.+_PATH$/");
  });

  test("owns SkillOpt and scripts tests in dedicated coverage shards", () => {
    expect(COVERAGE_SHARDS).toContainEqual({
      label: "skillopt",
      costSeconds: 60,
      paths: ["./scripts/skillopt-eval/tests"],
      timeoutMs: 120_000,
    });
    const scripts = COVERAGE_SHARDS.find((shard) => shard.label === "scripts");
    expect(scripts?.isolation).toBe("process-per-file");
    const scriptTests = readdirSync("./scripts/tests", {
      recursive: true,
      encoding: "utf8",
    })
      .filter((entry) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(entry))
      .map((entry) => `./scripts/tests/${entry}`)
      .sort();
    expect(scripts?.paths).toEqual([
      ...scriptTests,
      "./test/root-summary.test.ts",
    ]);
    expect(COVERAGE_SHARDS).toContainEqual({
      label: "runtime",
      paths: ["./packages/runtime"],
    });
    const zcode = COVERAGE_SHARDS.find((shard) => shard.label === "zcode");
    expect(zcode?.setup).toEqual(["run", "build:zcode"]);
    expect(zcode?.paths).toContain(
      "./packages/zcode/tests/hook-runner.test.ts",
    );
    expect(zcode?.paths).not.toContain(
      "./packages/zcode/tests/install-artifact.test.ts",
    );
    expect(zcode?.paths).not.toContain(
      "./packages/zcode/tests/mcp-launcher.subprocess.test.ts",
    );
    expect(zcode?.paths).not.toContain(
      "./packages/zcode/tests/packed-consumer-smoke.test.ts",
    );
    expect(
      COVERAGE_SHARDS.filter((shard) => shard.label.startsWith("cli.")).map(
        (shard) => shard.label,
      ),
    ).toEqual([
      "cli.commands",
      "cli.check-command",
      "cli.sync-command",
      "cli.sync-coverage",
      "cli.sync-modules",
      "cli.doctor",
      "cli.operations",
      "cli.public",
      "cli.support.staged-symbols-manifest",
      "cli.support.traceability",
      "cli.support",
      "cli.engine-remaining",
      "cli.engine-live-socket",
      "cli.engine",
      "cli.root.lcov",
      "cli.root",
      "cli.discovery-remaining",
      "cli.report-remaining",
      "cli.sync-tracked-relationships",
      "cli.report",
      "cli.parity",
      "cli.query",
      "cli.integration",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")
        ?.isolation,
    ).toBe("process-per-file");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.check-command")
        ?.isolation,
    ).toBe("process-per-file");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.doctor")?.isolation,
    ).toBe("process-per-file");
    expect(runnerSource).not.toContain("CLI_COMMANDS_PROCESS_TIMEOUT_MS");
    expect(runnerSource).toContain("FILE_PROCESS_TIMEOUT_MS");
    expect(runnerSource).toContain('isolation?: "batch" | "process-per-file"');
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.sync-command")
        ?.paths,
    ).toEqual(["./packages/cli/tests/commands/sync.test.ts"]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/sync.test.ts");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.check-command")
        ?.paths,
    ).toEqual([
      "./packages/cli/tests/commands/check.test.ts",
      "./packages/cli/tests/commands/check-remaining.coverage.test.ts",
      "./packages/cli/tests/commands/check-stale-manifest.test.ts",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/check.test.ts");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.sync-coverage")
        ?.paths,
    ).toEqual([
      "./packages/cli/tests/commands/sync-coverage.test.ts",
      "./packages/cli/tests/commands/sync-remaining.coverage.test.ts",
      "./packages/cli/tests/commands/sync.in-process.test.ts",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/sync-coverage.test.ts");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.doctor")?.paths,
    ).toEqual([
      "./packages/cli/tests/commands/doctor-behavior.test.ts",
      "./packages/cli/tests/commands/doctor-git-context.test.ts",
      "./packages/cli/tests/commands/doctor-remaining.coverage.test.ts",
      "./packages/cli/tests/commands/doctor-swipl-runtime.test.ts",
      "./packages/cli/tests/commands/doctor.in-process.test.ts",
      "./packages/cli/tests/commands/doctor.test.ts",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/doctor-behavior.test.ts");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/doctor-git-context.test.ts");
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "vscode.activation")
        ?.timeoutMs,
    ).toBe(120_000);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "vscode.activation")
        ?.mergeLcov,
    ).not.toBe(false);
    expect(
      COVERAGE_SHARDS.find(
        (shard) => shard.label === "vscode.activation-coverage",
      )?.paths,
    ).toEqual([
      "./packages/vscode/tests/coverage-completion.test.ts",
      "./packages/vscode/tests/workspace-resolve.coverage.test.ts",
    ]);
  });

  test("every in-process CLI unit test file belongs to a coverage shard", () => {
    // Directories whose tests drive the CLI or MCP through child processes,
    // so their lines never reach Bun's in-process coverage. They run in the
    // root unit suite and proof instead.
    const subprocessOnly = [
      "./packages/cli/tests/consumer/",
      "./packages/cli/tests/convergence/",
      "./packages/cli/tests/env/",
    ];
    const owned = COVERAGE_SHARDS.flatMap((shard) => shard.paths);
    const isOwned = (file: string) =>
      owned.some((path) => file === path || file.startsWith(`${path}/`));
    const files: string[] = [];
    const collect = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (["node_modules", "dist"].includes(entry.name)) continue;
        const file = `${directory}/${entry.name}`;
        if (entry.isDirectory()) collect(file);
        else if (/\.(?:test|spec)\.ts$/.test(entry.name)) files.push(file);
      }
    };
    collect("./packages/cli/tests");
    const unowned = files
      .filter((file) => !subprocessOnly.some((dir) => file.startsWith(dir)))
      .filter((file) => !isOwned(file))
      .sort();
    expect(unowned).toEqual([]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.sync-modules")
        ?.paths,
    ).toEqual(["./packages/cli/tests/commands/sync"]);
  });

  test("selectedShards returns every shard when no labels are requested", () => {
    expect(selectedShards(undefined)).toBe(COVERAGE_SHARDS);
  });

  test("selectedShards restricts runs to the requested labels in shard order", () => {
    const selected = selectedShards(["runtime", "cursor"]);
    expect(selected.map((shard) => shard.label)).toEqual(["cursor", "runtime"]);
  });

  test("selectedShards rejects unknown labels before any shard can run", () => {
    expect(() => selectedShards(["runtime", "does-not-exist"])).toThrow(
      "Unknown unit coverage shard label(s): does-not-exist",
    );
    expect(() => selectedShards([])).toThrow(
      "Unknown unit coverage shard label(s):",
    );
  });

  test("shardLabelsFromArgv reads --shards, equals form, then env", () => {
    expect(
      shardLabelsFromArgv(["--shards", "cli.check-command,cli.doctor"]),
    ).toEqual(["cli.check-command", "cli.doctor"]);
    expect(shardLabelsFromArgv(["--shards=cli.commands"])).toEqual([
      "cli.commands",
    ]);
    expect(
      shardLabelsFromArgv([], { KIBI_COVERAGE_SHARDS: " cli.sync-command " }),
    ).toEqual(["cli.sync-command"]);
    expect(shardLabelsFromArgv([])).toBeUndefined();
  });

  test("partitionShards assigns every shard to exactly one partition", () => {
    for (let count = 1; count <= 6; count += 1) {
      const labels = Array.from({ length: count }, (_, index) =>
        partitionShards({ index: index + 1, count }).map(
          (shard) => shard.label,
        ),
      );
      expect(labels.every((partition) => partition.length > 0)).toBe(true);
      expect(labels.flat().sort()).toEqual(
        COVERAGE_SHARDS.map((shard) => shard.label).sort(),
      );
    }
  });

  test("partitionShards balances known shard costs and is deterministic", () => {
    const count = 4;
    const loads = Array.from({ length: count }, (_, index) =>
      partitionShards({ index: index + 1, count }).reduce(
        (total, shard) => total + (shard.costSeconds ?? 2),
        0,
      ),
    );
    const heaviest = Math.max(
      ...COVERAGE_SHARDS.map((shard) => shard.costSeconds ?? 2),
    );
    // Longest-processing-time first stays within one shard of the lightest.
    expect(Math.max(...loads) - Math.min(...loads)).toBeLessThanOrEqual(
      heaviest,
    );
    expect(partitionShards({ index: 2, count })).toEqual(
      partitionShards({ index: 2, count }),
    );
    expect(() =>
      partitionShards({ index: 1, count: COVERAGE_SHARDS.length + 1 }),
    ).toThrow("Cannot split");
  });

  test("partitionFromArgv reads --partition, equals form, then env", () => {
    expect(partitionFromArgv(["--partition", "2/4"])).toEqual({
      index: 2,
      count: 4,
    });
    expect(partitionFromArgv(["--partition=4/4"])).toEqual({
      index: 4,
      count: 4,
    });
    expect(partitionFromArgv([], { KIBI_COVERAGE_PARTITION: " 1/3 " })).toEqual(
      { index: 1, count: 3 },
    );
    expect(partitionFromArgv([], {})).toBeUndefined();
    for (const bad of ["0/4", "5/4", "2", "a/b", "1/0"]) {
      expect(() => partitionFromArgv([`--partition=${bad}`])).toThrow(
        "Invalid unit coverage partition",
      );
    }
  });

  test("mergeDirFromArgv reads --merge, equals form, then env", () => {
    expect(mergeDirFromArgv(["--merge", "coverage/partitions"])).toBe(
      "coverage/partitions",
    );
    expect(mergeDirFromArgv(["--merge=out"])).toBe("out");
    expect(mergeDirFromArgv([], { KIBI_COVERAGE_MERGE_FROM: "dl" })).toBe("dl");
    expect(mergeDirFromArgv([], {})).toBeUndefined();
  });

  test("formatCoverageFailure names the exact file, timeout, and last output", () => {
    expect(
      formatCoverageFailure({
        label: "cli.commands",
        file: "./packages/cli/tests/commands/sync.test.ts",
        exitCode: 1,
        durationMs: 301_000,
        timeoutMs: 300_000,
        timedOut: true,
        lastOutput: "spawnSync /bin/sh ETIMEDOUT",
      }),
    ).toBe(
      'cli.commands file=./packages/cli/tests/commands/sync.test.ts (exit 1, 301000ms, timeout=300000ms timedOut lastOutput="spawnSync /bin/sh ETIMEDOUT")',
    );
  });

  test("a failed file's reported output keeps its failing test, not the coverage table", () => {
    const output = [
      "(pass) daemon > serves RPCs [120.00ms]",
      "error: expect(received).toBe(expected)",
      "      at <anonymous> (engine-daemon-inprocess.test.ts:42:7)",
      "(fail) daemon > idle timeout shuts the daemon down [4012.00ms]",
      "-----------------------|---------|---------|-------------------",
      "File                   | % Funcs | % Lines | Uncovered Line #s",
      "-----------------------|---------|---------|-------------------",
      "All files              |   91.20 |   88.40 |",
      " packages/cli/src/a.ts |  100.00 |   76.72 | 58-61,76-80",
      "",
      " 16 pass",
      " 1 fail",
    ].join("\n");
    const kept = testFailureOutput(output);
    expect(kept).toContain(
      "(fail) daemon > idle timeout shuts the daemon down",
    );
    expect(kept).toContain("engine-daemon-inprocess.test.ts:42:7");
    expect(kept).not.toContain("(pass)");
    expect(kept).not.toContain("% Funcs");
    expect(kept).not.toContain("packages/cli/src/a.ts");
    expect(
      formatCoverageFailure({
        label: "cli.engine",
        exitCode: 1,
        durationMs: 8_000,
        timeoutMs: 300_000,
        timedOut: false,
        lastOutput: output,
      }),
    ).toContain("(fail) daemon > idle timeout shuts the daemon down");
  });

  test("process-per-file isolation is the default for process-heavy CLI shards", () => {
    for (const label of [
      "cli.commands",
      "cli.check-command",
      "cli.sync-command",
      "cli.sync-coverage",
      "cli.doctor",
      "cli.operations",
      "cli.support.staged-symbols-manifest",
      "cli.support.traceability",
      "cli.engine-live-socket",
      "cli.report-remaining",
      "cli.sync-tracked-relationships",
    ]) {
      expect(
        COVERAGE_SHARDS.find((shard) => shard.label === label)?.isolation,
      ).toBe("process-per-file");
    }
    const operations = COVERAGE_SHARDS.find(
      (shard) => shard.label === "cli.operations",
    );
    expect(operations?.paths).toContain(
      "./packages/cli/tests/operations/apply-plan.test.ts",
    );
    expect(operations?.paths).toContain(
      "./packages/cli/tests/operations/migration/origin-backfill.test.ts",
    );
    expect(operations?.paths).not.toContain(
      "./packages/cli/tests/operations/bootstrap-workspace-fixture.ts",
    );
    expect(runnerSource).not.toContain("25 * 60 * 1000");
    expect(runnerSource).toContain("allowEmpty: result.exitCode === 0");
    expect(runnerSource).toContain("recording an empty coverage artifact");
  });

  test("isolates staged-symbols-manifest without dropping traceability coverage", () => {
    const traceabilityDirectory = "./packages/cli/tests/traceability";
    const isolatedTest =
      "./packages/cli/tests/traceability/staged-symbols-manifest.test.ts";
    const isolatedShard = COVERAGE_SHARDS.find(
      (shard) => shard.label === "cli.support.staged-symbols-manifest",
    );
    const supportShard = COVERAGE_SHARDS.find(
      (shard) => shard.label === "cli.support",
    );
    const traceabilityShard = COVERAGE_SHARDS.find(
      (shard) => shard.label === "cli.support.traceability",
    );
    const traceabilityTests = readdirSync(traceabilityDirectory, {
      withFileTypes: true,
    });
    expect(
      traceabilityTests
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name),
    ).toEqual([]);
    const traceabilityTestPaths = traceabilityTests
      .filter(
        (entry) => entry.isFile() && /\.(?:test|spec)\.ts$/.test(entry.name),
      )
      .map((entry) => `${traceabilityDirectory}/${entry.name}`)
      .sort();

    expect(isolatedShard?.paths).toEqual([isolatedTest]);
    expect(isolatedShard?.isolation).toBe("process-per-file");
    expect(supportShard?.paths).not.toContain(traceabilityDirectory);
    expect(
      supportShard?.paths.filter((path) =>
        path.startsWith(`${traceabilityDirectory}/`),
      ),
    ).toEqual([]);
    expect(traceabilityShard?.isolation).toBe("process-per-file");
    const assignedTraceabilityTests = [
      ...(traceabilityShard?.paths ?? []),
      ...(isolatedShard?.paths ?? []),
    ].sort();
    expect(assignedTraceabilityTests).toEqual(traceabilityTestPaths);
  });
});

import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  COVERAGE_SHARDS,
  formatCoverageFailure,
  selectedShards,
  shardLabelsFromArgv,
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
      paths: ["./scripts/skillopt-eval/tests"],
      timeoutMs: 120_000,
    });
    expect(COVERAGE_SHARDS).toContainEqual({
      label: "scripts",
      paths: ["./scripts/tests", "./test/root-summary.test.ts"],
    });
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
      "cli.doctor",
      "cli.operations",
      "cli.public",
      "cli.support.staged-symbols-manifest",
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
      "./packages/cli/tests/commands/doctor-remaining.coverage.test.ts",
      "./packages/cli/tests/commands/doctor.in-process.test.ts",
      "./packages/cli/tests/commands/doctor.test.ts",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/doctor-behavior.test.ts");
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

  test("process-per-file isolation is the default for process-heavy CLI shards", () => {
    for (const label of [
      "cli.commands",
      "cli.check-command",
      "cli.sync-command",
      "cli.sync-coverage",
      "cli.doctor",
      "cli.support.staged-symbols-manifest",
      "cli.engine-live-socket",
      "cli.report-remaining",
      "cli.sync-tracked-relationships",
    ]) {
      expect(
        COVERAGE_SHARDS.find((shard) => shard.label === label)?.isolation,
      ).toBe("process-per-file");
    }
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
    const assignedTraceabilityTests = [
      ...(supportShard?.paths.filter((path) =>
        path.startsWith(`${traceabilityDirectory}/`),
      ) ?? []),
      ...(isolatedShard?.paths ?? []),
    ].sort();
    expect(assignedTraceabilityTests).toEqual(traceabilityTestPaths);
  });
});

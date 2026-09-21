import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COVERAGE_SHARDS, selectedShards } from "../run-unit-coverage";

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
      "cli.sync-command",
      "cli.doctor",
      "cli.operations",
      "cli.public",
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
        ?.timeoutMs,
    ).toBe(120_000);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.sync-command")
        ?.paths,
    ).toEqual(["./packages/cli/tests/commands/sync.test.ts"]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.paths,
    ).not.toContain("./packages/cli/tests/commands/sync.test.ts");
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
});

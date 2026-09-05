import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COVERAGE_SHARDS } from "../run-unit-coverage";

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
      paths: ["./scripts/tests"],
    });
    expect(COVERAGE_SHARDS).toContainEqual({
      label: "runtime",
      paths: ["./packages/runtime"],
    });
    expect(
      COVERAGE_SHARDS.filter((shard) => shard.label.startsWith("cli.")).map(
        (shard) => shard.label,
      ),
    ).toEqual([
      "cli.commands",
      "cli.operations",
      "cli.public",
      "cli.support",
      "cli.engine-remaining",
      "cli.engine",
      "cli.root.lcov",
      "cli.root",
      "cli.discovery-remaining",
      "cli.report",
      "cli.parity",
      "cli.query",
      "cli.integration",
    ]);
    expect(
      COVERAGE_SHARDS.find((shard) => shard.label === "cli.commands")?.timeoutMs,
    ).toBe(120_000);
  });
});

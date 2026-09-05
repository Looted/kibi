import { describe, expect, test } from "bun:test";
import { COVERAGE_SHARDS } from "../run-unit-coverage";

describe("unit coverage runner contract", () => {
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
    expect(COVERAGE_SHARDS).toContainEqual({
      label: "cli",
      paths: ["./packages/cli"],
      timeoutMs: 120_000,
    });
  });
});

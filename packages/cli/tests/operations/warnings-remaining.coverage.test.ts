// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import {
  scenarioCoverageWarning,
  scenarioCoverageWarnings,
} from "../../src/operations/mutation/warnings.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

describe("scenarioCoverageWarnings remaining verified_by success", () => {
  test("warns when a requirement already has specified_by coverage", async () => {
    restores.push(isolateKibiEnv());
    const warnings = await scenarioCoverageWarnings(
      {
        query: async () => ({ success: true, bindings: { ScenarioId: "SCEN-1" } }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
      [{ type: "verified_by", from: "REQ-1", to: "TEST-1" }],
      "req",
      "REQ-1",
    );
    expect(warnings[0]).toMatch(/Scenario-backed coverage/);
    expect(scenarioCoverageWarning("REQ-9")[0]).toContain("REQ-9");
  });
});

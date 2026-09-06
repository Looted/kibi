// implements REQ-kibi-proof-evidence-protocol
import { afterEach, describe, expect, test } from "bun:test";
import {
  DEFAULT_TELEMETRY_ACCEPTANCE_POLICY,
  analyzeTelemetryAcceptance,
} from "../../src/public/telemetry-acceptance.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const NOW = new Date("2026-08-10T12:00:00.000Z");

function event(
  minutesBefore: number,
  overrides: Record<string, unknown> = {},
) {
  return {
    timestamp: new Date(NOW.getTime() - minutesBefore * 60_000).toISOString(),
    status: "error",
    telemetry_status: "provided",
    telemetry: { is_autonomous: true },
    tool: "kb_upsert",
    error_category: "validation_failed",
    ...overrides,
  };
}

describe("telemetry-acceptance remaining repeated-failure sort and proof-gap operator", () => {
  test("sorts equal repeated-failure counts by target id", () => {
    restores.push(isolateKibiEnv());
    const threshold =
      DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.repeatedMutationFailureThreshold;
    const events = [];
    for (let index = 0; index < threshold; index += 1) {
      events.push(
        event(40 - index, {
          business_args: { id: "REQ-Z", type: "req" },
        }),
      );
      events.push(
        event(39 - index, {
          business_args: { id: "REQ-A", type: "req" },
        }),
      );
    }
    const report = analyzeTelemetryAcceptance(events, NOW);
    const repeated = report.metrics.find(
      (metric) => metric.id === "repeated_mutation_failures",
    );
    expect(repeated?.evidence).toEqual(
      expect.objectContaining({
        targets: [
          expect.objectContaining({ target: "req:REQ-A" }),
          expect.objectContaining({ target: "req:REQ-Z" }),
        ],
      }),
    );
  });

  test("records proof-gap recovery with a less-than threshold", () => {
    restores.push(isolateKibiEnv());
    const report = analyzeTelemetryAcceptance(
      [
        {
          timestamp: new Date(NOW.getTime() - 20 * 60_000).toISOString(),
          status: "success",
          telemetry_status: "provided",
          telemetry: { is_autonomous: true },
          tool: "kb_coverage",
          status: "success",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 4,
        },
        {
          timestamp: new Date(NOW.getTime() - 5 * 60_000).toISOString(),
          status: "success",
          telemetry_status: "provided",
          telemetry: { is_autonomous: true },
          tool: "kb_coverage",
          coverage_scope_complete: true,
          coverage_proof_gap_count: 1,
        },
      ],
      NOW,
    );
    const recovery = report.metrics.find(
      (metric) => metric.id === "proof_gap_recovery",
    );
    expect(recovery?.threshold).toEqual({ operator: "<", value: 4 });
    expect(recovery?.status).toBe("passed");
  });
});

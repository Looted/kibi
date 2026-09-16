// implements REQ-kibi-telemetry-acceptance
import { afterEach, describe, expect, test } from "bun:test";
import { buildTelemetryRemediationReport } from "../../src/public/telemetry-remediation.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

const NOW = new Date("2026-08-10T12:00:00.000Z");

function event(
  line: number,
  tool: string,
  extra: Record<string, unknown> = {},
) {
  return {
    timestamp: new Date(NOW.getTime() - (60 - line) * 60_000).toISOString(),
    request_id: `request-${line}`,
    tool,
    status: "success",
    telemetry_status: "provided",
    telemetry: {
      is_autonomous: true,
      session_id: "session-a",
      actor_id: "actor-a",
    },
    session_id: "session-a",
    actor_id: "actor-a",
    business_args: {},
    ...extra,
  };
}

describe("telemetry-remediation remaining freshness and age-window branches", () => {
  test("emits evidence_freshness when the window has no current timestamps", () => {
    restores.push(isolateKibiEnv());
    const events = Array.from({ length: 20 }, (_, index) => ({
      tool: "kb_status",
      status: "success",
      telemetry_status: "provided",
      telemetry: { is_autonomous: true },
      request_id: `stale-${index}`,
    }));
    const report = buildTelemetryRemediationReport(events, NOW);
    expect(
      report.items.find((item) => item.metric === "evidence_freshness"),
    ).toMatchObject({
      scope: "report",
      target: ".kb/usage.log",
    });
  });

  test("evaluates withinAge against a compatible but expired preflight", () => {
    restores.push(isolateKibiEnv());
    const payload = {
      type: "req",
      id: "REQ-AGE",
      properties: { title: "Age", status: "open" },
    };
    const events = Array.from({ length: 20 }, (_, index) =>
      event(index + 1, "kb_status"),
    );
    events.push(
      event(21, "kb_validate_upsert", {
        timestamp: new Date(NOW.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        validation_valid: true,
        mutation_fingerprint: "same-payload",
        business_args: payload,
      }),
      event(22, "kb_upsert", {
        timestamp: NOW.toISOString(),
        mutation_fingerprint: "same-payload",
        business_args: payload,
      }),
    );
    const report = buildTelemetryRemediationReport(events, NOW);
    expect(
      report.items.find(
        (item) =>
          item.metric === "validation_before_upsert" &&
          item.event?.logLine === 22,
      ),
    ).toBeDefined();
  });
});

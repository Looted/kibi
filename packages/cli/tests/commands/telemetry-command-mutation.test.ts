import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import * as telemetry from "kibi-agent-core/usage-telemetry";
import { telemetryCommand } from "../../src/commands/telemetry.js";

const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];
let preferences: unknown[][] = [];
let statusEnvs: unknown[] = [];
let hostEnvs: unknown[] = [];
let status: telemetry.TelemetryStatus;
let host: string | undefined;

beforeEach(() => {
  logs = [];
  errors = [];
  preferences = [];
  statusEnvs = [];
  hostEnvs = [];
  host = "cursor";
  status = {
    enabled: true,
    reason: "default",
    directory: "/telemetry/dir",
    channel: "release",
    channelSource: "installed",
  };
  const spies = [
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
    spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    }),
    spyOn(telemetry, "setTelemetryPreference").mockImplementation(((
      ...args: unknown[]
    ) => {
      preferences.push(args);
    }) as never),
    spyOn(telemetry, "telemetryStatus").mockImplementation(((env: unknown) => {
      statusEnvs.push(env);
      return status;
    }) as never),
    spyOn(telemetry, "detectTelemetryHost").mockImplementation(((
      env: unknown,
    ) => {
      hostEnvs.push(env);
      return host;
    }) as never),
  ];
  for (const spy of spies) restores.push(() => spy.mockRestore());
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

describe("telemetryCommand", () => {
  test("refuses an unknown action without touching the preference", async () => {
    const env = { A: "1" };
    expect(await telemetryCommand("toggle", {}, env)).toStrictEqual({
      exitCode: 1,
    });
    expect(errors).toStrictEqual([
      'Error: unknown telemetry action "toggle"; use status, enable or disable',
    ]);
    expect(preferences).toStrictEqual([]);
    expect(statusEnvs).toStrictEqual([]);
    expect(logs).toStrictEqual([]);
  });

  test("shows the status in words by default", async () => {
    const env = { B: "2" };
    expect(await telemetryCommand(undefined, {}, env)).toStrictEqual({
      exitCode: 0,
    });
    expect(preferences).toStrictEqual([]);
    expect(statusEnvs).toStrictEqual([env]);
    expect(hostEnvs).toStrictEqual([env]);
    expect(logs).toStrictEqual([
      "Anonymous usage telemetry is on (default).",
      "Channel: release (Kibi runs from an installed package). Host: cursor (set KIBI_HOST to override).",
      "Settings and queue: /telemetry/dir",
      `What is collected: ${telemetry.TELEMETRY_DOCS_URL}`,
    ]);
  });

  test("names each channel source and an unknown host", async () => {
    host = undefined;
    status = {
      ...status,
      enabled: false,
      reason: "CI",
      channelSource: "checkout",
      channel: "source",
    };
    await telemetryCommand("status", { format: "text" }, {});
    status = { ...status, channelSource: "KIBI_TELEMETRY_CHANNEL" };
    await telemetryCommand("status", {}, {});
    expect(logs.filter((line) => !line.startsWith("Settings"))).toStrictEqual([
      "Anonymous usage telemetry is off (CI).",
      "Channel: source (Kibi runs from a checkout of its own repository). Host: unknown (set KIBI_HOST to override).",
      `What is collected: ${telemetry.TELEMETRY_DOCS_URL}`,
      "Anonymous usage telemetry is off (CI).",
      "Channel: source (set by KIBI_TELEMETRY_CHANNEL). Host: unknown (set KIBI_HOST to override).",
      `What is collected: ${telemetry.TELEMETRY_DOCS_URL}`,
    ]);
  });

  test("enable and disable persist the choice and print JSON", async () => {
    const env = { C: "3" };
    expect(
      await telemetryCommand("enable", { format: "json" }, env),
    ).toStrictEqual({ exitCode: 0 });
    expect(await telemetryCommand("disable", {}, env)).toStrictEqual({
      exitCode: 0,
    });
    expect(preferences).toStrictEqual([
      ["enabled", env],
      ["disabled", env],
    ]);
    expect(logs[0]).toBe(
      JSON.stringify({
        ...status,
        host: "cursor",
        docs: telemetry.TELEMETRY_DOCS_URL,
      }),
    );
    expect(logs).toHaveLength(5);
  });

  test("reads the process environment by default", async () => {
    await telemetryCommand("status");
    expect(statusEnvs).toStrictEqual([process.env]);
    expect(statusEnvs[0]).toBe(process.env);
  });
});

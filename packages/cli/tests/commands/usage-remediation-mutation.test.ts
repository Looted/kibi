import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import {
  renderUsageRemediationReport,
  usageRemediationCommand,
} from "../../src/commands/usage-remediation.js";
import * as acceptance from "../../src/public/telemetry-acceptance.js";
import * as remediation from "../../src/public/telemetry-remediation.js";
import type { TelemetryRemediationReport } from "../../src/public/telemetry-remediation.js";
import {
  createTempDir,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];

beforeEach(() => {
  logs = [];
  errors = [];
  const spies = [
    spyOn(console, "log").mockImplementation((...args) => {
      logs.push(args.map(String).join(" "));
    }),
    spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args.map(String).join(" "));
    }),
  ];
  for (const spy of spies) restores.push(() => spy.mockRestore());
});

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

const stripAnsi = stripVTControlCharacters;

function item(rank: number, logLine?: number) {
  return {
    rank,
    metric: `metric_${rank}`,
    target: `target ${rank}`,
    reason: `reason ${rank}`,
    action: `action ${rank}`,
    ...(logLine === undefined ? {} : { event: { logLine } }),
  };
}

function report(count: number): TelemetryRemediationReport {
  return {
    status: "action_required",
    summary: { total: count, eventItems: 2, reportItems: 3 },
    items: Array.from({ length: count }, (_, index) =>
      item(index + 1, index === 0 ? 7 : undefined),
    ),
  } as unknown as TelemetryRemediationReport;
}

const border = (l: string, m: string, r: string) =>
  `${l}${[7, 28, 8, 26, 42, 48].map((w) => "─".repeat(w)).join(m)}${r}`;
const cell = (text: string, width: number) =>
  ` ${text}${" ".repeat(width - 2 - text.length)} `;
const row = (cells: string[]) =>
  `│${cells.map((text, i) => cell(text, [7, 28, 8, 26, 42, 48][i] as number)).join("│")}│`;

describe("renderUsageRemediationReport", () => {
  test("renders the heading and a row per item up to the limit", () => {
    const text = stripAnsi(renderUsageRemediationReport(report(2), 2));
    expect(text).toBe(
      [
        "Telemetry remediation: action_required (2 event, 3 report-level)",
        border("┌", "┬", "┐"),
        row(["Rank", "Metric", "Line", "Target", "Reason", "Repair"]),
        border("├", "┼", "┤"),
        row(["1", "metric_1", "7", "target 1", "reason 1", "action 1"]),
        border("├", "┼", "┤"),
        row(["2", "metric_2", "report", "target 2", "reason 2", "action 2"]),
        border("└", "┴", "┘"),
      ].join("\n"),
    );
  });

  test("names how many items the limit hid", () => {
    const text = stripAnsi(renderUsageRemediationReport(report(3), 1));
    const lines = text.split("\n");
    expect(lines).toHaveLength(7);
    expect(lines[4]).toBe(
      row(["1", "metric_1", "7", "target 1", "reason 1", "action 1"]),
    );
    expect(lines[6]).toBe("Showing 1/3 remediation items.");
  });

  test("wraps long cells inside their column", () => {
    const long = report(1);
    (long.items[0] as { reason: string }).reason = `${"a ".repeat(30)}end`;
    const text = stripAnsi(renderUsageRemediationReport(long, 5));
    expect(text.split("\n").length).toBe(7);
    expect(text).toContain("end");
  });
});

describe("usageRemediationCommand", () => {
  let root: string;
  beforeEach(() => {
    root = createTempDir("kibi-remediation-");
    restores.push(() => removeTempDir(root));
  });

  function writeLog(contents: string) {
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    writeFileSync(path.join(root, ".kb", "usage.log"), contents);
  }

  test("refuses a bad limit or format before reading the log", async () => {
    for (const limit of ["0", "-1", "abc"]) {
      expect(await usageRemediationCommand({ limit })).toStrictEqual({
        exitCode: 1,
      });
    }
    expect(
      await usageRemediationCommand({ format: "yaml" as never }),
    ).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "Error: --limit must be a positive integer",
      "Error: --limit must be a positive integer",
      "Error: --limit must be a positive integer",
      "Error: --format must be json or table",
    ]);
  });

  test("refuses a workspace without a usage log", async () => {
    const result = await withCwd(root, () => usageRemediationCommand({}));
    expect(result).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      `Error: usage log not found at ${path.join(process.cwd(), ".kb", "usage.log")}`.replace(
        process.cwd(),
        root,
      ),
    ]);
  });

  test("builds the report from the log and prints it", async () => {
    writeLog("log contents");
    const parsed = [{ event: 1 }];
    const contents: string[] = [];
    const built: unknown[] = [];
    const parseSpy = spyOn(
      acceptance,
      "parseTelemetryUsageLog",
    ).mockImplementation(((text: string) => {
      contents.push(text);
      return parsed;
    }) as never);
    const buildSpy = spyOn(
      remediation,
      "buildTelemetryRemediationReport",
    ).mockImplementation(((events: unknown) => {
      built.push(events);
      return report(3);
    }) as never);
    restores.push(
      () => parseSpy.mockRestore(),
      () => buildSpy.mockRestore(),
    );
    const runs = await withCwd(root, async () => [
      await usageRemediationCommand({ format: "json" }),
      await usageRemediationCommand({ format: "table", limit: "2" }),
      await usageRemediationCommand({}),
      await usageRemediationCommand({ limit: "1" }),
    ]);
    expect(runs).toStrictEqual([undefined, undefined, undefined, undefined]);
    expect(contents).toStrictEqual(Array(4).fill("log contents"));
    expect(built).toStrictEqual([parsed, parsed, parsed, parsed]);
    expect(built[0]).toBe(parsed);
    expect(logs[0]).toBe(JSON.stringify(report(3), null, 2));
    expect(logs[1]).toBe(renderUsageRemediationReport(report(3), 2));
    expect(logs[2]).toBe(renderUsageRemediationReport(report(3), 50));
    expect(logs[3]).toBe(renderUsageRemediationReport(report(3), 1));
    expect(errors).toStrictEqual([]);
  });

  test("defaults the limit to fifty items", async () => {
    writeLog("");
    const buildSpy = spyOn(
      remediation,
      "buildTelemetryRemediationReport",
    ).mockImplementation((() => report(51)) as never);
    restores.push(() => buildSpy.mockRestore());
    await withCwd(root, () => usageRemediationCommand({}));
    expect(
      stripAnsi(logs[0] ?? "").endsWith("Showing 50/51 remediation items."),
    ).toBe(true);
  });
});

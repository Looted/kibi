// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import { registerMaintenanceCommands } from "../src/cli-register-maintenance.js";
import * as branch from "../src/commands/branch.js";
import * as doctor from "../src/commands/doctor.js";
import * as engine from "../src/commands/engine.js";
import * as gc from "../src/commands/gc.js";
import * as mergeDriver from "../src/commands/merge-driver.js";
import * as telemetry from "../src/commands/telemetry.js";
import * as usageMetrics from "../src/commands/usage-metrics.js";
import * as usageRemediation from "../src/commands/usage-remediation.js";
import {
  goldenSurface,
  plainCalls,
  programWith,
  stubExports,
} from "./helpers/command-surface.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

function stub(
  module: Record<string, unknown>,
  name: string,
  result: unknown = undefined,
) {
  const stubbed = stubExports(module, [name], result);
  restores.push(stubbed.restore);
  return stubbed.spies[name] as Parameters<typeof plainCalls>[0];
}

const run = (...args: string[]) =>
  programWith(registerMaintenanceCommands).parseAsync(args, { from: "user" });

describe("registerMaintenanceCommands", () => {
  test("registers the documented command surface", () => {
    const { actual, expected } = goldenSurface(
      "maintenance",
      registerMaintenanceCommands,
    );
    expect(actual).toStrictEqual(expected);
  });

  test("engine and storage subcommands run their implementations", async () => {
    const spies = Object.fromEntries(
      [
        "engineStatusCommand",
        "engineStopCommand",
        "engineJanitorCommand",
        "storageStatusCommand",
        "storageCompactCommand",
        "storageExportCommand",
      ].map((name) => [name, stub(engine, name)]),
    );
    await run("engine", "status");
    await run("engine", "stop");
    await run("engine", "janitor");
    await run("engine", "janitor", "--all", "--apply", "--format", "json");
    await run("storage", "status");
    await run("storage", "compact");
    await run("storage", "export", "--output", "out");
    expect(
      Object.fromEntries(
        Object.entries(spies).map(([name, spy]) => [name, plainCalls(spy)]),
      ),
    ).toStrictEqual({
      engineStatusCommand: [[]],
      engineStopCommand: [[]],
      engineJanitorCommand: [
        [{ all: false, apply: false, format: "table" }],
        [{ all: true, apply: true, format: "json" }],
      ],
      storageStatusCommand: [[]],
      storageCompactCommand: [[]],
      storageExportCommand: [[{ output: "out" }]],
    });
  });

  test("gc maps its flags to the collector options", async () => {
    const gcSpy = stub(gc, "gcCommand");
    await run("gc");
    await run("gc", "--force", "--purge", "--retention-days", "7");
    expect(plainCalls(gcSpy)).toStrictEqual([
      [
        {
          dryRun: true,
          force: undefined,
          purge: undefined,
          retentionDays: 30,
        },
      ],
      [{ dryRun: false, force: true, purge: true, retentionDays: 7 }],
    ]);
  });

  test("exit-code commands pass their arguments and set the exit code", async () => {
    const cases: Array<[Record<string, unknown>, string, string[], unknown[]]> =
      [
        [doctor, "doctorCommand", ["doctor"], [{ format: "table" }]],
        [
          usageMetrics,
          "usageMetricsCommand",
          ["usage-metrics", "--require-acceptance"],
          [{ format: "table", limit: "10", requireAcceptance: true }],
        ],
        [
          usageRemediation,
          "usageRemediationCommand",
          ["usage-remediation"],
          [{ format: "table", limit: "50" }],
        ],
        [
          telemetry,
          "telemetryCommand",
          ["telemetry", "status"],
          ["status", { format: "text" }],
        ],
        [
          mergeDriver,
          "mergeDriverCommand",
          ["merge-driver", "o", "a", "b"],
          ["o", "a", "b"],
        ],
      ];
    for (const [index, [module, name, args, expected]] of cases.entries()) {
      const spy = stub(module, name, { exitCode: 10 + index });
      await run(...args);
      expect(
        plainCalls(spy).map((call) => call.slice(0, expected.length)),
      ).toStrictEqual([expected]);
      expect(process.exitCode).toBe(10 + index);
    }
  });

  test("branch dispatches each action and refuses unknown ones", async () => {
    const spies = Object.fromEntries(
      [
        "branchEnsureCommand",
        "branchMigrateCommand",
        "branchRecoverCommand",
        "branchRestoreCommand",
      ].map((name) => [name, stub(branch, name)]),
    );
    await run("branch", "ensure");
    await run("branch", "migrate", "--to", "main", "--apply");
    await run("branch", "recover", "--recover-journal", "j1");
    await run("branch", "restore", "--branch", "b");
    await expect(run("branch", "bogus")).rejects.toThrow(
      new Error("Unknown branch action 'bogus'"),
    );
    expect(
      Object.fromEntries(
        Object.entries(spies).map(([name, spy]) => [name, plainCalls(spy)]),
      ),
    ).toStrictEqual({
      branchEnsureCommand: [[{}]],
      branchMigrateCommand: [[{ to: "main", apply: true }]],
      branchRecoverCommand: [[{ recoverJournal: "j1" }]],
      branchRestoreCommand: [[{ branch: "b" }]],
    });
  });
});

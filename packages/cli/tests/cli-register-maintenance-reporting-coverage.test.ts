// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { Command } from "commander";
import { registerMaintenanceCommands } from "../src/cli-register-maintenance.js";
import { registerReportingCommands } from "../src/cli-register-reporting.js";
import * as engine from "../src/commands/engine.js";
import * as gc from "../src/commands/gc.js";
import * as doctor from "../src/commands/doctor.js";
import * as usageMetrics from "../src/commands/usage-metrics.js";
import * as usageRemediation from "../src/commands/usage-remediation.js";
import * as branch from "../src/commands/branch.js";
import * as gaps from "../src/commands/gaps.js";
import * as report from "../src/commands/report.js";
import * as coverage from "../src/commands/coverage.js";
import * as graph from "../src/commands/graph.js";
import * as check from "../src/commands/check.js";
import * as jsonCommand from "../src/cli-json-command.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
});

describe("maintenance and reporting command registration", () => {
  test("maintenance actions dispatch to engine, gc, doctor, usage, and branch commands", async () => {
    const spies = [
      spyOn(engine, "engineStatusCommand").mockResolvedValue(undefined as never),
      spyOn(engine, "engineStopCommand").mockResolvedValue(undefined as never),
      spyOn(engine, "storageStatusCommand").mockResolvedValue(undefined as never),
      spyOn(engine, "storageCompactCommand").mockResolvedValue(undefined as never),
      spyOn(engine, "storageExportCommand").mockResolvedValue(undefined as never),
      spyOn(gc, "gcCommand").mockResolvedValue(undefined as never),
      spyOn(doctor, "doctorCommand").mockResolvedValue({ exitCode: 0 }),
      spyOn(usageMetrics, "usageMetricsCommand").mockResolvedValue({
        exitCode: 0,
      }),
      spyOn(usageRemediation, "usageRemediationCommand").mockResolvedValue({
        exitCode: 0,
      }),
      spyOn(branch, "branchEnsureCommand").mockResolvedValue(undefined as never),
      spyOn(branch, "branchMigrateCommand").mockResolvedValue(undefined as never),
      spyOn(branch, "branchRecoverCommand").mockResolvedValue(undefined as never),
      spyOn(branch, "branchRestoreCommand").mockResolvedValue(undefined as never),
    ];
    restores.push(() => {
      for (const spy of spies) spy.mockRestore();
    });

    const parse = async (...args: string[]) => {
      const program = new Command();
      program.exitOverride();
      registerMaintenanceCommands(program);
      return program.parseAsync(args, { from: "user" });
    };

    await parse("engine", "status");
    await parse("engine", "stop");
    await parse("storage", "status");
    await parse("storage", "compact");
    await parse("storage", "export", "--output", "/tmp/out");
    await parse("gc", "--force", "--purge", "--retention-days", "7");
    await parse("doctor", "--format", "json");
    await parse("usage-metrics", "--require-acceptance");
    await parse("usage-remediation");
    await parse("branch", "ensure");
    await parse("branch", "migrate", "--from", "main", "--to", "main");
    await parse("branch", "recover", "--recover-journal", "j1");
    await parse("branch", "restore", "--branch", "main");
    await expect(parse("branch", "nope")).rejects.toThrow(/Unknown branch action/);
  });

  test("reporting actions take human and JSON input paths", async () => {
    const spies = [
      spyOn(gaps, "gapsCommand").mockResolvedValue(undefined as never),
      spyOn(report, "reportCommand").mockResolvedValue(undefined as never),
      spyOn(coverage, "coverageCommand").mockResolvedValue(undefined as never),
      spyOn(graph, "graphCommand").mockResolvedValue(undefined as never),
      spyOn(check, "checkCommand").mockResolvedValue({ exitCode: 0 }),
      spyOn(jsonCommand, "runJsonInvocation").mockResolvedValue(undefined),
    ];
    restores.push(() => {
      for (const spy of spies) spy.mockRestore();
    });

    const parse = async (...args: string[]) => {
      const program = new Command();
      program.exitOverride();
      registerReportingCommands(program);
      return program.parseAsync(args, { from: "user" });
    };

    await parse("find-gaps", "req");
    await parse("find-gaps", "req", "--input", "-");
    await parse("report", "--output", "kibi-report");
    await parse("coverage");
    await parse("coverage", "--input", "-");
    await parse("graph", "--from", "REQ-1");
    await parse("graph", "--input", "-");
    await parse("check");
    await parse("check", "--input", "-");
    expect(jsonCommand.runJsonInvocation).toHaveBeenCalled();
  });
});

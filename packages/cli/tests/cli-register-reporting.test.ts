import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as jsonCommand from "../src/cli-json-command.js";
import { registerReportingCommands } from "../src/cli-register-reporting.js";
import * as checkCertificates from "../src/commands/check-certificates.js";
import * as checkDiff from "../src/commands/check-diff.js";
import * as checkGenerated from "../src/commands/check-generated.js";
import * as check from "../src/commands/check.js";
import * as coverage from "../src/commands/coverage.js";
import * as gaps from "../src/commands/gaps.js";
import * as graph from "../src/commands/graph.js";
import * as report from "../src/commands/report.js";
import * as signoff from "../src/commands/signoff.js";
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
  programWith(registerReportingCommands).parseAsync(args, { from: "user" });

describe("registerReportingCommands", () => {
  test("registers the documented command surface", () => {
    const { actual, expected } = goldenSurface(
      "reporting",
      registerReportingCommands,
    );
    expect(actual).toStrictEqual(expected);
  });

  test("check-generated and check-diff set the exit code", async () => {
    const generated = stub(checkGenerated, "checkGeneratedManifests", {
      exitCode: 3,
    });
    await run("check-generated", "--staged", "--changed-only");
    expect(plainCalls(generated)).toStrictEqual([
      [{ staged: true, changedOnly: true }],
    ]);
    expect(process.exitCode).toBe(3);
    const diff = stub(checkDiff, "checkDiffCommand", { exitCode: 4 });
    await run("check-diff");
    expect(diff.mock.calls.length).toBe(1);
    expect(process.exitCode).toBe(4);
  });

  test("report and signoff pass their options", async () => {
    const reportSpy = stub(report, "reportCommand");
    const signoffSpy = stub(signoff, "signoffCommand");
    await run("report");
    await run("signoff", "--staged");
    expect(plainCalls(reportSpy)).toStrictEqual([
      [{ output: "kibi-report", open: false, limit: "10000" }],
    ]);
    expect(plainCalls(signoffSpy)).toStrictEqual([
      [{ staged: true, open: false, proof: true }],
    ]);
  });

  test("find-gaps, coverage and graph take the human path or the JSON route", async () => {
    const gapsSpy = stub(gaps, "gapsCommand");
    const coverageSpy = stub(coverage, "coverageCommand");
    const graphSpy = stub(graph, "graphCommand");
    const json = stub(jsonCommand, "runJsonInvocation");
    await run("gaps", "req");
    await run("find-gaps", "req", "--input", "-");
    await run("coverage");
    await run("coverage", "--input", "-");
    await run("graph");
    await run("graph", "--input", "g.json");
    expect(plainCalls(gapsSpy)).toStrictEqual([
      ["req", { limit: "100", offset: "0", format: "table" }],
    ]);
    expect(coverageSpy.mock.calls.length).toBe(1);
    expect(graphSpy.mock.calls.length).toBe(1);
    expect(plainCalls(json)).toStrictEqual([
      [
        {
          operationName: "kb_find_gaps",
          inputPath: "-",
          command: "<command find-gaps>",
          positionals: [{ name: "type", value: "req" }],
        },
      ],
      [
        {
          operationName: "kb_coverage",
          inputPath: "-",
          command: "<command coverage>",
        },
      ],
      [
        {
          operationName: "kb_graph",
          inputPath: "g.json",
          command: "<command graph>",
        },
      ],
    ]);
  });
});

describe("kibi check", () => {
  test("--input takes the JSON route and leaves the exit code", async () => {
    const checkSpy = stub(check, "checkCommand", { exitCode: 9 });
    const json = stub(jsonCommand, "runJsonInvocation");
    await run("check", "--input", "-");
    expect(plainCalls(json)).toStrictEqual([
      [
        {
          operationName: "kb_check",
          inputPath: "-",
          command: "<command check>",
        },
      ],
    ]);
    expect(checkSpy.mock.calls.length).toBe(0);
    expect(process.exitCode).toBe(0);
  });

  test("runs the check with its options and sets the exit code", async () => {
    const checkSpy = stub(check, "checkCommand", { exitCode: 2 });
    const write = stub(checkCertificates, "writeCertificates");
    await run("check", "--rules", "a,b");
    await run("check", "--staged");
    expect(plainCalls(checkSpy)).toStrictEqual([
      [{ rules: "a,b", minLinks: "1", format: "text" }],
      [{ staged: true, minLinks: "1", format: "text" }],
    ]);
    expect(write.mock.calls.length).toBe(0);
    expect(process.exitCode).toBe(2);
  });

  test("--write-certificates saves the bundle after the check", async () => {
    const checkSpy = stub(check, "checkCommand", { exitCode: 0 });
    const write = stub(checkCertificates, "writeCertificates", {
      certificates: 12,
      path: "/abs/bundle.json",
    });
    const stderr: string[] = [];
    const spy = spyOn(process.stderr, "write").mockImplementation(
      (chunk: unknown) => {
        stderr.push(String(chunk));
        return true;
      },
    );
    try {
      await run("check", "--write-certificates", "bundle.json");
    } finally {
      spy.mockRestore();
    }
    expect(plainCalls(checkSpy)).toStrictEqual([
      [{ minLinks: "1", format: "text" }],
    ]);
    expect(plainCalls(write)).toStrictEqual([["bundle.json"]]);
    expect(stderr).toStrictEqual([
      "Saved 12 certificate(s) to /abs/bundle.json\n",
    ]);
  });

  test("--certificates re-checks a saved bundle only", async () => {
    const checkSpy = stub(check, "checkCommand");
    const recheck = stub(checkCertificates, "checkCertificatesCommand", {
      exitCode: 6,
    });
    await run("check", "--certificates", "b.json");
    await run("check", "--certificates", "b.json", "--format", "json");
    expect(plainCalls(recheck)).toStrictEqual([
      [{ certificates: "b.json", json: false }],
      [{ certificates: "b.json", json: true }],
    ]);
    expect(checkSpy.mock.calls.length).toBe(0);
    expect(process.exitCode).toBe(6);
  });

  test("refuses option combinations it cannot honour", async () => {
    const checkSpy = stub(check, "checkCommand");
    const recheck = stub(checkCertificates, "checkCertificatesCommand");
    const certificatesOnly = new Error(
      "check: --certificates only re-checks a saved bundle; it cannot be combined with --write-certificates, --staged or --rules",
    );
    for (const extra of [
      ["--write-certificates", "w.json"],
      ["--staged"],
      ["--rules", "a"],
    ])
      await expect(
        run("check", "--certificates", "b.json", ...extra),
      ).rejects.toThrow(certificatesOnly);
    await expect(
      run("check", "--write-certificates", "w.json", "--staged"),
    ).rejects.toThrow(
      new Error(
        "check: --write-certificates saves the full KB's bundle; it cannot be combined with --staged",
      ),
    );
    expect(checkSpy.mock.calls.length).toBe(0);
    expect(recheck.mock.calls.length).toBe(0);
  });
});

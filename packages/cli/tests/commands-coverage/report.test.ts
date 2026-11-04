import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import { EventEmitter } from "node:events";
import { openReport, reportCommand } from "../../src/commands/report.js";
import { coverageSpec } from "../../src/public/operations/specs/reporting.js";
import * as cliRuntime from "../../src/runtime/cli-runtime.js";
import {
  createTempDir,
  removeTempDir,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];

afterEach(() => {
  mock.restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

type Outcome = { status: string; result?: { branch: string }; error?: unknown };

function fakeRuntime(context: Record<string, unknown>): Outcome[] {
  const closed: Outcome[] = [];
  spyOn(cliRuntime, "createCliRuntime").mockImplementation(
    () =>
      ({
        open: async () => context,
        close: async (_context: unknown, outcome: Outcome) => {
          closed.push(outcome);
        },
      }) as never,
  );
  return closed;
}

function stubCoverage(meta?: Record<string, unknown>, structured = true) {
  const inputs: Array<Record<string, unknown>> = [];
  spyOn(coverageSpec, "execute").mockImplementation((async (
    input: Record<string, unknown>,
  ) => {
    inputs.push(input);
    return {
      content: [],
      structuredContent: structured
        ? { summary: { total: 0 }, rows: [], ...(meta ? { meta } : {}) }
        : undefined,
    };
  }) as never);
  return inputs;
}

async function run() {
  const root = createTempDir("kibi-report-");
  roots.push(root);
  spyOn(console, "log").mockImplementation(() => undefined);
  return reportCommand(
    { tag: "core", limit: "5" },
    {
      cwd: () => root,
      now: () => new Date("2026-01-01T00:00:00Z"),
      repository: {} as never,
    },
  );
}

describe("reportCommand default coverage loading", () => {
  test("loads requirement and symbol coverage through the runtime", async () => {
    const closed = fakeRuntime({ branchAttachment: { gitBranch: "feature" } });
    const inputs = stubCoverage({ branch: "ignored" });
    await run();
    expect(inputs).toStrictEqual([
      {
        by: "req",
        tags: ["core"],
        includePassing: true,
        includeTransitive: true,
        limit: 5,
        offset: 0,
      },
      {
        by: "symbol",
        tags: ["core"],
        includePassing: false,
        includeTransitive: true,
        limit: 0,
        offset: 0,
      },
    ]);
    expect(closed.map((outcome) => outcome.status)).toStrictEqual(["success"]);
    expect(closed[0]?.result?.branch).toBe("feature");
  });

  test("falls back to the report's branch and then to unknown", async () => {
    let closed = fakeRuntime({});
    stubCoverage({ branch: "develop" });
    await run();
    expect(closed[0]?.result?.branch).toBe("develop");
    mock.restore();
    closed = fakeRuntime({});
    stubCoverage();
    await run();
    expect(closed[0]?.result?.branch).toBe("unknown");
  });

  test("closes with the error when coverage has no structured data", async () => {
    const closed = fakeRuntime({});
    stubCoverage(undefined, false);
    await expect(run()).rejects.toThrow(
      "Coverage did not return structured report data",
    );
    expect(closed.map((outcome) => outcome.status)).toStrictEqual(["error"]);
  });
});

describe("openReport", () => {
  test("times out when the opener never starts", async () => {
    const child = Object.assign(new EventEmitter(), {
      unref: () => {
        throw new Error("never spawned");
      },
    });
    spyOn(childProcess, "spawn").mockReturnValue(child as never);
    spyOn(globalThis, "setTimeout").mockImplementation(((
      callback: () => void,
    ) => {
      callback();
      return 0;
    }) as never);
    await expect(openReport("/tmp/report.html")).rejects.toThrow(
      /^Timed out opening report via /,
    );
  });
});

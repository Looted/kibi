import { afterEach, describe, expect, spyOn, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as core from "kibi-agent-core/usage-telemetry";

import * as diagnostics from "../src/diagnostics.js";
import {
  flushMcpTelemetry,
  recordMcpToolTelemetry,
  startMcpTelemetry,
} from "../src/usage-telemetry.js";
import { resolveWorkspaceRoot } from "../src/workspace.js";
import { restoreProcessEnv } from "./helpers/process-env.js";

const spies: { mockRestore: () => void }[] = [];
const savedEnv = { ...process.env };
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  restoreProcessEnv(savedEnv);
});

function captureRecords() {
  const record = spyOn(core, "recordOperationTelemetry").mockImplementation(
    () => undefined,
  );
  spies.push(record);
  return record;
}

describe("recordMcpToolTelemetry, exact", () => {
  test("the source names the package, host and workspace", () => {
    const record = captureRecords();
    const version = diagnostics.readMcpPackageVersion();
    const read = spyOn(diagnostics, "readMcpPackageVersion");
    spies.push(read);
    spies.push(spyOn(core, "detectTelemetryHost").mockReturnValue(undefined));
    for (const key of ["KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
      Reflect.deleteProperty(process.env, key);
    }
    // A routed child inherits the launcher's attach root; its pin wins.
    process.env.KIBI_MCP_ATTACH_ROOT = "/attach";
    process.env.KIBI_WORKSPACE = "/workspace";
    const call = { operation: "kb_query", startedAt: new Date() } as const;
    recordMcpToolTelemetry({ ...call, status: "success", clientName: "c" });
    expect(read.mock.calls.length).toBeLessThanOrEqual(1);
    const reads = read.mock.calls.length;
    // Unpinned, the served root is resolved from the directory, never the
    // attach variable or the raw start directory.
    Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    recordMcpToolTelemetry({ ...call, status: "success" });
    Reflect.deleteProperty(process.env, "KIBI_MCP_ATTACH_ROOT");
    recordMcpToolTelemetry({ ...call, status: "success" });
    expect(read).toHaveBeenCalledTimes(reads);
    const served = resolveWorkspaceRoot(process.cwd());
    expect(record.mock.calls.map((args) => args[0])).toStrictEqual([
      {
        packageName: "kibi-mcp",
        packageVersion: version,
        host: "c",
        workspaceRoot: "/workspace",
      },
      {
        packageName: "kibi-mcp",
        packageVersion: version,
        host: undefined,
        workspaceRoot: served,
      },
      {
        packageName: "kibi-mcp",
        packageVersion: version,
        host: undefined,
        workspaceRoot: served,
      },
    ]);
  });

  test("a server started in a subdirectory records its workspace root", () => {
    const record = captureRecords();
    for (const key of ["KIBI_WORKSPACE", "KIBI_PROJECT_ROOT", "KIBI_ROOT"]) {
      Reflect.deleteProperty(process.env, key);
    }
    const root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-telem-root-")),
    );
    const sub = path.join(root, "packages", "app");
    fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
    fs.mkdirSync(sub, { recursive: true });
    const cwd = process.cwd();
    try {
      process.chdir(sub);
      recordMcpToolTelemetry({
        operation: "kb_query",
        startedAt: new Date(),
        status: "success",
      });
    } finally {
      process.chdir(cwd);
      fs.rmSync(root, { recursive: true, force: true });
    }
    expect(record.mock.calls[0]?.[0].workspaceRoot).toBe(root);
  });

  test("the detected host wins over the client name", () => {
    const record = captureRecords();
    spies.push(
      spyOn(core, "detectTelemetryHost").mockReturnValue("claude-code"),
    );
    recordMcpToolTelemetry({
      operation: "kb_query",
      startedAt: new Date(),
      status: "success",
      clientName: "other",
    });
    expect(record.mock.calls[0]?.[0].host).toBe("claude-code");
  });

  test("the event carries the duration and the error category", () => {
    const record = captureRecords();
    const startedAt = new Date(Date.now() - 1000);
    const cases: Array<
      [Parameters<typeof recordMcpToolTelemetry>[0], unknown]
    > = [
      [{ operation: "a", startedAt, status: "success" }, undefined],
      [
        {
          operation: "b",
          startedAt,
          status: "success",
          result: { error: { code: "C" } },
        },
        undefined,
      ],
      [
        {
          operation: "c",
          startedAt,
          status: "error",
          result: { error: { code: "UPSERT_DRY_RUN_INVALID" } },
        },
        "UPSERT_DRY_RUN_INVALID",
      ],
      [{ operation: "d", startedAt, status: "error", result: null }, undefined],
      [{ operation: "e", startedAt, status: "error", result: "x" }, undefined],
      [
        { operation: "f", startedAt, status: "error", result: { error: null } },
        undefined,
      ],
      [
        { operation: "g", startedAt, status: "error", result: { error: "x" } },
        undefined,
      ],
      [
        {
          operation: "h",
          startedAt,
          status: "error",
          result: { error: { code: 5 } },
        },
        undefined,
      ],
      [
        {
          operation: "i",
          startedAt,
          status: "error",
          error: new Error("query failed"),
          result: { error: { code: "IGNORED" } },
        },
        "prolog_query_failed",
      ],
    ];
    for (const [input] of cases) recordMcpToolTelemetry(input);
    const events = record.mock.calls.map((args) => args[1]);
    expect(events.map((event) => event.errorCategory as unknown)).toStrictEqual(
      cases.map(([, category]) => category),
    );
    for (const [index, event] of events.entries()) {
      const input = cases[index]?.[0];
      expect(event.interface).toBe("mcp");
      expect(event.operation).toBe(input?.operation ?? "");
      expect(event.status).toBe(input?.status ?? "success");
      expect(event.durationMs).toBeGreaterThanOrEqual(1000);
      expect(event.durationMs).toBeLessThan(60_000);
    }
  });
});

describe("startMcpTelemetry and flushMcpTelemetry", () => {
  test("the notice is shown once and the queue is sent every minute", async () => {
    const flush = spyOn(core, "flushTelemetry").mockResolvedValue(
      undefined as never,
    );
    spies.push(flush);
    const write = spyOn(process.stderr, "write").mockImplementation(() => true);
    spies.push(write);
    const unref = { unref: () => undefined };
    const unrefSpy = spyOn(unref, "unref");
    let tick: (() => void) | undefined;
    const interval = spyOn(globalThis, "setInterval").mockImplementation(((
      callback: () => void,
    ) => {
      tick = callback;
      return unref;
    }) as never);
    spies.push(interval);
    for (const notice of ["Telemetry is on.", null, ""]) {
      const take = spyOn(core, "takeTelemetryNotice").mockReturnValue(
        notice as never,
      );
      startMcpTelemetry();
      take.mockRestore();
    }
    expect(write.mock.calls).toStrictEqual([["[KIBI-MCP] Telemetry is on.\n"]]);
    expect(interval.mock.calls.map((call) => call[1])).toStrictEqual([
      60_000, 60_000, 60_000,
    ]);
    expect(unrefSpy).toHaveBeenCalledTimes(3);
    expect(flush).not.toHaveBeenCalled();
    tick?.();
    expect(flush.mock.calls).toStrictEqual([[]]);
    await flushMcpTelemetry();
    expect(flush.mock.calls[1]).toStrictEqual([{ force: true }]);
  });
});

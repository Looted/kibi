import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import * as engine from "../src/engine.js";
import { runEngineDaemonCli } from "../src/engine-daemon.js";

const roots: string[] = [];
const initialExitCode = process.exitCode;

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  process.exitCode = initialExitCode ?? 0;
});

describe("runEngineDaemonCli", () => {
  test("records missing required arguments and writes a socket error file", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-daemon-cli-"));
    roots.push(root);
    const socketPath = path.join(root, "engine.sock");
    const previousExit = process.exitCode;
    const errors: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation(
      (...args: unknown[]) => {
        errors.push(args.map(String).join(" "));
      },
    );

    await runEngineDaemonCli(["--socket", socketPath]);

    errorSpy.mockRestore();
    expect(process.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Missing --workspace argument");
    expect(readFileSync(`${socketPath}.error`, "utf8")).toContain(
      "Missing --workspace argument",
    );
    process.exitCode = previousExit;
  });

  test("forwards parsed arguments to runEngineDaemon", async () => {
    const calls: Array<Record<string, string>> = [];
    const daemonSpy = spyOn(engine, "runEngineDaemon").mockImplementation(
      async (options) => {
        calls.push({
          workspaceRoot: options.workspaceRoot,
          branch: options.branch,
          socketPath: options.socketPath,
        });
      },
    );
    const previousExit = process.exitCode;
    process.exitCode = 0;

    await runEngineDaemonCli([
      "--workspace",
      "/tmp/kibi-ws",
      "--branch",
      "main",
      "--socket",
      "/tmp/kibi.sock",
    ]);

    daemonSpy.mockRestore();
    expect(calls).toEqual([
      {
        workspaceRoot: "/tmp/kibi-ws",
        branch: "main",
        socketPath: "/tmp/kibi.sock",
      },
    ]);
    expect(process.exitCode ?? 0).toBe(0);
    process.exitCode = previousExit;
  });

  test("swallows diagnostic write failures when the socket directory is gone", async () => {
    const daemonSpy = spyOn(engine, "runEngineDaemon").mockRejectedValue(
      new Error("daemon boom"),
    );
    const previousExit = process.exitCode;
    const errorSpy = spyOn(console, "error").mockImplementation(() => undefined);

    await runEngineDaemonCli([
      "--workspace",
      "/tmp/kibi-ws",
      "--branch",
      "main",
      "--socket",
      path.join("/no/such/engine-dir", "engine.sock"),
    ]);

    daemonSpy.mockRestore();
    errorSpy.mockRestore();
    expect(process.exitCode).toBe(1);
    expect(
      existsSync(path.join("/no/such/engine-dir", "engine.sock.error")),
    ).toBe(false);
    process.exitCode = previousExit;
  });

  test("stringifies non-Error failures", async () => {
    const daemonSpy = spyOn(engine, "runEngineDaemon").mockRejectedValue(
      "raw failure",
    );
    const previousExit = process.exitCode;
    const errors: string[] = [];
    const errorSpy = spyOn(console, "error").mockImplementation(
      (...args: unknown[]) => {
        errors.push(args.map(String).join(" "));
      },
    );

    await runEngineDaemonCli([
      "--workspace",
      "/tmp/kibi-ws",
      "--branch",
      "",
      "--socket",
    ]);

    daemonSpy.mockRestore();
    errorSpy.mockRestore();
    expect(errors.join("\n")).toContain("Missing --branch argument");
    expect(process.exitCode).toBe(1);
    process.exitCode = previousExit;
  });
});

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as url from "node:url";
import { pathToFileURL } from "node:url";
import {
  isEngineDaemonEntrypoint,
  runEngineDaemonCli,
  runEngineDaemonIfEntrypoint,
} from "../src/engine-daemon.js";
import * as engine from "../src/engine.js";

const moduleUrl = new URL("../src/engine-daemon.ts", import.meta.url).href;
const initialCwd = process.cwd();
const initialArgv = process.argv;
const initialExitCode = process.exitCode;
let sandbox = "";

// A wrong socket path would land in the working directory, so use a sandbox.
beforeEach(() => {
  sandbox = mkdtempSync(path.join(tmpdir(), "kibi-daemon-mut-"));
  process.chdir(sandbox);
});

afterEach(() => {
  mock.restore();
  process.chdir(initialCwd);
  process.argv = initialArgv;
  process.exitCode = initialExitCode ?? 0;
  rmSync(sandbox, { recursive: true, force: true });
});

function quietErrors(): string[] {
  const errors: string[] = [];
  spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });
  return errors;
}

function recordDaemon(): unknown[] {
  const calls: unknown[] = [];
  spyOn(engine, "runEngineDaemon").mockImplementation(async (options) => {
    calls.push(options);
  });
  return calls;
}

describe("isEngineDaemonEntrypoint", () => {
  test("trusts import.meta.main only for this module", () => {
    expect(isEngineDaemonEntrypoint([], moduleUrl, true)).toBe(true);
    expect(isEngineDaemonEntrypoint([], `${moduleUrl}x`, true)).toBe(false);
  });

  test("compares the resolved entry script otherwise", () => {
    const script = path.join(sandbox, "daemon.js");
    const url = pathToFileURL(script).href;
    expect(isEngineDaemonEntrypoint(["node", script], url, false)).toBe(true);
    expect(isEngineDaemonEntrypoint(["node", "daemon.js"], url, false)).toBe(
      true,
    );
    expect(isEngineDaemonEntrypoint(["node", "other.js"], url, false)).toBe(
      false,
    );
    const cwdUrl = pathToFileURL(process.cwd()).href;
    expect(isEngineDaemonEntrypoint(["node", ""], cwdUrl, false)).toBe(false);
    expect(isEngineDaemonEntrypoint(["node"], cwdUrl, false)).toBe(false);
  });

  test("rejects an entry that has no file URL", () => {
    spyOn(url, "pathToFileURL").mockImplementation(() => {
      throw new Error("no url");
    });
    expect(isEngineDaemonEntrypoint(["node", "a.js"], moduleUrl, false)).toBe(
      false,
    );
  });
});

describe("runEngineDaemonCli", () => {
  test("reads the process arguments after the script by default", async () => {
    const calls = recordDaemon();
    process.argv = ["--socket", "s0", "--workspace", "w", "--branch", "b"];
    const errors = quietErrors();
    await runEngineDaemonCli();
    expect(errors).toStrictEqual(["Missing --socket argument"]);
    expect(calls).toStrictEqual([]);
    process.argv = ["node", "daemon", "--workspace", "w", "--branch", "b"];
    process.argv.push("--socket", "s1");
    await runEngineDaemonCli();
    expect(calls).toStrictEqual([
      { workspaceRoot: "w", branch: "b", socketPath: "s1" },
    ]);
  });

  test("writes a private error file next to the socket", async () => {
    const errors = quietErrors();
    const socket = path.join(sandbox, "engine.sock");
    await runEngineDaemonCli(["--socket", socket]);
    expect(errors).toStrictEqual(["Missing --workspace argument"]);
    expect(process.exitCode).toBe(1);
    expect(readFileSync(`${socket}.error`, "utf8")).toBe(
      "Missing --workspace argument\n",
    );
    expect(statSync(`${socket}.error`).mode & 0o777).toBe(0o600);
  });

  test("keeps the exit code when the error file cannot be written", async () => {
    const errors = quietErrors();
    await runEngineDaemonCli(["--socket", path.join(sandbox, "gone", "s")]);
    expect(errors).toStrictEqual(["Missing --workspace argument"]);
    expect(process.exitCode).toBe(1);
  });

  test("writes no error file without a socket path", async () => {
    const errors = quietErrors();
    await runEngineDaemonCli(["first", "--workspace", "w"]);
    await runEngineDaemonCli(["--workspace", "w", "--branch", "b", "--socket"]);
    await runEngineDaemonCli(["--workspace", "", "--branch", "b"]);
    expect(errors).toStrictEqual([
      "Missing --branch argument",
      "Missing --socket argument",
      "Missing --workspace argument",
    ]);
    expect(readdirSync(sandbox)).toStrictEqual([]);
    expect(existsSync(path.join(sandbox, "undefined.error"))).toBe(false);
  });
});

describe("runEngineDaemonIfEntrypoint", () => {
  test("runs the daemon only for the entrypoint", async () => {
    const calls = recordDaemon();
    process.argv = ["node", "daemon", "--workspace", "w", "--branch", "b"];
    process.argv.push("--socket", "s");
    await runEngineDaemonIfEntrypoint(false);
    expect(calls).toStrictEqual([]);
    await runEngineDaemonIfEntrypoint(true);
    expect(calls).toStrictEqual([
      { workspaceRoot: "w", branch: "b", socketPath: "s" },
    ]);
  });
});

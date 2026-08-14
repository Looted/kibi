import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type RunResult = {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
};

function runBin(args: string[], cwd: string, env: Record<string, string> = {}) {
  const binPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("node", [binPath, ...args], {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  return new Promise<RunResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(error);
    };

    const timeoutId = setTimeout(() => {
      proc.kill("SIGKILL");
      fail(new Error(`Timed out after 2000ms: ${args.join(" ")}`));
    }, 2000);

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.once("error", fail);
    proc.once("exit", (code, signal) => {
      finish({ code, signal, stdout, stderr });
    });
  });
}

describe("kibi-mcp help CLI", () => {
  test("launcher ships only the compiled server entrypoint", () => {
    const binPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
    const source = readFileSync(binPath, "utf8");

    expect(source).not.toContain("../src/server.ts");
    expect(source).toContain("../dist/server.js");
  });

  test("--help exits 0 and prints help text instead of hanging", async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-help-"));
    try {
      const result = await runBin(["--help"], cwd);

      expect(result.code).toBe(0);
      expect(result.signal).toBeNull();
      expect(result.stdout).toContain("Usage: kibi-mcp [options]");
      expect(result.stdout).toContain("--diagnostic-mode");
      expect(result.stdout).toContain("-h, --help");
      expect(result.stdout).not.toContain("jsonrpc");
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("-h prints identical output to --help", async () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-help-"));
    try {
      const help = await runBin(["--help"], cwd);
      const shortHelp = await runBin(["-h"], cwd);

      expect(shortHelp.code).toBe(0);
      expect(shortHelp.signal).toBeNull();
      expect(shortHelp.stdout).toBe(help.stdout);
      expect(shortHelp.stderr).toBe(help.stderr);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  test("--help --diagnostic-mode does not create usage.log", async () => {
    const workspace = mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-help-"));
    try {
      const result = await runBin(["--help", "--diagnostic-mode"], workspace, {
        KIBI_WORKSPACE: workspace,
      });

      expect(result.code).toBe(0);
      expect(result.stdout).toContain("Usage: kibi-mcp [options]");
      expect(result.stdout).not.toContain("jsonrpc");
      expect(existsSync(path.join(workspace, ".kb", "usage.log"))).toBe(false);
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
});

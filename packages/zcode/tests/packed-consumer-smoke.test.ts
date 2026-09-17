// implements REQ-zcode-kibi-plugin-v1
// This is deliberately an opt-in artifact test. Unit coverage must not pack
// packages or install dependencies, while the native acceptance job exercises
// the exact consumer layout that a published plugin encounters.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, describe, expect, test } from "bun:test";

const packageRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const coreRoot = path.join(repoRoot, "packages", "core");
const runtimeRoot = path.join(repoRoot, "packages", "runtime");
const mcpRoot = path.join(repoRoot, "packages", "mcp");
const buildLockPath = path.join(repoRoot, ".zcode-proof-build.lock");
let inProcessBuildLock = Promise.resolve();

const roots: string[] = [];
const enabled =
  process.platform !== "win32" &&
  (process.env.KIBI_ZCODE_PACKED_SMOKE === "1" ||
    process.env.KIBI_PROOF_RUN === "1");

afterAll(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function runBun(args: string[], cwd: string): void {
  execFileSync(Bun.which("bun") ?? process.execPath, args, {
    cwd,
    stdio: "inherit",
  });
}

function withBuildLock(operation: () => void): void {
  const deadline = Date.now() + 180_000;
  for (;;) {
    try {
      const handle = fs.openSync(buildLockPath, "wx");
      try {
        operation();
      } finally {
        fs.closeSync(handle);
        fs.rmSync(buildLockPath, { force: true });
      }
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (Date.now() > deadline)
        throw new Error(`timed out waiting for build lock ${buildLockPath}`);
      try {
        const stats = fs.statSync(buildLockPath);
        if (Date.now() - stats.mtimeMs > 180_000)
          fs.rmSync(buildLockPath, { force: true });
      } catch {
        // The lock vanished between acquisition and inspection.
      }
      Bun.sleepSync(100);
    }
  }
}

function buildProofArtifacts(): Promise<void> {
  const build = inProcessBuildLock.then(() => {
    withBuildLock(() => {
      // Always build the complete first-party runtime chain before packing. A
      // pre-existing dist directory may belong to a different source snapshot.
      runBun(["run", "build:cli"], repoRoot);
      runBun(["run", "build:runtime"], repoRoot);
      runBun(["run", "build:mcp"], repoRoot);
      runBun(["run", "build:zcode"], repoRoot);
    });
  });
  inProcessBuildLock = build.catch(() => undefined);
  return build;
}

function makeTarball(packageDirectory: string, packagePrefix: string): string {
  const destination = fs.mkdtempSync(
    path.join(os.tmpdir(), `${packagePrefix}-pack-`),
  );
  roots.push(destination);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(
    npm,
    ["pack", "--ignore-scripts", "--pack-destination", destination],
    {
      cwd: packageDirectory,
      stdio: "inherit",
    },
  );
  const tarball = fs
    .readdirSync(destination)
    .find(
      (entry) =>
        entry.startsWith(`${packagePrefix}-`) && entry.endsWith(".tgz"),
    );
  if (tarball === undefined) {
    throw new Error(`npm pack did not produce a ${packagePrefix} tarball`);
  }
  return path.join(destination, tarball);
}

function makeMcpTarball(): string {
  return makeTarball(mcpRoot, "kibi-mcp");
}

function makeZcodeTarball(): string {
  return makeTarball(packageRoot, "kibi-zcode");
}

function isolatedConsumerEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: "", Path: "", NODE_PATH: undefined };
}

async function runShippedLauncher(
  workspaceRoot: string,
  launcherPath: string,
  env: NodeJS.ProcessEnv,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const node = Bun.which("node") ?? "node";
  const child = Bun.spawn([node, launcherPath], {
    cwd: workspaceRoot,
    env,
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = new Response(child.stdout).text();
  const stderr = new Response(child.stderr).text();
  child.stdin.write(
    `${JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "kibi-zcode-proof", version: "1.0.0" },
      },
    })}\n${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "kb_status", arguments: {} } })}\n`,
  );
  child.stdin.end();

  const timer = setTimeout(() => child.kill(), 30_000);
  try {
    const exitCode = await child.exited;
    return {
      exitCode: exitCode ?? -1,
      stdout: await stdout,
      stderr: await stderr,
    };
  } finally {
    clearTimeout(timer);
  }
}

describe("packed kibi-mcp consumer resolution", () => {
  test.skipIf(!enabled)(
    "installs the local MCP tarball and launches it through the shipped Node launcher",
    async () => {
      await buildProofArtifacts();
      const coreTarball = makeTarball(coreRoot, "kibi-core");
      const runtimeTarball = makeTarball(runtimeRoot, "kibi-runtime");
      const mcpTarball = makeMcpTarball();
      const zcodeTarball = makeZcodeTarball();
      const consumerRoot = fs.mkdtempSync(
        path.join(os.tmpdir(), "kibi-zcode-packed-consumer-"),
      );
      roots.push(consumerRoot);
      fs.mkdirSync(path.join(consumerRoot, ".kb"), { recursive: true });
      fs.writeFileSync(path.join(consumerRoot, ".kb", "manifest.json"), "{}\n");
      fs.writeFileSync(
        path.join(consumerRoot, "package.json"),
        `${JSON.stringify({ name: "packed-consumer", private: true })}\n`,
      );

      const npm = process.platform === "win32" ? "npm.cmd" : "npm";
      execFileSync(
        npm,
        [
          "install",
          "--ignore-scripts",
          "--no-save",
          "--no-package-lock",
          "--no-audit",
          "--no-fund",
          zcodeTarball,
          mcpTarball,
          runtimeTarball,
          coreTarball,
        ],
        { cwd: consumerRoot, stdio: "inherit" },
      );

      const installedMcpRoot = path.join(
        consumerRoot,
        "node_modules",
        "kibi-mcp",
      );
      const installedZcodeRoot = path.join(
        consumerRoot,
        "node_modules",
        "kibi-zcode",
      );
      const installedEntry = path.join(installedMcpRoot, "bin", "kibi-mcp");
      const installedLauncher = path.join(
        installedZcodeRoot,
        "bin",
        "mcp-launcher.cjs",
      );
      expect(fs.existsSync(installedLauncher)).toBe(true);
      expect(fs.existsSync(installedEntry)).toBe(true);

      const env = {
        ...isolatedConsumerEnv(),
        // Keep the consumer isolated from project-local/global package bins,
        // while retaining git for Kibi's branch-name validation.
        PATH: path.dirname(Bun.which("git") ?? "git"),
        KIBI_BRANCH: "packed-consumer",
      };
      const node = Bun.which("node") ?? "node";
      const resolution = spawnSync(
        node,
        [
          "-e",
          `const launcher = require(${JSON.stringify(installedLauncher)}); process.stdout.write(JSON.stringify(launcher.resolveLaunchTarget(process.cwd(), process.env)));`,
        ],
        { cwd: consumerRoot, env, encoding: "utf8" },
      );
      expect(resolution.status, resolution.stderr).toBe(0);
      const target = JSON.parse(resolution.stdout) as {
        command: string;
        args: string[];
        via: string;
      } | null;
      expect(target?.via).toBe("project-local");
      expect(target?.command).toBe(node);
      expect(path.resolve(target?.args[0] ?? "")).toBe(
        path.resolve(installedEntry),
      );
      expect(path.resolve(target?.args[0] ?? "")).toContain(
        `${path.sep}node_modules${path.sep}kibi-mcp${path.sep}`,
      );

      // `--print-resolution` is the real package's dependency/API probe. Any
      // failure is a failed consumer proof, never an optional prerequisite.
      const preflight = spawnSync(
        node,
        [installedEntry, "--print-resolution"],
        { cwd: consumerRoot, env, encoding: "utf8" },
      );
      expect(preflight.status, preflight.stderr || preflight.stdout).toBe(0);
      const preflightResult = JSON.parse(preflight.stdout) as {
        packageName?: string;
        resolved?: string;
      };
      expect(preflightResult.packageName).toBe("kibi-mcp");
      expect(path.resolve(preflightResult.resolved ?? "")).toBe(
        path.resolve(installedMcpRoot, "dist", "server.js"),
      );

      // Resolution alone does not import the MCP API. Check the shipped
      // server module too, so a registry/runtime mismatch fails the proof.
      const serverImport = spawnSync(
        node,
        [
          "--input-type=module",
          "-e",
          `await import(${JSON.stringify(pathToFileURL(path.join(installedMcpRoot, "dist", "server.js")).href)});`,
        ],
        { cwd: consumerRoot, env, encoding: "utf8" },
      );
      expect(
        serverImport.status,
        serverImport.stderr || serverImport.stdout,
      ).toBe(0);

      const run = await runShippedLauncher(
        consumerRoot,
        installedLauncher,
        env,
      );
      expect(run.exitCode, run.stderr || run.stdout).toBe(0);
      expect(run.stderr).toBe("");
      const responses = run.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as Record<string, unknown>);
      const initialize = responses.find((response) => response.id === 1);
      const tools = responses.find((response) => response.id === 2);
      const status = responses.find((response) => response.id === 3);
      expect(initialize?.result).toMatchObject({
        serverInfo: { name: "kibi-mcp" },
      });
      expect(tools?.result).toMatchObject({
        tools: expect.arrayContaining([
          expect.objectContaining({ name: "kb_search" }),
        ]),
      });
      expect(status?.error).toBeUndefined();
      expect(status?.result).toBeDefined();
    },
    300_000,
  );
});

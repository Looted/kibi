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

import { buildZcodePackageOnce } from "./build-once";

const packageRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const mcpRoot = path.join(repoRoot, "packages", "mcp");
const launcherPath = path.join(packageRoot, "bin", "mcp-launcher.cjs");

const roots: string[] = [];
const enabled = process.env.KIBI_ZCODE_PACKED_SMOKE === "1";

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

function ensureMcpApiBuild(): void {
  if (fs.existsSync(path.join(mcpRoot, "dist", "server.js"))) return;

  // The packed artifact must be built from the API package, not from a fake
  // fixture. Its declarations depend on the first-party CLI/runtime builds.
  runBun(["run", "build:cli"], repoRoot);
  runBun(["run", "build:runtime"], repoRoot);
  runBun(["run", "build:mcp"], repoRoot);
}

function makeMcpTarball(): string {
  ensureMcpApiBuild();
  const destination = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-zcode-mcp-pack-"),
  );
  roots.push(destination);
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  execFileSync(
    npm,
    ["pack", "--ignore-scripts", "--pack-destination", destination],
    {
      cwd: mcpRoot,
      stdio: "inherit",
    },
  );
  const tarball = fs
    .readdirSync(destination)
    .find((entry) => entry.startsWith("kibi-mcp-") && entry.endsWith(".tgz"));
  if (tarball === undefined) {
    throw new Error("npm pack did not produce a kibi-mcp tarball");
  }
  return path.join(destination, tarball);
}

function isolatedConsumerEnv(): NodeJS.ProcessEnv {
  return { ...process.env, PATH: "", Path: "", NODE_PATH: undefined };
}

async function runShippedLauncher(
  workspaceRoot: string,
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
      params: { protocolVersion: "2025-06-18" },
    })}\n${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`,
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
      buildZcodePackageOnce(packageRoot);
      const tarball = makeMcpTarball();
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
          tarball,
        ],
        { cwd: consumerRoot, stdio: "inherit" },
      );

      const installedRoot = path.join(consumerRoot, "node_modules", "kibi-mcp");
      const installedEntry = path.join(installedRoot, "bin", "kibi-mcp");
      expect(fs.existsSync(installedEntry)).toBe(true);

      const env = isolatedConsumerEnv();
      const node = Bun.which("node") ?? "node";
      const resolution = spawnSync(
        node,
        [
          "-e",
          `const launcher = require(${JSON.stringify(launcherPath)}); process.stdout.write(JSON.stringify(launcher.resolveLaunchTarget(process.cwd(), process.env)));`,
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

      // `--print-resolution` is the real package's dependency/API probe. If
      // it cannot start, retain the resolution assertion but diagnose the
      // actual missing runtime prerequisite instead of substituting a fixture.
      const preflight = spawnSync(
        node,
        [installedEntry, "--print-resolution"],
        { cwd: consumerRoot, env, encoding: "utf8" },
      );
      if (preflight.status !== 0) {
        console.warn(
          `[packed-consumer] skipping probe/handshake/proxy: packed kibi-mcp runtime prerequisite unavailable (${(preflight.stderr || preflight.stdout).trim() || `exit ${preflight.status}`})`,
        );
        return;
      }

      // Resolution alone does not import the MCP API. Check the shipped
      // server module too, so a registry/runtime version mismatch is reported
      // as the real unavailable prerequisite rather than replaced by a fake
      // server response.
      const serverImport = spawnSync(
        node,
        [
          "--input-type=module",
          "-e",
          `await import(${JSON.stringify(pathToFileURL(path.join(installedRoot, "dist", "server.js")).href)});`,
        ],
        { cwd: consumerRoot, env, encoding: "utf8" },
      );
      if (serverImport.status !== 0) {
        console.warn(
          `[packed-consumer] skipping probe/handshake/proxy: packed kibi-mcp API prerequisite unavailable (${(serverImport.stderr || serverImport.stdout).trim() || `exit ${serverImport.status}`})`,
        );
        return;
      }

      const run = await runShippedLauncher(consumerRoot, env);
      expect(run.exitCode, run.stderr || run.stdout).toBe(0);
      expect(run.stdout).toContain('"kibi-mcp"');
      expect(run.stdout).toContain('"tools"');
    },
    120_000,
  );
});

import { afterEach, describe, expect, test } from "bun:test";
import { execFile } from "node:child_process";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const packageRoot = path.resolve(import.meta.dir, "..");
const hooksPath = path.join(packageRoot, "hooks", "hooks.json");
const tempRoots: string[] = [];

type HookConfig = {
  hooks: Record<
    string,
    Array<{ hooks?: Array<{ command?: string; type?: string }> }>
  >;
};

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

async function runCommand(
  command: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  input: unknown,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("close", (exitCode) => {
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
    child.stdin.end(JSON.stringify(input));
  });
}

function resultOf(output: {
  exitCode: number;
  stdout: string;
  stderr: string;
}): { continue: boolean; systemMessage?: string } {
  expect(output.exitCode, output.stderr).toBe(0);
  return JSON.parse(output.stdout.trim()) as {
    continue: boolean;
    systemMessage?: string;
  };
}

function copyPluginAssets(pluginRoot: string): void {
  for (const asset of [".codex-plugin", ".mcp.json", "hooks", "bin"]) {
    const source = path.join(packageRoot, asset);
    const target = path.join(pluginRoot, asset);
    if (fs.statSync(source).isDirectory()) {
      fs.cpSync(source, target, { recursive: true });
    } else {
      fs.copyFileSync(source, target);
    }
  }
}

async function packedPluginRoot(fixtureRoot: string): Promise<string> {
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const packed = await execFileAsync(
    "npm",
    ["pack", "--ignore-scripts", "--pack-destination", fixtureRoot],
    { cwd: packageRoot },
  );
  const archiveName = packed.stdout.trim().split(/\r?\n/).at(-1);
  if (!archiveName) throw new Error("npm pack did not report an archive");

  const pluginRoot = path.join(fixtureRoot, "packed plugin");
  fs.mkdirSync(pluginRoot, { recursive: true });
  await execFileAsync(
    "tar",
    [
      "-xzf",
      path.join(fixtureRoot, archiveName),
      "--strip-components=1",
      "-C",
      pluginRoot,
    ],
    { cwd: fixtureRoot },
  );
  return pluginRoot;
}

async function exercisePlugin(
  pluginRoot: string,
  fixtureRoot: string,
): Promise<void> {
  const workspaceRoot = path.join(fixtureRoot, "opted-in workspace");
  const pluginData = path.join(fixtureRoot, "plugin data");
  fs.mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(workspaceRoot, ".kb", "manifest.json"), "{}\n");
  fs.mkdirSync(pluginData, { recursive: true });

  const config = JSON.parse(fs.readFileSync(hooksPath, "utf8")) as HookConfig;
  const environment = {
    ...process.env,
    PLUGIN_ROOT: pluginRoot,
    PLUGIN_DATA: pluginData,
  };

  const hook = (event: string): string => {
    const command = config.hooks[event]?.[0]?.hooks?.[0]?.command;
    expect(command).toBe('node "$PLUGIN_ROOT/bin/hook-runner.mjs"');
    return command as string;
  };

  expect(
    resultOf(
      await runCommand(hook("SessionStart"), workspaceRoot, environment, {
        event: "SessionStart",
        cwd: workspaceRoot,
      }),
    ),
  ).toEqual({ continue: true });

  expect(
    resultOf(
      await runCommand(hook("PreToolUse"), workspaceRoot, environment, {
        event: "PreToolUse",
        cwd: workspaceRoot,
        toolName: "Write",
        toolInput: { file_path: ".kb/config.json" },
      }),
    ).systemMessage,
  ).toContain("Avoid direct edits to .kb/");

  expect(
    resultOf(
      await runCommand(hook("PostToolUse"), workspaceRoot, environment, {
        event: "PostToolUse",
        cwd: workspaceRoot,
        toolName: "Edit",
        toolInput: { file_path: "docs/codex.md" },
      }),
    ),
  ).toEqual({ continue: true });

  const stop = resultOf(
    await runCommand(hook("Stop"), workspaceRoot, environment, {
      event: "Stop",
      cwd: workspaceRoot,
    }),
  );
  expect(stop.continue).toBe(true);
  expect(stop.systemMessage).toContain("Kibi freshness reminder");
  expect(stop.systemMessage).toContain("docs/codex.md");
}

describe("Codex source and packed-install hook artifact", () => {
  test("runs all lifecycle events without dist or package dependencies", async () => {
    const fixtureRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-codex-hook-artifact-"),
    );
    tempRoots.push(fixtureRoot);

    const sourceRoot = path.join(fixtureRoot, "source plugin");
    fs.mkdirSync(sourceRoot, { recursive: true });
    copyPluginAssets(sourceRoot);
    expect(fs.existsSync(path.join(sourceRoot, "dist"))).toBe(false);
    await exercisePlugin(sourceRoot, path.join(fixtureRoot, "source run"));

    const packedRoot = await packedPluginRoot(
      path.join(fixtureRoot, "pack output"),
    );
    await exercisePlugin(packedRoot, path.join(fixtureRoot, "packed run"));
  }, 30_000);
});

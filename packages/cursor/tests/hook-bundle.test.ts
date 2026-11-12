import { afterEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const packageRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageRoot, "../..");

type PackageJson = { files: string[] };
type HooksJson = { hooks: Record<string, { command: string }[]> };

function readJson<T>(relativePath: string): T {
  return JSON.parse(
    fs.readFileSync(path.join(packageRoot, relativePath), "utf8"),
  ) as T;
}

const tempRoots: string[] = [];

function tempRoot(prefix: string): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  tempRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/** Every hook command registered in `hooks/hooks.json`, by event. */
function hookCommands(): [string, string][] {
  const manifest = readJson<HooksJson>("hooks/hooks.json");
  return Object.entries(manifest.hooks).flatMap(([event, entries]) =>
    entries.map((entry): [string, string] => [event, entry.command]),
  );
}

/** Plugin-relative files a hook command runs (`node <file> [args]`). */
function hookScriptPath(command: string): string {
  const match = /^node\s+(?:"([^"]+)"|(\S+))/.exec(command);
  const script = match?.[1] ?? match?.[2];
  if (!script) throw new Error(`unrecognised hook command: ${command}`);
  return script;
}

/** True when `relativePath` falls under one of the package's `files`. */
function isPublished(relativePath: string, files: string[]): boolean {
  const normalized = path.posix.normalize(relativePath);
  return files.some(
    (entry) => normalized === entry || normalized.startsWith(`${entry}/`),
  );
}

/**
 * Copy the plugin the way the documented install routes do
 * (`cp -r "$(npm root)/kibi-cursor" ~/.cursor/plugins/local/kibi-cursor`):
 * only the published `files` plus package.json, with no node_modules beside
 * or above it, so nothing but the plugin's own files can resolve.
 */
function copyPublishedPlugin(): string {
  const target = path.join(tempRoot("kibi-cursor-plugin-copy-"), "kibi-cursor");
  fs.mkdirSync(target, { recursive: true });
  const { files } = readJson<PackageJson>("package.json");
  for (const entry of [...files, "package.json"]) {
    const source = path.join(packageRoot, entry);
    if (!fs.existsSync(source)) continue;
    fs.cpSync(source, path.join(target, entry), {
      recursive: true,
      dereference: true,
      filter: (file) => !file.split(path.sep).includes("node_modules"),
    });
  }
  return target;
}

type CommandRun = { code: number | null; stdout: string; stderr: string };

/** Run a hooks.json command as Cursor does: a shell in the plugin root. */
function runCommand(
  command: string,
  cwd: string,
  payload: Record<string, unknown>,
  env: NodeJS.ProcessEnv,
): Promise<CommandRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

/** Payloads shaped like Cursor's, one per registered event. */
function cursorPayloads(
  workspace: string,
): Record<string, Record<string, unknown>> {
  const common = {
    conversation_id: "bundle-copy-1",
    workspace_roots: [workspace],
  };
  const file = path.join(workspace, "src/checkout.ts");
  return {
    sessionStart: { ...common, hook_event_name: "sessionStart" },
    beforeSubmitPrompt: {
      ...common,
      hook_event_name: "beforeSubmitPrompt",
      prompt: "Totals must not be rounded from now on.",
    },
    preToolUse: {
      ...common,
      hook_event_name: "preToolUse",
      tool_name: "StrReplace",
      tool_input: {
        file_path: file,
        old_string: "  return total;",
        new_string: "  return Math.round(total);",
      },
    },
    postToolUse: {
      ...common,
      hook_event_name: "postToolUse",
      tool_name: "Write",
      tool_input: { file_path: file },
    },
    beforeReadFile: {
      ...common,
      hook_event_name: "beforeReadFile",
      file_path: file,
    },
    stop: { ...common, hook_event_name: "stop", status: "completed" },
  };
}

function workspaceFixture(kibi: boolean): string {
  const root = tempRoot("kibi-cursor-copy-ws-");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "src/checkout.ts"),
    "export function computeTotal(items: number[]): number {\n  let total = 0;\n  for (const item of items) total += item;\n  return total;\n}\n",
  );
  if (kibi) {
    fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(root, ".kb/manifest.json"), "{}");
  }
  return root;
}

describe("kibi-cursor hook bundle", () => {
  test("hooks.json only runs files that exist and ship in the package's published files", () => {
    const { files } = readJson<PackageJson>("package.json");
    const commands = hookCommands();
    expect(commands.length).toBeGreaterThan(0);
    for (const [event, command] of commands) {
      const script = hookScriptPath(command);
      expect({ event, script, exists: true, published: true }).toEqual({
        event,
        script,
        exists: fs.existsSync(path.join(packageRoot, script)),
        published: isPublished(script, files),
      });
    }
  });

  test("the bundle imports nothing but Node built-ins", () => {
    const bundle = fs.readFileSync(
      path.join(packageRoot, "bin/hook-runner.mjs"),
      "utf8",
    );
    const specifiers = [
      ...bundle.matchAll(/^\s*import\s[^;]*?from\s+"([^"]+)"/gm),
      ...bundle.matchAll(/\bimport\(\s*"([^"]+)"\s*\)/g),
      ...bundle.matchAll(/\brequire\(\s*"([^"]+)"\s*\)/g),
    ].map((match) => match[1] ?? "");
    expect(specifiers.length).toBeGreaterThan(0);
    expect(specifiers.filter((name) => !name.startsWith("node:"))).toEqual([]);
  });

  for (const kibi of [false, true]) {
    test(`every hook command exits 0 from a copied plugin with no node_modules (${kibi ? "Kibi" : "non-Kibi"} workspace)`, async () => {
      const plugin = copyPublishedPlugin();
      expect(fs.existsSync(path.join(plugin, "node_modules"))).toBe(false);
      const workspace = workspaceFixture(kibi);
      const home = tempRoot("kibi-cursor-copy-home-");
      const env: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "",
        HOME: home,
        PLUGIN_DATA: path.join(home, "plugin-data"),
        KIBI_TELEMETRY: "0",
      };
      const payloads = cursorPayloads(workspace);
      for (const [event, command] of hookCommands()) {
        const payload = payloads[event];
        if (!payload) throw new Error(`no Cursor payload for ${event}`);
        const run = await runCommand(command, plugin, payload, env);
        expect({ event, code: run.code, stderr: run.stderr }).toEqual({
          event,
          code: 0,
          stderr: "",
        });
        expect(() => JSON.parse(run.stdout)).not.toThrow();
        expect(run.stdout).not.toContain("Kibi hook runner error");
      }
    }, 60_000);
  }
});

// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  cleanupTempDirs,
  createKibiWorkspace,
  tempDir,
  write,
} from "./fixture";

afterEach(cleanupTempDirs);

const packageRoot = path.resolve(import.meta.dir, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const hookBundle = path.join(packageRoot, "bin/hook-runner.mjs");
const launcher = path.join(packageRoot, "bin/mcp-launcher.cjs");

function readJson(relativePath: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(packageRoot, relativePath), "utf8"),
  ) as Record<string, unknown>;
}

function runBundle(
  payload: Record<string, unknown>,
  env: Record<string, string>,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [hookBundle], {
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(stdout) : reject(new Error(`exit ${code}`)),
    );
    child.stdin.end(JSON.stringify(payload));
  });
}

describe("kibi-claude distribution artifacts", () => {
  test("the committed hook bundle matches the source", () => {
    const result = spawnSync(
      "bun",
      ["run", "scripts/build-hook-bundle.ts", "--check"],
      { cwd: packageRoot, encoding: "utf8" },
    );
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  test("the bundle runs under node and emits Claude Code hook JSON", async () => {
    const fixture = createKibiWorkspace();
    const stdout = await runBundle(
      {
        hook_event_name: "PreToolUse",
        session_id: "bundle",
        cwd: fixture.root,
        tool_name: "Read",
        tool_input: { file_path: path.join(fixture.root, "src/checkout.ts") },
      },
      { CLAUDE_PLUGIN_DATA: fixture.pluginData },
    );
    const output = JSON.parse(stdout);
    expect(output.hookSpecificOutput.hookEventName).toBe("PreToolUse");
    expect(output.hookSpecificOutput.additionalContext).toContain(
      "REQ-checkout-rounding",
    );
  });

  test("concurrent hook processes do not lose session events", async () => {
    const fixture = createKibiWorkspace();
    const files = Array.from({ length: 8 }, (_, index) => `src/f${index}.ts`);
    for (const file of files) write(fixture.root, file, "export {};\n");
    await Promise.all(
      files.map((file) =>
        runBundle(
          {
            hook_event_name: "PostToolUse",
            session_id: "parallel",
            cwd: fixture.root,
            tool_name: "Write",
            tool_input: { file_path: file },
          },
          { CLAUDE_PLUGIN_DATA: fixture.pluginData },
        ),
      ),
    );
    const output = JSON.parse(
      await runBundle(
        { hook_event_name: "Stop", session_id: "parallel", cwd: fixture.root },
        { CLAUDE_PLUGIN_DATA: fixture.pluginData },
      ),
    );
    const text: string = output.hookSpecificOutput.additionalContext;
    expect(text).toContain("8 source files changed");
  });

  test("an npm pack artifact ships the plugin manifest, hooks, MCP config, launcher, bundle, and skills", () => {
    const pkg = readJson("package.json");
    const files = pkg.files as string[];
    for (const entry of [
      ".claude-plugin",
      ".mcp.json",
      "bin",
      "hooks",
      "skills",
    ]) {
      expect(files).toContain(entry);
    }
    // Marketplace installs copy the directory without building, so every
    // runtime file a manifest references must be committed, not generated.
    const tracked = spawnSync("git", ["ls-files", "packages/claude"], {
      cwd: repoRoot,
      encoding: "utf8",
    }).stdout;
    if (tracked.length > 0) {
      for (const required of [
        "packages/claude/.claude-plugin/plugin.json",
        "packages/claude/.mcp.json",
        "packages/claude/hooks/hooks.json",
        "packages/claude/bin/hook-runner.mjs",
        "packages/claude/bin/mcp-launcher.cjs",
        "packages/claude/skills/kibi-usage/SKILL.md",
      ]) {
        expect(tracked).toContain(required);
      }
    }
  });

  test("manifests reference files that exist in the plugin root", () => {
    const manifest = readJson(".claude-plugin/plugin.json");
    expect(manifest.name).toBe("kibi-claude");
    expect(manifest.version).toBe(readJson("package.json").version);

    const hooks = JSON.stringify(readJson("hooks/hooks.json"));
    const hookCommands = [
      ...hooks.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([^"\\]+)/g),
    ];
    expect(hookCommands.length).toBeGreaterThan(0);
    for (const match of hookCommands) {
      expect(fs.existsSync(path.join(packageRoot, match[1] ?? ""))).toBe(true);
    }

    const mcp = readJson(".mcp.json") as {
      mcpServers: Record<string, { args: string[] }>;
    };
    expect(mcp.mcpServers.kibi?.args).toEqual([
      "${CLAUDE_PLUGIN_ROOT}/bin/mcp-launcher.cjs",
    ]);
  });

  test("skill names are the canonical ids so slash commands stay usable", () => {
    const skillsRoot = path.join(packageRoot, "skills");
    const ids = fs
      .readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(ids).toEqual([
      "kibi-bootstrap",
      "kibi-freshness",
      "kibi-traceability",
      "kibi-usage",
    ]);
    for (const id of ids) {
      const skill = fs.readFileSync(
        path.join(skillsRoot, id, "SKILL.md"),
        "utf8",
      );
      expect(skill.split("\n")[1]).toBe(`name: ${id}`);
      expect(skill).toMatch(/\ndescription: \S/);
    }
  });
});

describe("kibi-claude package contract", () => {
  test("the package entry identifies the Claude Code adapter", async () => {
    const moduleExports = await import("../src/index");
    expect(moduleExports.packageName).toBe("kibi-claude");
    expect(moduleExports.adapterKind).toBe("claude-code-plugin");
    expect(moduleExports.default).toEqual({
      name: "kibi-claude",
      adapterKind: "claude-code-plugin",
    });
  });

  test("optional package contract has no install lifecycle or runtime dependencies", () => {
    const pkg = readJson("package.json");
    const scripts = (pkg.scripts ?? {}) as Record<string, string>;
    for (const hook of ["preinstall", "install", "postinstall"]) {
      expect(scripts[hook]).toBeUndefined();
    }
    expect(pkg.dependencies).toBeUndefined();
    expect(Object.keys((pkg.peerDependenciesMeta ?? {}) as object)).toEqual([
      "kibi-cli",
      "kibi-mcp",
    ]);
  });

  test("README declares the Claude Code adapter optional", () => {
    const readme = fs.readFileSync(path.join(packageRoot, "README.md"), "utf8");
    expect(readme).toContain("optional");
    expect(readme).toContain("kibi-mcp");
  });
});

function mcpSession(
  env: Record<string, string>,
  cwd: string,
): Promise<{ tools: unknown[]; serverName: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [launcher], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let buffer = "";
    const responses: Record<number, { result?: Record<string, unknown> }> = {};
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      for (const line of buffer.split("\n").slice(0, -1)) {
        const message = JSON.parse(line);
        responses[message.id] = message;
      }
      buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
      const init = responses[1]?.result;
      const list = responses[2]?.result;
      if (init && list) {
        child.stdin.end();
        resolve({
          tools: list.tools as unknown[],
          serverName: (init.serverInfo as { name: string }).name,
        });
      }
    });
    child.on("error", reject);
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } })}\n`,
    );
    child.stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`,
    );
  });
}

describe("kibi-claude MCP launcher", () => {
  test("serves no tools when the project dir does not own .kb/manifest.json", async () => {
    const project = tempDir("kibi-claude-mcp-plain-");
    fs.mkdirSync(path.join(project, ".git"));
    // cwd is a Kibi workspace, but CLAUDE_PROJECT_DIR is authoritative.
    const kibi = createKibiWorkspace();
    const session = await mcpSession(
      { CLAUDE_PROJECT_DIR: project, KIBI_WORKSPACE: "" },
      kibi.root,
    );
    expect(session.serverName).toBe("kibi-claude-launcher");
    expect(session.tools).toEqual([]);
  });
});

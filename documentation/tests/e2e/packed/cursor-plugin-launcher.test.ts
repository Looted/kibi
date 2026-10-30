// Packed Cursor plugin E2E: plugin cwd versus consumer workspace cwd.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
  run,
} from "./helpers.js";

describe(
  "packed Cursor plugin consumer-local MCP launcher",
  { concurrency: false },
  () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let pluginRoot: string;

    before(
      async () => {
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        pluginRoot = mkdtempSync(join(tmpdir(), "kibi-cursor-packed-plugin-"));
        const extracted = await run(
          "tar",
          ["-xzf", tarballs.cursor, "--strip-components=1", "-C", pluginRoot],
          { cwd: sandbox.repoDir, env: sandbox.env },
        );
        assert.equal(extracted.exitCode, 0, extracted.stderr);
      },
      { timeout: 300_000 },
    );

    after(async () => {
      if (sandbox) await sandbox.cleanup();
      if (pluginRoot) rmSync(pluginRoot, { recursive: true, force: true });
    });

    it("ships the launcher and starts the packed consumer kibi-mcp from the consumer root", async () => {
      const launcher = join(pluginRoot, "bin", "launch-kibi-mcp.mjs");
      assert.equal(
        existsSync(launcher),
        true,
        "packed plugin omitted bin launcher",
      );

      const result = await run(
        process.execPath,
        [launcher, sandbox.npmPrefix, "--print-resolution"],
        { cwd: pluginRoot, env: sandbox.env },
      );
      assert.equal(result.exitCode, 0, result.stderr);

      const resolution = JSON.parse(result.stdout) as {
        cwd?: string;
        packageName?: string;
        running?: { entrypoint?: string };
        projectLocal?: { entrypoint?: string };
      };
      assert.equal(resolution.packageName, "kibi-mcp");
      assert.equal(resolution.cwd, sandbox.npmPrefix);
      const consumerRoot = resolve(sandbox.npmPrefix);
      for (const entrypoint of [
        resolution.running?.entrypoint,
        resolution.projectLocal?.entrypoint,
      ]) {
        assert.ok(entrypoint && isAbsolute(entrypoint));
        const relativeEntrypoint = relative(consumerRoot, entrypoint);
        assert.ok(
          relativeEntrypoint === "" ||
            (!relativeEntrypoint.startsWith("..") &&
              !relativeEntrypoint.startsWith("/")),
          `entrypoint escaped consumer prefix: ${entrypoint}`,
        );
        assert.match(relativeEntrypoint, /kibi-mcp/);
      }
    });

    it("refuses to start any other kibi-mcp when the consumer workspace lacks one, with an actionable error", () => {
      const launcher = join(pluginRoot, "bin", "launch-kibi-mcp.mjs");
      const workspace = mkdtempSync(join(tmpdir(), "kibi-cursor-no-mcp-"));
      try {
        mkdirSync(join(workspace, ".kb"), { recursive: true });
        writeFileSync(join(workspace, ".kb", "manifest.json"), "{}\n");
        writeFileSync(
          join(workspace, "package.json"),
          '{"name":"consumer-without-kibi-mcp","private":true}\n',
        );

        const result = spawnSync(
          process.execPath,
          [launcher, workspace, "--print-resolution"],
          { cwd: pluginRoot, env: sandbox.env, encoding: "utf8" },
        );
        assert.equal(result.status, 1, result.stdout + result.stderr);
        assert.equal(result.stdout, "", "no server resolution may be printed");
        assert.match(
          result.stderr,
          /No project-local kibi-mcp package was found for .*kibi-cursor-no-mcp-/,
        );
        assert.match(result.stderr, /npm install --save-dev kibi-mcp/);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
      }
    });

    it("the packed hooks only warn: a direct .kb edit is allowed with a warning and a prompt is never held back", () => {
      const hookRunner = join(
        sandbox.npmPrefix,
        "node_modules",
        "kibi-cursor",
        "dist",
        "hook-runner.js",
      );
      assert.equal(existsSync(hookRunner), true, "kibi-cursor is not installed");
      const workspace = mkdtempSync(join(tmpdir(), "kibi-cursor-advisory-"));
      const pluginData = mkdtempSync(
        join(tmpdir(), "kibi-cursor-advisory-data-"),
      );
      const hook = (event: Record<string, unknown>) => {
        const result = spawnSync(process.execPath, [hookRunner], {
          cwd: workspace,
          env: { ...sandbox.env, PLUGIN_DATA: pluginData },
          input: JSON.stringify({
            conversation_id: "advisory-only",
            workspace_roots: [workspace],
            ...event,
          }),
          encoding: "utf8",
        });
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout) as Record<string, unknown>;
      };
      try {
        mkdirSync(join(workspace, ".kb", "requirements"), { recursive: true });
        // The edit a blocking hook would stop: a direct write into .kb.
        const kbEdit = hook({
          hook_event_name: "preToolUse",
          tool_name: "Write",
          tool_input: { file_path: ".kb/requirements/REQ-direct.md" },
        });
        assert.equal(kbEdit.permission, "allow", JSON.stringify(kbEdit));
        assert.match(String(kbEdit.agent_message ?? ""), /Do not read or edit/);
        const prompt = hook({
          hook_event_name: "beforeSubmitPrompt",
          prompt: "Edit .kb/requirements/REQ-direct.md by hand.",
        });
        assert.notEqual(prompt.continue, false, JSON.stringify(prompt));
        for (const output of [kbEdit, prompt]) {
          assert.notEqual(output.permission, "deny", JSON.stringify(output));
        }
      } finally {
        rmSync(workspace, { recursive: true, force: true });
        rmSync(pluginData, { recursive: true, force: true });
      }
    });

    it("the packed stop hook still asks for an impact check when a plan turn also edited source", () => {
      // The installed package resolves kibi-agent-core from the consumer.
      const hookRunner = join(
        sandbox.npmPrefix,
        "node_modules",
        "kibi-cursor",
        "dist",
        "hook-runner.js",
      );
      assert.equal(existsSync(hookRunner), true, "kibi-cursor is not installed");
      const workspace = mkdtempSync(join(tmpdir(), "kibi-cursor-plan-edit-"));
      const pluginData = mkdtempSync(join(tmpdir(), "kibi-cursor-plan-data-"));
      const hook = (event: Record<string, unknown>) => {
        const result = spawnSync(process.execPath, [hookRunner], {
          cwd: workspace,
          env: { ...sandbox.env, PLUGIN_DATA: pluginData },
          input: JSON.stringify({
            conversation_id: "plan-and-edit",
            workspace_roots: [workspace],
            ...event,
          }),
          encoding: "utf8",
        });
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout) as { followup_message?: string };
      };
      try {
        mkdirSync(join(workspace, "src"), { recursive: true });
        hook({
          hook_event_name: "postToolUse",
          tool_name: "CreatePlan",
          tool_input: {},
        });
        hook({
          hook_event_name: "postToolUse",
          tool_name: "Write",
          tool_input: { file_path: "src/app.ts" },
        });
        const stop = hook({ hook_event_name: "stop", status: "completed" });
        assert.match(stop.followup_message ?? "", /run impact-enabled kb_check/);
        assert.match(stop.followup_message ?? "", /src\/app\.ts/);
      } finally {
        rmSync(workspace, { recursive: true, force: true });
        rmSync(pluginData, { recursive: true, force: true });
      }
    });
  },
);

import assert from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";
import { startMcpStdioServer } from "./mcp-stdio-client.js";

const REPO_ROOT = resolve(process.cwd());

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: briefing surfaces stay retired across shipped artifacts.
 *
 * SCEN-remove-briefs-v1 — no briefing tool ships through MCP, the CLI, the
 * OpenCode plugin, the cursor/codex plugin tarballs, or the VS Code
 * extension manifest.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: briefing surfaces retired", { timeout: 300000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;
    let server: Awaited<ReturnType<typeof startMcpStdioServer>> | undefined;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
        server = await startMcpStdioServer({
          command: "node",
          args: [sandbox.kibiMcpBin],
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (server) await server.close();
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 60000 },
    );

    it(
      "MCP tool list exposes no briefing tools",
      { timeout: 120000 },
      async () => {
        if (!server) return;
        const result = await server.protocol("tools/list");
        const tools = (result.tools as Array<{ name: string }> | undefined) ?? [];
        assert.ok(tools.length > 0, "tool list must not be empty");
        const briefing = tools.filter((tool) => /brief/i.test(tool.name));
        assert.deepStrictEqual(
          briefing,
          [],
          `no briefing tools may ship: ${JSON.stringify(tools.map((t) => t.name))}`,
        );
      },
    );

    it(
      "CLI help exposes no briefing commands",
      { timeout: 90000 },
      async () => {
        if (!hasProlog) return;
        const help = await kibi(sandbox, ["--help"]);
        assert.strictEqual(help.exitCode, 0, `${help.stdout}${help.stderr}`);
        assert.ok(
          !/brief/i.test(help.stdout),
          "kibi --help must not advertise briefing commands",
        );
      },
    );

    it(
      "shipped plugin tarballs contain no briefing modules",
      { timeout: 60000 },
      async () => {
        for (const [label, tarballPath] of [
          ["opencode", tarballs.opencode],
          ["cursor", tarballs.cursor],
          ["codex", tarballs.codex],
        ] as const) {
          if (tarballPath === undefined) continue;
          const listing = await run("tar", ["-tzf", tarballPath], {
            cwd: REPO_ROOT,
            env: process.env,
          });
          assert.strictEqual(
            listing.exitCode,
            0,
            `tar -tzf ${tarballPath} failed: ${listing.stderr}`,
          );
          const briefEntries =
            listing.stdout.match(/[^\n]*brief[^\n]*/gi) ?? [];
          assert.deepStrictEqual(
            briefEntries,
            [],
            `${label} tarball must not contain briefing modules: ${briefEntries.join(", ")}`,
          );
        }
      },
    );

    it(
      "VS Code extension manifest contributes no briefing commands",
      { timeout: 60000 },
      () => {
        const manifestPath = join(REPO_ROOT, "packages", "vscode", "package.json");
        assert.ok(existsSync(manifestPath), "vscode package.json must exist");
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
          contributes?: { commands?: Array<{ command: string; title: string }> };
        };
        const commands = manifest.contributes?.commands ?? [];
        const briefing = commands.filter((command) =>
          /brief/i.test(`${command.command} ${command.title}`),
        );
        assert.deepStrictEqual(
          briefing,
          [],
          `vscode manifest must not contribute briefing commands: ${JSON.stringify(briefing)}`,
        );

        const vscodeSrc = join(REPO_ROOT, "packages", "vscode", "src");
        const briefSources = readdirSync(vscodeSrc).filter((entry) =>
          /brief/i.test(entry),
        );
        assert.deepStrictEqual(
          briefSources,
          [],
          `vscode sources must not contain briefing modules: ${briefSources.join(", ")}`,
        );
      },
    );
  });
}

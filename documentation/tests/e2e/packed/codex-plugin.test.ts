import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
  run,
} from "./helpers.js";

type McpServerConfig = {
  command?: string;
  args?: string[];
  cwd?: string;
};

type CodexMcpConfig = {
  mcpServers?: Record<string, McpServerConfig>;
};

function npxInstallCacheEntries(cacheDir: string): string[] {
  const installCache = join(cacheDir, "_npx");
  if (!existsSync(installCache)) return [];
  const pending = [installCache];
  const files: string[] = [];
  while (pending.length > 0) {
    const directory = pending.pop();
    if (!directory) continue;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else files.push(relative(installCache, entryPath));
    }
  }
  return files.sort();
}

function projectEnv(
  sandbox: TestSandbox,
  consumerRoot: string,
  cacheDir: string,
): NodeJS.ProcessEnv {
  const pathEntries = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(
      (entry) =>
        resolve(entry) !==
        resolve(join(sandbox.npmPrefix, "node_modules", ".bin")),
    );
  return {
    ...sandbox.env,
    HOME: join(consumerRoot, "home"),
    USERPROFILE: join(consumerRoot, "home"),
    npm_config_cache: cacheDir,
    npm_config_update_notifier: "false",
    PATH: [join(consumerRoot, "node_modules", ".bin"), ...pathEntries].join(
      delimiter,
    ),
  };
}

describe(
  "packed Codex plugin consumer-local MCP registration",
  { concurrency: false },
  () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    const tempRoots: string[] = [];

    before(
      async () => {
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
      },
      { timeout: 300_000 },
    );

    after(async () => {
      if (sandbox) await sandbox.cleanup();
      for (const root of tempRoots) {
        rmSync(root, { recursive: true, force: true });
      }
    });

    it(
      "uses the active consumer cwd for the packed plugin and refuses missing installs",
      { timeout: 120_000 },
      async () => {
        const fixtureRoot = mkdtempSync(join(tmpdir(), "kibi-codex-packed-"));
        tempRoots.push(fixtureRoot);
        const pluginRoot = join(fixtureRoot, "plugin-cache", "kibi-codex");
        // The packed harness has already installed all packed Kibi packages in
        // an isolated npm consumer prefix. Keep the plugin cache elsewhere so
        // resolution can prove it uses the active task cwd.
        const consumerRoot = sandbox.npmPrefix;
        const cacheDir = join(fixtureRoot, "npm-cache");
        mkdirSync(pluginRoot, { recursive: true });
        mkdirSync(cacheDir, { recursive: true });
        const extractedPlugin = await run(
          "tar",
          ["-xzf", tarballs.codex, "--strip-components=1", "-C", pluginRoot],
          { cwd: sandbox.repoDir, env: sandbox.env },
        );
        assert.equal(extractedPlugin.exitCode, 0, extractedPlugin.stderr);

        const config = JSON.parse(
          readFileSync(join(pluginRoot, ".mcp.json"), "utf8"),
        ) as CodexMcpConfig;
        const server = config.mcpServers?.kibi;
        assert.ok(server, "packed plugin omitted mcpServers.kibi");
        const command = server.command;
        const args = server.args;
        assert.equal(command, "npx");
        assert.deepEqual(args, ["--no-install", "kibi-mcp"]);
        assert.equal(server.cwd, undefined);
        assert.ok(command);

        const env = projectEnv(sandbox, consumerRoot, cacheDir);
        const result = await run(
          command,
          [...(args ?? []), "--print-resolution"],
          { cwd: consumerRoot, env },
        );
        assert.equal(result.exitCode, 0, result.stderr);
        const resolution = JSON.parse(result.stdout) as {
          cwd?: string;
          running?: { entrypoint?: string };
          projectLocal?: { entrypoint?: string };
        };
        assert.equal(resolve(resolution.cwd ?? ""), resolve(consumerRoot));
        for (const entrypoint of [
          resolution.running?.entrypoint,
          resolution.projectLocal?.entrypoint,
        ]) {
          assert.ok(entrypoint, "resolution did not report an entrypoint");
          const withinConsumer = relative(consumerRoot, entrypoint);
          assert.ok(
            withinConsumer === "" ||
              (!withinConsumer.startsWith("..") &&
                !withinConsumer.startsWith("/")),
            `resolution escaped consumer root: ${entrypoint}`,
          );
          assert.match(withinConsumer, /kibi-mcp/);
        }

        // Use a second disposable consumer for the negative case. The packed
        // harness prefix may be shared with other test files and must remain
        // immutable after the positive resolution assertion.
        const missingConsumerRoot = join(fixtureRoot, "missing-consumer");
        mkdirSync(join(missingConsumerRoot, "node_modules", ".bin"), {
          recursive: true,
        });
        const missingPackageJson = join(missingConsumerRoot, "package.json");
        const missingPackageRoot = join(
          missingConsumerRoot,
          "node_modules",
          "kibi-mcp",
        );
        writeFileSync(
          missingPackageJson,
          JSON.stringify({ name: "codex-missing-consumer", private: true }),
        );
        const beforeMissing = npxInstallCacheEntries(cacheDir);
        const missing = await run(
          command,
          [...(args ?? []), "--print-resolution"],
          {
            cwd: missingConsumerRoot,
            env: projectEnv(sandbox, missingConsumerRoot, cacheDir),
          },
        );
        assert.notEqual(missing.exitCode, 0);
        assert.deepEqual(npxInstallCacheEntries(cacheDir), beforeMissing);
        assert.equal(existsSync(missingPackageRoot), false);
        assert.equal(existsSync(missingPackageJson), true);
      },
    );
  },
);

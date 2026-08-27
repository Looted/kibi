// Packed Cursor plugin E2E: plugin cwd versus consumer workspace cwd.
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
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
  },
);

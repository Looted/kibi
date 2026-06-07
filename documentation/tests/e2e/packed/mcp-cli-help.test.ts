import assert from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  kibiMcp,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * MCP CLI Help Packed E2E Regression Tests
 *
 * These tests verify that the kibi-mcp CLI help functionality works correctly
 * without requiring SWI-Prolog or server startup. Help short-circuits before
 * the MCP server initializes, so these tests can run without Prolog gating.
 */

if (RUN_NODE_TEST_SUITE) {
  describe(
    "MCP CLI Help: Packed tarball regression",
    {
      timeout: 120000,
    },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;

      before(
        async () => {
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          // No need to init git repo for help tests
          // No need to checkPrologAvailable() - help works without Prolog
        },
        { timeout: 120000 },
      );

      after(
        async () => {
          if (sandbox) {
            await sandbox.cleanup();
          }
        },
        { timeout: 60000 },
      );

      it(
        "should display help with --help flag",
        { timeout: 10000 },
        async () => {
          const result = await kibiMcp(sandbox, ["--help"]);

          // Verify exit code 0
          assert.strictEqual(
            result.exitCode,
            0,
            `kibi-mcp --help should exit with code 0: ${result.stderr}`,
          );

          // Verify stdout contains expected help text
          assert.ok(
            result.stdout.includes("Usage: kibi-mcp [options]"),
            "Help output should contain usage line",
          );
          assert.ok(
            result.stdout.includes("--diagnostic-mode"),
            "Help output should mention --diagnostic-mode flag",
          );
          assert.ok(
            result.stdout.includes("-h, --help"),
            "Help output should mention help flags",
          );

          // Verify no jsonrpc output (help short-circuits before server)
          assert.ok(
            !result.stdout.includes("jsonrpc"),
            "Help output should not contain jsonrpc (server should not start)",
          );

          // Verify stderr is empty
          assert.strictEqual(
            result.stderr,
            "",
            `Help output should not have stderr: ${result.stderr}`,
          );

          console.log("  ✓ --help flag works correctly");
        },
      );

      it("should display help with -h flag", { timeout: 10000 }, async () => {
        const result = await kibiMcp(sandbox, ["-h"]);

        // Verify exit code 0
        assert.strictEqual(
          result.exitCode,
          0,
          `kibi-mcp -h should exit with code 0: ${result.stderr}`,
        );

        // Verify stdout contains expected help text
        assert.ok(
          result.stdout.includes("Usage: kibi-mcp [options]"),
          "Help output should contain usage line",
        );
        assert.ok(
          result.stdout.includes("--diagnostic-mode"),
          "Help output should mention --diagnostic-mode flag",
        );
        assert.ok(
          result.stdout.includes("-h, --help"),
          "Help output should mention help flags",
        );

        // Verify no jsonrpc output (help short-circuits before server)
        assert.ok(
          !result.stdout.includes("jsonrpc"),
          "Help output should not contain jsonrpc (server should not start)",
        );

        // Verify stderr is empty
        assert.strictEqual(
          result.stderr,
          "",
          `Help output should not have stderr: ${result.stderr}`,
        );

        console.log("  ✓ -h flag works correctly");
      });

      it(
        "should display help with --help --diagnostic-mode",
        {
          timeout: 10000,
        },
        async () => {
          const result = await kibiMcp(sandbox, [
            "--help",
            "--diagnostic-mode",
          ]);

          // Verify exit code 0
          assert.strictEqual(
            result.exitCode,
            0,
            `kibi-mcp --help --diagnostic-mode should exit with code 0: ${result.stderr}`,
          );

          // Verify stdout contains expected help text
          assert.ok(
            result.stdout.includes("Usage: kibi-mcp [options]"),
            "Help output should contain usage line",
          );
          assert.ok(
            result.stdout.includes("--diagnostic-mode"),
            "Help output should mention --diagnostic-mode flag",
          );
          assert.ok(
            result.stdout.includes("-h, --help"),
            "Help output should mention help flags",
          );

          // Verify no jsonrpc output (help short-circuits before server)
          assert.ok(
            !result.stdout.includes("jsonrpc"),
            "Help output should not contain jsonrpc (server should not start)",
          );

          // Verify stderr is empty
          assert.strictEqual(
            result.stderr,
            "",
            `Help output should not have stderr: ${result.stderr}`,
          );

          // Verify .kb/usage.log is absent (help short-circuits before server starts)
          const usageLogPath = join(sandbox.repoDir, ".kb", "usage.log");
          assert.ok(
            !existsSync(usageLogPath),
            ".kb/usage.log should not exist after --help (server should not start)",
          );

          console.log("  ✓ --help --diagnostic-mode works correctly");
        },
      );
    },
  );
}

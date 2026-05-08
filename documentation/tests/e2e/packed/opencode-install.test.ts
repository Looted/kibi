// E2E test: kibi-opencode tarball install + plugin invocation (issue #82 / REQ-opencode-kibi-plugin-v1)
//
// Verifies the full "install from tarball → load as OpenCode plugin" path:
//   1. Pack kibi-opencode to a .tgz (triggers prepack → build)
//   2. Install the tarball into an isolated npm prefix
//   3. Dynamically import dist/index.js and invoke the default export as a plugin
//   4. Assert that the plugin initialises and returns a hooks object without throwing
//
// This is hermetic (no network, no LLM provider, no opencode binary required) and
// mirrors what OpenCode does internally when it auto-installs a plugin from opencode.json.
//
// implements REQ-opencode-kibi-plugin-v1

import assert from "node:assert";
import {
  existsSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  createIsolatedInstall,
  installOpencodeTarball,
  resolveOpencodeTarball,
} from "./opencode-packed-utils.js";

const REPO_ROOT = resolve(process.cwd());

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: kibi-opencode tarball install and plugin invocation",
    { timeout: 300000 },
    () => {
      let tmpDir: string;
      let installDir: string;
      let tarballPath: string;

      before(
        async () => {
          const { tarballPath: tb } = resolveOpencodeTarball(REPO_ROOT);
          tarballPath = tb;
          assert.ok(existsSync(tarballPath), `Tarball not found: ${tarballPath}`);

          const isolated = createIsolatedInstall();
          tmpDir = isolated.tmpDir;
          installDir = isolated.installDir;

          installOpencodeTarball(installDir, tarballPath);
        },
        { timeout: 240000 },
      );

      after(async () => {
        if (tmpDir) {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it(
        "installs kibi-opencode package with correct version",
        { timeout: 30000 },
        () => {
          const pkgJsonPath = join(
            installDir,
            "node_modules/kibi-opencode/package.json",
          );
          assert.ok(
            existsSync(pkgJsonPath),
            `kibi-opencode/package.json not found at ${pkgJsonPath}`,
          );

          const installed = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
            name: string;
            version: string;
          };
          assert.strictEqual(installed.name, "kibi-opencode");

          // Version should match what's in packages/opencode/package.json
          const sourcePkg = JSON.parse(
            readFileSync(
              join(REPO_ROOT, "packages/opencode/package.json"),
              "utf8",
            ),
          ) as { version: string };
          assert.strictEqual(
            installed.version,
            sourcePkg.version,
            "Installed version should match source package.json",
          );
          console.log(`  ✓ Installed kibi-opencode@${installed.version}`);
        },
      );

      it(
        "dist/index.js is present after tarball install",
        { timeout: 30000 },
        () => {
          const distIndex = join(
            installDir,
            "node_modules/kibi-opencode/dist/index.js",
          );
          assert.ok(
            existsSync(distIndex),
            `dist/index.js not found — prepack (tsc build) did not run: ${distIndex}`,
          );
          console.log("  ✓ dist/index.js present");
        },
      );

      it(
        "plugin default export is callable and returns hooks without throwing",
        { timeout: 60000 },
        async () => {
          const distIndex = join(
            installDir,
            "node_modules/kibi-opencode/dist/index.js",
          );

          // Dynamically import the installed plugin (mirrors what OpenCode does)
          const pkg = await import(distIndex);

          assert.ok(
            typeof pkg.default === "function",
            "default export must be a function (the plugin)",
          );

          // Construct minimal PluginInput — matches @opencode-ai/plugin PluginInput shape
          // worktree/directory are both set to tmpDir (no .kb, triggers bootstrap warning but no error)
          const mockInput = {
            worktree: tmpDir,
            directory: tmpDir,
          };

          // Invoke the plugin — should not throw
          const hooks: unknown = await pkg.default(mockInput);

          assert.ok(
            hooks !== null && typeof hooks === "object",
            "plugin must return a hooks object",
          );

          console.log(
            `  ✓ Plugin invoked successfully, hooks keys: [${Object.keys(hooks as object).join(", ") || "none"}]`,
          );
        },
      );

      it(
        "subpath exports are accessible after install",
        { timeout: 30000 },
        async () => {
          const base = join(installDir, "node_modules/kibi-opencode");

          const configModule = await import(join(base, "dist/config.js"));
          const promptModule = await import(join(base, "dist/prompt.js"));
          const schedulerModule = await import(join(base, "dist/scheduler.js"));
          const fileFilterModule = await import(
            join(base, "dist/file-filter.js")
          );

          assert.ok(
            typeof configModule.loadConfig === "function",
            "config.loadConfig must be exported",
          );
          assert.ok(
            typeof promptModule.injectPrompt === "function",
            "prompt.injectPrompt must be exported",
          );
          assert.ok(
            typeof schedulerModule.createSyncScheduler === "function",
            "scheduler.createSyncScheduler must be exported",
          );
          assert.ok(
            typeof fileFilterModule.shouldHandleFile === "function",
            "file-filter.shouldHandleFile must be exported",
          );

          console.log("  ✓ All subpath exports accessible");
        },
      );
    },
  );
}

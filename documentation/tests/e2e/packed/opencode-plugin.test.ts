// E2E test for kibi-opencode plugin loader safety (issue #82)
// This test ensures the plugin package exports only loader-safe functions from root
import assert from "node:assert";
import { existsSync, rmSync } from "node:fs";
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
    "E2E: kibi-opencode plugin loader safety",
    { timeout: 180000 },
    () => {
      let tmpDir: string;
      let installDir: string;

      before(
        async () => {
          const { tarballPath } = resolveOpencodeTarball(REPO_ROOT);
          const isolated = createIsolatedInstall();
          tmpDir = isolated.tmpDir;
          installDir = isolated.installDir;
          installOpencodeTarball(installDir, tarballPath);
        },
        { timeout: 120000 },
      );

      after(async () => {
        rmSync(tmpDir, { recursive: true, force: true });
      });

      it(
        "plugin root exports only loader-safe plugin function",
        { timeout: 30000 },
        async () => {
          const distIndex = join(
            installDir,
            "node_modules/kibi-opencode/dist/index.js",
          );
          assert.ok(
            existsSync(distIndex),
            `dist/index.js not found at ${distIndex}`,
          );
          const pkg = await import(distIndex);
          assert.ok(pkg.default !== undefined, "must have default export");

          // Verify no runtime helpers are exported from root (loader-safety check)
          // OpenCode loader imports plugin modules and invokes all exports as plugin
          // functions. Any helper function exported from root would crash the loader.
          const exportNames = Object.keys(pkg);
          for (const name of exportNames) {
            if (name === "default") continue;

            const value = pkg[name];
            if (typeof value === "function") {
              assert.fail(
                `Root export "${name}" is a function and would be invoked by OpenCode loader`,
              );
            }
          }
        },
      );

      it(
        "helpers accessible via subpath exports",
        { timeout: 30000 },
        async () => {
          const configModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/config.js")
          );
          const promptModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/prompt.js")
          );
          const schedulerModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/scheduler.js")
          );
          const fileFilterModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/file-filter.js")
          );

          // Verify helper functions are accessible via subpaths
          assert.ok(typeof configModule.loadConfig === "function");
          assert.ok(typeof promptModule.injectPrompt === "function");
          assert.ok(typeof schedulerModule.createSyncScheduler === "function");
          assert.ok(typeof fileFilterModule.shouldHandleFile === "function");
        },
      );
    },
  );
}

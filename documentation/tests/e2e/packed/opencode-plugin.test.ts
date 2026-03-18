// E2E test for kibi-opencode plugin loader safety (issue #82)
// This test ensures the plugin package exports only loader-safe functions from root
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

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
          tmpDir = mkdtempSync(join(tmpdir(), "kibi-opencode-e2e-"));
          installDir = join(tmpDir, "install");
          mkdirSync(installDir, { recursive: true });

          // Pack: opencode package (triggers prepack → build)
          const opencodeDir = join(REPO_ROOT, "packages/opencode");
          const packOutput = execFileSync("npm", ["pack", "--json"], {
            cwd: opencodeDir,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
          });

          interface PackResult {
            filename: string;
          }
          const packResults = JSON.parse(packOutput) as PackResult[];
          if (
            !packResults ||
            packResults.length === 0 ||
            !packResults[0]?.filename
          ) {
            throw new Error("npm pack did not return filename");
          }
          const tarball = join(opencodeDir, packResults[0].filename);

          // Install tarball into isolated prefix
          execFileSync("npm", ["install", "--prefix", installDir, tarball], {
            stdio: ["pipe", "pipe", "pipe"],
          });
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
            join(installDir, "node_modules/kibi-opencode/config.js")
          );
          const promptModule = await import(
            join(installDir, "node_modules/kibi-opencode/prompt.js")
          );
          const schedulerModule = await import(
            join(installDir, "node_modules/kibi-opencode/scheduler.js")
          );
          const fileFilterModule = await import(
            join(installDir, "node_modules/kibi-opencode/file-filter.js")
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

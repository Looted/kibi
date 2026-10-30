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
    {
      timeout: 180000,
    },
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
        if (tmpDir) {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      });

      it(
        "plugin root exports only loader-safe plugin function",
        {
          timeout: 30000,
        },
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
        {
          timeout: 30000,
        },
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

      it(
        "trims oversized guidance to one block within the bullet and word budget",
        {
          timeout: 30000,
        },
        async () => {
          const configModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/config.js")
          );
          const promptModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/prompt.js")
          );
          const sentinel = "<!-- kibi-opencode -->";
          const reminder =
            "- Kibi impact evidence is required before completion/commit: run `kb_check` before completing this task.";
          const oversized = Array.from(
            { length: 90 },
            (_, index) => `detail${index}`,
          ).join(" ");
          const edit = { path: "src/feature.ts", kind: "source" };

          const prompt: string = promptModule.injectPrompt(
            "Initial system prompt",
            configModule.DEFAULTS,
            {
              recentEdits: [edit],
              focusEdit: edit,
              posture: "root_active",
              riskClass: "behavior_candidate",
              completionReminder: true,
              fileOperationReminder: {
                path: edit.path,
                lifecycleReminder: oversized,
                e2eReminder: oversized,
              },
            },
          );

          assert.strictEqual(prompt.split(sentinel).length - 1, 1);
          const block = prompt.slice(prompt.indexOf(sentinel));
          assert.ok(block.includes(reminder), block);
          const guidance = block.slice(0, block.indexOf(reminder));
          const words = guidance.split(/\s+/).filter(Boolean).length;
          assert.ok(words <= 120, `guidance has ${words} words: ${guidance}`);
          const bullets = block
            .split("\n")
            .filter((line) => line.startsWith("-")).length;
          assert.ok(bullets <= 5, `guidance has ${bullets} bullets`);
          // Both reminders end in detail89; trimming keeps at most one of them.
          assert.ok(
            guidance.split("detail89").length - 1 <= 1,
            "the oversized reminders must be trimmed",
          );
        },
      );

      it(
        "contains a failing background sync, reports it, and keeps scheduling",
        {
          timeout: 30000,
        },
        async () => {
          const configModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/config.js")
          );
          const schedulerModule = await import(
            join(installDir, "node_modules/kibi-opencode/dist/scheduler.js")
          );

          const completed: Array<{
            exitCode: number;
            reason: string;
            syncErrorMessage?: string;
          }> = [];
          let syncCalls = 0;
          const scheduler = schedulerModule.createSyncScheduler({
            worktree: tmpDir,
            config: {
              ...configModule.DEFAULTS,
              sync: { ...configModule.DEFAULTS.sync, debounceMs: 10 },
            },
            runSync: async () => {
              syncCalls += 1;
              if (syncCalls === 1) {
                throw new Error("kibi sync exploded");
              }
              return { exitCode: 0, syncCommand: "kibi sync" };
            },
            onRunComplete: (meta: (typeof completed)[number]) => {
              completed.push(meta);
            },
          });
          try {
            scheduler.scheduleSync("e2e.failing-sync");
            await scheduler.flush();
            assert.strictEqual(completed.length, 1);
            assert.strictEqual(completed[0]?.exitCode, 1);
            assert.match(
              completed[0]?.syncErrorMessage ?? "",
              /kibi sync exploded/,
            );

            scheduler.scheduleSync("e2e.after-failure");
            await scheduler.flush();
            assert.strictEqual(completed.length, 2);
            assert.strictEqual(completed[1]?.exitCode, 0);
          } finally {
            scheduler.dispose();
          }
        },
      );
    },
  );
}

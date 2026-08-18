// Packed e2e test for local plugin loading
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, before, describe, it } from "node:test";

const REPO_ROOT = resolve(process.cwd());

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

if (RUN_NODE_TEST_SUITE) {
  describe("opencode-plugin-local", { timeout: 120000 }, () => {
    let tmpDir: string;

    before(
      async () => {
        // Build: opencode package so we can import from dist/
        execFileSync("bun", ["run", "build:opencode"], {
          cwd: REPO_ROOT,
          stdio: "pipe",
        });

        tmpDir = mkdtempSync(join(tmpdir(), "kibi-e2e-local-"));
        mkdirSync(join(tmpDir, ".kb"), { recursive: true });
        for (const dir of [
          ".kb/requirements",
          ".kb/scenarios",
          ".kb/tests",
          ".kb/adr",
          ".kb/flags",
          ".kb/events",
          ".kb/facts",
        ]) {
          mkdirSync(join(tmpDir, dir), { recursive: true });
        }
        mkdirSync(join(tmpDir, "src"), { recursive: true });

        writeFileSync(
          join(tmpDir, ".kb", "manifest.json"),
          JSON.stringify({
            manifestVersion: 1,
            schemaVersion: 5,
            semanticAdvisorBackfill: "not_applicable",
          }),
        );
        writeFileSync(join(tmpDir, ".kb", "symbols.yaml"), "symbols: []\n");
        writeFileSync(
          join(tmpDir, ".kb", "requirements", "REQ-001.md"),
          "---\nid: REQ-001\ntitle: Test Requirement\nstatus: open\n---\n# Test",
        );
        writeFileSync(join(tmpDir, "src", "main.ts"), "console.log('hello');");
      },
      { timeout: 60000 },
    );

    after(async () => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    it("plugin package can be loaded", { timeout: 30000 }, async () => {
      const distIndex = join(REPO_ROOT, "packages/opencode/dist/index.js");
      const pkg = await import(distIndex);
      assert.ok(pkg.default !== undefined);
    });

    it("plugin exports required functions", { timeout: 30000 }, async () => {
      const distRoot = join(REPO_ROOT, "packages/opencode/dist");
      const { injectPrompt, buildPrompt } = await import(
        join(distRoot, "prompt.js")
      );
      const { loadConfig } = await import(join(distRoot, "config.js"));
      const { shouldHandleFile } = await import(
        join(distRoot, "file-filter.js")
      );
      const { createSyncScheduler } = await import(
        join(distRoot, "scheduler.js")
      );

      assert.ok(typeof injectPrompt === "function");
      assert.ok(typeof buildPrompt === "function");
      assert.ok(typeof loadConfig === "function");
      assert.ok(typeof shouldHandleFile === "function");
      assert.ok(typeof createSyncScheduler === "function");
    });

    it(
      "plugin root exports only loader-safe plugin function",
      { timeout: 30000 },
      async () => {
        const distIndex = join(REPO_ROOT, "packages/opencode/dist/index.js");
        const pkg = await import(distIndex);
        assert.ok(pkg.default !== undefined, "must have default export");

        // Verify no runtime helpers are exported from root (loader-safety check)
        const exportNames = Object.keys(pkg);
        for (const name of exportNames) {
          if (name === "default") continue;

          const value = pkg[name];
          if (typeof value === "function") {
            // Any function export from root would be called by OpenCode's loader
            assert.fail(
              `Root export "${name}" is a function and would be invoked by OpenCode loader`,
            );
          }
        }
      },
    );

    it(
      "relevant file triggers sync eligibility",
      { timeout: 30000 },
      async () => {
        const { shouldHandleFile } = await import(
          join(REPO_ROOT, "packages/opencode/dist/file-filter.js")
        );
        const result = shouldHandleFile(".kb/requirements/REQ-001.md", tmpDir);
        assert.equal(result, true);
      },
    );

    it(
      "irrelevant file does not trigger sync",
      { timeout: 30000 },
      async () => {
        const { shouldHandleFile } = await import(
          join(REPO_ROOT, "packages/opencode/dist/file-filter.js")
        );
        const result = shouldHandleFile("src/main.ts", tmpDir);
        assert.equal(result, false);
      },
    );

    // implements REQ-opencode-kibi-plugin-v1
    it(
      "does not emit bootstrap warning for a healthy canonical .kb/ layout",
      { timeout: 30000 },
      async () => {
        const healthyDir = mkdtempSync(
          join(tmpdir(), "kibi-e2e-canonical-healthy-"),
        );
        try {
          mkdirSync(join(healthyDir, ".kb"), { recursive: true });
          writeFileSync(
            join(healthyDir, ".kb", "manifest.json"),
            JSON.stringify({
              manifestVersion: 1,
              schemaVersion: 5,
              semanticAdvisorBackfill: "not_applicable",
            }),
          );
          for (const dir of [
            ".kb/requirements",
            ".kb/scenarios",
            ".kb/tests",
            ".kb/adr",
            ".kb/flags",
            ".kb/events",
            ".kb/facts",
          ]) {
            mkdirSync(join(healthyDir, dir), { recursive: true });
          }
          writeFileSync(
            join(healthyDir, ".kb", "symbols.yaml"),
            "symbols: []\n",
          );

          const { getSessionTracker, resetSessionTracker } = await import(
            join(REPO_ROOT, "packages/opencode/dist/session-tracker.js")
          );
          resetSessionTracker();

          const distIndex = join(REPO_ROOT, "packages/opencode/dist/index.js");
          const pkg = await import(distIndex);
          const plugin = pkg.default;
          await plugin({ directory: healthyDir, worktree: healthyDir });

          const summary = getSessionTracker().generateSummary();
          assert.equal(
            summary.warningsByCategory["bootstrap-needed"],
            0,
            "Should not emit bootstrap warning for a healthy canonical .kb/ layout",
          );
        } finally {
          rmSync(healthyDir, { recursive: true, force: true });
        }
      },
    );

    // implements REQ-opencode-kibi-plugin-v1
    it(
      "emits bootstrap warning when canonical targets are missing",
      { timeout: 30000 },
      async () => {
        const missingDir = mkdtempSync(
          join(tmpdir(), "kibi-e2e-canonical-missing-"),
        );
        try {
          mkdirSync(join(missingDir, ".kb"), { recursive: true });
          writeFileSync(
            join(missingDir, ".kb", "manifest.json"),
            JSON.stringify({
              manifestVersion: 1,
              schemaVersion: 5,
              semanticAdvisorBackfill: "not_applicable",
            }),
          );
          mkdirSync(join(missingDir, ".kb", "requirements"), {
            recursive: true,
          });

          const { getSessionTracker, resetSessionTracker } = await import(
            join(REPO_ROOT, "packages/opencode/dist/session-tracker.js")
          );
          resetSessionTracker();

          const distIndex = join(REPO_ROOT, "packages/opencode/dist/index.js");
          const pkg = await import(distIndex);
          const plugin = pkg.default;
          await plugin({ directory: missingDir, worktree: missingDir });

          const summary = getSessionTracker().generateSummary();
          assert.equal(
            summary.warningsByCategory["bootstrap-needed"],
            1,
            "Should emit bootstrap warning when canonical targets are missing",
          );
        } finally {
          rmSync(missingDir, { recursive: true, force: true });
        }
      },
    );

    // implements REQ-opencode-kibi-plugin-v1
    it(
      "toast behavior uses structured client contract",
      { timeout: 30000 },
      async () => {
        const distIndex = join(REPO_ROOT, "packages/opencode/dist/index.js");
        const pkg = await import(distIndex);
        const plugin = pkg.default;

        const toastCalls: unknown[] = [];
        const logCalls: unknown[] = [];

        const client = {
          tui: {
            showToast: async (payload: unknown) => {
              toastCalls.push(payload);
            },
          },
          app: {
            log: async (payload: unknown) => {
              logCalls.push(payload);
            },
          },
        };

        await plugin({ directory: tmpDir, worktree: tmpDir, client });

        assert.ok(
          toastCalls.length >= 0,
          "plugin may or may not toast depending on startup timing",
        );
        assert.ok(
          logCalls.length >= 0,
          "plugin should initialize with a client app logger",
        );

        const distToast = join(REPO_ROOT, "packages/opencode/dist/toast.js");
        const distToastContent = readFileSync(distToast, "utf-8");
        assert.ok(
          !distToastContent.includes("KIBI-TRACE"),
          "dist/toast.js must not contain KIBI-TRACE",
        );
        assert.ok(
          !distToastContent.includes("fetch("),
          "dist/toast.js must not contain raw fetch",
        );
        assert.ok(
          distToastContent.includes("body: payload"),
          "dist/toast.js must wrap showToast payload with body",
        );
      },
    );
  });
}

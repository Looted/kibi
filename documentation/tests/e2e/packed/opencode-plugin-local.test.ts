// Packed e2e test for local plugin loading
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
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
  describe(
    "opencode-plugin-local",
    { timeout: 120000 },
    () => {
      let tmpDir: string;

      before(
        async () => {
          // Build the opencode package so we can import from dist/
          execFileSync("bun", ["run", "build:opencode"], {
            cwd: REPO_ROOT,
            stdio: "pipe",
          });

          tmpDir = mkdtempSync(join(tmpdir(), "kibi-e2e-local-"));
          mkdirSync(join(tmpDir, ".kb"), { recursive: true });
          mkdirSync(join(tmpDir, "documentation", "requirements"), {
            recursive: true,
          });
          mkdirSync(join(tmpDir, "src"), { recursive: true });

          writeFileSync(
            join(tmpDir, ".kb", "config.json"),
            JSON.stringify({
              paths: {
                requirements: "documentation/requirements/**/*.md",
              },
            }),
          );
          writeFileSync(
            join(tmpDir, "documentation", "requirements", "REQ-001.md"),
            "---\nid: REQ-001\ntitle: Test Requirement\nstatus: active\n---\n# Test",
          );
          writeFileSync(join(tmpDir, "src", "main.ts"), "console.log('hello');");
        },
        { timeout: 60000 },
      );

      after(async () => {
        rmSync(tmpDir, { recursive: true, force: true });
      });

      it(
        "plugin package can be loaded",
        async () => {
          const distIndex = join(
            REPO_ROOT,
            "packages/opencode/dist/index.js",
          );
          const pkg = await import(distIndex);
          assert.ok(pkg.default !== undefined);
        },
        { timeout: 30000 },
      );

      it(
        "plugin exports required functions",
        async () => {
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
        },
        { timeout: 30000 },
      );

      it(
        "relevant file triggers sync eligibility",
        async () => {
          const { shouldHandleFile } = await import(
            join(REPO_ROOT, "packages/opencode/dist/file-filter.js")
          );
          const result = shouldHandleFile(
            "documentation/requirements/REQ-001.md",
            tmpDir,
          );
          assert.equal(result, true);
        },
        { timeout: 30000 },
      );

      it(
        "irrelevant file does not trigger sync",
        async () => {
          const { shouldHandleFile } = await import(
            join(REPO_ROOT, "packages/opencode/dist/file-filter.js")
          );
          const result = shouldHandleFile("src/main.ts", tmpDir);
          assert.equal(result, false);
        },
        { timeout: 30000 },
      );
    },
  );
}

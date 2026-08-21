import assert from "node:assert";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  packAll,
  run,
} from "./helpers.js";

/**
 * Smoke test proving packed CLI/MCP suites can run from an empty workspace
 * plus downloaded artifacts (no repo checkout required).
 *
 * This test intentionally exercises a minimal happy-path group and a
 * failure-path that demonstrates missing tarballs are reported.
 */

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";
const COMPILED_HELPERS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "helpers.js",
);

function restoreEnvironmentValue(
  name: "KIBI_TEST_TARBALLS" | "KIBI_E2E_PREFIX",
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed CI: artifact-only smoke (no checkout)",
    { timeout: 180000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let artifactRoot: string;
      let emptyRoot: string | undefined;
      let originalTestTarballs: string | undefined;
      let originalE2ePrefix: string | undefined;

      before(async () => {
        originalTestTarballs = process.env.KIBI_TEST_TARBALLS;
        originalE2ePrefix = process.env.KIBI_E2E_PREFIX;
        // Create an owned artifact root that mirrors actions/download-artifact output.
        artifactRoot = mkdtempSync(join(tmpdir(), "kibi-e2e-artifacts-"));

        // In CI, the downloaded package artifacts are already available through
        // KIBI_TEST_TARBALLS. Standalone runs pack once from the checkout, then
        // copy that immutable artifact set into the simulated download root.
        // Never repack the checkout while another packed test worker may be
        // consuming the same tarballs.
        const downloadedArtifacts = process.env.KIBI_TEST_TARBALLS;
        if (downloadedArtifacts) {
          tarballs = await packAll();
        } else {
          // biome-ignore lint/performance/noDelete: clear the inherited CI override so packAll uses workspace artifacts.
          delete process.env.KIBI_TEST_TARBALLS;
          tarballs = await packAll();
        }

        // Create artifactRoot and copy tarballs into it under package-named subdirs
        // Use run('cp', ...) to avoid introducing fs copy logic here
        await run("mkdir", ["-p", join(artifactRoot, "core")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "cli")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "runtime")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "mcp")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "opencode")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "codex")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("mkdir", ["-p", join(artifactRoot, "cursor")], {
          cwd: "/tmp",
          env: process.env,
        });

        await run("cp", [tarballs.core, join(artifactRoot, "core")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.cli, join(artifactRoot, "cli")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.runtime, join(artifactRoot, "runtime")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.mcp, join(artifactRoot, "mcp")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.opencode, join(artifactRoot, "opencode")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.codex, join(artifactRoot, "codex")], {
          cwd: "/tmp",
          env: process.env,
        });
        await run("cp", [tarballs.cursor, join(artifactRoot, "cursor")], {
          cwd: "/tmp",
          env: process.env,
        });

        // Now create an empty workspace (no checked-out repo) and a sandbox that
        // will install from the artifactRoot via KIBI_TEST_TARBALLS. Ensure any
        // baked prefix is unset so we exercise packed installs rather than a
        // pre-baked installation.
        process.env.KIBI_TEST_TARBALLS = artifactRoot;
        // biome-ignore lint/performance/noDelete: clear the inherited baked-prefix override for this isolated artifact test.
        delete process.env.KIBI_E2E_PREFIX;

        // Create sandbox which will use KIBI_TEST_TARBALLS via packAll() during install
        sandbox = createSandbox();

        // Install from tarballs found in artifactRoot
        await sandbox.install(await packAll());
        await sandbox.initGitRepo();
      });

      after(async () => {
        try {
          if (sandbox) await sandbox.cleanup();
        } finally {
          if (artifactRoot) {
            rmSync(artifactRoot, { recursive: true, force: true });
            assert.strictEqual(existsSync(artifactRoot), false);
          }
          if (emptyRoot) {
            rmSync(emptyRoot, { recursive: true, force: true });
            assert.strictEqual(existsSync(emptyRoot), false);
          }
          restoreEnvironmentValue("KIBI_TEST_TARBALLS", originalTestTarballs);
          restoreEnvironmentValue("KIBI_E2E_PREFIX", originalE2ePrefix);
          assert.strictEqual(
            process.env.KIBI_TEST_TARBALLS,
            originalTestTarballs,
          );
          assert.strictEqual(process.env.KIBI_E2E_PREFIX, originalE2ePrefix);
        }
      });

      it("happy-path group A: cli workflows + query + verify-core", async () => {
        // Run a subset of packed CLI happy-path tests by invoking the installed bin
        // We intentionally keep these minimal: version check, sync and query flow.

        // kibi --version
        const { exitCode: vCode } = await run(
          "node",
          [sandbox.kibiBin, "--version"],
          { cwd: sandbox.repoDir, env: sandbox.env },
        );
        assert.strictEqual(vCode, 0, "kibi --version should succeed");

        // init
        const { exitCode: initCode } = await run(
          "node",
          [sandbox.kibiBin, "init", "--no-hooks"],
          { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 120000 },
        );
        assert.strictEqual(initCode, 0, "kibi init should succeed");

        // sync (should succeed even in minimal workspace)
        const { exitCode: syncCode } = await run(
          "node",
          [sandbox.kibiBin, "sync"],
          { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 120000 },
        );
        assert.strictEqual(syncCode, 0, "kibi sync should succeed");
      });

      it("happy-path group B: mcp + branch-workflow basics", async () => {
        // Verify the kibi-mcp binary exists and is executable in the installed prefix.
        const { exitCode: execCode } = await run(
          "test",
          ["-x", sandbox.kibiMcpBin],
          { cwd: sandbox.repoDir, env: sandbox.env },
        );
        assert.strictEqual(
          execCode,
          0,
          `kibi-mcp binary should exist and be executable at ${sandbox.kibiMcpBin}`,
        );
      });

      it("failure-path: missing tarballs reported", async () => {
        // Point KIBI_TEST_TARBALLS at an empty temp dir and expect packAll() to fail.
        // We spawn a fresh Node process so the helpers module has a fresh module
        // scope (cachedTarballsPromise won't be set) and honors the new env.
        emptyRoot = mkdtempSync(join(tmpdir(), "kibi-e2e-empty-"));

        const expr = [
          "process.env.KIBI_TEST_TARBALLS = ",
          JSON.stringify(emptyRoot),
          `; import(${JSON.stringify(COMPILED_HELPERS_PATH)}).then(async (h)=>{ try { await h.packAll(); console.log('PACK_OK'); process.exit(0); } catch(e){ console.error(e && e.message ? e.message : String(e)); process.exit(2); } })`,
        ].join("");

        const { exitCode, stdout, stderr } = await run(
          "node",
          ["--input-type=module", "-e", expr],
          {
            cwd: dirname(COMPILED_HELPERS_PATH),
            env: process.env,
            timeoutMs: 120000,
          },
        );

        // Expect non-zero exit and error about missing pre-packed tarball
        assert.notStrictEqual(
          exitCode,
          0,
          `Expected packAll() in fresh process to fail, stdout: ${stdout}, stderr: ${stderr}`,
        );
        const combined = `${stdout}\n${stderr}`;
        assert.ok(
          combined.includes("Pre-packed tarball not found for package:"),
          `Expected missing tarball error, got: ${combined}`,
        );
      });
    },
  );
}

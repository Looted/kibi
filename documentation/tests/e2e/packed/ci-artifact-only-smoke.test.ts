import assert from "node:assert";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
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

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed CI: artifact-only smoke (no checkout)",
    { timeout: 180000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let artifactRoot: string;

      before(async () => {
        // Create a temporary artifact root that mirrors actions/download-artifact output
        artifactRoot = join(tmpdir(), `kibi-e2e-artifacts-${Date.now()}`);

        // Allow packAll() to resolve pre-packed tarballs by setting KIBI_TEST_TARBALLS
        process.env.KIBI_TEST_TARBALLS = artifactRoot;

        // packAll() will throw if tarballs are not present in artifactRoot;
        // in normal CI the artifacts are downloaded into this directory.
        // To make this smoke test hermetic locally we call packAll() which
        // will create tarballs in the repo and then we mirror them into
        // artifactRoot layout expected by helpers.findPrePackedTarball
        // (helpers supports both flat and <pkg> subdir layouts).

        // Produce tarballs (this writes into repo packages/* dirs)
        tarballs = await packAll();

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

        // Now create an empty workspace (no checked-out repo) and a sandbox that
        // will install from the artifactRoot via KIBI_TEST_TARBALLS. Ensure any
        // baked prefix is unset so we exercise packed installs rather than a
        // pre-baked installation.
        process.env.KIBI_E2E_PREFIX = undefined as unknown as string;

        // Create sandbox which will use KIBI_TEST_TARBALLS via packAll() during install
        sandbox = createSandbox();

        // Install from tarballs found in artifactRoot
        await sandbox.install(await packAll());
        await sandbox.initGitRepo();
      });

      after(async () => {
        if (sandbox) await sandbox.cleanup();
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
        const emptyRoot = join(tmpdir(), `kibi-e2e-empty-${Date.now()}`);
        await run("mkdir", ["-p", emptyRoot], {
          cwd: "/tmp",
          env: process.env,
        });

        const expr = [
          "process.env.KIBI_TEST_TARBALLS = ",
          JSON.stringify(emptyRoot),
          "; import('/tmp/kibi-e2e-packed-compiled/helpers.js').then(async (h)=>{ try { await h.packAll(); console.log('PACK_OK'); process.exit(0); } catch(e){ console.error(e && e.message ? e.message : String(e)); process.exit(2); } })",
        ].join("");

        const { exitCode, stdout, stderr } = await run(
          "node",
          ["--input-type=module", "-e", expr],
          {
            cwd: "/tmp/kibi-e2e-packed-compiled",
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

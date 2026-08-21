import assert from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  stopRuntimeEngines,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

export async function startPackedEngineDaemonAndQuery(
  sandbox: TestSandbox,
): Promise<{ success: boolean; error?: string }> {
  const runtimeEntry = join(
    sandbox.npmPrefix,
    "node_modules",
    "kibi-runtime",
    "dist",
    "index.js",
  );
  const installed = await import(pathToFileURL(runtimeEntry).href);
  assert.ok(
    typeof installed.EngineClient === "function",
    "installed kibi-runtime must export EngineClient",
  );

  // Route the spawned daemon into the sandbox runtime namespace so it shares
  // sockets and branch-store locks with engines started by sandboxed CLI
  // commands instead of fighting them for the rdf_db lock.
  const previousRuntimeDir = process.env.KIBI_RUNTIME_DIR;
  process.env.KIBI_RUNTIME_DIR = sandbox.runtimeDir;

  // The setup hook's `kibi sync` may leave an idle engine holding the branch
  // store. Stop owned engines first so the client starts against a quiescent
  // store instead of racing a dying daemon for the rdf_db lock.
  await stopRuntimeEngines(sandbox.runtimeDir);

  const client = new installed.EngineClient({
    workspaceRoot: sandbox.repoDir,
    branch: "develop",
    timeout: 120000,
  });
  try {
    await client.start();
    return await client.query("kb_storage_status(S)");
  } finally {
    await client.stop();
    if (previousRuntimeDir === undefined) {
      delete process.env.KIBI_RUNTIME_DIR;
    } else {
      process.env.KIBI_RUNTIME_DIR = previousRuntimeDir;
    }
  }
}

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Packed E2E: runtime ships a working engine daemon",
    { timeout: 240000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) {
            console.warn(
              "⚠️  SWI-Prolog not available, skipping engine daemon tests",
            );
            return;
          }

          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();

          await kibi(sandbox, ["init"]);

          createMarkdownFile(
            sandbox,
            ".kb/requirements/REQ-ENGINE-DAEMON-001.md",
            {
              id: "REQ-ENGINE-DAEMON-001",
              title: "Engine serves packed consumers",
              status: "open",
              tags: ["engine", "test"],
            },
            "The engine must serve typed queries for a packed consumer install.",
          );

          await kibi(sandbox, ["sync"]);
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          if (sandbox) {
            await sandbox.cleanup();
          }
        },
        { timeout: 120000 },
      );

      it("installed kibi-runtime must ship dist/engine-daemon.js", async () => {
        // SWI-Prolog is an optional local prerequisite for packed E2E runs.
        // The setup hook deliberately avoids creating a sandbox when it is
        // absent, so every test must honor the same skip boundary.
        if (!hasProlog) return;

        const daemonEntry = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-runtime",
          "dist",
          "engine-daemon.js",
        );
        assert.ok(
          existsSync(daemonEntry),
          `Expected bundled daemon at ${daemonEntry}`,
        );
      });

      it("EngineClient from the installed runtime must start the daemon and serve typed queries", async () => {
        if (!hasProlog) return;

        const result = await startPackedEngineDaemonAndQuery(sandbox);
        assert.ok(
          result.success,
          `kb_storage_status query failed: ${result.error ?? "unknown error"}`,
        );
      });
    },
  );
}

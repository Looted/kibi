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

  // `kibi sync` in the setup hook starts the CLI-owned daemon using the
  // sandbox runtime directory. Stop that daemon before exercising the
  // installed runtime so this test proves that its bundled daemon can own
  // the branch, rather than racing a second daemon against the same RDF
  // store. EngineClient reads KIBI_RUNTIME_DIR from the current process, not
  // from the child-process environment used by the kibi helper.
  await stopRuntimeEngines(sandbox.runtimeDir);
  const previousRuntimeDir = process.env.KIBI_RUNTIME_DIR;
  const previousNodePath = process.env.KIBI_NODE_PATH;
  process.env.KIBI_RUNTIME_DIR = sandbox.runtimeDir;
  process.env.KIBI_NODE_PATH = process.execPath;
  let client: InstanceType<typeof installed.EngineClient> | undefined;
  try {
    client = new installed.EngineClient({
      workspaceRoot: sandbox.repoDir,
      branch: "develop",
      timeout: 120000,
    });
    await client.start();
    return await client.query("kb_storage_status(S)");
  } finally {
    try {
      // A failed start may have no reachable daemon to stop. Avoid masking the
      // original startup error by asking EngineClient not to auto-start again;
      // the sandbox cleanup still reaps any daemon process left behind.
      await client?.stop(false);
    } finally {
      if (previousRuntimeDir === undefined) {
        // biome-ignore lint/performance/noDelete: restore the caller's absent environment variable exactly.
        delete process.env.KIBI_RUNTIME_DIR;
      } else {
        process.env.KIBI_RUNTIME_DIR = previousRuntimeDir;
      }
      if (previousNodePath === undefined) {
        // biome-ignore lint/performance/noDelete: restore the caller's absent environment variable exactly.
        delete process.env.KIBI_NODE_PATH;
      } else {
        process.env.KIBI_NODE_PATH = previousNodePath;
      }
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

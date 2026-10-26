import assert from "node:assert";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: SCEN-cli-subdirectory-workspace — a kibi command typed in a
 * subdirectory of a Kibi workspace answers from the workspace's knowledge
 * base, and does not compile a second, empty one where it was typed.
 * Relative path options still resolve from the subdirectory.
 */
export async function checkSubdirectoryWorkspace(
  sandbox: TestSandbox,
): Promise<void> {
  createMarkdownFile(
    sandbox,
    ".kb/requirements/REQ-SUBDIR-ANSWER.md",
    {
      id: "REQ-SUBDIR-ANSWER",
      title: "A requirement the workspace knows",
      status: "open",
    },
    "Queries typed in a subdirectory find this requirement in the workspace knowledge base.",
  );
  stageSourceFile(sandbox, ".kb/requirements/REQ-SUBDIR-ANSWER.md");
  const synced = await kibi(sandbox, ["sync"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);

  const subdirectory = join(sandbox.repoDir, "apps", "server");
  mkdirSync(subdirectory, { recursive: true });
  writeFileSync(
    join(subdirectory, "query-request.json"),
    JSON.stringify({ type: "req" }),
  );
  const nested = await kibi(
    sandbox,
    ["query", "--input", "query-request.json"],
    { cwd: "apps/server" },
  );
  assert.strictEqual(nested.exitCode, 0, nested.stdout + nested.stderr);
  assert.match(nested.stdout, /REQ-SUBDIR-ANSWER/, nested.stdout);
  assert.ok(
    !existsSync(join(subdirectory, ".kb")),
    "kibi compiled a second knowledge base in the subdirectory",
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: kibi in a subdirectory of the workspace", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init", "--no-hooks"]);
      },
      { timeout: 240000 },
    );

    after(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 120000 },
    );

    it(
      "answers from the workspace knowledge base",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkSubdirectoryWorkspace(sandbox);
      },
    );
  });
}

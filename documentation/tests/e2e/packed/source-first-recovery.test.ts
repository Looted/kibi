import assert from "node:assert";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * Proof-bearing source-first smoke: Git is the input authority, authored
 * source survives a compile/query round trip, and arbitrary untracked files
 * remain out of the compiled branch store.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: source-first and tracked-input proof", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (hasProlog) tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
      },
      { timeout: 120000 },
    );

    afterEach(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 120000 },
    );

    it("compiles tracked source and refuses arbitrary untracked input", async () => {
      if (!hasProlog) return;
      await kibi(sandbox, ["init", "--no-hooks"]);
      createMarkdownFile(
        sandbox,
        "documentation/requirements/REQ-SOURCE-FIRST-E2E.md",
        {
          id: "REQ-SOURCE-FIRST-E2E",
          title: "Source-first proof",
          type: "req",
          status: "open",
        },
        "The source file is authoritative.",
      );
      const first = await kibi(sandbox, ["sync"]);
      assert.strictEqual(first.exitCode, 0, first.stderr);
      const query = await kibi(sandbox, ["query", "req", "--format", "json"]);
      assert.strictEqual(query.exitCode, 0, query.stderr);
      assert.match(query.stdout, /REQ-SOURCE-FIRST-E2E/);

      const untracked = join(
        sandbox.repoDir,
        "documentation/requirements/REQ-UNTRACKED-E2E.md",
      );
      mkdirSync(join(untracked, ".."), { recursive: true });
      writeFileSync(
        untracked,
        "---\nid: REQ-UNTRACKED-E2E\ntype: req\ntitle: Untracked\n---\n",
      );
      const second = await kibi(sandbox, ["sync"]);
      assert.strictEqual(second.exitCode, 0, second.stderr);
      const after = await kibi(sandbox, ["query", "req", "--format", "json"]);
      assert.strictEqual(after.exitCode, 0, after.stderr);
      assert.doesNotMatch(after.stdout, /REQ-UNTRACKED-E2E/);

      const trackedContent = readFileSync(
        join(
          sandbox.repoDir,
          "documentation/requirements/REQ-SOURCE-FIRST-E2E.md",
        ),
        "utf8",
      );
      assert.match(trackedContent, /The source file is authoritative/);
      await run("git", ["status", "--short"], {
        cwd: sandbox.repoDir,
        env: sandbox.env,
      });
      assert.ok(existsSync(join(sandbox.repoDir, ".kb", "branches")));
    });
  });
}

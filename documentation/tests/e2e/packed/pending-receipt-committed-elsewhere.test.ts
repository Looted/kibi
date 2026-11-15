import assert from "node:assert";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: a receipt whose file another local branch committed is retired.
 *
 * SCEN-kibi-pending-receipt-committed-elsewhere — an entity upserted on
 * develop leaves a pending-source receipt. The file is committed on a new
 * branch without a sync there, and develop is checked out again: `kibi sync`
 * on develop succeeds and retires the receipt, because that branch's Git
 * owns the file. Once no local branch holds the file, sync fails as missing.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: pending-source receipt for a file committed elsewhere",
    { timeout: 240000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;

      const git = async (...args: string[]): Promise<void> => {
        const result = await run("git", args, {
          cwd: sandbox.repoDir,
          env: sandbox.env,
          timeoutMs: 120000,
        });
        assert.strictEqual(
          result.exitCode,
          0,
          `git ${args.join(" ")}: ${result.stdout}${result.stderr}`,
        );
      };

      const receipts = (): Array<{ path?: string; branch?: string }> => {
        const root = join(
          sandbox.repoDir,
          ".kb",
          "recovery",
          "pending-sources",
        );
        if (!existsSync(root)) return [];
        return readdirSync(root)
          .filter((name) => name.endsWith(".json"))
          .map((name) => JSON.parse(readFileSync(join(root, name), "utf8")));
      };

      const sync = async (): Promise<void> => {
        const result = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          result.exitCode,
          0,
          `${result.stdout}${result.stderr}`,
        );
      };

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          await kibi(sandbox, ["init", "--no-hooks"]);
          await git("add", "-A");
          await git("commit", "-q", "--no-verify", "-m", "init");
          await sync();
        },
        { timeout: 180000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "retires a receipt whose file another branch committed without a sync",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const path = ".kb/scenarios/SCEN-COMMITTED-ELSEWHERE.md";
          const request = join(
            sandbox.repoDir,
            "..",
            "committed-elsewhere.json",
          );
          writeFileSync(
            request,
            JSON.stringify({
              type: "scenario",
              id: "SCEN-COMMITTED-ELSEWHERE",
              properties: { title: "Committed elsewhere", status: "active" },
              document: {
                path,
                body: "Given a scenario authored on develop, when it is committed on a new branch without a sync there, then develop still syncs.",
              },
            }),
          );
          const upsert = await kibi(sandbox, ["upsert", "--input", request]);
          assert.strictEqual(
            upsert.exitCode,
            0,
            `${upsert.stdout}${upsert.stderr}`,
          );
          assert.deepStrictEqual(
            receipts().map(({ branch }) => branch),
            ["develop"],
          );

          await git("checkout", "-q", "-b", "elsewhere");
          await git("add", path);
          await git("commit", "-q", "--no-verify", "-m", "elsewhere");
          await git("checkout", "-q", "develop");
          assert.ok(!existsSync(join(sandbox.repoDir, path)));
          assert.strictEqual(receipts().length, 1, "no sync ran on elsewhere");

          await sync();
          assert.deepStrictEqual(
            receipts(),
            [],
            "develop retires the receipt of a file another branch committed",
          );
        },
      );

      it(
        "still fails as missing when no local branch holds the file",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          const path = ".kb/scenarios/SCEN-LOST-FILE.md";
          const request = join(sandbox.repoDir, "..", "lost-file.json");
          writeFileSync(
            request,
            JSON.stringify({
              type: "scenario",
              id: "SCEN-LOST-FILE",
              properties: { title: "Lost file", status: "active" },
              document: {
                path,
                body: "Given a scenario whose file is committed on a branch that is then deleted, when develop syncs, then the file is reported missing.",
              },
            }),
          );
          const upsert = await kibi(sandbox, ["upsert", "--input", request]);
          assert.strictEqual(
            upsert.exitCode,
            0,
            `${upsert.stdout}${upsert.stderr}`,
          );
          await git("checkout", "-q", "-b", "doomed");
          await git("add", path);
          await git("commit", "-q", "--no-verify", "-m", "doomed");
          await git("checkout", "-q", "develop");
          await git("branch", "-q", "-D", "doomed");

          const result = await kibi(sandbox, ["sync"]);
          assert.notStrictEqual(result.exitCode, 0, result.stdout);
          assert.match(
            `${result.stdout}${result.stderr}`,
            /Pending source is missing: \.kb\/scenarios\/SCEN-LOST-FILE\.md/,
          );
        },
      );
    },
  );
}

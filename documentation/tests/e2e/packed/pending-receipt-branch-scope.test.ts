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

const SCENARIO_PATH = ".kb/scenarios/SCEN-BRANCH-RECEIPT.md";

/**
 * E2E: a pending-source receipt is scoped to the branch it was written on.
 *
 * SCEN-kibi-pending-receipt-branch-scope — an entity upserted on a feature
 * branch leaves a pending-source receipt that records that branch. After the
 * file is committed there and the workspace checks out a branch without it,
 * `kibi sync` succeeds instead of failing on a missing pending source; back
 * on the feature branch, sync consumes the receipt because Git tracks the
 * file.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: pending-source receipts across branches",
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
          await kibi(sandbox, ["init"]);
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
        "syncs a branch without the file a receipt from another branch binds",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          await git("checkout", "-q", "-b", "feature");
          const request = join(sandbox.repoDir, "..", "branch-receipt.json");
          writeFileSync(
            request,
            JSON.stringify({
              type: "scenario",
              id: "SCEN-BRANCH-RECEIPT",
              properties: { title: "Branch receipt", status: "active" },
              document: {
                path: SCENARIO_PATH,
                body: "Given a scenario authored on a feature branch, when another branch is checked out, then that branch still syncs.",
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
            receipts().map(({ path, branch }) => ({ path, branch })),
            [{ path: SCENARIO_PATH, branch: "feature" }],
          );

          await git("add", SCENARIO_PATH);
          await git("commit", "-q", "--no-verify", "-m", "scenario");
          await git("checkout", "-q", "develop");
          assert.ok(
            !existsSync(join(sandbox.repoDir, SCENARIO_PATH)),
            "the scenario exists only on the feature branch",
          );

          await sync();
          assert.strictEqual(
            receipts().length,
            1,
            "develop leaves the feature branch's receipt in place",
          );

          await git("checkout", "-q", "feature");
          await sync();
          assert.deepStrictEqual(
            receipts(),
            [],
            "the feature branch consumes its receipt once Git tracks the file",
          );
        },
      );

      it(
        "retires a receipt written on develop once another branch commits its file",
        { timeout: 180000 },
        async (t) => {
          if (!hasProlog) {
            t.skip("SWI-Prolog is not available");
            return;
          }
          await git("checkout", "-q", "develop");
          const path = ".kb/scenarios/SCEN-BRANCHED-OFF.md";
          const request = join(sandbox.repoDir, "..", "branched-off.json");
          writeFileSync(
            request,
            JSON.stringify({
              type: "scenario",
              id: "SCEN-BRANCHED-OFF",
              properties: { title: "Branched off", status: "active" },
              document: {
                path,
                body: "Given a scenario authored on develop, when it is committed on a new branch, then develop still syncs.",
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

          await git("checkout", "-q", "-b", "branched-off");
          await git("add", path);
          await git("commit", "-q", "--no-verify", "-m", "branched off");
          await sync();
          assert.deepStrictEqual(
            receipts(),
            [],
            "the branch that tracks the file retires develop's receipt",
          );

          await git("checkout", "-q", "develop");
          assert.ok(!existsSync(join(sandbox.repoDir, path)));
          await sync();
        },
      );
    },
  );
}

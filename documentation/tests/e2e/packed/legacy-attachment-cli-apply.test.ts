import assert from "node:assert";
import { existsSync, readdirSync, renameSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  exactBranchStorePath,
  kibi,
  packAll,
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type Plan = Readonly<{
  planHash: string;
  actions: readonly Readonly<{ id: string; code: string; state: string }>[];
}>;

/**
 * E2E: kibi migrate --apply-safe migrates an attached legacy branch store.
 *
 * SCEN-kibi-cli-legacy-apply-safe — through the installed CLI, the plan
 * `kibi migrate` previews for a legacy literal-path store applies with
 * `--apply-safe <hash>`: the legacy migration runs against the store the
 * plan previewed, and no empty hashed store is created beside it first.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: legacy branch attachment CLI apply",
    { timeout: 300000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox | undefined;
      let legacyStore = "";

      before(
        async () => {
          if (!checkPrologAvailable()) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          createMarkdownFile(
            sandbox,
            ".kb/requirements/REQ-LEGACY-CLI-E2E.md",
            {
              id: "REQ-LEGACY-CLI-E2E",
              title: "Legacy attachment CLI apply fixture",
              type: "req",
              status: "open",
            },
            "The legacy store keeps this requirement through its migration.",
          );
          await run("git", ["commit", "-m", "add legacy cli fixture"], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
          });
          assert.strictEqual(
            (await kibi(sandbox, ["init", "--no-hooks"])).exitCode,
            0,
          );
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
          // An older Kibi kept each branch's store at its literal name; the
          // upgrade starts with no engine serving it.
          const stopped = await kibi(sandbox, ["engine", "stop"]);
          assert.strictEqual(stopped.exitCode, 0, stopped.stderr);
          legacyStore = join(sandbox.repoDir, ".kb", "branches", "develop");
          renameSync(
            exactBranchStorePath(sandbox.repoDir, "develop"),
            legacyStore,
          );
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "applies the previewed legacy migration with --apply-safe",
        { timeout: 180000 },
        async (testContext) => {
          if (!sandbox) {
            testContext.skip("SWI-Prolog is unavailable");
            return;
          }
          const preview = await kibi(sandbox, ["migrate", "--format", "json"]);
          assert.strictEqual(preview.exitCode, 0, preview.stderr);
          const plan = JSON.parse(preview.stdout) as Plan;
          const legacy = plan.actions.find(
            (action) => action.code === "legacy_branch_storage",
          );
          assert.strictEqual(legacy?.state, "ready", preview.stdout);
          assert.ok(
            !existsSync(exactBranchStorePath(sandbox.repoDir, "develop")),
            "the preview creates no hashed store",
          );

          const applied = await kibi(sandbox, [
            "migrate",
            "--apply-safe",
            plan.planHash,
          ]);
          assert.strictEqual(
            applied.exitCode,
            0,
            `${applied.stdout}${applied.stderr}`,
          );
          assert.match(applied.stdout, /Outcome: applied/);
          assert.match(
            applied.stdout,
            new RegExp(`applied ${legacy?.id}: Applied legacy_branch_storage`),
          );
          assert.ok(!existsSync(legacyStore), "the legacy store is migrated");
          assert.deepStrictEqual(
            readdirSync(join(sandbox.repoDir, ".kb", "branches")),
            [exactBranchStorePath(sandbox.repoDir, "develop").split("/").pop()],
            "only the migrated hashed store remains",
          );

          const query = await kibi(sandbox, [
            "query",
            "req",
            "--format",
            "json",
          ]);
          assert.strictEqual(query.exitCode, 0, query.stderr);
          assert.deepStrictEqual(
            (JSON.parse(query.stdout) as { id: string }[]).map(
              (entity) => entity.id,
            ),
            ["REQ-LEGACY-CLI-E2E"],
          );
        },
      );
    },
  );
}

import assert from "node:assert";
import { existsSync, renameSync, writeFileSync } from "node:fs";
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
import { mcpToolPayload, startMcpStdioServer } from "./mcp-stdio-client.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type Action = Readonly<{
  id: string;
  code: string;
  state: string;
  safety: string;
  invocation?: { command_argv?: readonly string[] };
}>;
type Plan = Readonly<{ planHash: string; actions: readonly Action[] }>;
type Status = Readonly<{
  syncState?: string;
  migrationPlan?: Plan;
  branchAttachment?: { kind?: string; migrationRequired?: boolean };
  branchStore?: { state?: string };
}>;

function resultText(result: Record<string, unknown>): string {
  const content = Array.isArray(result.content) ? result.content : [];
  return content
    .map((part) => String((part as { text?: unknown }).text ?? ""))
    .join("\n");
}

/**
 * E2E: kb_apply_plan migrates an attached legacy literal-path branch store.
 *
 * SCEN-kibi-legacy-attachment-apply-migration — through the installed MCP
 * server, the legacy store a project still attaches is migrated by the plan
 * kb_status previews, only when that plan approves its migration action, and
 * only while the store still matches the preview.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: legacy branch attachment plan apply",
    { timeout: 300000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;
      let server: Awaited<ReturnType<typeof startMcpStdioServer>> | undefined;
      let legacyStore = "";

      const status = async (): Promise<Status> => {
        assert.ok(server, "the MCP server is running");
        return mcpToolPayload(await server.call("kb_status", {})) as Status;
      };

      const legacyAction = (plan: Plan): Action => {
        const action = plan.actions.find(
          (candidate) => candidate.code === "legacy_branch_storage",
        );
        assert.ok(
          action,
          `no legacy migration action: ${JSON.stringify(plan)}`,
        );
        return action;
      };

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          createMarkdownFile(
            sandbox,
            ".kb/requirements/REQ-LEGACY-APPLY-E2E.md",
            {
              id: "REQ-LEGACY-APPLY-E2E",
              title: "Legacy attachment apply fixture",
              type: "req",
              status: "open",
            },
            "The legacy store keeps this requirement through its migration.",
          );
          await run("git", ["commit", "-m", "add legacy apply fixture"], {
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
          server = await startMcpStdioServer({
            command: "node",
            args: [sandbox.kibiMcpBin],
            cwd: sandbox.repoDir,
            env: sandbox.env,
          });
        },
        { timeout: 240000 },
      );

      after(
        async () => {
          if (server) await server.close();
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "refuses a plan that does not approve the legacy migration",
        { timeout: 120000 },
        async (testContext) => {
          if (!server) {
            testContext.skip("SWI-Prolog is unavailable");
            return;
          }
          const plan = (await status()).migrationPlan;
          assert.ok(plan, "kb_status must preview a migration plan");
          const others = plan.actions
            .filter(
              (action) =>
                action.code !== "legacy_branch_storage" &&
                action.safety === "automatic",
            )
            .map((action) => action.id);
          const refused = await server.call("kb_apply_plan", {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: others,
          });
          assert.strictEqual(refused.isError, true, JSON.stringify(refused));
          assert.match(
            resultText(refused),
            /Legacy branch attachment requires explicit migration/,
          );
          assert.ok(existsSync(legacyStore), "the legacy store must stay put");
        },
      );

      it(
        "refuses a migration approved before the legacy store changed",
        { timeout: 120000 },
        async (testContext) => {
          if (!server) {
            testContext.skip("SWI-Prolog is unavailable");
            return;
          }
          const plan = (await status()).migrationPlan;
          assert.ok(plan, "kb_status must preview a migration plan");
          const action = legacyAction(plan);
          const marker = join(legacyStore, "changed-after-preview.txt");
          writeFileSync(marker, "written after the preview\n");
          const refused = await server.call("kb_apply_plan", {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: [action.id],
          });
          const result = mcpToolPayload(refused) as {
            outcome?: string;
            actionResults?: {
              actionId: string;
              outcome: string;
              detail?: string;
            }[];
          };
          assert.strictEqual(result.outcome, "refused", JSON.stringify(result));
          const migration = result.actionResults?.find(
            (entry) => entry.actionId === action.id,
          );
          assert.strictEqual(
            migration?.outcome,
            "failed",
            JSON.stringify(result),
          );
          assert.match(
            String(migration?.detail),
            /changed after its migration preview/,
          );
          assert.ok(existsSync(marker), "the changed store must stay put");
          assert.ok(
            !existsSync(exactBranchStorePath(sandbox.repoDir, "develop")),
            "no hashed store may be created from a stale approval",
          );
        },
      );

      it(
        "applies the approved migration first and attaches the hashed store",
        { timeout: 180000 },
        async (testContext) => {
          if (!server) {
            testContext.skip("SWI-Prolog is unavailable");
            return;
          }
          const before = await status();
          assert.strictEqual(before.branchAttachment?.kind, "legacy_compat");
          const plan = before.migrationPlan;
          assert.ok(plan, "kb_status must preview a migration plan");
          const action = legacyAction(plan);
          assert.strictEqual(action.state, "ready");
          const argv = action.invocation?.command_argv ?? [];
          assert.match(
            String(argv[argv.indexOf("--approval-hash") + 1]),
            /^[a-f0-9]{64}$/,
            `the migration action must carry the preview hash: ${JSON.stringify(argv)}`,
          );
          const applied = await server.call("kb_apply_plan", {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: plan.actions
              .filter((candidate) => candidate.safety === "automatic")
              .map((candidate) => candidate.id),
          });
          assert.notStrictEqual(
            applied.isError,
            true,
            `apply failed: ${resultText(applied)}`,
          );
          assert.ok(
            !existsSync(legacyStore),
            `the legacy store is migrated: ${resultText(applied)} ${JSON.stringify(applied.structuredContent)}`,
          );
          const appliedResult = mcpToolPayload(applied) as {
            outcome?: string;
            closeout?: { kbState?: string; taskOutcome?: string };
          };
          assert.strictEqual(
            appliedResult.outcome,
            "applied",
            JSON.stringify(appliedResult),
          );
          assert.strictEqual(
            appliedResult.closeout?.kbState,
            "clean_fresh",
            "the closeout reads the attachment the migration left",
          );
          assert.ok(
            existsSync(exactBranchStorePath(sandbox.repoDir, "develop")),
            "the hashed store exists",
          );
          const afterStatus = await status();
          assert.strictEqual(afterStatus.branchAttachment?.kind, "exact");
          assert.strictEqual(
            afterStatus.branchAttachment?.migrationRequired,
            false,
          );
          assert.strictEqual(afterStatus.syncState, "fresh");
          const query = mcpToolPayload(
            await server.call("kb_query", { id: "REQ-LEGACY-APPLY-E2E" }),
          ) as { entities?: { id: string }[] };
          assert.deepStrictEqual(
            (query.entities ?? []).map((entity) => entity.id),
            ["REQ-LEGACY-APPLY-E2E"],
          );
        },
      );
    },
  );
}

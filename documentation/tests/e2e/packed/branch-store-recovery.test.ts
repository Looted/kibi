import assert from "node:assert";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
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

export function assertExactBranchRecoveryOutcome(
  statusOutput: string,
  recoveryRoot: string,
): void {
  const status = JSON.parse(statusOutput) as {
    syncState: string;
    branchStore: { state: string };
  };
  assert.strictEqual(status.syncState, "fresh");
  assert.strictEqual(status.branchStore.state, "healthy");
  assert.strictEqual(readdirSync(recoveryRoot).length, 1);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: exact branch-store recovery contract", () => {
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

    it(
      "enforces exact identity, bounded migration, and explicit recovery",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        assert.strictEqual(
          sandbox.env.KIBI_BRANCH,
          undefined,
          "packed sandboxes must not inherit host KIBI_BRANCH",
        );

        createMarkdownFile(
          sandbox,
          ".kb/requirements/REQ-BRANCH-RECOVERY-E2E.md",
          {
            id: "REQ-BRANCH-RECOVERY-E2E",
            title: "Exact branch recovery fixture",
            type: "req",
            status: "open",
          },
          "Branch recovery is explicit.",
        );
        await run("git", ["commit", "-m", "add branch recovery fixture"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        createMarkdownFile(
          sandbox,
          ".kb/requirements/REQ-BRANCH-HISTORY-OLD.md",
          {
            id: "REQ-BRANCH-HISTORY-OLD",
            title: "Legacy branch history fixture",
            type: "req",
            status: "open",
          },
          "Reference material.",
        );
        await run("git", ["commit", "-m", "add legacy branch policy"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        createMarkdownFile(
          sandbox,
          ".kb/requirements/REQ-BRANCH-HISTORY-NEW.md",
          {
            id: "REQ-BRANCH-HISTORY-NEW",
            title: "Replacement branch history fixture",
            type: "req",
            status: "open",
          },
          "Reference material.",
        );
        await run("git", ["commit", "-m", "add replacement branch policy"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.strictEqual(
          (await kibi(sandbox, ["init", "--no-hooks"])).exitCode,
          0,
        );
        const initialSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(initialSync.exitCode, 0, initialSync.stderr);

        const reversedSupersedesInput = join(
          sandbox.repoDir,
          "reversed-supersedes.json",
        );
        writeFileSync(
          reversedSupersedesInput,
          JSON.stringify({
            type: "req",
            id: "REQ-BRANCH-HISTORY-OLD",
            properties: {
              title: "Legacy branch history fixture",
              status: "open",
              source: ".kb/requirements/REQ-BRANCH-HISTORY-OLD.md",
            },
            relationships: [
              {
                type: "supersedes",
                from: "REQ-BRANCH-HISTORY-OLD",
                to: "REQ-BRANCH-HISTORY-NEW",
              },
            ],
          }),
        );
        const reversedSupersedes = await kibi(sandbox, [
          "upsert",
          "--input",
          reversedSupersedesInput,
        ]);
        const reversedSupersedesOutput =
          reversedSupersedes.stdout + reversedSupersedes.stderr;
        assert.notStrictEqual(
          reversedSupersedes.exitCode,
          0,
          reversedSupersedesOutput,
        );
        assert.match(
          reversedSupersedesOutput,
          /Invalid supersedes direction.*new -> old/,
        );

        const developStore = exactBranchStorePath(sandbox.repoDir, "develop");
        writeFileSync(join(developStore, "CURRENT"), "corrupted-pointer\n");
        const preview = await kibi(sandbox, ["branch", "recover"]);
        assert.strictEqual(preview.exitCode, 0, preview.stderr);
        assert.match(preview.stdout, /Preview only/);
        assert.strictEqual(
          readFileSync(join(developStore, "CURRENT"), "utf8"),
          "corrupted-pointer\n",
        );

        const recovery = await kibi(sandbox, ["branch", "recover", "--apply"]);
        assert.strictEqual(recovery.exitCode, 0, recovery.stderr);
        assert.match(recovery.stdout, /Original bytes preserved/);
        const status = await kibi(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(status.exitCode, 0, status.stderr);
        assertExactBranchRecoveryOutcome(
          status.stdout,
          join(sandbox.repoDir, ".kb", "recovery", "develop"),
        );

        await run("git", ["checkout", "-b", "feature/exact"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        const ensured = await kibi(sandbox, ["branch", "ensure"]);
        assert.strictEqual(ensured.exitCode, 0, ensured.stderr);
        const featureStore = exactBranchStorePath(
          sandbox.repoDir,
          "feature/exact",
        );
        assert.ok(existsSync(join(featureStore, "branch.json")));
        assert.ok(!existsSync(join(featureStore, "kb.rdf")));

        const copyAttempt = await kibi(sandbox, [
          "branch",
          "ensure",
          "--from",
          "develop",
        ]);
        assert.notStrictEqual(copyAttempt.exitCode, 0);
        assert.match(copyAttempt.stderr, /branch ensure --from was removed/);

        const unrelated = join(sandbox.repoDir, ".kb", "branches", "unrelated");
        mkdirSync(unrelated, { recursive: true });
        writeFileSync(join(unrelated, "kb.rdf"), "<rdf:RDF></rdf:RDF>");
        const migration = await kibi(sandbox, [
          "branch",
          "migrate",
          "--from",
          "unrelated",
          "--to",
          "feature/exact",
        ]);
        assert.notStrictEqual(migration.exitCode, 0);
        assert.match(migration.stderr, /every cross-branch move is refused/);
        assert.ok(existsSync(unrelated));
      },
    );
  });
}

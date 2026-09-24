import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  parseKibiResult,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface StatusJson {
  proofSnapshot: string;
  proofSnapshotAvailable: boolean;
  proofSnapshotDirty: boolean;
  proofSnapshotChangeCount: number;
  proofSnapshotChanges?: Array<{
    path: string;
    status: string;
    snapshotRelevant?: boolean;
  }>;
  syncState: string;
}

/**
 * E2E: operational artifacts never dirty the verification snapshot.
 *
 * SCEN-kibi-snapshot-relevance — excluded operational artifacts and
 * receipt-only edits to tracked proof documents keep the verification
 * snapshot clean, while any edit outside receipt frontmatter dirties it.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: snapshot relevance of operational artifacts",
    { timeout: 240000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;
      let hasProlog = false;
      let baselineSnapshot = "";

      before(
        async () => {
          hasProlog = checkPrologAvailable();
          if (!hasProlog) return;
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();
          await kibi(sandbox, ["init"]);

          mkdirSync(join(sandbox.repoDir, ".kb", "tests"), { recursive: true });
          writeFileSync(
            join(sandbox.repoDir, ".kb", "tests", "TEST-SNAPSHOT-REL.md"),
            `---
id: TEST-SNAPSHOT-REL
title: Snapshot relevance fixture
status: passing
verification_scope: end_to_end
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-snapshotrelevance0000000000
    test_id: TEST-SNAPSHOT-REL
    scope: end_to_end
    outcome: passed
    code_snapshot: 0000000000000000000000000000000000000000000000000000000000000000
    environment_hash: 0000000000000000000000000000000000000000000000000000000000000000
    started_at: '2026-01-01T00:00:00.000Z'
    finished_at: '2026-01-01T00:00:01.000Z'
    artifact_digest: 0000000000000000000000000000000000000000000000000000000000000000
    contract_hash: 0000000000000000000000000000000000000000000000000000000000000000
    fingerprint: 0000000000000000000000000000000000000000000000000000000000000000
    fingerprint_components:
      contract: 0000000000000000000000000000000000000000000000000000000000000000
      integration: 0000000000000000000000000000000000000000000000000000000000000000
      command: 0000000000000000000000000000000000000000000000000000000000000000
      bindings: 0000000000000000000000000000000000000000000000000000000000000000
      producer: 0000000000000000000000000000000000000000000000000000000000000000
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
---

Snapshot relevance fixture body.
`,
          );
          stageSourceFile(sandbox, ".kb/tests/TEST-SNAPSHOT-REL.md");
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
          // Commit the complete workspace (init files included) so the
          // receipt-only comparison has a HEAD and the baseline status is clean.
          const addAll = await run("git", ["add", "-A"], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
          });
          assert.strictEqual(
            addAll.exitCode,
            0,
            `${addAll.stdout}${addAll.stderr}`,
          );
          const commit = await run(
            "git",
            ["commit", "-m", "fixture baseline", "--no-verify"],
            { cwd: sandbox.repoDir, env: sandbox.env },
          );
          assert.strictEqual(
            commit.exitCode,
            0,
            `${commit.stdout}${commit.stderr}`,
          );
          const baseline = await readStatus();
          assert.strictEqual(
            baseline.proofSnapshotDirty,
            false,
            `baseline must be clean: ${JSON.stringify(baseline.proofSnapshotChanges ?? [])}`,
          );
          baselineSnapshot = baseline.proofSnapshot;
        },
        { timeout: 180000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      async function readStatus(): Promise<StatusJson> {
        const status = await kibi(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(
          status.exitCode,
          0,
          `${status.stdout}${status.stderr}`,
        );
        return parseKibiResult<StatusJson>(status.stdout);
      }

      it(
        "keeps the snapshot clean when only an excluded operational artifact changes",
        { timeout: 90000 },
        async () => {
          mkdirSync(join(sandbox.repoDir, ".kb", "proof", "runs"), {
            recursive: true,
          });
          writeFileSync(
            join(sandbox.repoDir, ".kb", "proof", "runs", "self-proof.json"),
            '{"operational":true}\n',
            "utf8",
          );

          const status = await readStatus();
          assert.strictEqual(
            status.proofSnapshotDirty,
            false,
            `operational run artifacts must never dirty the verification snapshot: ${JSON.stringify(status.proofSnapshotChanges ?? [])}`,
          );
          assert.strictEqual(status.proofSnapshot, baselineSnapshot);
          assert.strictEqual(status.proofSnapshotChangeCount, 0);
        },
      );

      it(
        "keeps the snapshot hash unchanged for receipt-only proof document edits",
        { timeout: 90000 },
        async () => {
          const docPath = join(
            sandbox.repoDir,
            ".kb",
            "tests",
            "TEST-SNAPSHOT-REL.md",
          );
          const original = readFileSync(docPath, "utf8");
          const appended = original.replace(
            "run_outcome: passed\n",
            "run_outcome: passed\n    receipt_note: appended receipt-only line\n",
          );
          assert.notStrictEqual(appended, original);
          writeFileSync(docPath, appended, "utf8");

          const status = await readStatus();
          assert.strictEqual(
            status.proofSnapshot,
            baselineSnapshot,
            "receipt-only frontmatter edits must not change the snapshot hash",
          );
          assert.strictEqual(status.proofSnapshotDirty, false);
        },
      );

      it(
        "dirties the snapshot when a proof document changes outside receipts",
        { timeout: 90000 },
        async () => {
          const docPath = join(
            sandbox.repoDir,
            ".kb",
            "tests",
            "TEST-SNAPSHOT-REL.md",
          );
          const original = readFileSync(docPath, "utf8");
          writeFileSync(
            docPath,
            original.replace(
              "title: Snapshot relevance fixture",
              "title: Snapshot relevance fixture (edited)",
            ),
            "utf8",
          );

          const status = await readStatus();
          assert.strictEqual(
            status.proofSnapshotDirty,
            true,
            "edits outside receipt frontmatter must dirty the verification snapshot",
          );
        },
      );
    },
  );
}

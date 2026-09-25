import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type TestEntity = {
  readonly id: string;
  readonly verification_receipts?: unknown;
  readonly proof_receipts?: readonly { readonly receipt_id?: string }[];
};

const PROOF_CONTRACT = `proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-PACKED-MAINTENANCE
      target: default
  success_policy: all_required_first_attempt`;

function legacyReceiptsBlock(): string {
  return `verification_receipts:
  - snapshot: ${"a".repeat(64)}
    started_at: "2025-01-01T00:00:00.000Z"
    finished_at: "2025-01-01T00:00:01.000Z"
    outcome: passed
  - snapshot: ${"b".repeat(64)}
    started_at: "2025-01-02T00:00:00.000Z"
    finished_at: "2025-01-02T00:00:01.000Z"
    outcome: passed`;
}

function receiptBlock(
  receiptId: string,
  snapshot: string,
  startedAt: string,
  finishedAt: string,
): string {
  return `  - version: kibi.proof-receipt.v1
    receipt_id: ${receiptId}
    test_id: TEST-PACKED-PRUNE
    scope: end_to_end
    outcome: passed
    code_snapshot: ${snapshot}
    environment_hash: ${"b".repeat(64)}
    started_at: ${startedAt}
    finished_at: ${finishedAt}
    artifact_digest: ${"c".repeat(64)}
    contract_hash: ${"d".repeat(64)}
    fingerprint: ${"e".repeat(64)}
    fingerprint_components:
      contract: ${"1a".repeat(32)}
      integration: ${"2a".repeat(32)}
      command: ${"3a".repeat(32)}
      bindings: ${"4a".repeat(32)}
      producer: ${"5a".repeat(32)}
    integration_id: command
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - --test
      - tests/e2e/prune.test.ts
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-PACKED-MAINTENANCE
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable`;
}

function pruneTestDocument(
  snapshot: string,
  receipts: ReadonlyArray<{
    readonly id: string;
    readonly startedAt: string;
    readonly finishedAt: string;
  }>,
): string {
  return `---
id: TEST-PACKED-PRUNE
title: Packed prune E2E
status: passing
source: tests/e2e/prune.test.ts
verification_scope: end_to_end
verification_perspective: consumer
${PROOF_CONTRACT}
proof_receipts:
${receipts.map((r) => receiptBlock(r.id, snapshot, r.startedAt, r.finishedAt)).join("\n")}
links:
  - type: validates
    target: SCEN-PACKED-MAINTENANCE
---

Exercises packed receipt-history maintenance.
`;
}

function junitTestDocument(): string {
  return `---
id: TEST-PACKED-JUNIT
title: Packed junit binding E2E
status: passing
source: tests/e2e/junit.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: junit-ambiguous
  required_proofs:
    - symbol_id: SYM-PACKED-JUNIT-ONE
      target: default
  success_policy: all_required_first_attempt
proof_bindings:
  - symbol_id: SYM-PACKED-JUNIT-ONE
    target: default
    native_id: suite::ambiguous-case
  - symbol_id: SYM-PACKED-JUNIT-TWO
    target: default
    native_id: suite::ambiguous-case
links:
  - type: validates
    target: SCEN-PACKED-MAINTENANCE
---

Exercises packed junit binding conversion.
`;
}

const JUNIT_REPORT = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="suite" tests="1" failures="0">
  <testcase name="ambiguous-case" classname="suite" time="0.01"/>
</testsuite>
`;

async function queryTest(
  sandbox: TestSandbox,
  testId: string,
): Promise<TestEntity | undefined> {
  const queried = await kibi(sandbox, [
    "query",
    "test",
    "--format",
    "json",
    "--id",
    testId,
  ]);
  const payload = JSON.parse(queried.stdout) as
    | TestEntity[]
    | { data?: { entities?: TestEntity[] } };
  const entities = Array.isArray(payload)
    ? payload
    : (payload.data?.entities ?? []);
  return entities.find((entity) => entity.id === testId);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: proof receipt maintenance operations", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
      },
      { timeout: 240000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
        await run("git", ["commit", "--allow-empty", "-m", "initial"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        createMarkdownFile(
          sandbox,
          ".kb/requirements/REQ-PACKED-MAINTENANCE.md",
          {
            id: "REQ-PACKED-MAINTENANCE",
            title: "Packed receipt maintenance fixture",
            status: "open",
            priority: "must",
          },
          "Fixture requirement for receipt maintenance operations.",
        );
        createMarkdownFile(
          sandbox,
          ".kb/scenarios/SCEN-PACKED-MAINTENANCE.md",
          {
            id: "SCEN-PACKED-MAINTENANCE",
            title: "Packed receipt maintenance scenario",
            status: "active",
          },
          "Given packed maintenance commands, receipts stay valid evidence.",
        );
        for (const sourcePath of [
          ".kb/requirements/REQ-PACKED-MAINTENANCE.md",
          ".kb/scenarios/SCEN-PACKED-MAINTENANCE.md",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
        const seeded = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          seeded.exitCode,
          0,
          `${seeded.stdout}${seeded.stderr}`,
        );
      },
      { timeout: 240000 },
    );

    afterEach(
      async () => {
        if (sandbox) await sandbox.cleanup();
      },
      { timeout: 240000 },
    );

    it(
      "migrate-legacy strips legacy verification_receipts only from targeted proof-contract tests",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-MIGRATE.md"),
          `---
id: TEST-PACKED-MIGRATE
title: Packed migrate E2E
status: passing
source: tests/e2e/migrate.test.ts
verification_scope: end_to_end
verification_perspective: consumer
${PROOF_CONTRACT}
${legacyReceiptsBlock()}
links:
  - type: validates
    target: SCEN-PACKED-MAINTENANCE
---

Exercises packed legacy receipt migration.
`,
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-LEGACY-ONLY.md"),
          `---
id: TEST-PACKED-LEGACY-ONLY
title: Packed legacy-only test
status: passing
source: tests/e2e/legacy-only.test.ts
verification_scope: end_to_end
verification_perspective: consumer
${legacyReceiptsBlock()}
links:
  - type: validates
    target: SCEN-PACKED-MAINTENANCE
---

Legacy receipts without a proof contract must stay untouched.
`,
        );
        mkdirSync(join(sandbox.repoDir, "tests", "e2e"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "migrate.test.ts"),
          "export const migrateBehavior = 'v1';\n",
        );
        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "legacy-only.test.ts"),
          "export const legacyOnlyBehavior = 'v1';\n",
        );
        for (const sourcePath of [
          ".kb/tests/TEST-PACKED-MIGRATE.md",
          ".kb/tests/TEST-PACKED-LEGACY-ONLY.md",
          "tests/e2e/migrate.test.ts",
          "tests/e2e/legacy-only.test.ts",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const targeted = await kibi(sandbox, [
          "proof",
          "migrate-legacy",
          "--test",
          "TEST-PACKED-MIGRATE",
        ]);
        assert.strictEqual(
          targeted.exitCode,
          0,
          `${targeted.stdout}${targeted.stderr}`,
        );

        const migratedDoc = readFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-MIGRATE.md"),
          "utf8",
        );
        assert.ok(
          !migratedDoc.includes("verification_receipts:"),
          "legacy block must be spliced out of the authored document",
        );
        assert.ok(
          migratedDoc.includes("proof_contract:"),
          "the proof contract must survive the splice",
        );
        const migratedEntity = await queryTest(sandbox, "TEST-PACKED-MIGRATE");
        assert.ok(migratedEntity, "migrated test entity missing");
        assert.strictEqual(
          migratedEntity.verification_receipts,
          undefined,
          "compiled entity must drop the legacy lane",
        );

        const untouchedDoc = readFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-LEGACY-ONLY.md"),
          "utf8",
        );
        assert.ok(
          untouchedDoc.includes("verification_receipts:"),
          "tests without a proof contract must not be migrated",
        );

        const repeat = await kibi(sandbox, [
          "proof",
          "migrate-legacy",
          "--test",
          "TEST-PACKED-MIGRATE",
        ]);
        assert.match(
          repeat.stdout + repeat.stderr,
          /No test carries a legacy verification_receipts block/,
        );

        const missing = await kibi(sandbox, [
          "proof",
          "migrate-legacy",
          "--test",
          "TEST-DOES-NOT-EXIST",
        ]);
        assert.notStrictEqual(missing.exitCode, 0);
        assert.match(
          missing.stdout + missing.stderr,
          /TEST-DOES-NOT-EXIST.*was not found/,
        );
      },
    );

    it(
      "prune shrinks receipt history to the newest entries and rejects invalid keep windows",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        const status = await kibi(sandbox, ["status", "--format", "json"]);
        const statusPayload = JSON.parse(status.stdout) as {
          proofSnapshot?: string;
        };
        const proofSnapshot = statusPayload.proofSnapshot;
        assert.ok(proofSnapshot, "status must expose the proof snapshot");

        const finishedBase = Date.now();
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-PRUNE.md"),
          pruneTestDocument(proofSnapshot, [
            {
              id: "PR-PACKED-PRUNE-0001",
              startedAt: new Date(finishedBase - 4000).toISOString(),
              finishedAt: new Date(finishedBase - 3000).toISOString(),
            },
            {
              id: "PR-PACKED-PRUNE-0002",
              startedAt: new Date(finishedBase - 2000).toISOString(),
              finishedAt: new Date(finishedBase - 1000).toISOString(),
            },
          ]),
        );
        mkdirSync(join(sandbox.repoDir, "tests", "e2e"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "prune.test.ts"),
          "export const pruneBehavior = 'v1';\n",
        );
        for (const sourcePath of [
          ".kb/tests/TEST-PACKED-PRUNE.md",
          "tests/e2e/prune.test.ts",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const before = await queryTest(sandbox, "TEST-PACKED-PRUNE");
        assert.strictEqual(before?.proof_receipts?.length, 2);

        const invalid = await kibi(sandbox, ["proof", "prune", "--keep", "0"]);
        assert.notStrictEqual(invalid.exitCode, 0);
        assert.match(
          invalid.stdout + invalid.stderr,
          /keep must be an integer between 1 and 50/,
        );

        const pruned = await kibi(sandbox, [
          "proof",
          "prune",
          "--test",
          "TEST-PACKED-PRUNE",
          "--keep",
          "1",
        ]);
        assert.strictEqual(
          pruned.exitCode,
          0,
          `${pruned.stdout}${pruned.stderr}`,
        );

        const after = await queryTest(sandbox, "TEST-PACKED-PRUNE");
        assert.deepStrictEqual(
          after?.proof_receipts?.map((receipt) => receipt.receipt_id),
          ["PR-PACKED-PRUNE-0002"],
          "prune must keep only the newest receipt",
        );

        const prunedDoc = readFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-PRUNE.md"),
          "utf8",
        );
        assert.ok(prunedDoc.includes("PR-PACKED-PRUNE-0002"));
        assert.ok(!prunedDoc.includes("PR-PACKED-PRUNE-0001"));

        const missing = await kibi(sandbox, [
          "proof",
          "prune",
          "--test",
          "TEST-DOES-NOT-EXIST",
        ]);
        assert.notStrictEqual(missing.exitCode, 0);
        assert.match(
          missing.stdout + missing.stderr,
          /TEST-DOES-NOT-EXIST.*was not found/,
        );
      },
    );

    it(
      "junit bindings with ambiguous native ids fail closed without partial receipts",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        mkdirSync(join(sandbox.repoDir, ".kb", "proof", "runs"), {
          recursive: true,
        });
        mkdirSync(join(sandbox.repoDir, "tests", "e2e"), {
          recursive: true,
        });
        // The junit producer owns its report artifact: `kibi prove` clears the
        // destination before invoking the command, so the command must copy the
        // canned native report into place exactly like a real runner would.
        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "junit-fixture.xml"),
          JUNIT_REPORT,
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "proof", "integrations.json"),
          `${JSON.stringify(
            {
              version: "kibi.proof-integration.v1",
              integrations: [
                {
                  id: "junit-ambiguous",
                  producer: "junit",
                  command: [
                    "cp",
                    "tests/e2e/junit-fixture.xml",
                    ".kb/proof/runs/junit.xml",
                  ],
                  artifact: ".kb/proof/runs/junit.xml",
                  targets: ["default"],
                },
              ],
            },
            null,
            2,
          )}\n`,
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-JUNIT.md"),
          junitTestDocument(),
        );
        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "junit.test.ts"),
          "export const junitBehavior = 'v1';\n",
        );
        for (const sourcePath of [
          ".kb/proof/integrations.json",
          ".kb/tests/TEST-PACKED-JUNIT.md",
          "tests/e2e/junit.test.ts",
          "tests/e2e/junit-fixture.xml",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const prove = await kibi(sandbox, [
          "prove",
          "--test",
          "TEST-PACKED-JUNIT",
        ]);
        assert.notStrictEqual(
          prove.exitCode,
          0,
          "ambiguous native bindings must fail the proof run closed",
        );
        const proveOutput = prove.stdout + prove.stderr;
        assert.match(
          proveOutput,
          /ambiguous junit binding for suite::ambiguous-case/,
          `expected an ambiguity diagnostic, got: ${proveOutput}`,
        );

        const after = await queryTest(sandbox, "TEST-PACKED-JUNIT");
        assert.strictEqual(
          after?.proof_receipts,
          undefined,
          "a fatal conversion must never append receipts",
        );
      },
    );
  });
}

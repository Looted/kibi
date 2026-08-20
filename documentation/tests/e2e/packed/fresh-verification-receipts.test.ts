import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";

import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  stageSourceFile,
} from "./helpers.js";
import {
  sendMcpRequest,
  startMcpServer,
} from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type CoverageRow = {
  readonly id: string;
  readonly proofGaps: readonly string[];
  readonly proofStages: {
    readonly passingE2e: {
      readonly status: string;
      readonly tests: readonly string[];
      readonly currentCodeSnapshot: string;
    };
  };
};

function testDocument(receipt?: {
  readonly snapshot: string;
  readonly startedAt: string;
  readonly finishedAt: string;
}): string {
  return `---
id: TEST-PACKED-RECEIPT
title: Packed receipt E2E
status: failing
source: tests/e2e/receipt.test.ts
verification_scope: end_to_end
verification_perspective: consumer
${
  receipt
    ? `verification_receipts:
  - version: kibi.verification-receipt.v1
    receipt_id: VR-PACKED-RECEIPT-0001
    test_id: TEST-PACKED-RECEIPT
    runner: node
    command: node --test tests/e2e/receipt.test.ts
    scope: end_to_end
    outcome: passed
    code_snapshot: ${receipt.snapshot}
    environment_hash: ${"b".repeat(64)}
    started_at: ${receipt.startedAt}
    finished_at: ${receipt.finishedAt}
    artifact_digest: ${"c".repeat(64)}
`
    : ""
}links:
  - type: validates
    target: SCEN-PACKED-RECEIPT
---

Exercises packed snapshot-bound receipt behavior.
`;
}

async function cliJson<T>(sandbox: TestSandbox, args: readonly string[]) {
  const result = await kibi(sandbox, [...args]);
  assert.strictEqual(
    result.exitCode,
    0,
    `${args.join(" ")} failed: ${result.stdout}${result.stderr}`,
  );
  const parsed = JSON.parse(result.stdout) as { data?: T };
  return (parsed.data ?? parsed) as T;
}

function receiptRow(payload: { readonly rows: readonly CoverageRow[] }) {
  const row = payload.rows.find(
    (candidate) => candidate.id === "REQ-PACKED-RECEIPT",
  );
  assert.ok(row, "coverage omitted REQ-PACKED-RECEIPT");
  return row;
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: fresh verification receipts", { concurrency: false }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(async () => {
      hasProlog = checkPrologAvailable();
      if (!hasProlog) return;
      tarballs = await packAll();
    });

    beforeEach(async () => {
      if (!hasProlog) return;
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
      await kibi(sandbox, ["init"]);

      mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
        recursive: true,
      });
      mkdirSync(join(sandbox.repoDir, ".kb", "scenarios"), {
        recursive: true,
      });
      mkdirSync(join(sandbox.repoDir, ".kb", "tests"), {
        recursive: true,
      });
      mkdirSync(join(sandbox.repoDir, "tests", "e2e"), { recursive: true });
      writeFileSync(
        join(sandbox.repoDir, ".kb", "requirements", "REQ-PACKED-RECEIPT.md"),
        `---
id: REQ-PACKED-RECEIPT
title: Packed receipt fixture
status: open
priority: must
links:
  - type: specified_by
    target: SCEN-PACKED-RECEIPT
---

Packed receipt fixture.
`,
      );
      writeFileSync(
        join(sandbox.repoDir, ".kb", "scenarios", "SCEN-PACKED-RECEIPT.md"),
        `---
id: SCEN-PACKED-RECEIPT
title: Packed receipt scenario
status: active
links:
  - type: verified_by
    target: TEST-PACKED-RECEIPT
---

Given a packed runtime, when receipt evidence is evaluated, then it is bound to the current snapshot.
`,
      );
      writeFileSync(
        join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-RECEIPT.md"),
        testDocument(),
      );
      writeFileSync(
        join(sandbox.repoDir, "tests", "e2e", "receipt.test.ts"),
        "export const receiptBehavior = 'v1';\n",
      );
      for (const sourcePath of [
        ".kb/requirements/REQ-PACKED-RECEIPT.md",
        ".kb/scenarios/SCEN-PACKED-RECEIPT.md",
        ".kb/tests/TEST-PACKED-RECEIPT.md",
        "tests/e2e/receipt.test.ts",
      ]) {
        stageSourceFile(sandbox, sourcePath);
      }
      const sync = await kibi(sandbox, ["sync"]);
      assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
    });

    afterEach(async () => {
      if (sandbox) await sandbox.cleanup();
    });

    it(
      "fails closed without a receipt, accepts a current pass, and invalidates it after source drift across CLI and MCP",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
        const initialStatus = await cliJson<{
          verificationSnapshot: string;
          verificationSnapshotAvailable: boolean;
        }>(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(initialStatus.verificationSnapshotAvailable, true);
        assert.match(initialStatus.verificationSnapshot, /^[a-f0-9]{64}$/);

        const missingCoverage = await cliJson<{ rows: CoverageRow[] }>(
          sandbox,
          ["coverage", "--by", "req", "--include-passing", "--format", "json"],
        );
        assert.ok(
          receiptRow(missingCoverage).proofGaps.includes(
            "missing_verification_receipt",
          ),
        );

        const finishedAt = new Date();
        const startedAt = new Date(finishedAt.getTime() - 1_000);
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-RECEIPT.md"),
          testDocument({
            snapshot: initialStatus.verificationSnapshot,
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
          }),
        );
        const receiptSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          receiptSync.exitCode,
          0,
          `${receiptSync.stdout}${receiptSync.stderr}`,
        );

        const receiptStatus = await cliJson<{
          verificationSnapshot: string;
        }>(sandbox, ["status", "--format", "json"]);
        assert.strictEqual(
          receiptStatus.verificationSnapshot,
          initialStatus.verificationSnapshot,
          "recording a receipt changed its own snapshot",
        );
        const currentCoverage = await cliJson<{ rows: CoverageRow[] }>(
          sandbox,
          ["coverage", "--by", "req", "--include-passing", "--format", "json"],
        );
        const currentRow = receiptRow(currentCoverage);
        assert.strictEqual(currentRow.proofStages.passingE2e.status, "passed");
        assert.deepStrictEqual(currentRow.proofStages.passingE2e.tests, [
          "TEST-PACKED-RECEIPT",
        ]);
        assert.strictEqual(
          currentRow.proofStages.passingE2e.currentCodeSnapshot,
          initialStatus.verificationSnapshot,
        );

        const mcp = startMcpServer(sandbox);
        try {
          await sendMcpRequest(mcp, 1, "initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "receipt-e2e", version: "1.0.0" },
          });
          mcp.stdin?.write(
            `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
          );
          const mcpStatus = await sendMcpRequest(mcp, 2, "tools/call", {
            name: "kb_status",
            arguments: {},
          });
          assert.ifError(mcpStatus.error);
          const mcpStatusEnvelope = mcpStatus.result?.structuredContent as {
            data?: { verificationSnapshot?: string };
            verificationSnapshot?: string;
          };
          assert.strictEqual(
            (mcpStatusEnvelope.data ?? mcpStatusEnvelope).verificationSnapshot,
            initialStatus.verificationSnapshot,
          );
          const mcpCoverage = await sendMcpRequest(mcp, 3, "tools/call", {
            name: "kb_coverage",
            arguments: { by: "req", includePassing: true },
          });
          assert.ifError(mcpCoverage.error);
          const mcpCoverageEnvelope = mcpCoverage.result?.structuredContent as
            | { data?: { rows: CoverageRow[] }; rows?: CoverageRow[] }
            | undefined;
          const mcpPayload = (mcpCoverageEnvelope?.data ??
            mcpCoverageEnvelope) as { rows: CoverageRow[] } | undefined;
          if (!mcpPayload) throw new Error("MCP coverage payload missing");
          assert.strictEqual(
            receiptRow(mcpPayload).proofStages.passingE2e.status,
            "passed",
          );
        } finally {
          mcp.kill();
        }

        writeFileSync(
          join(sandbox.repoDir, "tests", "e2e", "receipt.test.ts"),
          "export const receiptBehavior = 'v2';\n",
        );
        const driftStatus = await cliJson<{ verificationSnapshot: string }>(
          sandbox,
          ["status", "--format", "json"],
        );
        assert.notStrictEqual(
          driftStatus.verificationSnapshot,
          initialStatus.verificationSnapshot,
        );
        const staleCoverage = await cliJson<{ rows: CoverageRow[] }>(sandbox, [
          "coverage",
          "--by",
          "req",
          "--include-passing",
          "--format",
          "json",
        ]);
        const staleRow = receiptRow(staleCoverage);
        assert.strictEqual(staleRow.proofStages.passingE2e.status, "missing");
        assert.ok(staleRow.proofGaps.includes("stale_verification_receipt"));
      },
    );
  });
}

import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
import { startMcpServer, sendMcpRequest } from "./mcp-cli-operation-parity-support.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * Packed E2E for the receipt code-scope binding path.
 *
 * Drives the real public workflow end to end: author a source file and its
 * symbol manifest binding, run `kibi prove` so the contract's receipt is
 * minted, and assert that the minted receipt carries a GENERATED code scope
 * (symbol id + source hash resolved through resolveBoundSymbolScope), plus
 * the invalidation case when the bound source changes afterwards.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: receipt code-scope generation", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init", "--no-hooks"]);
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
      "generates code scope for bound symbols during receipt ingestion",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        // Real source file, staged into the KB.
        writeFileSync(
          join(sandbox.repoDir, "scope.js"),
          "export const scopeTarget = 'v1';\n",
        );
        stageSourceFile(sandbox, "scope.js");

        // Author the symbol manifest binding via the public upsert route.
        const upsertRequest = join(sandbox.repoDir, "symbol-upsert.json");
        writeFileSync(
          upsertRequest,
          JSON.stringify({
            type: "symbol",
            id: "SYM-PACKED-COV",
            properties: {
              title: "Packed coverage symbol",
              status: "active",
              sourceFile: "scope.js",
              symbol_role: "behavioral",
            },
            relationships: [
              {
                from: "SYM-PACKED-COV",
                to: "REQ-PACKED-RECEIPT",
                type: "implements",
              },
            ],
          }),
        );
        for (const command of ["validate-upsert", "upsert"]) {
          const result = await kibi(sandbox, [command, "--input", upsertRequest]);
          assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
        }

        // Author the contracted test document: binds the production symbol.
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-COV.md"),
          `---
id: TEST-PACKED-COV
title: Packed coverage contract test
status: passing
source: tests/e2e/receipt.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PACKED-COV
      target: default
  success_policy: all_required_first_attempt
type: test
---

Drives the artifact producer so the bound symbol's code scope is generated.
`,
        );

        // Author the command integration: writes a minimal passing artifact.
        const integrationPath = join(
          sandbox.repoDir,
          ".kb",
          "proof",
          "integrations.json",
        );
        mkdirSync(join(sandbox.repoDir, ".kb", "proof"), { recursive: true });
        writeFileSync(
          integrationPath,
          JSON.stringify({
            version: "kibi.proof-integration.v1",
            integrations: [
              {
                id: "command",
                producer: "command",
                command: ["node", "write-artifact.mjs"],
                artifact: ".kb/proof/runs/command.json",
                targets: ["default"],
                description: "Emits the proof-run artifact for the sandbox.",
              },
            ],
          }),
        );
        writeFileSync(
          join(sandbox.repoDir, "write-artifact.mjs"),
          `const fs = require("node:fs");
const artifact = {
  version: "kibi.proof-run.v1",
  producer: { name: "packed-e2e-command-producer" },
  command_argv: process.env.KIBI_PROOF_COMMAND_ARGV
    ? JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV)
    : ["node", "cov-pass.mjs"],
  code_snapshot: process.env.KIBI_PROOF_SNAPSHOT,
  environment: { os: process.platform, ci: "packed-e2e" },
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: new Date(Date.now() - 1000).toISOString(),
    finished_at: new Date().toISOString(),
  },
  proof_results: JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]").map(
    (testId) => ({
      symbol_id: testId,
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    }),
  ),
};
fs.writeFileSync(process.env.KIBI_PROOF_OUTPUT, JSON.stringify(artifact, null, 2));
`,
        );

        // Author the producer steps file and run the campaign.
        writeFileSync(
          join(sandbox.repoDir, "proof", "steps.json"),
          JSON.stringify([
            {
              test_id: "TEST-PACKED-COV",
              steps: [["node", "cov-pass.mjs"]],
            },
          ]),
        );
        writeFileSync(
          join(sandbox.repoDir, "cov-pass.mjs"),
          "process.exit(0);\n",
        );

        const prove = await kibi(sandbox, ["prove", "--test", "TEST-PACKED-COV"]);
        assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

        // The minted receipt carries a GENERATED code scope entry for the
        // bound symbol, resolved through the authored manifest.
        const testDocument = readFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-COV.md"),
          "utf8",
        );
        assert.match(testDocument, /code_scope:/);
        assert.match(
          testDocument,
          /symbol_id: SYM-PACKED-COV/,
          "code scope must name the bound symbol",
        );
        assert.match(
          testDocument,
          /source_hash: [0-9a-f]{64}/,
          "code scope must carry the resolved source hash",
        );
      },
    );

    it(
      "invalidates the receipt when the bound source changes",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        // Same setup as the generation case above.
        writeFileSync(
          join(sandbox.repoDir, "scope.js"),
          "export const scopeTarget = 'v1';\n",
        );
        stageSourceFile(sandbox, "scope.js");
        const upsertRequest = join(sandbox.repoDir, "symbol-upsert.json");
        writeFileSync(
          upsertRequest,
          JSON.stringify({
            type: "symbol",
            id: "SYM-PACKED-COV",
            properties: {
              title: "Packed coverage symbol",
              status: "active",
              sourceFile: "scope.js",
              symbol_role: "behavioral",
            },
            relationships: [
              {
                from: "SYM-PACKED-COV",
                to: "REQ-PACKED-RECEIPT",
                type: "implements",
              },
            ],
          }),
        );
        for (const command of ["validate-upsert", "upsert"]) {
          const result = await kibi(sandbox, [command, "--input", upsertRequest]);
          assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
        }
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-PACKED-COV.md"),
          `---
id: TEST-PACKED-COV
title: Packed coverage contract test
status: passing
source: tests/e2e/receipt.test.ts
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PACKED-COV
      target: default
  success_policy: all_required_first_attempt
type: test
---

Drives the artifact producer so the bound symbol's code scope is generated.
`,
        );
        const integrationPath = join(
          sandbox.repoDir,
          ".kb",
          "proof",
          "integrations.json",
        );
        mkdirSync(join(sandbox.repoDir, ".kb", "proof"), { recursive: true });
        writeFileSync(
          integrationPath,
          JSON.stringify({
            version: "kibi.proof-integration.v1",
            integrations: [
              {
                id: "command",
                producer: "command",
                command: ["node", "write-artifact.mjs"],
                artifact: ".kb/proof/runs/command.json",
                targets: ["default"],
                description: "Emits the proof-run artifact for the sandbox.",
              },
            ],
          }),
        );
        writeFileSync(
          join(sandbox.repoDir, "write-artifact.mjs"),
          `const fs = require("node:fs");
const artifact = {
  version: "kibi.proof-run.v1",
  producer: { name: "packed-e2e-command-producer" },
  command_argv: process.env.KIBI_PROOF_COMMAND_ARGV
    ? JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV)
    : ["node", "cov-pass.mjs"],
  code_snapshot: process.env.KIBI_PROOF_SNAPSHOT,
  environment: { os: process.platform, ci: "packed-e2e" },
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: new Date(Date.now() - 1000).toISOString(),
    finished_at: new Date().toISOString(),
  },
  proof_results: JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]").map(
    (testId) => ({
      symbol_id: testId,
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    }),
  ),
};
fs.writeFileSync(process.env.KIBI_PROOF_OUTPUT, JSON.stringify(artifact, null, 2));
`,
        );
        writeFileSync(
          join(sandbox.repoDir, "proof", "steps.json"),
          JSON.stringify([
            {
              test_id: "TEST-PACKED-COV",
              steps: [["node", "cov-pass.mjs"]],
            },
          ]),
        );
        writeFileSync(
          join(sandbox.repoDir, "cov-pass.mjs"),
          "process.exit(0);\n",
        );

        const prove = await kibi(sandbox, ["prove", "--test", "TEST-PACKED-COV"]);
        assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);

        // Invalidate: the bound source's content hash changes.
        writeFileSync(
          join(sandbox.repoDir, "scope.js"),
          "export const scopeTarget = 'v2-changed';\n",
        );

        const coverage = await kibi(sandbox, [
          "coverage",
          "--by",
          "req",
          "--format",
          "json",
          "--include-passing",
        ]);
        assert.strictEqual(coverage.exitCode, 0, coverage.stdout + coverage.stderr);
        const payload = JSON.parse(coverage.stdout) as {
          data?: {
            rows?: Array<{
              id: string;
              proofStages?: {
                passingE2e?: { status?: string };
              };
            }>;
          };
        };
        const row = (payload.data?.rows ?? []).find(
          (entry) => entry.id === "REQ-PACKED-RECEIPT",
        );
        assert.ok(row, "requirement row missing from coverage");
        assert.match(
          row.proofStages?.passingE2e?.status ?? "",
          /stale|missing/,
          "the receipt must no longer validate after the bound source changes",
        );
      },
    );
  });
}

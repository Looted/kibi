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

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * Packed E2E for proof fingerprint drift.
 *
 * A receipt is proven under one execution fingerprint. When the integration's
 * command changes, the receipt no longer counts, and `kibi prove`, coverage
 * and `kibi proof explain` name the fingerprint components that changed. A
 * description-only edit never does.
 */

const TEST_ID = "TEST-PACKED-DRIFT";
const REQ_ID = "REQ-PACKED-DRIFT";

type Integrations = {
  version: string;
  integrations: Array<Record<string, unknown>>;
};

type CoverageRow = {
  readonly id: string;
  readonly proofGaps: readonly string[];
  readonly proofStages: {
    readonly passingE2e: {
      readonly status: string;
      readonly receiptEvidence?: ReadonlyArray<{
        readonly testId: string;
        readonly state: string;
        readonly fingerprintDrift?: readonly string[];
      }>;
    };
  };
};

function integrationsPath(sandbox: TestSandbox): string {
  return join(sandbox.repoDir, ".kb", "proof", "integrations.json");
}

function readIntegrations(sandbox: TestSandbox): Integrations {
  return JSON.parse(readFileSync(integrationsPath(sandbox), "utf8"));
}

function writeIntegrations(sandbox: TestSandbox, value: Integrations): void {
  write(sandbox, ".kb/proof/integrations.json", JSON.stringify(value));
}

function write(sandbox: TestSandbox, path: string, content: string): void {
  mkdirSync(join(sandbox.repoDir, path, ".."), { recursive: true });
  writeFileSync(join(sandbox.repoDir, path), content);
  stageSourceFile(sandbox, path);
}

async function provision(sandbox: TestSandbox): Promise<void> {
  write(
    sandbox,
    `.kb/requirements/${REQ_ID}.md`,
    `---
id: ${REQ_ID}
type: req
title: Packed fingerprint drift
status: open
links:
  - type: specified_by
    target: SCEN-PACKED-DRIFT
---

A receipt proven under another execution fingerprint is not evidence.
`,
  );
  write(
    sandbox,
    ".kb/scenarios/SCEN-PACKED-DRIFT.md",
    `---
id: SCEN-PACKED-DRIFT
title: Packed fingerprint drift scenario
status: active
links:
  - type: verified_by
    target: ${TEST_ID}
---

Given a proven test, when its integration command changes, then the receipt is stale and names what changed.
`,
  );
  write(sandbox, "scope.js", "export const scopeTarget = 'v1';\n");
  write(
    sandbox,
    `.kb/tests/${TEST_ID}.md`,
    `---
id: ${TEST_ID}
title: Packed fingerprint drift test
status: passing
source: .kb/tests/${TEST_ID}.md
verification_scope: end_to_end
verification_perspective: consumer
proof_bindings:
  - symbol_id: SYM-PACKED-DRIFT
    target: default
proof_contract:
  version: kibi.proof-contract.v1
  integration: command
  required_proofs:
    - symbol_id: SYM-PACKED-DRIFT
      target: default
  success_policy: all_required_first_attempt
links:
  - type: validates
    target: SCEN-PACKED-DRIFT
type: test
---

Drives the artifact producer so the bound symbol is proven.
`,
  );
  const upsertRequest = join(sandbox.repoDir, "symbol-upsert.json");
  writeFileSync(
    upsertRequest,
    JSON.stringify({
      type: "symbol",
      id: "SYM-PACKED-DRIFT",
      properties: {
        title: "scopeTarget",
        status: "active",
        sourceFile: "scope.js",
        symbol_role: "behavioral",
      },
      relationships: [
        { from: "SYM-PACKED-DRIFT", to: REQ_ID, type: "implements" },
      ],
    }),
  );
  for (const command of ["validate-upsert", "upsert"]) {
    const result = await kibi(sandbox, [command, "--input", upsertRequest]);
    assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
  }
  const synced = await kibi(sandbox, ["sync", "--refresh-symbol-coordinates"]);
  assert.strictEqual(synced.exitCode, 0, synced.stdout + synced.stderr);

  writeIntegrations(sandbox, {
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
  });
  write(
    sandbox,
    "write-artifact.mjs",
    `import * as fs from "node:fs";
const artifact = {
  version: "kibi.proof-run.v1",
  producer: { name: "packed-e2e-command-producer" },
  integration: process.env.KIBI_PROOF_INTEGRATION,
  command_argv: JSON.parse(process.env.KIBI_PROOF_COMMAND_ARGV),
  code_snapshot: process.env.KIBI_PROOF_SNAPSHOT,
  environment: { os: process.platform, ci: "packed-e2e" },
  run: {
    outcome: "passed",
    exit_code: 0,
    started_at: new Date(Date.now() - 1000).toISOString(),
    finished_at: new Date().toISOString(),
  },
  proof_results: [
    {
      symbol_id: "SYM-PACKED-DRIFT",
      target: "default",
      outcome: "passed",
      binding: "aggregate_run",
      attempts: { status: "unavailable" },
    },
  ],
};
fs.writeFileSync(process.env.KIBI_PROOF_OUTPUT, JSON.stringify(artifact, null, 2));
`,
  );
  write(
    sandbox,
    "proof/steps.json",
    JSON.stringify([{ test_id: TEST_ID, steps: [["node", "step.mjs"]] }]),
  );
  write(sandbox, "step.mjs", "process.exit(0);\n");
}

async function coverageRow(sandbox: TestSandbox): Promise<CoverageRow> {
  const result = await kibi(sandbox, [
    "coverage",
    "--by",
    "req",
    "--format",
    "json",
    "--include-passing",
  ]);
  assert.strictEqual(result.exitCode, 0, result.stdout + result.stderr);
  const parsed = JSON.parse(result.stdout) as {
    data?: { rows: CoverageRow[] };
    rows?: CoverageRow[];
  };
  const rows = parsed.data?.rows ?? parsed.rows ?? [];
  const row = rows.find((candidate) => candidate.id === REQ_ID);
  assert.ok(row, `coverage omitted ${REQ_ID}: ${result.stdout}`);
  return row;
}

function driftOf(row: CoverageRow): readonly string[] | undefined {
  return row.proofStages.passingE2e.receiptEvidence?.find(
    (entry) => entry.testId === TEST_ID,
  )?.fingerprintDrift;
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: proof fingerprint drift", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
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
      "names the changed components when an integration command changes, and ignores a description edit",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await provision(sandbox);
        const prove = await kibi(sandbox, ["prove", "--test", TEST_ID]);
        assert.strictEqual(prove.exitCode, 0, prove.stdout + prove.stderr);
        assert.doesNotMatch(prove.stderr, /fingerprint changed/);

        const current = await coverageRow(sandbox);
        assert.strictEqual(current.proofStages.passingE2e.status, "passed");
        assert.strictEqual(driftOf(current), undefined);

        // A cosmetic edit never stales proof.
        const integrations = readIntegrations(sandbox);
        const described = structuredClone(integrations);
        described.integrations[0] = {
          ...described.integrations[0],
          description: "A reworded description.",
        };
        writeIntegrations(sandbox, described);
        const afterDescription = await coverageRow(sandbox);
        assert.strictEqual(
          afterDescription.proofStages.passingE2e.status,
          "passed",
        );
        assert.strictEqual(driftOf(afterDescription), undefined);

        // An execution edit stales the receipt and names the components.
        const changed = structuredClone(integrations);
        changed.integrations[0] = {
          ...changed.integrations[0],
          command: ["node", "write-artifact.mjs", "--changed"],
        };
        writeIntegrations(sandbox, changed);
        const stale = await coverageRow(sandbox);
        assert.ok(
          stale.proofGaps.includes("stale_proof_receipt"),
          `expected stale_proof_receipt: ${JSON.stringify(stale.proofGaps)}`,
        );
        assert.deepStrictEqual(driftOf(stale), ["integration", "command"]);

        const explain = await kibi(sandbox, ["proof", "explain", REQ_ID]);
        assert.strictEqual(
          explain.exitCode,
          0,
          explain.stdout + explain.stderr,
        );
        assert.match(
          explain.stdout,
          new RegExp(`fingerprint drift for ${TEST_ID}: integration, command`),
        );

        // kibi prove --stale selects the drifted test and names the drift.
        const reprove = await kibi(sandbox, ["prove", "--stale"]);
        assert.strictEqual(
          reprove.exitCode,
          0,
          reprove.stdout + reprove.stderr,
        );
        assert.match(
          reprove.stderr,
          new RegExp(
            `${TEST_ID}: execution fingerprint changed since its previous receipt \\(integration, command\\)`,
          ),
        );
        const proven = await coverageRow(sandbox);
        assert.strictEqual(proven.proofStages.passingE2e.status, "passed");
        assert.strictEqual(driftOf(proven), undefined);
      },
    );
  });
}

import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
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
  parseKibiResult,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

async function packedCliEnforcesPropositionCompleteIngestion(
  sandbox: TestSandbox,
) {
  createMarkdownFile(
    sandbox,
    ".kb/requirements/baseline.md",
    {
      id: "REQ-BASELINE",
      title: "Legacy baseline",
      type: "req",
      status: "open",
    },
    "Reference material.",
  );
  assert.strictEqual((await kibi(sandbox, ["sync"])).exitCode, 0);

  const directInput = join(sandbox.repoDir, "omitted-ledger.json");
  writeFileSync(
    directInput,
    JSON.stringify({
      type: "req",
      id: "REQ-DIRECT-INCOMPLETE",
      properties: {
        title: "Direct incomplete requirement",
        status: "open",
        text_ref: "Service must retain audit records.",
      },
    }),
  );
  const direct = await kibi(sandbox, [
    "validate-upsert",
    "--input",
    directInput,
  ]);
  assert.strictEqual(direct.exitCode, 0);
  const directResult = parseKibiResult<{
    valid: boolean;
    errors: string[];
  }>(direct.stdout);
  assert.strictEqual(directResult.valid, false);
  assert.match(
    directResult.errors.join("\n"),
    /Proposition-complete ingestion failed/,
  );

  createMarkdownFile(
    sandbox,
    ".kb/requirements/new-requirement.md",
    {
      id: "REQ-NEW",
      title: "Retain audit records",
      type: "req",
      status: "open",
    },
    "Service must retain audit records.",
  );
  const incompleteSync = await kibi(sandbox, ["sync"]);
  assert.notStrictEqual(incompleteSync.exitCode, 0);
  assert.match(
    `${incompleteSync.stdout}${incompleteSync.stderr}`,
    /proposition-complete ingestion failed/,
  );

  const requirementDir = join(sandbox.repoDir, ".kb/requirements");
  mkdirSync(requirementDir, { recursive: true });
  writeFileSync(
    join(requirementDir, "new-requirement.md"),
    `---
id: REQ-NEW
title: Retain audit records
type: req
status: open
logic_claims: [CLAIM-0E1557A5C7262A64]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 07d39d86a0299ce4cf7e6b87736144a4f40bf330eb15e8e9242e915971b97282
semantic_inventory:
  - claim_key: CLAIM-0E1557A5C7262A64
    claim_text: Service must retain audit records
    role: normative
    status: ontology_gap
    span: {start: 0, end: 33}
---

Service must retain audit records.
`,
  );
  const completeSync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    completeSync.exitCode,
    0,
    `${completeSync.stdout}${completeSync.stderr}`,
  );

  // The clause is then grounded by a property fact: the ledger entry becomes
  // modeled and the requirement links the fact that declares its claim_key.
  // The fixture is staged like every authored input; source-first sync
  // ignores untracked files.
  createMarkdownFile(
    sandbox,
    ".kb/facts/audit-retention.md",
    {
      id: "FACT-AUDIT-RETENTION",
      title: "Audit records are retained",
      type: "fact",
      status: "active",
      fact_kind: "property_value",
      subject_key: "audit.record",
      property_key: "retained",
      operator: "eq",
      value_type: "bool",
      value_bool: "true",
      polarity: "require",
      canonical_key: "audit.record.retained.eq.true",
      claim_key: "CLAIM-0E1557A5C7262A64",
      claim_text: "Service must retain audit records",
    },
    "Audit records are retained.",
  );
  writeFileSync(
    join(requirementDir, "new-requirement.md"),
    `---
id: REQ-NEW
title: Retain audit records
type: req
status: open
links:
  - type: requires_property
    target: FACT-AUDIT-RETENTION
logic_claims: [CLAIM-0E1557A5C7262A64]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 07d39d86a0299ce4cf7e6b87736144a4f40bf330eb15e8e9242e915971b97282
semantic_inventory:
  - claim_key: CLAIM-0E1557A5C7262A64
    claim_text: Service must retain audit records
    role: normative
    status: modeled
    span: {start: 0, end: 33}
---

Service must retain audit records.
`,
  );
  const groundedSync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(
    groundedSync.exitCode,
    0,
    `${groundedSync.stdout}${groundedSync.stderr}`,
  );

  // Analyzing reworded prose with the stored requirement's id warns about
  // the claim-key drift before any write, naming the grounded clause and
  // its fact; the stored wording analyzes without the warning.
  const rewordedText = "Service keeps audit records.";
  const driftInput = join(sandbox.repoDir, "drift.json");
  writeFileSync(
    driftInput,
    JSON.stringify({ mode: "analyze", id: "REQ-NEW", text: rewordedText }),
  );
  const drift = await kibi(sandbox, ["model", "--input", driftInput]);
  assert.strictEqual(drift.exitCode, 0, `${drift.stdout}${drift.stderr}`);
  const driftResult = parseKibiResult<{
    warnings: string[];
    receipt: {
      inventory_contract: {
        version: string;
        source_field: string;
        source_hash: string;
      };
      logic_coverage: { expected_claim_keys: string[] };
      propositions: Record<string, unknown>[];
    };
  }>(drift.stdout);
  const driftWarning = driftResult.warnings.find((warning) =>
    warning.startsWith("Claim-key drift against the stored ledger of REQ-NEW"),
  );
  assert.ok(driftWarning, driftResult.warnings.join("\n"));
  assert.match(
    driftWarning,
    /'CLAIM-0E1557A5C7262A64' \("Service must retain audit records"\), grounded by FACT-AUDIT-RETENTION via requires_property/,
  );
  assert.match(
    driftWarning,
    /The analyzed prose differs from the stored semantic_text of REQ-NEW/,
  );

  const storedInput = join(sandbox.repoDir, "stored.json");
  writeFileSync(
    storedInput,
    JSON.stringify({
      mode: "analyze",
      id: "REQ-NEW",
      text: "Service must retain audit records.",
    }),
  );
  const stored = await kibi(sandbox, ["model", "--input", storedInput]);
  assert.strictEqual(stored.exitCode, 0, `${stored.stdout}${stored.stderr}`);
  assert.deepStrictEqual(
    parseKibiResult<{ warnings: string[] }>(stored.stdout).warnings.filter(
      (warning) => warning.startsWith("Claim-key drift"),
    ),
    [],
  );

  // Writing the reworded ledger over the stored grounding is refused with
  // both sides of the drift named.
  const contract = driftResult.receipt.inventory_contract;
  const rewriteInput = join(sandbox.repoDir, "rewrite.json");
  writeFileSync(
    rewriteInput,
    JSON.stringify({
      type: "req",
      id: "REQ-NEW",
      properties: {
        title: "Retain audit records",
        status: "open",
        semantic_text: rewordedText,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        logic_claims: driftResult.receipt.logic_coverage.expected_claim_keys,
        semantic_inventory: driftResult.receipt.propositions.map(
          (proposition) => ({ ...proposition, status: "modeled" }),
        ),
      },
      relationships: [
        {
          type: "requires_property",
          from: "REQ-NEW",
          to: "FACT-AUDIT-RETENTION",
        },
      ],
    }),
  );
  const rewrite = await kibi(sandbox, [
    "validate-upsert",
    "--input",
    rewriteInput,
  ]);
  assert.strictEqual(rewrite.exitCode, 0, `${rewrite.stdout}${rewrite.stderr}`);
  const rewriteResult = parseKibiResult<{
    valid: boolean;
    errors: string[];
  }>(rewrite.stdout);
  assert.strictEqual(rewriteResult.valid, false);
  const [rewordedClaimKey] =
    driftResult.receipt.logic_coverage.expected_claim_keys;
  assert.match(
    rewriteResult.errors.join("\n"),
    new RegExp(
      `Modeled claims with no grounding fact declaring their claim_key: '${rewordedClaimKey}'\\. Grounding facts whose claim_key the inventory no longer models: FACT-AUDIT-RETENTION \\('CLAIM-0E1557A5C7262A64'\\)`,
    ),
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: proposition-complete requirement ingestion", () => {
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
    });

    afterEach(async () => {
      if (sandbox) await sandbox.cleanup();
    });

    it("rejects omissions and accepts exact explicit unresolved ledgers", async (testContext) => {
      if (!hasProlog) {
        testContext.skip("SWI-Prolog is unavailable");
        return;
      }
      await packedCliEnforcesPropositionCompleteIngestion(sandbox);
    });
  });
}

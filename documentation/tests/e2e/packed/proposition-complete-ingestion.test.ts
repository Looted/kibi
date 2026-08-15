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
  parseKibiResult,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

async function packedCliEnforcesPropositionCompleteIngestion(
  sandbox: TestSandbox,
) {
  createMarkdownFile(
    sandbox,
    "documentation/requirements/baseline.md",
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
    "documentation/requirements/new-requirement.md",
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

  const requirementDir = join(sandbox.repoDir, "documentation/requirements");
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

    it("rejects omissions and accepts exact explicit unresolved ledgers", async () => {
      if (!hasProlog) return;
      await packedCliEnforcesPropositionCompleteIngestion(sandbox);
    });
  });
}

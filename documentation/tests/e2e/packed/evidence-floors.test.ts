import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createInventoriedRequirement,
  createSandbox,
  kibi,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type CheckResult = {
  structuredContent: {
    violations: {
      rule: string;
      entityId: string;
      description: string;
      evidence?: Record<string, unknown>;
    }[];
  };
};

const CONTEXT =
  "## Context\n\nThis fixture requirement exists so the evidence floor check has a current requirement to judge.";

/**
 * E2E: every current requirement's evidence level must reach its floor.
 *
 * SCEN-kibi-evidence-floors — kibi check fails a firm requirement with no
 * end-to-end proof (floor tested) and an agent-written one whose
 * required_evidence asks for a person's approval; lowering the first floor
 * and approving the second passes; --fresh-evidence also needs a clean proof
 * snapshot; and the schema 11 upgrade records required_evidence: asserted on
 * a firm requirement without a proof path, so an upgraded KB passes.
 */
const FLOOR = ["check", "--rules", "evidence-floor", "--format", "json"];

function setFrontmatterLine(
  sandbox: TestSandbox,
  relativePath: string,
  line: string,
): void {
  const fullPath = join(sandbox.repoDir, relativePath);
  const text = readFileSync(fullPath, "utf8");
  writeFileSync(fullPath, text.replace(/^(status: .*)$/m, `$1\n${line}`));
  stageSourceFile(sandbox, relativePath);
}

// The commit gate is not under test here: commit everything as it stands.
async function commit(sandbox: TestSandbox, message: string): Promise<void> {
  await run("git", ["add", "."], { cwd: sandbox.repoDir, env: sandbox.env });
  const result = await run(
    "git",
    ["commit", "-q", "--no-verify", "-m", message],
    {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      timeoutMs: 180000,
    },
  );
  assert.strictEqual(result.exitCode, 0, `${result.stdout}${result.stderr}`);
}

async function floorFindings(
  sandbox: TestSandbox,
  extra: string[] = [],
): Promise<{
  exitCode: number;
  findings: CheckResult["structuredContent"]["violations"];
}> {
  const result = await kibi(sandbox, [...FLOOR, ...extra], {
    timeoutMs: 120000,
  });
  const parsed = JSON.parse(result.stdout) as CheckResult;
  return {
    exitCode: result.exitCode,
    findings: parsed.structuredContent.violations,
  };
}

/**
 * Runs the evidence-floor rule on the sandbox: two requirements below their
 * floors fail kibi check, raising one level and lowering the other floor
 * passes, and --fresh-evidence needs a committed tree.
 */
export async function checkEvidenceFloors(sandbox: TestSandbox) {
  const below = await floorFindings(sandbox);
  assert.strictEqual(below.exitCode, 1, JSON.stringify(below.findings));
  assert.deepStrictEqual(
    below.findings.map((finding) => [finding.entityId, finding.description]),
    [
      [
        "REQ-FLOOR-AGENT",
        "REQ-FLOOR-AGENT is unverified but needs asserted (its required_evidence)",
      ],
      [
        "REQ-FLOOR-PERSON",
        "REQ-FLOOR-PERSON is asserted but needs tested (the floor of a firm requirement)",
      ],
    ],
  );

  // The text output names the proof gaps without --fix or --format json.
  const text = await kibi(sandbox, ["check", "--rules", "evidence-floor"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(text.exitCode, 1, text.stdout + text.stderr);
  assert.match(
    text.stdout,
    /REQ-FLOOR-PERSON is asserted but needs tested[^\n]*\n\s+Suggestion: [^\n]*missing_scenario/,
  );

  // A person decides the first needs no tests and approves the second.
  setFrontmatterLine(
    sandbox,
    ".kb/requirements/REQ-FLOOR-PERSON.md",
    "required_evidence: asserted",
  );
  const agentPath = ".kb/requirements/REQ-FLOOR-AGENT.md";
  const agentFile = join(sandbox.repoDir, agentPath);
  writeFileSync(
    agentFile,
    readFileSync(agentFile, "utf8").replace(
      "origin: {kind: agent}",
      "origin: {kind: agent, approved_by: Owner, ref: 'review 1'}",
    ),
  );
  stageSourceFile(sandbox, agentPath);
  const sync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
  const met = await floorFindings(sandbox);
  assert.strictEqual(met.exitCode, 0, JSON.stringify(met.findings));
  assert.deepStrictEqual(met.findings, []);

  // Fresh evidence is judged on a clean proof snapshot only.
  const dirty = await floorFindings(sandbox, ["--fresh-evidence"]);
  assert.strictEqual(dirty.exitCode, 1, JSON.stringify(dirty.findings));
  assert.deepStrictEqual(
    dirty.findings.map((finding) => finding.entityId),
    ["proof-snapshot"],
  );
  await commit(sandbox, "floors");
  const clean = await floorFindings(sandbox, ["--fresh-evidence"]);
  assert.strictEqual(clean.exitCode, 0, JSON.stringify(clean.findings));
}

/**
 * Downgrades the sandbox manifest to schema 10, adds a firm requirement with
 * no proof path, and checks that kibi migrate --yes records its floor so the
 * upgraded KB passes evidence-floor.
 */
export async function checkEvidenceFloorMigration(sandbox: TestSandbox) {
  // A firm requirement whose scenario test has a passing receipt but no
  // production symbol: the evidence ladder puts it below tested, so the
  // migration must record its floor instead of keeping tested on the
  // strength of the receipt alone.
  await createInventoriedRequirement(
    sandbox,
    ".kb/requirements/REQ-FLOOR-RECEIPT.md",
    {
      id: "REQ-FLOOR-RECEIPT",
      title: "Reports export as CSV",
      type: "req",
      status: "open",
      links: "\n  - type: specified_by\n    target: SCEN-FLOOR-RECEIPT",
    },
    `Reports must export as CSV.\n\n${CONTEXT}`,
  );
  writeFileSync(
    join(sandbox.repoDir, ".kb/scenarios/SCEN-FLOOR-RECEIPT.md"),
    "---\nid: SCEN-FLOOR-RECEIPT\ntitle: A user exports a report as CSV\ntype: scenario\nstatus: active\nlinks:\n  - type: verified_by\n    target: TEST-FLOOR-RECEIPT\n---\n\nGiven a report, when the user exports it, then a CSV file downloads with every row of the report in it.\n",
  );
  stageSourceFile(sandbox, ".kb/scenarios/SCEN-FLOOR-RECEIPT.md");
  writeFileSync(
    join(sandbox.repoDir, ".kb/tests/TEST-FLOOR-RECEIPT.md"),
    "---\nid: TEST-FLOOR-RECEIPT\ntitle: Exporting a report downloads a CSV file\ntype: test\nstatus: active\nverification_scope: end_to_end\nverification_perspective: consumer\nproof_contract:\n  version: kibi.proof-contract.v1\n  integration: floor-proof\n  required_proofs:\n    - symbol_id: SYM-floor-receipt\n      target: default\n  success_policy: all_required_first_attempt\n---\n\nExporting a report downloads a CSV file with every row in it.\n",
  );
  stageSourceFile(sandbox, ".kb/tests/TEST-FLOOR-RECEIPT.md");
  mkdirSync(join(sandbox.repoDir, ".kb", "proof"), { recursive: true });
  writeFileSync(
    join(sandbox.repoDir, ".kb", "proof", "integrations.json"),
    `${JSON.stringify({
      version: "kibi.proof-integration.v1",
      integrations: [
        {
          id: "floor-proof",
          producer: "command",
          command: ["node", "floor-proof.mjs"],
          targets: ["default"],
        },
      ],
    })}\n`,
  );
  writeFileSync(join(sandbox.repoDir, "floor-proof.mjs"), "process.exit(0);\n");
  stageSourceFile(sandbox, ".kb/proof/integrations.json");
  stageSourceFile(sandbox, "floor-proof.mjs");
  const before = await kibi(sandbox, ["sync"]);
  assert.strictEqual(before.exitCode, 0, `${before.stdout}${before.stderr}`);
  const prove = await kibi(sandbox, ["prove", "--test", "TEST-FLOOR-RECEIPT"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(prove.exitCode, 0, `${prove.stdout}${prove.stderr}`);
  assert.doesNotMatch(prove.stderr, /fatal:/);
  stageSourceFile(sandbox, ".kb/tests/TEST-FLOOR-RECEIPT.md");
  const proved = await kibi(sandbox, ["sync"]);
  assert.strictEqual(proved.exitCode, 0, `${proved.stdout}${proved.stderr}`);

  const manifestPath = join(sandbox.repoDir, ".kb", "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
    string,
    unknown
  >;
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, schemaVersion: 10 }, null, 2)}\n`,
  );
  stageSourceFile(sandbox, ".kb/manifest.json");
  await createInventoriedRequirement(
    sandbox,
    ".kb/requirements/REQ-FLOOR-LEGACY.md",
    {
      id: "REQ-FLOOR-LEGACY",
      title: "Exports finish within the nightly window",
      type: "req",
      status: "open",
    },
    `Exports must finish within the nightly window.\n\n${CONTEXT}`,
  );
  const migrate = await kibi(sandbox, ["migrate", "--yes"], {
    timeoutMs: 120000,
  });
  assert.strictEqual(migrate.exitCode, 0, `${migrate.stdout}${migrate.stderr}`);
  assert.match(
    migrate.stdout,
    /Recorded required_evidence: asserted on 2 current firm requirement\(s\)/,
  );
  assert.match(
    readFileSync(
      join(sandbox.repoDir, ".kb/requirements/REQ-FLOOR-RECEIPT.md"),
      "utf8",
    ),
    /^required_evidence: asserted$/m,
  );
  const legacy = readFileSync(
    join(sandbox.repoDir, ".kb/requirements/REQ-FLOOR-LEGACY.md"),
    "utf8",
  );
  assert.match(legacy, /^required_evidence: asserted$/m);
  assert.strictEqual(
    (
      JSON.parse(readFileSync(manifestPath, "utf8")) as {
        schemaVersion: number;
      }
    ).schemaVersion,
    11,
  );
  await run("git", ["add", "-A", ".kb"], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
  });
  const sync = await kibi(sandbox, ["sync"]);
  assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
  const upgraded = await floorFindings(sandbox);
  assert.strictEqual(upgraded.exitCode, 0, JSON.stringify(upgraded.findings));
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: evidence floors in kibi check", { timeout: 420000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
        // Firm by default (no firmness and no agent origin): floor tested.
        await createInventoriedRequirement(
          sandbox,
          ".kb/requirements/REQ-FLOOR-PERSON.md",
          {
            id: "REQ-FLOOR-PERSON",
            title: "Invoices show the tax rate",
            type: "req",
            status: "open",
          },
          `Invoices must show the tax rate.\n\n${CONTEXT}`,
        );
        // Agent-written, asks for a person's approval at least.
        await createInventoriedRequirement(
          sandbox,
          ".kb/requirements/REQ-FLOOR-AGENT.md",
          {
            id: "REQ-FLOOR-AGENT",
            title: "Receipts show the currency",
            type: "req",
            status: "open",
            required_evidence: "asserted",
            origin: "{kind: agent}",
          },
          `Receipts must show the currency.\n\n${CONTEXT}`,
        );
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
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
      "fails requirements below their floor and passes once they reach it",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkEvidenceFloors(sandbox);
      },
    );

    it(
      "records the floor of firm requirements without a proof path on upgrade",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        await checkEvidenceFloorMigration(sandbox);
      },
    );
  });
}

import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
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
  parseKibiResult,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface CoverageRow {
  id: string;
  proofStatus: string;
  proofStages?: {
    executableSymbols?: { status?: string; missingTests?: string[] };
    productionSymbols?: {
      status?: string;
      symbols?: string[];
      uncoveredSymbols?: string[];
    };
  };
  proofGaps?: string[];
  proofRepairs?: Array<{ gap: string }>;
  coverageDepth?: string;
  coverageStatus?: string;
  proofVersion?: string;
}

/** Write a fixture document and put it inside the Git source boundary. */
function writeStaged(
  sandbox: TestSandbox,
  relativePath: string,
  content: string,
): void {
  const target = join(sandbox.repoDir, relativePath);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, content);
  stageSourceFile(sandbox, relativePath);
}

async function upsertJson(
  sandbox: TestSandbox,
  payload: Record<string, unknown>,
): Promise<void> {
  const request = join(sandbox.repoDir, "coverage-proof-upsert.json");
  writeFileSync(request, JSON.stringify(payload));
  const result = await kibi(sandbox, ["upsert", "--input", request]);
  assert.strictEqual(result.exitCode, 0, `${result.stdout}${result.stderr}`);
}

async function coverageRows(
  sandbox: TestSandbox,
): Promise<Map<string, CoverageRow>> {
  const coverage = await kibi(sandbox, [
    "coverage",
    "--format",
    "json",
    "--include-passing",
  ]);
  assert.strictEqual(
    coverage.exitCode,
    0,
    `${coverage.stdout}${coverage.stderr}`,
  );
  const payload = parseKibiResult<{ rows?: CoverageRow[] }>(coverage.stdout);
  return new Map((payload.rows ?? []).map((row) => [row.id, row]));
}

// The commit gate is not under test here: commit everything as it stands.
async function commitAll(sandbox: TestSandbox, message: string): Promise<void> {
  await run("git", ["add", "-A"], { cwd: sandbox.repoDir, env: sandbox.env });
  const result = await run(
    "git",
    ["commit", "-q", "--no-verify", "-m", message],
    { cwd: sandbox.repoDir, env: sandbox.env, timeoutMs: 180000 },
  );
  assert.strictEqual(result.exitCode, 0, `${result.stdout}${result.stderr}`);
}

/**
 * E2E: conservative proof is reported separately from structural coverage.
 *
 * SCEN-kibi-conservative-requirement-proof — a structurally linked
 * requirement whose E2E proof path is incomplete keeps its compatibility
 * coverage fields while coverage reports a non-proven proofStatus, stable
 * gap codes, and ranked repair actions.
 *
 * The failure-side cases of the same contract: a requirement whose scenario
 * test has a fresh passing receipt is still not tested while that test has no
 * executable_for symbol, while a symbol covered by the test does not
 * implement the requirement, or while an implementing symbol has no
 * covered_by link to it; and sync refuses a modeled claim with no grounding
 * or with two.
 */
if (RUN_NODE_TEST_SUITE) {
  describe(
    "E2E: conservative coverage proof status",
    { timeout: 240000 },
    () => {
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

          for (const dir of [
            ["requirements", "REQ-COVERAGE-PROOF"],
            ["scenarios", "SCEN-COVERAGE-PROOF"],
            ["tests", "TEST-COVERAGE-PROOF"],
          ] as const) {
            mkdirSync(join(sandbox.repoDir, ".kb", dir[0]), {
              recursive: true,
            });
          }
          mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
          writeFileSync(
            join(
              sandbox.repoDir,
              ".kb",
              "requirements",
              "REQ-COVERAGE-PROOF.md",
            ),
            `---
id: REQ-COVERAGE-PROOF
title: Coverage proof fixture
status: open
links:
  - type: specified_by
    target: SCEN-COVERAGE-PROOF
---

Coverage proof fixture requirement.
`,
          );
          writeFileSync(
            join(sandbox.repoDir, ".kb", "scenarios", "SCEN-COVERAGE-PROOF.md"),
            `---
id: SCEN-COVERAGE-PROOF
title: Coverage proof scenario
status: active
links:
  - type: verified_by
    target: TEST-COVERAGE-PROOF
---

Given a linked fixture, when coverage runs, then proof gaps stay explicit.
`,
          );
          writeFileSync(
            join(sandbox.repoDir, ".kb", "tests", "TEST-COVERAGE-PROOF.md"),
            `---
id: TEST-COVERAGE-PROOF
title: Coverage proof unit fixture
status: passing
verification_scope: unit
source: src/coverage-proof.test.ts
links:
  - type: validates
    target: SCEN-COVERAGE-PROOF
---

Unit-scope fixture that satisfies structure but never E2E proof.
`,
          );
          writeFileSync(
            join(sandbox.repoDir, "src", "coverage-proof.test.ts"),
            "export const coverageProofFixture = 'v1';\n",
          );
          for (const sourcePath of [
            ".kb/requirements/REQ-COVERAGE-PROOF.md",
            ".kb/scenarios/SCEN-COVERAGE-PROOF.md",
            ".kb/tests/TEST-COVERAGE-PROOF.md",
            "src/coverage-proof.test.ts",
          ]) {
            stageSourceFile(sandbox, sourcePath);
          }
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
        },
        { timeout: 180000 },
      );

      after(
        async () => {
          if (sandbox) await sandbox.cleanup();
        },
        { timeout: 60000 },
      );

      it(
        "reports non-proven proofStatus with stable gaps and ranked repairs",
        { timeout: 120000 },
        async () => {
          const coverage = await kibi(sandbox, [
            "coverage",
            "--format",
            "json",
            "--include-passing",
          ]);
          assert.strictEqual(
            coverage.exitCode,
            0,
            `${coverage.stdout}${coverage.stderr}`,
          );
          const payload = parseKibiResult<{ rows?: CoverageRow[] }>(
            coverage.stdout,
          );
          const rows = payload.rows ?? [];
          const row = rows.find(
            (candidate) => candidate.id === "REQ-COVERAGE-PROOF",
          );
          assert.ok(row, "coverage must include the fixture requirement row");
          assert.notStrictEqual(
            row.proofStatus,
            "tested",
            "a unit-only chain must never report tested",
          );
          assert.ok(
            (row.proofGaps ?? []).length > 0,
            "incomplete proof must surface stable gap codes",
          );
          assert.ok(
            (row.proofRepairs ?? []).length > 0,
            "incomplete proof must surface ranked repair actions",
          );
          assert.ok(
            row.coverageDepth !== undefined && row.coverageStatus !== undefined,
            "structural coverage fields remain present alongside proof gaps",
          );
          assert.strictEqual(
            row.proofVersion,
            "kibi.requirement-proof.v5",
            "proof projection stays on the current contract version",
          );
        },
      );

      it(
        "keeps a receipt-backed chain below tested while executable or production symbol links are missing",
        { timeout: 240000 },
        async () => {
          // Two requirements share one scenario whose end-to-end test gets a
          // fresh passing receipt from a command integration.
          for (const [id, title] of [
            ["REQ-CHAIN-EXEC", "Receipt chain without symbol links"],
            ["REQ-CHAIN-COVER", "Receipt chain with an uncovered symbol"],
          ]) {
            await createInventoriedRequirement(
              sandbox,
              `.kb/requirements/${id}.md`,
              {
                id,
                title,
                status: "open",
                links: "\n  - type: specified_by\n    target: SCEN-CHAIN",
              },
              `${title}.`,
            );
          }
          writeStaged(
            sandbox,
            ".kb/scenarios/SCEN-CHAIN.md",
            `---
id: SCEN-CHAIN
title: Receipt chain scenario
status: active
links:
  - type: verified_by
    target: TEST-CHAIN
---

Given a receipt-backed test, when coverage runs, then missing symbol links stay explicit gaps.
`,
          );
          writeStaged(
            sandbox,
            ".kb/tests/TEST-CHAIN.md",
            `---
id: TEST-CHAIN
title: Receipt chain end-to-end test
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: chain-proof
  required_proofs:
    - symbol_id: SYM-chain-runner
      target: default
  success_policy: all_required_first_attempt
---

End-to-end fixture whose integration always passes.
`,
          );
          writeStaged(
            sandbox,
            ".kb/proof/integrations.json",
            `${JSON.stringify({
              version: "kibi.proof-integration.v1",
              integrations: [
                {
                  id: "chain-proof",
                  producer: "command",
                  command: ["node", "chain-proof.mjs"],
                  targets: ["default"],
                },
              ],
            })}\n`,
          );
          writeStaged(sandbox, "chain-proof.mjs", "process.exit(0);\n");
          writeStaged(
            sandbox,
            "src/export.mjs",
            "export function runExport() {\n  return 1;\n}\nexport function helper() {\n  return 2;\n}\n",
          );
          const sync = await kibi(sandbox, ["sync"]);
          assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
          // A symbol the test covers that implements no requirement, and a
          // symbol that implements a requirement but no test covers.
          await upsertJson(sandbox, {
            type: "symbol",
            id: "SYM-CHAIN-COVERED-ONLY",
            properties: {
              title: "runExport",
              status: "active",
              sourceFile: "src/export.mjs",
              symbol_role: "behavioral",
            },
            relationships: [
              {
                type: "covered_by",
                from: "SYM-CHAIN-COVERED-ONLY",
                to: "TEST-CHAIN",
              },
            ],
          });
          await upsertJson(sandbox, {
            type: "symbol",
            id: "SYM-CHAIN-UNCOVERED",
            properties: {
              title: "helper",
              status: "active",
              sourceFile: "src/export.mjs",
              symbol_role: "behavioral",
            },
            relationships: [
              {
                type: "implements",
                from: "SYM-CHAIN-UNCOVERED",
                to: "REQ-CHAIN-COVER",
              },
            ],
          });
          await commitAll(sandbox, "receipt chain fixture");
          const prove = await kibi(sandbox, ["prove", "--test", "TEST-CHAIN"], {
            timeoutMs: 120000,
          });
          assert.strictEqual(
            prove.exitCode,
            0,
            `${prove.stdout}${prove.stderr}`,
          );
          stageSourceFile(sandbox, ".kb/tests/TEST-CHAIN.md");
          const proved = await kibi(sandbox, ["sync"]);
          assert.strictEqual(
            proved.exitCode,
            0,
            `${proved.stdout}${proved.stderr}`,
          );

          const rows = await coverageRows(sandbox);
          const exec = rows.get("REQ-CHAIN-EXEC");
          const cover = rows.get("REQ-CHAIN-COVER");
          assert.ok(exec && cover, "coverage must list both chain fixtures");
          for (const row of [exec, cover]) {
            assert.notStrictEqual(row.proofStatus, "tested", row.id);
            // The passing receipt reached the executable-symbol stage, and
            // the test has no executable_for symbol.
            assert.strictEqual(
              row.proofStages?.executableSymbols?.status,
              "missing",
              row.id,
            );
            assert.deepStrictEqual(
              row.proofStages?.executableSymbols?.missingTests,
              ["TEST-CHAIN"],
              row.id,
            );
            assert.ok(
              (row.proofGaps ?? []).includes("missing_executable_test_symbol"),
              row.id,
            );
          }
          // A symbol the test covers does not count for a requirement it does
          // not implement.
          assert.deepStrictEqual(
            exec.proofStages?.productionSymbols?.symbols,
            [],
          );
          assert.ok(
            (exec.proofGaps ?? []).includes("missing_production_symbol"),
            JSON.stringify(exec.proofGaps),
          );
          // An implementing symbol with no covered_by link to the passing
          // test keeps the coverage gap.
          assert.deepStrictEqual(
            cover.proofStages?.productionSymbols?.uncoveredSymbols,
            ["SYM-CHAIN-UNCOVERED"],
          );
          assert.ok(
            (cover.proofGaps ?? []).includes(
              "missing_production_symbol_coverage",
            ),
            JSON.stringify(cover.proofGaps),
          );
        },
      );

      it(
        "refuses to sync a modeled claim with no grounding or with two groundings",
        { timeout: 180000 },
        async () => {
          const prose = "An export must finish within 5 minutes.";
          const adviceRequest = join(sandbox.repoDir, "advice-request.json");
          writeFileSync(adviceRequest, JSON.stringify({ text: prose }));
          const advise = await kibi(sandbox, [
            "semantic-advisor",
            "--input",
            adviceRequest,
          ]);
          assert.strictEqual(
            advise.exitCode,
            0,
            `${advise.stdout}${advise.stderr}`,
          );
          const receipt = parseKibiResult<{
            receipt: {
              inventory_contract: Record<string, string>;
              propositions: Array<{
                claim_key: string;
                claim_text: string;
                role: string;
                span: { start: number; end: number };
              }>;
            };
          }>(advise.stdout).receipt;
          const contract = receipt.inventory_contract;
          const [claim] = receipt.propositions;
          assert.ok(claim, "the advisor must find one clause");
          writeStaged(
            sandbox,
            ".kb/facts/FACT-EXPORT-SUBJECT.md",
            "---\nid: FACT-EXPORT-SUBJECT\ntitle: Export job\ntype: fact\nstatus: active\nfact_kind: subject\nsubject_key: export.job\n---\n",
          );
          for (const id of ["FACT-EXPORT-A", "FACT-EXPORT-B"]) {
            writeStaged(
              sandbox,
              `.kb/facts/${id}.md`,
              `---
id: ${id}
title: An export finishes within 5 minutes
type: fact
status: active
fact_kind: property_value
subject_key: export.job
property_key: duration_minutes
operator: lte
value_type: int
value_int: 5
claim_key: ${claim.claim_key}
claim_text: ${claim.claim_text}
---
`,
            );
          }
          const requirement = (id: string, groundings: readonly string[]) =>
            `---
id: ${id}
title: Exports finish within 5 minutes
type: req
status: open
semantic_text: ${prose}
semantic_inventory_version: ${contract.version}
semantic_source_field: ${contract.source_field}
semantic_source_hash: ${contract.source_hash}
semantic_inventory:
  - claim_key: ${claim.claim_key}
    claim_text: ${claim.claim_text}
    role: ${claim.role}
    status: modeled
    span: {start: ${claim.span.start}, end: ${claim.span.end}}
logic_claims: [${claim.claim_key}]
links:
  - type: constrains
    target: FACT-EXPORT-SUBJECT
${groundings.map((fact) => `  - type: requires_property\n    target: ${fact}\n`).join("")}---

${prose}
`;
          const fixtures = [
            ".kb/facts/FACT-EXPORT-SUBJECT.md",
            ".kb/facts/FACT-EXPORT-A.md",
            ".kb/facts/FACT-EXPORT-B.md",
            ".kb/requirements/REQ-GROUND-NONE.md",
            ".kb/requirements/REQ-GROUND-TWO.md",
          ];
          try {
            writeStaged(
              sandbox,
              ".kb/requirements/REQ-GROUND-NONE.md",
              requirement("REQ-GROUND-NONE", []),
            );
            writeStaged(
              sandbox,
              ".kb/requirements/REQ-GROUND-TWO.md",
              requirement("REQ-GROUND-TWO", ["FACT-EXPORT-A", "FACT-EXPORT-B"]),
            );
            const sync = await kibi(sandbox, ["sync"]);
            const output = `${sync.stdout}${sync.stderr}`;
            assert.notStrictEqual(sync.exitCode, 0, output);
            assert.match(
              output,
              /REQ-GROUND-NONE\.md: proposition-complete ingestion failed: modeled semantic_inventory entries \(1\) must equal logical grounding relationships \(0\)/,
            );
            assert.match(
              output,
              /REQ-GROUND-TWO\.md: proposition-complete ingestion failed: modeled semantic_inventory entries \(1\) must equal logical grounding relationships \(2\)/,
            );
          } finally {
            await run("git", ["rm", "-q", "--cached", "--force", ...fixtures], {
              cwd: sandbox.repoDir,
              env: sandbox.env,
            });
            for (const fixture of fixtures)
              rmSync(join(sandbox.repoDir, fixture), { force: true });
          }
        },
      );
    },
  );
}

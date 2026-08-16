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

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

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

function writeInput(
  sandbox: TestSandbox,
  name: string,
  payload: Record<string, unknown>,
) {
  const inputPath = join(sandbox.repoDir, `${name}.json`);
  writeFileSync(inputPath, JSON.stringify(payload));
  return inputPath;
}

function assertExactPredicatePlan(exact: {
  recommendedAction: string;
  applyPlan: Array<{ properties: Record<string, unknown> }>;
}) {
  assert.strictEqual(exact.recommendedAction, "apply_requires_predicate");
  assert.deepStrictEqual(exact.applyPlan[0]?.properties.predicate_args, [
    "packed.consumer",
    "fresh_workspace",
    "source_bound_witness",
  ]);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: ontology convergence and contradiction witnesses", () => {
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

    it(
      "discovers packed project schemas, withholds incomplete plans, and returns exact contradiction evidence",
      { timeout: 300_000 },
      async () => {
        if (!hasProlog) return;
        mkdirSync(join(sandbox.repoDir, "documentation", "facts"), {
          recursive: true,
        });
        writeFileSync(
          join(
            sandbox.repoDir,
            "documentation/facts/FACT-SCHEMA-PACKED-BINDING.md",
          ),
          `---
id: FACT-SCHEMA-PACKED-BINDING
title: Packed binding rule schema
type: fact
status: active
fact_kind: predicate_schema
predicate_name: packed_binding_rule
predicate_namespace: packed.requirements
predicate_arity: 3
argument_names: [subject, condition, outcome]
argument_types: [entity, condition, outcome]
tags: [packed, convergence, binding]
---

Defines the packed convergence binding relation.
`,
        );
        stageSourceFile(
          sandbox,
          "documentation/facts/FACT-SCHEMA-PACKED-BINDING.md",
        );
        assert.strictEqual((await kibi(sandbox, ["sync"])).exitCode, 0);

        const prose =
          "Packed convergence binding must preserve an exact condition and outcome.";
        const incompleteInput = writeInput(sandbox, "incomplete", {
          text: prose,
          subjectHint: "packed.consumer",
          maxCandidates: 1,
        });
        const incomplete = await cliJson<{
          recommendedAction: string;
          applyPlan: unknown[];
          candidates: Array<{
            predicate_name: string;
            binding_status: string;
            unbound_arguments: string[];
          }>;
        }>(sandbox, ["suggest-predicates", "--input", incompleteInput]);
        assert.strictEqual(
          incomplete.candidates[0]?.predicate_name,
          "packed_binding_rule",
        );
        assert.strictEqual(
          incomplete.recommendedAction,
          "provide_argument_bindings",
        );
        assert.deepStrictEqual(incomplete.applyPlan, []);
        assert.deepStrictEqual(incomplete.candidates[0]?.unbound_arguments, [
          "condition",
          "outcome",
        ]);

        const exactInput = writeInput(sandbox, "exact", {
          text: prose,
          schemaId: "FACT-SCHEMA-PACKED-BINDING",
          subjectHint: "packed.consumer",
          argumentBindings: {
            condition: "fresh_workspace",
            outcome: "source_bound_witness",
          },
          polarityHint: "assert",
          maxCandidates: 1,
        });
        const exact = await cliJson<{
          recommendedAction: string;
          applyPlan: Array<{ properties: Record<string, unknown> }>;
        }>(sandbox, ["suggest-predicates", "--input", exactInput]);
        assertExactPredicatePlan(exact);

        mkdirSync(join(sandbox.repoDir, "documentation", "requirements"), {
          recursive: true,
        });
        writeFileSync(
          join(sandbox.repoDir, "documentation/facts/FACT-PACKED-SUBJECT.md"),
          `---
id: FACT-PACKED-SUBJECT
title: Packed quota subject
type: fact
status: active
fact_kind: subject
subject_key: packed.quota
---

Fixture subject.
`,
        );
        for (const [suffix, value, claim, sourceHash] of [
          [
            "A",
            10,
            "CLAIM-12C87DBC9E384CE8",
            "91fd3991bdf94a4d52aa5411bd65a3117a6846a1adaccb2fc8f3a8e022d1b529",
          ],
          [
            "B",
            20,
            "CLAIM-32A088E522FDD0BE",
            "3b2e32b77468c6891c37aca5f880cb48b2f73925787a4bd8304f4074fd85b686",
          ],
        ] as const) {
          writeFileSync(
            join(
              sandbox.repoDir,
              `documentation/facts/FACT-PACKED-${suffix}.md`,
            ),
            `---
id: FACT-PACKED-${suffix}
title: Packed quota ${suffix}
type: fact
status: active
fact_kind: property_value
subject_key: packed.quota
property_key: limit
operator: eq
value_type: int
value_int: ${value}
claim_key: ${claim}
claim_text: Packed quota must equal ${value}
claim_span_start: 0
claim_span_end: 26
---

Fixture value ${suffix}.
`,
          );
          writeFileSync(
            join(
              sandbox.repoDir,
              `documentation/requirements/REQ-PACKED-${suffix}.md`,
            ),
            `---
id: REQ-PACKED-${suffix}
title: Packed contradiction ${suffix}
type: req
status: open
logic_claims: [${claim}]
semantic_clauses: [Packed quota must equal ${value}]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${sourceHash}
semantic_inventory:
  - claim_key: ${claim}
    claim_text: Packed quota must equal ${value}
    role: normative
    status: modeled
    span: {start: 0, end: 26}
links:
  - type: constrains
    target: FACT-PACKED-SUBJECT
  - type: requires_property
    target: FACT-PACKED-${suffix}
---

Packed quota must equal ${value}
`,
          );
        }
        for (const sourcePath of [
          "documentation/facts/FACT-PACKED-SUBJECT.md",
          "documentation/facts/FACT-PACKED-A.md",
          "documentation/facts/FACT-PACKED-B.md",
          "documentation/requirements/REQ-PACKED-A.md",
          "documentation/requirements/REQ-PACKED-B.md",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
        const conflictSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          conflictSync.exitCode,
          0,
          `${conflictSync.stdout}${conflictSync.stderr}`,
        );

        const check = await kibi(sandbox, [
          "check",
          "--rules",
          "domain-contradictions",
          "--format",
          "json",
        ]);
        assert.notStrictEqual(check.exitCode, 0);
        const checked = JSON.parse(check.stdout) as {
          data?: {
            structuredContent: {
              violations: Array<{
                evidence?: {
                  witnesses?: Array<{
                    kind: string;
                    left: { factId: string; claimKey: string };
                    right: { factId: string; claimKey: string };
                  }>;
                };
              }>;
            };
          };
        };
        const checkedData = (checked.data ?? checked) as {
          structuredContent: {
            violations: Array<{
              evidence?: {
                witnesses?: Array<{
                  kind: string;
                  left: { factId: string; claimKey: string };
                  right: { factId: string; claimKey: string };
                }>;
              };
            }>;
          };
        };
        const witness =
          checkedData.structuredContent.violations[0]?.evidence?.witnesses?.[0];
        assert.strictEqual(witness?.kind, "strict_property");
        assert.deepStrictEqual(
          [witness?.left.factId, witness?.right.factId],
          ["FACT-PACKED-A", "FACT-PACKED-B"],
        );
        assert.deepStrictEqual(
          [witness?.left.claimKey, witness?.right.claimKey],
          ["CLAIM-12C87DBC9E384CE8", "CLAIM-32A088E522FDD0BE"],
        );
      },
    );
  });
}

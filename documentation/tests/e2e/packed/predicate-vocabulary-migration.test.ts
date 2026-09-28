import assert from "node:assert";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, before, beforeEach, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  run,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

type Diagnostic = {
  id: string;
  entityId?: string;
  blocking: boolean;
  evidence?: Record<string, unknown>;
};

type MigrationAction = {
  id: string;
  code: string;
  state: string;
  safety: string;
  autoApplicable: boolean;
  affectedEntityIds: string[];
  invocation: { kind: string; name?: string };
};

function conformance(stdout: string): Diagnostic[] {
  const payload = JSON.parse(stdout) as {
    structuredContent: { violations: unknown[]; qualityDiagnostics: Diagnostic[] };
  };
  assert.deepStrictEqual(payload.structuredContent.violations, []);
  return payload.structuredContent.qualityDiagnostics.filter(
    (diagnostic) => diagnostic.id === "rule.predicate-schema-conformance",
  );
}

/**
 * Executable proof of closed predicate vocabularies over a packed install:
 * the advisory conformance check finds namespace drift, alias spellings, and
 * undeclared values; kibi migrate plans automatic kb_upsert repairs only for
 * the mechanical cases and applies them under an approved plan hash; kb_upsert
 * then refuses new facts outside the declared vocabulary.
 */
export function assertPredicateVocabularyMigration(input: {
  before: Diagnostic[];
  actions: MigrationAction[];
  after: Diagnostic[];
  migratedFact: string;
}): void {
  const byEntity = new Map(input.before.map((d) => [d.entityId, d]));
  assert.strictEqual(input.before.length, 2, JSON.stringify(input.before));
  assert.ok(input.before.every((d) => d.blocking === false));
  assert.strictEqual(byEntity.get("FACT-POLICY-DRIFT")?.evidence?.issue, "missing_schema");
  assert.strictEqual(
    byEntity.get("FACT-POLICY-FATAL")?.evidence?.issue,
    "undeclared_constant",
  );

  const automatic = input.actions.filter(
    (action) => action.code === "predicate_schema_alignment",
  );
  assert.deepStrictEqual(
    automatic.map((action) => [action.id, action.safety, action.state]),
    [["predicate-schema-alignment-FACT-POLICY-DRIFT", "automatic", "ready"]],
  );
  assert.strictEqual(automatic[0]?.invocation.name, "kb_upsert");

  assert.deepStrictEqual(
    input.after.map((d) => d.entityId),
    ["FACT-POLICY-FATAL"],
  );
  assert.match(input.migratedFact, /predicate_namespace: kibi\.checks/);
  assert.match(
    input.migratedFact,
    /canonical_key: check_finding_policy\(domain_redundancy,same_signature,warning\)/,
  );
}

function writeTracked(sandbox: TestSandbox, relativePath: string, content: string): void {
  const fullPath = join(sandbox.repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  stageSourceFile(sandbox, relativePath);
}

function seedFixture(sandbox: TestSandbox): void {
  writeTracked(
    sandbox,
    ".kb/facts/FACT-SCHEMA-CHECK-FINDING-POLICY.md",
    `---
id: FACT-SCHEMA-CHECK-FINDING-POLICY
title: Check finding policy
status: active
fact_kind: predicate_schema
predicate_namespace: kibi.checks
predicate_name: check_finding_policy
predicate_arity: 3
argument_names: [rule, finding, severity]
argument_types: [check_rule, finding_class, diagnostic_severity]
argument_constants:
  severity: [warning, info]
argument_aliases:
  severity:
    warn: warning
---

Fixture schema with a closed severity vocabulary.
`,
  );
  const fact = (id: string, namespace: string | null, severity: string) =>
    writeTracked(
      sandbox,
      `.kb/facts/${id}.md`,
      `---
id: ${id}
title: 'Predicate: check_finding_policy(domain_redundancy,same_signature,${severity})'
status: active
fact_kind: predicate
${namespace === null ? "" : `predicate_namespace: ${namespace}\n`}predicate_name: check_finding_policy
predicate_args: [domain_redundancy, same_signature, ${severity}]
canonical_key: check_finding_policy(domain_redundancy,same_signature,${severity})
polarity: assert
---

Fixture predicate fact.
`,
    );
  // Wrong namespace and an alias: mechanically repairable.
  fact("FACT-POLICY-DRIFT", null, "warn");
  // Undeclared value: left for review.
  fact("FACT-POLICY-FATAL", "kibi.checks", "fatal");
  fact("FACT-POLICY-OK", "kibi.checks", "info");
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: predicate vocabulary conformance and migration", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (hasProlog) tarballs = await packAll();
      },
      { timeout: 120000 },
    );

    beforeEach(
      async () => {
        if (!hasProlog) return;
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
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
      "reports drift, migrates mechanical repairs under an approved hash, and rejects undeclared values",
      { timeout: 300000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        seedFixture(sandbox);
        await run("git", ["commit", "-m", "predicate vocabulary fixtures"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.strictEqual((await kibi(sandbox, ["init", "--no-hooks"])).exitCode, 0);
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const checkArgs = [
          "check",
          "--rules",
          "predicate-schema-conformance",
          "--format",
          "json",
        ];
        const beforeCheck = await kibi(sandbox, checkArgs);
        assert.strictEqual(beforeCheck.exitCode, 0, beforeCheck.stderr);

        const planned = await kibi(sandbox, ["migrate", "--format", "json"]);
        assert.strictEqual(planned.exitCode, 0, planned.stderr);
        const plan = JSON.parse(planned.stdout) as {
          planHash: string;
          actions: MigrationAction[];
        };
        const approved = plan.actions
          .filter((action) => action.code === "predicate_schema_alignment")
          .map((action) => action.id);
        const applied = await kibi(sandbox, [
          "migrate",
          "--apply-safe",
          "--approved-plan-hash",
          plan.planHash,
          "--approved-action",
          approved.join(","),
          "--format",
          "json",
        ]);
        assert.strictEqual(applied.exitCode, 0, `${applied.stdout}${applied.stderr}`);

        const afterCheck = await kibi(sandbox, checkArgs);
        assert.strictEqual(afterCheck.exitCode, 0, afterCheck.stderr);

        assertPredicateVocabularyMigration({
          before: conformance(beforeCheck.stdout),
          actions: plan.actions,
          after: conformance(afterCheck.stdout),
          migratedFact: readFileSync(
            join(sandbox.repoDir, ".kb/facts/FACT-POLICY-DRIFT.md"),
            "utf8",
          ),
        });

        const inputPath = join(sandbox.baseDir, "undeclared-upsert.json");
        writeFileSync(
          inputPath,
          JSON.stringify({
            type: "fact",
            id: "FACT-POLICY-NEW",
            properties: {
              title: "New policy fact",
              status: "active",
              fact_kind: "predicate",
              predicate_namespace: "kibi.checks",
              predicate_name: "check_finding_policy",
              predicate_args: ["domain_redundancy", "same_signature", "warn"],
              canonical_key:
                "check_finding_policy(domain_redundancy,same_signature,warn)",
            },
            document: { path: ".kb/facts/FACT-POLICY-NEW.md" },
          }),
        );
        const rejected = await kibi(sandbox, ["upsert", "--input", inputPath]);
        const output = `${rejected.stdout}${rejected.stderr}`;
        assert.match(
          output,
          /argument severity uses alias warn; use the declared constant warning/,
        );
      },
    );
  });
}

import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
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

type QualityDiagnostic = {
  id: string;
  severity: string;
  blocking: boolean;
  entityId?: string;
  evidence?: { witnesses?: Array<Record<string, unknown>> };
};

type CheckPayload = {
  violations: unknown[];
  qualityDiagnostics: QualityDiagnostic[];
};

function findings(payload: CheckPayload, rule: string): QualityDiagnostic[] {
  return payload.qualityDiagnostics.filter(
    (diagnostic) => diagnostic.id === `rule.${rule}`,
  );
}

/**
 * Executable proof of the vocabulary-convergence checks over a packed install:
 * unit-canonical redundancy with exact witnesses, restates suppression,
 * informational implication, requirement-derived and malformed subject keys,
 * prose-in-atoms ontology quality, and filename-stem identity. Every finding is
 * advisory, so the check must not report blocking violations.
 */
export function assertVocabularyConvergenceOutcome(
  payload: CheckPayload,
): void {
  assert.deepStrictEqual(payload.violations, []);
  for (const diagnostic of payload.qualityDiagnostics) {
    if (diagnostic.id.startsWith("rule.")) {
      assert.strictEqual(diagnostic.blocking, false, diagnostic.id);
    }
  }

  const redundancy = findings(payload, "domain-redundancy");
  assert.deepStrictEqual(
    redundancy.map((diagnostic) => diagnostic.entityId),
    ["REQ-billing-session-ttl/REQ-platform-session-ttl"],
  );
  const witness = redundancy[0]?.evidence?.witnesses?.[0];
  assert.strictEqual(witness?.match, "same_signature");
  assert.deepStrictEqual(witness?.facts, [
    "FACT-SESSION-TTL-MINUTES",
    "FACT-SESSION-TTL-SECONDS",
  ]);
  assert.match(String(witness?.signature), /1800,s/);

  const implication = findings(payload, "domain-implication");
  assert.ok(
    implication.some(
      (diagnostic) =>
        diagnostic.entityId ===
          "REQ-billing-session-ttl/REQ-audit-session-ttl" &&
        diagnostic.severity === "info",
    ),
    JSON.stringify(implication),
  );

  assert.deepStrictEqual(
    findings(payload, "subject-key-identity").map((d) => d.entityId),
    ["FACT-SUBJ-REQ-BILLING-SESSION-TTL"],
  );
  assert.deepStrictEqual(
    findings(payload, "subject-key-shape").map((d) => d.entityId),
    ["FACT-SUBJ-FLAT"],
  );
  assert.deepStrictEqual(
    findings(payload, "entity-id-style").map((d) => d.entityId),
    ["SCEN-session-ttl"],
  );
  const ontology = findings(payload, "ontology-quality");
  assert.strictEqual(ontology.length, 1, JSON.stringify(ontology));
  assert.strictEqual(ontology[0]?.severity, "info");
}

function writeTracked(
  sandbox: TestSandbox,
  relativePath: string,
  content: string,
): void {
  const fullPath = join(sandbox.repoDir, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
  stageSourceFile(sandbox, relativePath);
}

function fact(
  sandbox: TestSandbox,
  id: string,
  fields: Record<string, string>,
): void {
  const lines = Object.entries(fields).map(
    ([key, value]) => `${key}: ${value}`,
  );
  writeTracked(
    sandbox,
    `.kb/facts/${id}.md`,
    `---\nid: ${id}\ntitle: ${id}\nstatus: active\n${lines.join("\n")}\n---\n\nFixture fact.\n`,
  );
}

function requirement(
  sandbox: TestSandbox,
  id: string,
  links: Array<[string, string]>,
): void {
  const linkLines = links
    .map(([type, target]) => `  - type: ${type}\n    target: ${target}`)
    .join("\n");
  writeTracked(
    sandbox,
    `.kb/requirements/${id}.md`,
    `---\nid: ${id}\ntitle: ${id}\nstatus: open\nlinks:\n${linkLines}\n---\n\nFixture requirement.\n`,
  );
}

function seedFixture(sandbox: TestSandbox): void {
  fact(sandbox, "FACT-SUBJ-SESSION-LIFETIME", {
    fact_kind: "subject",
    subject_key: "session.lifetime",
  });
  const ttl = (id: string, value: string, unit: string) =>
    fact(sandbox, id, {
      fact_kind: "property_value",
      subject_key: "session.lifetime",
      property_key: "idle_timeout",
      operator: "lte",
      value_type: "int",
      value_int: value,
      unit,
    });
  ttl("FACT-SESSION-TTL-MINUTES", "30", "min");
  ttl("FACT-SESSION-TTL-SECONDS", "1800", "seconds");
  ttl("FACT-SESSION-TTL-HOUR", "3600", "s");
  const strict = (
    id: string,
    property: string,
    extra: Array<[string, string]> = [],
  ) =>
    requirement(sandbox, id, [
      ["constrains", "FACT-SUBJ-SESSION-LIFETIME"],
      ["requires_property", property],
      ...extra,
    ]);
  strict("REQ-billing-session-ttl", "FACT-SESSION-TTL-MINUTES");
  strict("REQ-platform-session-ttl", "FACT-SESSION-TTL-SECONDS");
  strict("REQ-audit-session-ttl", "FACT-SESSION-TTL-HOUR");
  // An intentional restatement of both: exempt from domain-redundancy.
  strict("REQ-mobile-session-ttl", "FACT-SESSION-TTL-MINUTES", [
    ["restates", "REQ-billing-session-ttl"],
    ["restates", "REQ-platform-session-ttl"],
  ]);

  fact(sandbox, "FACT-SUBJ-REQ-BILLING-SESSION-TTL", {
    fact_kind: "subject",
    subject_key: "req.req_billing_session_ttl",
  });
  fact(sandbox, "FACT-SUBJ-FLAT", {
    fact_kind: "subject",
    subject_key: "sessionflat",
  });
  for (const index of [1, 2, 3]) {
    fact(sandbox, `FACT-PROSE-RULE-${index}`, {
      fact_kind: "predicate",
      predicate_name: "prose_rule",
      predicate_args: `[clause_${index}_subject, clause_${index}_obligation]`,
      canonical_key: `prose_rule(clause_${index}_subject,clause_${index}_obligation)`,
    });
  }
  writeTracked(
    sandbox,
    ".kb/scenarios/SCEN-session-expiry.md",
    "---\nid: SCEN-session-ttl\ntitle: Session expiry\nstatus: active\n---\n\nFixture scenario whose file name differs from its id.\n",
  );
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: vocabulary convergence checks and subject reuse", () => {
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
      "reports advisory redundancy, vocabulary, and naming findings and reuses subjects",
      { timeout: 240000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }

        seedFixture(sandbox);
        await run("git", ["commit", "-m", "vocabulary fixtures"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        assert.strictEqual(
          (await kibi(sandbox, ["init", "--no-hooks"])).exitCode,
          0,
        );
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        sandbox.env.KIBI_ONTOLOGY_QUALITY_MIN_FACTS = "3";
        const check = await kibi(sandbox, [
          "check",
          "--rules",
          "domain-redundancy,domain-implication,subject-key-identity,subject-key-shape,entity-id-style,ontology-quality",
          "--format",
          "json",
        ]);
        assert.strictEqual(check.exitCode, 0, `${check.stdout}${check.stderr}`);
        const payload = (
          JSON.parse(check.stdout) as { structuredContent: CheckPayload }
        ).structuredContent;
        assertVocabularyConvergenceOutcome(payload);

        const inputPath = join(sandbox.baseDir, "model-requirement.json");
        writeFileSync(
          inputPath,
          JSON.stringify({
            text: "Session lifetime must expire after 45 minutes of inactivity.",
            source: ".kb/requirements/REQ-session-expiry-demo.md",
          }),
        );
        const modeled = await kibi(sandbox, [
          "model-requirement",
          "--input",
          inputPath,
        ]);
        assert.strictEqual(
          modeled.exitCode,
          0,
          `${modeled.stdout}${modeled.stderr}`,
        );
        const envelope = JSON.parse(modeled.stdout) as {
          data: {
            vocabularyAlignment: {
              subject: {
                decision: string;
                subjectKey: string;
                existingFactId: string;
              };
              stamps: Array<{ pluginId: string }>;
            };
            applyPlan: Array<{
              id: string;
              relationships: Array<{ type: string; to: string }>;
            }>;
          };
        };
        const alignment = envelope.data.vocabularyAlignment;
        assert.strictEqual(alignment.subject.decision, "reuse_existing");
        assert.strictEqual(alignment.subject.subjectKey, "session.lifetime");
        assert.strictEqual(
          alignment.subject.existingFactId,
          "FACT-SUBJ-SESSION-LIFETIME",
        );
        assert.ok(
          alignment.stamps.every(
            (stamp) => stamp.pluginId === "kibi-plugin-builtin",
          ),
        );
        assert.ok(
          envelope.data.applyPlan.some((step) =>
            step.relationships.some(
              (relationship) =>
                relationship.type === "constrains" &&
                relationship.to === "FACT-SUBJ-SESSION-LIFETIME",
            ),
          ),
        );

        const numericPath = join(sandbox.baseDir, "numbered-upsert.json");
        writeFileSync(
          numericPath,
          JSON.stringify({
            type: "req",
            id: "REQ-042",
            properties: { title: "A numbered requirement", status: "open" },
          }),
        );
        const numbered = await kibi(sandbox, [
          "upsert",
          "--input",
          numericPath,
        ]);
        assert.strictEqual(
          numbered.exitCode,
          0,
          `${numbered.stdout}${numbered.stderr}`,
        );
        const upserted = JSON.parse(numbered.stdout) as {
          data: { warnings: string[] };
        };
        assert.ok(
          upserted.data.warnings.some((warning) =>
            warning.startsWith("entity-id-style: Entity ID REQ-042"),
          ),
          JSON.stringify(upserted.data.warnings),
        );
      },
    );
  });
}

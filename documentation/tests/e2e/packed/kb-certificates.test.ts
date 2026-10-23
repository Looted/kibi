import assert from "node:assert";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
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

type Certificate = Record<string, unknown> & { kind: string };

/**
 * E2E: kibi verify certifies KB theorems and re-checks every certificate.
 *
 * SCEN-kibi-kb-certificates — on a KB with property facts, kibi verify
 * produces a model for each consistent context and the independent checker
 * re-verifies it; a saved bundle with a broken model is rejected; and facts
 * that only contradict jointly (every pair admits a value) are reported as a
 * contradiction with an irreducible core.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: kibi verify certificates", { timeout: 300000 }, () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    const write = (relativePath: string, text: string) => {
      const fullPath = join(sandbox.repoDir, relativePath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, text);
      stageSourceFile(sandbox, relativePath);
    };

    const claimKey = (text: string) =>
      `CLAIM-${createHash("sha256").update(text.toLowerCase()).digest("hex").slice(0, 16).toUpperCase()}`;

    // One requirement per bound, each grounded by one property fact whose
    // claim is the requirement's whole prose.
    const boundRequirement = (
      suffix: string,
      operator: string,
      value: number,
      text: string,
    ) => {
      const claim = claimKey(text);
      write(
        `.kb/facts/FACT-SEAT-${suffix}.md`,
        `---
id: FACT-SEAT-${suffix}
title: Free seats ${operator} ${value}
type: fact
status: active
fact_kind: property_value
subject_key: seat.pool
property_key: free_seats
operator: ${operator}
value_type: int
value_int: ${value}
claim_key: ${claim}
claim_text: ${text}
claim_span_start: 0
claim_span_end: ${text.length}
---

Fixture bound ${suffix}.
`,
      );
      write(
        `.kb/requirements/REQ-SEAT-${suffix}.md`,
        `---
id: REQ-SEAT-${suffix}
title: Seat pool bound ${suffix}
type: req
status: open
logic_claims: [${claim}]
semantic_clauses: [${text}]
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ${createHash("sha256").update(text).digest("hex")}
semantic_inventory:
  - claim_key: ${claim}
    claim_text: ${text}
    role: normative
    status: modeled
    span: {start: 0, end: ${text.length}}
links:
  - type: constrains
    target: FACT-SEAT-POOL
  - type: requires_property
    target: FACT-SEAT-${suffix}
---

${text}
`,
      );
    };

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) return;
        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);
        write(
          ".kb/facts/FACT-SEAT-POOL.md",
          `---
id: FACT-SEAT-POOL
title: Seat pool
type: fact
status: active
fact_kind: subject
subject_key: seat.pool
---

The pool of seats a workspace can assign.
`,
        );
        boundRequirement("MIN", "gte", 0, "Free seats must be at least 0");
        boundRequirement("MAX", "lte", 1, "Free seats must be at most 1");
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
      "certifies consistent facts and rejects a tampered certificate",
      { timeout: 120000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        const verify = await kibi(sandbox, ["verify"], { timeoutMs: 120000 });
        assert.strictEqual(
          verify.exitCode,
          0,
          `${verify.stdout}${verify.stderr}`,
        );
        assert.match(verify.stdout, /certificates re-verified/);
        assert.match(verify.stdout, /Property facts are consistent: proved/);
        assert.match(verify.stdout, /Not certified yet: /);

        const bundlePath = join(sandbox.repoDir, "certificates.json");
        const saved = await kibi(
          sandbox,
          ["verify", "--write", bundlePath, "--json"],
          { timeoutMs: 120000 },
        );
        assert.strictEqual(saved.exitCode, 0, `${saved.stdout}${saved.stderr}`);
        const report = JSON.parse(saved.stdout) as {
          version: string;
          status: string;
          theorems: { theorem: string; verdict: string }[];
        };
        assert.strictEqual(report.version, "kibi.verification.v1");
        assert.strictEqual(report.status, "verified");
        assert.deepStrictEqual(
          report.theorems.map((theorem) => theorem.theorem),
          [
            "properties_consistent",
            "predicates_consistent",
            "decisions_consistent",
            "rules_stratified",
          ],
        );

        const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
          version: string;
          certificates: Certificate[];
        };
        assert.strictEqual(bundle.version, "kibi.certificates.v1");
        const model = bundle.certificates.find(
          (certificate) =>
            certificate.kind === "property_model" &&
            certificate.subjectKey === "seat.pool",
        );
        assert.ok(model, "the seat pool context should have a model");
        assert.ok(
          model.value === 0 || model.value === 1,
          `model value ${String(model.value)} should satisfy 0 <= free <= 1`,
        );

        const tamperedPath = join(sandbox.repoDir, "tampered.json");
        writeFileSync(
          tamperedPath,
          JSON.stringify({
            ...bundle,
            certificates: bundle.certificates.map((certificate) =>
              certificate === model
                ? { ...certificate, value: 5 }
                : certificate,
            ),
          }),
        );
        const rejected = await kibi(
          sandbox,
          ["verify", "--certificates", tamperedPath],
          { timeoutMs: 120000 },
        );
        assert.strictEqual(
          rejected.exitCode,
          1,
          `${rejected.stdout}${rejected.stderr}`,
        );
        assert.match(
          rejected.stdout,
          /model value does not satisfy FACT-SEAT-MAX/,
        );
      },
    );

    it(
      "reports a joint contradiction that no pair of facts shows",
      { timeout: 180000 },
      async (testContext) => {
        if (!hasProlog) {
          testContext.skip("SWI-Prolog is unavailable");
          return;
        }
        // 0 <= free <= 1, free != 0 and free != 1: every pair admits an
        // integer, all four admit none.
        boundRequirement("NOT-ZERO", "neq", 0, "Free seats must not equal 0");
        boundRequirement("NOT-ONE", "neq", 1, "Free seats must not equal 1");
        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);

        const verify = await kibi(sandbox, ["verify", "--json"], {
          timeoutMs: 120000,
        });
        assert.strictEqual(
          verify.exitCode,
          1,
          `${verify.stdout}${verify.stderr}`,
        );
        const report = JSON.parse(verify.stdout) as {
          status: string;
          theorems: {
            theorem: string;
            verdict: string;
            contradictions: Record<string, unknown>[];
          }[];
        };
        assert.strictEqual(report.status, "verified");
        const properties = report.theorems.find(
          (theorem) => theorem.theorem === "properties_consistent",
        );
        assert.strictEqual(properties?.verdict, "disproved");
        assert.strictEqual(
          properties?.contradictions[0]?.subjectKey,
          "seat.pool",
        );

        const bundlePath = join(sandbox.repoDir, "contradiction.json");
        await kibi(sandbox, ["verify", "--write", bundlePath], {
          timeoutMs: 120000,
        });
        const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
          certificates: Certificate[];
        };
        const core = bundle.certificates.find(
          (certificate) => certificate.kind === "property_contradiction",
        );
        assert.deepStrictEqual([...((core?.core as string[]) ?? [])].sort(), [
          "FACT-SEAT-MAX",
          "FACT-SEAT-MIN",
          "FACT-SEAT-NOT-ONE",
          "FACT-SEAT-NOT-ZERO",
        ]);
      },
    );
  });
}

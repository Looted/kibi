import assert from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
  parseKibiResult,
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface CoverageRow {
  id: string;
  proofStatus: string;
  proofGaps?: string[];
  proofRepairs?: Array<{ gap: string }>;
  coverageDepth?: string;
  coverageStatus?: string;
  proofVersion?: string;
}

/**
 * E2E: conservative proof is reported separately from structural coverage.
 *
 * SCEN-kibi-conservative-requirement-proof — a structurally linked
 * requirement whose E2E proof path is incomplete keeps its compatibility
 * coverage fields while coverage reports a non-proven proofStatus, stable
 * gap codes, and ranked repair actions.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: conservative coverage proof status", { timeout: 240000 }, () => {
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
          join(sandbox.repoDir, ".kb", "requirements", "REQ-COVERAGE-PROOF.md"),
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
        const row = rows.find((candidate) => candidate.id === "REQ-COVERAGE-PROOF");
        assert.ok(row, "coverage must include the fixture requirement row");
        assert.notStrictEqual(
          row.proofStatus,
          "proven",
          "a unit-only chain must never report proven",
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
          "kibi.requirement-proof.v3",
          "proof projection stays on the current contract version",
        );
      },
    );
  });
}

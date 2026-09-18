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
  stageSourceFile,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * E2E: pre-commit and CI check gate blocks uncovered must-priority work.
 *
 * SCEN-009 — a KB containing a must-priority requirement without scenario
 * coverage fails `kibi check`; once the scenario chain is authored and
 * synced, the same gate passes.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: check gate enforcement", { timeout: 300000 }, () => {
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

        mkdirSync(join(sandbox.repoDir, ".kb", "requirements"), {
          recursive: true,
        });
        mkdirSync(join(sandbox.repoDir, ".kb", "scenarios"), {
          recursive: true,
        });
        mkdirSync(join(sandbox.repoDir, ".kb", "tests"), { recursive: true });
        // Covered requirement: must priority with a scenario chain.
        writeFileSync(
          join(sandbox.repoDir, ".kb", "requirements", "REQ-GATE-COVERED.md"),
          `---
id: REQ-GATE-COVERED
title: Covered gate fixture
status: open
priority: must
links:
  - type: specified_by
    target: SCEN-GATE-COVERED
---

Covered gate fixture.
`,
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-GATE-COVERED.md"),
          `---
id: SCEN-GATE-COVERED
title: Covered gate scenario
status: active
links:
  - type: verified_by
    target: TEST-GATE-COVERED
---

Covered gate fixture scenario.
`,
        );
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-GATE-COVERED.md"),
          `---
id: TEST-GATE-COVERED
title: Covered gate test
status: passing
verification_scope: end_to_end
verification_perspective: consumer
source: src/gate-covered.test.ts
links:
  - type: validates
    target: SCEN-GATE-COVERED
---

Covered gate fixture test.
`,
        );
        mkdirSync(join(sandbox.repoDir, "src"), { recursive: true });
        writeFileSync(
          join(sandbox.repoDir, "src", "gate-covered.test.ts"),
          "export const gateCovered = 'v1';\n",
        );
        // Uncovered requirement: must priority without any scenario link.
        writeFileSync(
          join(sandbox.repoDir, ".kb", "requirements", "REQ-GATE-BARE.md"),
          `---
id: REQ-GATE-BARE
title: Uncovered gate fixture
status: open
priority: must
---

Uncovered gate fixture.
`,
        );
        for (const sourcePath of [
          ".kb/requirements/REQ-GATE-COVERED.md",
          ".kb/scenarios/SCEN-GATE-COVERED.md",
          ".kb/tests/TEST-GATE-COVERED.md",
          "src/gate-covered.test.ts",
          ".kb/requirements/REQ-GATE-BARE.md",
        ]) {
          stageSourceFile(sandbox, sourcePath);
        }
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
      "blocks when a must-priority requirement lacks scenario coverage",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const check = await kibi(sandbox, ["check"]);
        assert.notStrictEqual(
          check.exitCode,
          0,
          `check must fail while a must-priority requirement has no scenario: ${check.stdout}${check.stderr}`,
        );
        const output = `${check.stdout}${check.stderr}`;
        assert.match(
          output,
          /REQ-GATE-BARE/,
          "the violation must name the uncovered requirement",
        );
      },
    );

    it(
      "passes once the uncovered requirement gains a scenario chain",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        writeFileSync(
          join(sandbox.repoDir, ".kb", "scenarios", "SCEN-GATE-BARE.md"),
          `---
id: SCEN-GATE-BARE
title: Bare fixture scenario
status: active
links:
  - type: verified_by
    target: TEST-GATE-BARE
---

Bare fixture scenario.
`,
          "utf8",
        );
        stageSourceFile(sandbox, ".kb/scenarios/SCEN-GATE-BARE.md");
        writeFileSync(
          join(sandbox.repoDir, ".kb", "tests", "TEST-GATE-BARE.md"),
          `---
id: TEST-GATE-BARE
title: Bare gate test
status: passing
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-GATE-BARE
---

Bare gate fixture test.
`,
          "utf8",
        );
        stageSourceFile(sandbox, ".kb/tests/TEST-GATE-BARE.md");
        // Adding the scenario chain to the requirement is a frontmatter-only
        // edit, so the semantic prose hash stays stable across the resync.
        const reqPath = join(
          sandbox.repoDir,
          ".kb",
          "requirements",
          "REQ-GATE-BARE.md",
        );
        const original = await import("node:fs").then((fs) =>
          fs.readFileSync(reqPath, "utf8"),
        );
        const linked = original.replace(
          "priority: must\n",
          "priority: must\nlinks:\n  - type: specified_by\n    target: SCEN-GATE-BARE\n",
        );
        assert.notStrictEqual(linked, original);
        writeFileSync(reqPath, linked, "utf8");

        const resync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(
          resync.exitCode,
          0,
          `${resync.stdout}${resync.stderr}`,
        );

        const check = await kibi(sandbox, ["check"]);
        assert.strictEqual(
          check.exitCode,
          0,
          `check must pass once coverage exists: ${check.stdout}${check.stderr}`,
        );
      },
    );
  });
}

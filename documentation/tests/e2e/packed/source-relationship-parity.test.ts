import assert from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
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
  run,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

export function assertSourceRelationshipParityOutcome(output: string): void {
  assert.match(output, /source-relationship-parity/);
  assert.match(output, /specified_by REQ-PARITY-E2E->SCEN-PARITY-E2E/);
  assert.match(output, /authored_to_compiled/);
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: authored relationship parity", () => {
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
      "blocks an authored edge that is absent from compiled RDF",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        const requirementPath = "documentation/requirements/REQ-PARITY-E2E.md";
        createMarkdownFile(
          sandbox,
          requirementPath,
          {
            id: "REQ-PARITY-E2E",
            title: "Relationship parity fixture",
            type: "req",
            status: "open",
          },
          "Reference fixture.",
        );
        createMarkdownFile(
          sandbox,
          "documentation/scenarios/SCEN-PARITY-E2E.md",
          {
            id: "SCEN-PARITY-E2E",
            title: "Relationship parity scenario",
            type: "scenario",
            status: "active",
          },
          "Reference fixture.",
        );
        await run("git", ["add", "documentation"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });
        await run("git", ["commit", "-m", "add parity fixtures"], {
          cwd: sandbox.repoDir,
          env: sandbox.env,
        });

        assert.strictEqual(
          (await kibi(sandbox, ["init", "--no-hooks"])).exitCode,
          0,
        );
        const initialSync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(initialSync.exitCode, 0, initialSync.stderr);

        const absoluteRequirement = join(sandbox.repoDir, requirementPath);
        const original = readFileSync(absoluteRequirement, "utf8");
        writeFileSync(
          absoluteRequirement,
          original.replace(
            "status: open\n",
            "status: open\nlinks:\n  - type: specified_by\n    target: SCEN-PARITY-E2E\n",
          ),
        );

        const drift = await kibi(sandbox, [
          "check",
          "--rules",
          "source-relationship-parity",
          "--format",
          "json",
        ]);
        assert.strictEqual(drift.exitCode, 1, drift.stderr);
        assertSourceRelationshipParityOutcome(drift.stdout);

        const sync = await kibi(sandbox, ["sync"]);
        assert.strictEqual(sync.exitCode, 0, `${sync.stdout}${sync.stderr}`);
        const reconciled = await kibi(sandbox, [
          "check",
          "--rules",
          "source-relationship-parity",
          "--format",
          "json",
        ]);
        assert.strictEqual(
          reconciled.exitCode,
          0,
          `${reconciled.stdout}${reconciled.stderr}`,
        );
      },
    );
  });
}

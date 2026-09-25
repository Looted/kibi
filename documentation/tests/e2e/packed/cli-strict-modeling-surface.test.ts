import assert from "node:assert";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface ModelRequirementPayload {
  isStrict?: boolean;
  applyPlan?: unknown[];
  confidence?: number;
}

async function runModelRequirement(
  sandbox: TestSandbox,
  confidence: number,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const inputPath = join(sandbox.repoDir, "model-input.json");
  writeFileSync(
    inputPath,
    `${JSON.stringify({
      text: "Customer data must be retained for 7 years.",
      confidence,
    })}\n`,
    "utf8",
  );
  return kibi(sandbox, ["model-requirement", "--input", inputPath]);
}

/**
 * E2E: strict modeling write sets through the packed CLI.
 *
 * SCEN-cli-strict-modeling-v1 — the model-requirement CLI route returns a
 * strict-lane requirement write set for high-confidence normative prose and
 * an observation-lane review artifact for low-confidence prose.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: CLI strict modeling surface", { timeout: 240000 }, () => {
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
      "returns a strict write set for high-confidence prose",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const result = await runModelRequirement(sandbox, 0.9);
        assert.strictEqual(
          result.exitCode,
          0,
          `${result.stdout}${result.stderr}`,
        );
        const envelope = JSON.parse(result.stdout) as {
          data?: ModelRequirementPayload;
        };
        const payload = envelope.data;
        assert.ok(payload, "model-requirement must return a payload envelope");
        assert.strictEqual(
          payload.isStrict,
          true,
          `high-confidence prose must produce a strict write set: ${result.stdout.slice(0, 400)}`,
        );
        assert.ok(
          Array.isArray(payload.applyPlan) && payload.applyPlan.length > 0,
          "strict lane must carry an apply plan",
        );
      },
    );

    it(
      "holds low-confidence prose in the observation lane",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const result = await runModelRequirement(sandbox, 0.3);
        assert.strictEqual(
          result.exitCode,
          0,
          `${result.stdout}${result.stderr}`,
        );
        const envelope = JSON.parse(result.stdout) as {
          data?: ModelRequirementPayload;
        };
        const payload = envelope.data;
        assert.ok(payload, "model-requirement must return a payload envelope");
        assert.strictEqual(
          payload.isStrict,
          false,
          `low-confidence prose must stay in the observation lane: ${result.stdout.slice(0, 400)}`,
        );
      },
    );
  });
}

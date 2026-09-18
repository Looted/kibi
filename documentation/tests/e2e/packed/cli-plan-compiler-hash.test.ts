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

interface CompilePlanPayload {
  version?: string;
  planHash?: string;
  status?: string;
  steps?: unknown[];
}

function writeInput(
  sandbox: TestSandbox,
  name: string,
  value: Record<string, unknown>,
): string {
  const inputPath = join(sandbox.repoDir, name);
  writeFileSync(inputPath, `${JSON.stringify(value)}\n`, "utf8");
  return inputPath;
}

/**
 * E2E: change-to-proof plan compiler hash discipline.
 *
 * SCEN-kibi-change-to-proof-plan-compiler — compile-intent emits a
 * deterministic, hash-bound plan, and apply-plan rejects a request whose
 * approved hash does not match the canonical plan hash.
 */
if (RUN_NODE_TEST_SUITE) {
  describe("E2E: CLI plan compiler hash binding", { timeout: 300000 }, () => {
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
      "compiles a hash-bound plan and rejects a mismatched apply request",
      { timeout: 240000 },
      async () => {
        if (!hasProlog) return;

        const compileInput = writeInput(sandbox, "compile-input.json", {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
        });
        const compile = await kibi(sandbox, [
          "compile-intent",
          "--input",
          compileInput,
        ]);
        assert.strictEqual(compile.exitCode, 0, `${compile.stdout}${compile.stderr}`);
        const compileEnvelope = JSON.parse(compile.stdout) as {
          data?: CompilePlanPayload;
        };
        const plan = compileEnvelope.data;
        assert.ok(plan, "compile-intent must return a plan payload");
        assert.ok(
          typeof plan.planHash === "string" && /^[a-f0-9]{64}$/.test(plan.planHash),
          `plan hash must be a canonical sha-256 digest: ${String(plan.planHash)}`,
        );
        assert.strictEqual(
          plan.version,
          "kibi.compile-plan.v1",
          "compiled plan must carry its typed version",
        );

        const applyInput = writeInput(sandbox, "apply-input.json", {
          plan: { ...plan, planHash: `${"0".repeat(63)}1` },
          approvedPlanHash: `${"0".repeat(63)}1`,
        });
        const apply = await kibi(sandbox, ["apply-plan", "--input", applyInput]);
        assert.notStrictEqual(
          apply.exitCode,
          0,
          `apply-plan must reject a mismatched plan hash, got exit ${apply.exitCode}: ${apply.stdout}${apply.stderr}`,
        );
        assert.match(
          `${apply.stdout}${apply.stderr}`,
          /hash|mismatch|reject|does not match/i,
          "rejection must name the hash mismatch",
        );
      },
    );
  });
}

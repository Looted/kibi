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

type AdvisorSuggestion = {
  kind: string;
  claim?: { property_key?: string; value_int?: number };
  predicate?: { predicate_name?: string };
};

async function adviseOn(
  sandbox: TestSandbox,
  text: string,
): Promise<AdvisorSuggestion[]> {
  const inputPath = join(sandbox.repoDir, "advisor-input.json");
  writeFileSync(inputPath, `${JSON.stringify({ text })}\n`, "utf8");
  const result = await kibi(sandbox, ["semantic-advisor", "--input", inputPath]);
  assert.strictEqual(result.exitCode, 0, `${result.stdout}${result.stderr}`);
  const envelope = JSON.parse(result.stdout) as {
    data?: { receipt?: { suggestions?: AdvisorSuggestion[] } };
  };
  return envelope.data?.receipt?.suggestions ?? [];
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

    it(
      "suggests a strict fact for one measurable value and a predicate fact for a matching rule, and neither for vague prose",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;
        const expiry = await adviseOn(
          sandbox,
          "Session tokens expire after 30 days.",
        );
        assert.ok(
          expiry.some(
            (s) =>
              s.kind === "strict_property" &&
              s.claim?.property_key === "expiry_days" &&
              s.claim.value_int === 30,
          ),
          `a single measurable value must get a strict property suggestion: ${JSON.stringify(expiry)}`,
        );
        const guard = await adviseOn(
          sandbox,
          "Paid launches must stay disabled until the budget is approved.",
        );
        assert.ok(
          guard.some(
            (s) =>
              s.kind === "predicate" &&
              s.predicate?.predicate_name === "guard",
          ),
          `prose matching a core predicate rule must get a predicate suggestion: ${JSON.stringify(guard)}`,
        );
        const vague = await adviseOn(
          sandbox,
          "Session tokens should be handled carefully.",
        );
        assert.ok(
          !vague.some(
            (s) => s.kind === "strict_property" || s.kind === "predicate",
          ),
          `vague prose must not get a strict or predicate suggestion: ${JSON.stringify(vague)}`,
        );
        assert.ok(
          vague.some((s) => s.kind === "ontology_gap"),
          `vague prose must be reported as an ontology gap: ${JSON.stringify(vague)}`,
        );
      },
    );
  });
}

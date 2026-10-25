import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { replaySteps } from "../replay-proof-ci.ts";

const FINAL_GATE_STEP = "Enforce evidence floors on a clean snapshot";
const HOST_PROVISIONING_STEPS = [
  "Check whether the PR can reuse develop proof",
  "Bootstrap Ubuntu packages",
  "Install SWI-Prolog",
  "Provision strict-proof host prerequisites",
];

const ROOT = join(import.meta.dir, "..", "..");
const proofWorkflow = readFileSync(
  join(ROOT, ".github", "workflows", "proof.yml"),
  "utf8",
);

describe("local proof CI replay", () => {
  test("replays the proof job's gate steps in CI order", () => {
    const names = replaySteps(proofWorkflow).map((step) => step.name);
    const order = [
      "Install dependencies for canonical snapshot",
      "Build packages used by packed proof contracts",
      "Reject generated manifest drift in committed snapshot",
      "Compile packed proof tests",
      "Sync and validate integrity of the proof snapshot",
      "Reject evidence-floor regressions before executing contracts",
      "Prove every contracted test through Kibi",
      FINAL_GATE_STEP,
    ].map((name) => names.indexOf(name));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(names.at(-1)).toBe(FINAL_GATE_STEP);
  });

  test("skips host provisioning but keeps its repository-local uv commands", () => {
    const steps = replaySteps(proofWorkflow);
    for (const name of HOST_PROVISIONING_STEPS) {
      expect(steps.map((step) => step.name)).not.toContain(name);
    }
    const local = steps.find((step) =>
      step.name.startsWith("Provision strict-proof host prerequisites"),
    );
    expect(local?.run).toContain("uv sync --project tools/skillopt --frozen");
    expect(local?.run).not.toContain("npm install --global");
    expect(local?.run).not.toContain("curl");
  });

  test("replays a step with its own env block, like CI", () => {
    const prove = replaySteps(proofWorkflow).find(
      (step) => step.name === "Prove every contracted test through Kibi",
    );
    expect(prove?.env?.KIBI_PROOF_STEP_CONCURRENCY).toBe("3");
    // GitHub-only expressions stay unset locally instead of becoming literals.
    expect(prove?.env).not.toHaveProperty("GH_TOKEN");
    expect(prove?.env).not.toHaveProperty("CI_HEAD_SHA");
    const finalGate = replaySteps(proofWorkflow).find(
      (step) => step.name === FINAL_GATE_STEP,
    );
    expect(finalGate?.env).toBeUndefined();
  });

  test("fails loudly when a skipped step is renamed in the workflow", () => {
    const renamed = proofWorkflow.replace(
      "name: Install SWI-Prolog",
      "name: Install Prolog",
    );
    expect(() => replaySteps(renamed)).toThrow("Install SWI-Prolog");
  });
});

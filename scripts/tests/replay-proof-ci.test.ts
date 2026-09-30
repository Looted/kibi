import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { replaySteps } from "../replay-proof-ci.ts";

const FINAL_GATE_STEP = "Enforce proof baseline and clean snapshot";
const HOST_PROVISIONING_STEPS = [
  "Check whether master PR can reuse develop proof",
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

  test("fails loudly when a skipped step is renamed in the workflow", () => {
    const renamed = proofWorkflow.replace(
      "name: Install SWI-Prolog",
      "name: Install Prolog",
    );
    expect(() => replaySteps(renamed)).toThrow("Install SWI-Prolog");
  });
});

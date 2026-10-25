import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseProofTestReport } from "../../src/proof/command-test-report.js";
import {
  runProofSteps,
  selectProofSteps,
  validateProofSteps,
} from "../../src/proof/step-runner.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function workspace(steps: unknown): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-step-runner-"));
  roots.push(root);
  writeFileSync(path.join(root, "steps.json"), JSON.stringify(steps));
  writeFileSync(path.join(root, "count.mjs"), [
    'import { appendFileSync } from "node:fs";',
    'appendFileSync("runs.log", `${process.argv[2]}\\n`);',
    "process.exit(process.argv[2] === 'bad' ? 3 : 0);",
  ].join("\n"));
  return root;
}

describe("kibi proof run-steps", () => {
  test("fails only the tests whose own steps failed and runs shared argv once", async () => {
    const root = workspace([
      { test_id: "TEST-a", steps: [["node", "count.mjs", "ok"]] },
      { test_id: "TEST-b", steps: [["node", "count.mjs", "ok"], ["node", "count.mjs", "bad"]] },
      { test_id: "TEST-c", steps: [["node", "count.mjs", "other"]] },
    ]);
    const reportPath = path.join(root, "out", "report.json");
    const lines: string[] = [];
    const exitCode = await runProofSteps({
      workspaceRoot: root,
      stepsPath: "steps.json",
      env: {
        ...process.env,
        KIBI_PROOF_TEST_IDS: JSON.stringify(["TEST-a", "TEST-b"]),
        KIBI_PROOF_TEST_REPORT: reportPath,
      },
      write: (line) => lines.push(line),
    });
    expect(exitCode).toBe(1);
    // TEST-c was not selected; the shared step ran once.
    expect(readFileSync(path.join(root, "runs.log"), "utf8")).toBe("ok\nbad\n");
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const entries = parseProofTestReport(report, ["TEST-a", "TEST-b"]);
    expect(entries.get("TEST-a")?.outcome).toBe("passed");
    expect(entries.get("TEST-b")?.outcome).toBe("failed");
    expect(entries.get("TEST-b")?.steps.at(-1)).toMatchObject({
      step_index: 2,
      outcome: "failed",
      exit_code: 3,
    });
    expect(lines.at(-1)).toContain("1 of 2 test(s) have a failing step: TEST-b");
  });

  test("passes and runs every test in the file when nothing is selected", async () => {
    const root = workspace([
      { test_id: "TEST-a", steps: [["node", "count.mjs", "one"]] },
      { test_id: "TEST-b", steps: [["node", "count.mjs", "two"]] },
    ]);
    const env = { ...process.env };
    delete env.KIBI_PROOF_TEST_IDS;
    delete env.KIBI_PROOF_TEST_REPORT;
    expect(
      await runProofSteps({ workspaceRoot: root, stepsPath: "steps.json", env, write: () => {} }),
    ).toBe(0);
    expect(readFileSync(path.join(root, "runs.log"), "utf8")).toBe("one\ntwo\n");
  });

  test("rejects malformed files and unknown test ids", () => {
    expect(() => validateProofSteps([])).toThrow("non-empty JSON array");
    expect(() =>
      validateProofSteps([{ test_id: "TEST-a", steps: [[]] }]),
    ).toThrow("step 1 must be a non-empty string argv array");
    expect(() =>
      validateProofSteps([
        { test_id: "TEST-a", steps: [["x"]] },
        { test_id: "TEST-a", steps: [["y"]] },
      ]),
    ).toThrow("duplicate test_id");
    expect(() =>
      selectProofSteps(validateProofSteps([{ test_id: "TEST-a", steps: [["x"]] }]), ["TEST-z"]),
    ).toThrow("no steps declared for TEST-z");
  });
});

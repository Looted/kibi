// implements REQ-kibi-proof-aware-quality-diagnostics
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  coverageRows,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of `kibi check` and proof receipts: once `kibi prove` has
 * recorded a current passing end-to-end receipt for a requirement's
 * scenario test, `kibi check` reads the same proof evidence as
 * `kibi coverage` and stops asking for stronger coverage depth.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const REQ = "REQ-session-resume";
const TEST = "TEST-session-resume";
const INTEGRATION = "session-proof";

/** The project's proof command: every selected test passes. */
const PROOF_COMMAND = `import { writeFileSync } from "node:fs";
const selected = JSON.parse(process.env.KIBI_PROOF_TEST_IDS ?? "[]");
const reportPath = process.env.KIBI_PROOF_TEST_REPORT;
if (reportPath) {
  writeFileSync(reportPath, JSON.stringify({
    version: "kibi.proof-test-report.v1",
    tests: selected.map((testId) => ({
      test_id: testId,
      outcome: "passed",
      steps: [{ step_index: 1, command: ["node", "scripts/session-proof.mjs"], outcome: "passed", exit_code: 0 }],
    })),
  }));
}
`;

function seed(ws: ConsumerWorkspace): void {
  ws.write(
    `.kb/requirements/${REQ}.md`,
    doc(
      `
id: ${REQ}
title: Learners resume their daily session where they left off
type: req
status: open
links:
  - type: specified_by
    target: SCEN-session-resume
`,
      "Learners resume their daily session where they left off.",
    ),
  );
  ws.write(
    ".kb/scenarios/SCEN-session-resume.md",
    doc(
      `
id: SCEN-session-resume
title: A learner reopens the app and continues the daily session
type: scenario
status: active
`,
      "Given a half-finished daily session, when the learner reopens the app, the session continues at the next card.",
    ),
  );
  // The test was never marked passing: only its proof receipt says it ran.
  ws.write(
    `.kb/tests/${TEST}.md`,
    doc(
      `
id: ${TEST}
title: Reopening the app continues the daily session
type: test
status: active
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: ${INTEGRATION}
  required_proofs:
    - symbol_id: SYM-session-resume
      target: default
  success_policy: all_required_first_attempt
links:
  - type: validates
    target: SCEN-session-resume
`,
      "Reopening the app continues the daily session.",
    ),
  );
  ws.write(
    ".kb/proof/integrations.json",
    `${JSON.stringify(
      {
        version: "kibi.proof-integration.v1",
        integrations: [
          {
            id: INTEGRATION,
            producer: "command",
            command: ["node", "scripts/session-proof.mjs"],
            targets: ["default"],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  ws.write("scripts/session-proof.mjs", PROOF_COMMAND);
  ws.git("add", "-A");
  ws.git("commit", "-q", "-m", "session proof fixture");
  ws.sync();
}

function depthReviews(ws: ConsumerWorkspace): Json[] {
  const result = ws.json(["check", "--format", "json"]);
  const structured = result.structuredContent as Json;
  return (structured.qualityDiagnostics as Json[]).filter(
    (diagnostic) =>
      diagnostic.id === "coverage_depth_review" && diagnostic.entityId === REQ,
  );
}

describe("kibi check proof evidence through the kibi CLI", () => {
  test("a current passing e2e receipt clears coverage_depth_review in kibi check", () => {
    const ws = createConsumerWorkspace("kibi-check-proof-evidence-");
    workspace = ws;
    seed(ws);

    // Without a receipt the open test is weak evidence, and check reads
    // the proof status coverage reports.
    const before = depthReviews(ws);
    expect(before).toHaveLength(1);
    expect(before[0]?.evidence).toMatchObject({
      coverageDepth: "open_or_nonpassing_tests_only",
      proofStatus: coverageRows(ws).get(REQ)?.proofStatus,
    });
    expect((before[0]?.evidence as Json).passingE2eStatus).not.toBe("passed");

    const prove = ws.kibi(["prove", "--test", TEST]);
    expect({ status: prove.status, stderr: prove.stderr }).toMatchObject({
      status: 0,
    });
    const summary = JSON.parse(
      prove.stdout.trim().split("\n").at(-1) ?? "{}",
    ) as Json;
    expect(summary).toMatchObject({ passed: 1, failed: 0 });

    const row = coverageRows(ws).get(REQ);
    expect(row?.proofStages.passingE2e).toMatchObject({
      status: "passed",
      tests: [TEST],
    });
    // The receipt is the behavior-level evidence the review asked for.
    expect(depthReviews(ws)).toEqual([]);
  }, 300_000);

  test("kibi check keeps a receipt current after an unrelated change", () => {
    const ws = createConsumerWorkspace("kibi-check-proof-binding-");
    workspace = ws;
    seed(ws);
    const prove = ws.kibi(["prove", "--test", TEST]);
    expect({ status: prove.status, stderr: prove.stderr }).toMatchObject({
      status: 0,
    });
    // An unrelated committed change moves the workspace snapshot but not the
    // test's per-contract binding, so coverage still reads the receipt as
    // current and check must agree.
    ws.write("src/unrelated.ts", "export const unrelated = 1;\n");
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "unrelated change");
    ws.sync();

    expect(coverageRows(ws).get(REQ)?.proofStages.passingE2e).toMatchObject({
      status: "passed",
      tests: [TEST],
    });
    expect(depthReviews(ws)).toEqual([]);
  }, 300_000);

  test("a proof-status filter judges receipts like the unfiltered report", () => {
    const ws = createConsumerWorkspace("kibi-coverage-status-binding-");
    workspace = ws;
    seed(ws);
    const prove = ws.kibi(["prove", "--test", TEST]);
    expect(prove.status).toBe(0);
    // An unrelated committed change moves the workspace snapshot but not the
    // test's per-contract binding, so its receipt stays current.
    ws.write("docs-notes.txt", "unrelated\n");
    ws.write("src/unrelated.ts", "export const unrelated = 1;\n");
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "unrelated change");
    ws.sync();

    const unfiltered = ws.json([
      "coverage",
      "--format",
      "json",
      "--include-passing",
    ]);
    const status = coverageRows(ws).get(REQ)?.proofStatus;
    expect(status).toBeDefined();
    const filtered = ws.json([
      "coverage",
      "--format",
      "json",
      "--status",
      String(status),
    ]);
    const report = (value: unknown): Json | undefined => {
      if (value === null || typeof value !== "object") return undefined;
      const record = value as Json;
      if (Array.isArray(record.rows) && record.summary) return record;
      for (const nested of Object.values(record)) {
        const found = report(nested);
        if (found) return found;
      }
      return undefined;
    };
    const summaryOf = (result: Json) => report(result)?.summary as Json;
    const rowsOf = (result: Json) => (report(result)?.rows ?? []) as Json[];
    expect(rowsOf(filtered).map((row) => row.id)).toContain(REQ);
    const filteredRow = rowsOf(filtered).find((row) => row.id === REQ);
    expect((filteredRow?.proofStages as Json).passingE2e as Json).toMatchObject(
      { status: "passed", tests: [TEST] },
    );
    expect(summaryOf(filtered)).toEqual(summaryOf(unfiltered));
  }, 300_000);

  test("prove --stale reruns only tests without a current passing receipt", () => {
    const ws = createConsumerWorkspace("kibi-prove-stale-");
    workspace = ws;
    seed(ws);
    const lastLine = (stdout: string) =>
      JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}") as Json;

    const first = ws.kibi(["prove", "--stale"]);
    expect({ status: first.status, stderr: first.stderr }).toMatchObject({
      status: 0,
    });
    expect(lastLine(first.stdout)).toMatchObject({ passed: 1, failed: 0 });

    // The receipt is current, so a second stale pass selects nothing.
    const second = ws.kibi(["prove", "--stale"]);
    expect(second.status).toBe(0);
    expect(lastLine(second.stdout)).toMatchObject({
      passed: 0,
      message: "every selected test already has a current passing receipt",
    });
  }, 300_000);
});

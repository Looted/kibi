// implements REQ-kibi-conservative-requirement-proof
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  coverageRows,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * Consumer view of the engine's per-generation proof memo: a second
 * `kibi check` on the warm engine daemon reads the same result as the first,
 * and a change to the proven test's document (its receipt binding) is seen
 * by the very next check instead of a remembered proof.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const REQ = "REQ-session-resume";
const SCEN = "SCEN-session-resume";
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

function testDocument(body: string): string {
  return doc(
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
    target: ${SCEN}
`,
    body,
  );
}

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
    target: ${SCEN}
`,
      "Learners resume their daily session where they left off.",
    ),
  );
  ws.write(
    `.kb/scenarios/${SCEN}.md`,
    doc(
      `
id: ${SCEN}
title: A learner reopens the app and continues the daily session
type: scenario
status: active
`,
      "Given a half-finished daily session, when the learner reopens the app, the session continues at the next card.",
    ),
  );
  ws.write(
    `.kb/tests/${TEST}.md`,
    testDocument("Reopening the app continues the daily session."),
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

function checkFindings(ws: ConsumerWorkspace): {
  violations: Json[];
  diagnostics: Json[];
  depthReviews: Json[];
} {
  const result = ws.json(["check", "--format", "json"]);
  const structured = result.structuredContent as Json;
  const diagnostics = structured.qualityDiagnostics as Json[];
  return {
    violations: (structured.violations as Json[]) ?? [],
    diagnostics,
    depthReviews: diagnostics.filter(
      (diagnostic) =>
        diagnostic.id === "coverage_depth_review" &&
        diagnostic.entityId === REQ,
    ),
  };
}

describe("kibi check on a warm engine daemon", () => {
  test("a repeated check reads the same proof, and a changed test document is seen at once", () => {
    const ws = createConsumerWorkspace("kibi-check-warm-daemon-");
    workspace = ws;
    seed(ws);
    const prove = ws.kibi(["prove", "--test", TEST]);
    expect({ status: prove.status, stderr: prove.stderr }).toMatchObject({
      status: 0,
    });

    // The first check after the proof computes the ladder; the second one
    // runs against the same engine daemon and its remembered proof.
    const first = checkFindings(ws);
    expect(first.depthReviews).toEqual([]);
    const second = checkFindings(ws);
    expect(second.violations).toEqual(first.violations);
    expect(second.diagnostics).toEqual(first.diagnostics);
    expect(coverageRows(ws).get(REQ)?.proofStages.passingE2e).toMatchObject({
      status: "passed",
      tests: [TEST],
    });

    // Editing the proven test's document changes its receipt binding: the
    // next sync is a new KB generation and the next check must not reuse
    // the proof it remembered.
    ws.write(
      `.kb/tests/${TEST}.md`,
      testDocument(
        "Reopening the app continues the daily session at the next card.",
      ),
    );
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "clarify the test");
    ws.sync();

    const row = coverageRows(ws).get(REQ);
    expect((row?.proofStages.passingE2e as Json).status).not.toBe("passed");
    const after = checkFindings(ws);
    expect(after.depthReviews).toHaveLength(1);
    expect((after.depthReviews[0]?.evidence as Json).passingE2eStatus).not.toBe(
      "passed",
    );
    expect((after.depthReviews[0]?.evidence as Json).proofStatus).toBe(
      row?.proofStatus,
    );
  }, 300_000);
});

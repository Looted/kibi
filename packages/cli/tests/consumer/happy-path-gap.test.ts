// implements REQ-kibi-happy-path-gap
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  QUOTA_SUBJECT,
  adviseProse,
  checkViolations,
  coverageRows,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the failure-side proof stage: a requirement whose
 * scenarios only cover the happy path is not tested until a linked scenario
 * expects rejection and assumes a value the requirement forbids, or a
 * person approves a waiver for a requirement with nothing to refuse.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const PROSE = "A client may call only with remaining quota.";

function requirement(
  ws: ConsumerWorkspace,
  scenarios: readonly string[],
  extra = "",
): string {
  const { contract, propositions } = adviseProse(ws, PROSE);
  const [claim] = propositions;
  if (claim === undefined || propositions.length !== 1) {
    throw new Error(`expected one proposition, got ${propositions.length}`);
  }
  ws.write(
    ".kb/facts/FACT-QUOTA-POSITIVE.md",
    quotaValueFact("FACT-QUOTA-POSITIVE", "Remaining quota above zero", "gt", 0, {
      key: claim.claim_key,
      text: claim.claim_text,
    }),
  );
  const links = scenarios
    .map((id) => `  - type: specified_by\n    target: ${id}`)
    .join("\n");
  return doc(
    `
id: REQ-QUOTA-CALL
title: A client may call only with remaining quota
type: req
status: open
priority: must
${extra}${semanticFrontMatter(PROSE, contract, [{ ...claim, status: "modeled" }])}
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
${links}
`,
    PROSE,
  );
}

function scenario(id: string, expects: string, fact: string): string {
  return doc(
    `
id: ${id}
title: A call assuming ${fact} (${expects})
type: scenario
status: active
expects: ${expects}
links:
  - type: assumes
    target: ${fact}
`,
    `Given the client quota described by ${fact}, when the client calls, the call ends in ${expects}.`,
  );
}

describe("failure-side proof stage through the kibi CLI", () => {
  test("a happy-path-only requirement gets the gap until a rejection scenario assumes a forbidden value", () => {
    const ws = createConsumerWorkspace("kibi-happy-path-gap-");
    workspace = ws;

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-FIVE.md",
      quotaValueFact("FACT-QUOTA-FIVE", "Remaining quota is five", "eq", 5),
    );
    ws.write(
      ".kb/facts/FACT-QUOTA-ZERO.md",
      quotaValueFact("FACT-QUOTA-ZERO", "Remaining quota is zero", "eq", 0),
    );
    ws.write(
      ".kb/scenarios/SCEN-QUOTA-CALL.md",
      scenario("SCEN-QUOTA-CALL", "success", "FACT-QUOTA-FIVE"),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      requirement(ws, ["SCEN-QUOTA-CALL"]),
    );
    ws.sync();

    // Success scenarios alone leave the failure side open, and the stage
    // suggests the value just past the bound.
    const happyOnly = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(happyOnly?.proofGaps).toContain("happy_path_only");
    const missing = happyOnly?.proofStages.negativePath as {
      status: string;
      suggestedNegatives: Array<{
        factId: string;
        expects: string;
        assumption: Record<string, unknown>;
      }>;
    };
    expect(missing.status).toBe("missing");
    expect(missing.suggestedNegatives).toHaveLength(1);
    expect(missing.suggestedNegatives[0]).toMatchObject({
      factId: "FACT-QUOTA-POSITIVE",
      expects: "rejection",
      assumption: { operator: "eq", value: 0, property_key: "remaining" },
    });
    expect(
      ws.text(["proof", "explain", "REQ-QUOTA-CALL"]),
    ).toContain("Failure side: missing");

    // A rejection scenario whose assumptions the requirement permits
    // predicts success, so it does not count and the check reports it.
    ws.write(
      ".kb/scenarios/SCEN-QUOTA-FIVE-REJECTED.md",
      scenario("SCEN-QUOTA-FIVE-REJECTED", "rejection", "FACT-QUOTA-FIVE"),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      requirement(ws, ["SCEN-QUOTA-CALL", "SCEN-QUOTA-FIVE-REJECTED"]),
    );
    ws.sync();
    expect(
      checkViolations(ws, "scenario-outcome-mismatch").map((v) => v.entityId),
    ).toEqual(["SCEN-QUOTA-FIVE-REJECTED"]);
    expect(coverageRows(ws).get("REQ-QUOTA-CALL")?.proofGaps).toContain(
      "happy_path_only",
    );

    // Assuming the forbidden value closes the gap.
    ws.write(
      ".kb/scenarios/SCEN-QUOTA-FIVE-REJECTED.md",
      scenario("SCEN-QUOTA-FIVE-REJECTED", "rejection", "FACT-QUOTA-ZERO"),
    );
    ws.sync();
    expect(checkViolations(ws, "scenario-outcome-mismatch")).toEqual([]);
    const covered = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(covered?.proofGaps).not.toContain("happy_path_only");
    expect(covered?.proofStages.negativePath).toMatchObject({
      status: "passed",
      negativeScenarios: ["SCEN-QUOTA-FIVE-REJECTED"],
    });
  });

  test("a failure-side waiver counts only once a person approved it", () => {
    const ws = createConsumerWorkspace("kibi-failure-side-waiver-");
    workspace = ws;

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    const reason =
      "failure_side_waiver: The quota is reported, never enforced, here.\n";
    ws.write(".kb/requirements/REQ-QUOTA-CALL.md", requirement(ws, [], reason));
    ws.sync();

    const pending = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(pending?.proofGaps).toContain("happy_path_only");
    expect(pending?.proofStages.negativePath).toMatchObject({
      status: "missing",
      waiver: { reason: "The quota is reported, never enforced, here." },
    });
    expect(ws.text(["proof", "explain", "REQ-QUOTA-CALL"])).toContain(
      "waiver awaiting approval",
    );

    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      requirement(
        ws,
        [],
        `${reason}failure_side_waiver_approved_by: Quota owner\n`,
      ),
    );
    ws.sync();
    const waived = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(waived?.proofGaps).not.toContain("happy_path_only");
    expect(waived?.proofStages.negativePath).toMatchObject({
      status: "waived",
      waiver: { approvedBy: "Quota owner" },
    });
  });
});

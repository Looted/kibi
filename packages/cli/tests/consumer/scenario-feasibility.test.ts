// implements REQ-kibi-scenario-feasibility
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
 * Consumer view of scenario feasibility: a requirement, a scenario that
 * assumes a value the requirement forbids, and an approved exception, all
 * authored in a fresh workspace and checked through the built CLI.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function scenario(id: string, expects: string): string {
  return doc(
    `
id: ${id}
title: A zero-quota promo call (${expects})
type: scenario
status: active
expects: ${expects}
links:
  - type: assumes
    target: FACT-QUOTA-ZERO
`,
    "Given a client with zero remaining quota, when it makes a promo call, the call is answered.",
  );
}

describe("scenario feasibility through the kibi CLI", () => {
  test("flags a success scenario that assumes a forbidden value until an approved exception exempts it", () => {
    const ws = createConsumerWorkspace("kibi-scenario-feasibility-");
    workspace = ws;

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-POSITIVE.md",
      quotaValueFact(
        "FACT-QUOTA-POSITIVE",
        "Remaining quota above zero",
        "gt",
        0,
      ),
    );
    ws.write(
      ".kb/facts/FACT-QUOTA-ZERO.md",
      quotaValueFact("FACT-QUOTA-ZERO", "Remaining quota is zero", "eq", 0),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      doc(
        `
id: REQ-QUOTA-CALL
title: A client may call only with remaining quota
type: req
status: open
priority: must
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
  - type: specified_by
    target: SCEN-ZERO-QUOTA-CALL
`,
        "A client may call only with remaining quota.",
      ),
    );
    ws.write(
      ".kb/scenarios/SCEN-ZERO-QUOTA-CALL.md",
      scenario("SCEN-ZERO-QUOTA-CALL", "success"),
    );
    ws.write(
      ".kb/scenarios/SCEN-ZERO-QUOTA-REJECTED.md",
      scenario("SCEN-ZERO-QUOTA-REJECTED", "rejection"),
    );
    ws.sync();

    // Only the success scenario is checked, and it names the requirement
    // and both facts.
    const infeasible = checkViolations(ws, "scenario-feasibility");
    expect(infeasible.map((v) => [v.rule, v.entityId])).toEqual([
      ["scenario-feasibility", "SCEN-ZERO-QUOTA-CALL"],
    ]);
    expect(infeasible[0]?.description).toContain("REQ-QUOTA-CALL");
    expect(infeasible[0]?.description).toContain("FACT-QUOTA-ZERO");
    expect(infeasible[0]?.description).toContain("FACT-QUOTA-POSITIVE");

    // The proof ladder blocks the requirement the scenario specifies.
    const blocked = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(blocked?.proofGaps).toContain("infeasible_scenario");
    expect(blocked?.proofStages.scenarios?.status).toBe("blocked");
    expect(blocked?.proofStages.scenarios?.infeasibleScenarios).toEqual([
      "SCEN-ZERO-QUOTA-CALL",
    ]);

    // An exception that exempts the base requirement and is specified by
    // the scenario only counts once a human approved it. Its prose ledger
    // comes from the semantic advisor, as any current requirement's must.
    const prose = "Promo calls may skip the call quota.";
    const { contract, propositions } = adviseProse(ws, prose);
    expect(propositions).toHaveLength(1);
    const exception = (approval: string) =>
      doc(
        `
id: REQ-QUOTA-PROMO-EXCEPTION
title: Promo calls are exempt from the quota
type: req
status: open
priority: must
${approval}${semanticFrontMatter(prose, contract, propositions)}
links:
  - type: exempts
    target: REQ-QUOTA-CALL
  - type: specified_by
    target: SCEN-ZERO-QUOTA-CALL
`,
        prose,
      );
    ws.write(".kb/requirements/REQ-QUOTA-PROMO-EXCEPTION.md", exception(""));
    ws.sync();

    // Without approval the exception does not exempt, and the violation
    // says an exception exists but is not approved.
    const unapproved = checkViolations(ws, "scenario-feasibility");
    expect(unapproved.map((v) => v.entityId)).toEqual(["SCEN-ZERO-QUOTA-CALL"]);
    expect(unapproved[0]?.description).toContain("REQ-QUOTA-PROMO-EXCEPTION");
    expect(unapproved[0]?.description).toContain("not approved");
    expect(coverageRows(ws).get("REQ-QUOTA-CALL")?.proofGaps).toContain(
      "infeasible_scenario",
    );

    ws.write(
      ".kb/requirements/REQ-QUOTA-PROMO-EXCEPTION.md",
      exception("approved_by: Product owner\napproval_ref: DEC-42\n"),
    );
    ws.sync();

    expect(checkViolations(ws, "scenario-feasibility")).toEqual([]);
    const exempted = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(exempted?.status).toBe("open");
    expect(exempted?.proofGaps).not.toContain("infeasible_scenario");
  }, 300_000);
});

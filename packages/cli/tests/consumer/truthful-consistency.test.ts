// implements REQ-kibi-truthful-consistency
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  checkViolations,
  coverageRows,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of truthful consistency: requirements authored in a fresh
 * workspace, then `kibi coverage` and `kibi check` through the built CLI.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

describe("truthful consistency through the kibi CLI", () => {
  test("reports incomplete analysis for unmodeled clauses and exact strict-bound conflicts", () => {
    const ws = createConsumerWorkspace("kibi-truthful-consistency-");
    workspace = ws;

    // The author records the advisor's clause ledger, grounds the numeric
    // clause and leaves the review clause as an explicit ontology gap.
    const prose =
      "The remaining call quota must be greater than 0. Every quota reset must be reviewed by an operator.";
    const { contract, propositions } = adviseProse(ws, prose);
    expect(propositions.map((p) => p.claim_text)).toEqual([
      "The remaining call quota must be greater than 0",
      "Every quota reset must be reviewed by an operator",
    ]);
    const [numeric, review] = propositions as [
      (typeof propositions)[number],
      (typeof propositions)[number],
    ];
    expect(review.status).toBe("ontology_gap");

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    ws.write(
      ".kb/facts/FACT-QUOTA-POSITIVE.md",
      quotaValueFact(
        "FACT-QUOTA-POSITIVE",
        "Remaining quota above zero",
        "gt",
        0,
        { key: numeric.claim_key, text: numeric.claim_text },
      ),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      doc(
        `
id: REQ-QUOTA-CALL
title: Calls need remaining quota and resets need review
type: req
status: open
priority: must
${semanticFrontMatter(prose, contract, [{ ...numeric, status: "modeled" }, review])}
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
`,
        prose,
      ),
    );
    ws.sync();

    // No conflicting requirement exists, but an unmodeled clause means the
    // contradiction stage cannot claim "no conflict found".
    const partial = coverageRows(ws).get("REQ-QUOTA-CALL");
    expect(partial?.proofStages.logicGrounding?.status).toBe("passed");
    expect(partial?.proofStages.contradictions?.status).toBe("unresolved");
    expect(partial?.proofStages.contradictions?.outcome).toBe(
      "analysis_incomplete",
    );
    expect(partial?.proofGaps).toContain("contradiction_check_incomplete");
    expect(checkViolations(ws, "domain-contradictions")).toEqual([]);

    // remaining > 0 and remaining = 0 have no common value; remaining >= 0
    // is compatible with both and must not be reported.
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-FREE-TIER",
      title: "Free-tier remaining quota is zero",
      prose: "The free-tier remaining call quota must equal 0.",
      factId: "FACT-QUOTA-ZERO",
      operator: "eq",
      value: 0,
    });
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-NON-NEGATIVE",
      title: "Remaining quota is never negative",
      prose: "The remaining call quota must be at least 0.",
      factId: "FACT-QUOTA-NON-NEGATIVE",
      operator: "gte",
      value: 0,
    });
    ws.sync();

    const violations = checkViolations(ws, "domain-contradictions");
    expect(violations).toHaveLength(1);
    expect(violations[0]?.rule).toBe("domain-contradictions");
    expect(violations[0]?.entityId).toBe("REQ-QUOTA-CALL/REQ-QUOTA-FREE-TIER");
    expect(violations[0]?.description).toContain(
      "Value conflict on client.call_quota.remaining: gt 0 vs eq 0",
    );

    const rows = coverageRows(ws);
    const call = rows.get("REQ-QUOTA-CALL");
    expect(call?.proofStages.contradictions?.status).toBe("blocked");
    expect(call?.proofStages.contradictions?.outcome).toBe("conflict_found");
    expect(call?.proofGaps).toContain("blocking_contradiction");
    const nonNegative = rows.get("REQ-QUOTA-NON-NEGATIVE");
    expect(nonNegative?.proofStages.contradictions?.outcome).toBe(
      "no_conflict_found",
    );
    expect(nonNegative?.proofGaps).not.toContain("blocking_contradiction");
  }, 300_000);
});

// implements REQ-kibi-truthful-consistency
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  checkAdvisories,
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

/** The kibi.logic.v1 rule: `modality` alert(S) when reading(S, V) is `operator value`. */
function readingRule(
  modality: "permit" | "forbid",
  operator: string,
  value: number,
): Json {
  const sensor = { kind: "var", name: "S", type: "sensor" };
  const reading = { kind: "var", name: "V", type: "number" };
  return {
    version: "kibi.logic.v1",
    kind: "rule",
    modality,
    head: { kind: "atom", name: "alert", args: [sensor] },
    body: {
      kind: "all",
      items: [
        { kind: "atom", name: "reading", args: [sensor, reading] },
        {
          kind: "compare",
          operator,
          left: reading,
          right: { kind: "number", value },
        },
      ],
    },
    variables: [
      { name: "S", type: "sensor", quantifier: "forall" },
      { name: "V", type: "number", quantifier: "forall" },
    ],
  };
}

/** Model one rule requirement with kibi model and write its plan with kibi upsert. */
function authorRuleRequirement(
  ws: ConsumerWorkspace,
  requirementId: string,
  text: string,
  logic: Json,
): void {
  const modeled = ws.json(["model"], {
    mode: "requirement",
    text,
    requirementId,
    logic,
  });
  const data = modeled.data as Json;
  for (const entry of data.applyPlan as Json[]) {
    expect(ws.kibi(["upsert"], { input: entry }).status).toBe(0);
  }
}

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

  test("classifies each opposing rule pair as contradiction, disjoint or unresolved", () => {
    const ws = createConsumerWorkspace("kibi-rule-pair-classes-");
    workspace = ws;
    authorRuleRequirement(
      ws,
      "REQ-ALERT-POSITIVE",
      "A sensor may alert when its reading is above 0.",
      readingRule("permit", "gt", 0),
    );
    authorRuleRequirement(
      ws,
      "REQ-NO-ALERT-NON-POSITIVE",
      "A sensor must not alert when its reading is at most 0.",
      readingRule("forbid", "lte", 0),
    );
    authorRuleRequirement(
      ws,
      "REQ-NO-ALERT-HIGH",
      "A sensor must not alert when its reading is above 5.",
      readingRule("forbid", "gt", 5),
    );
    ws.sync();

    // Each opposing pair is judged once; the class is in the status the
    // check reports, and a disjoint pair is not reported at all.
    const ruleConflicts = () =>
      checkViolations(ws, "domain-contradictions")
        .map((violation) => ({
          pair: violation.entityId,
          status: /^Rule conflict \((\w+)\)/.exec(violation.description)?.[1],
        }))
        .filter((conflict) => conflict.status !== undefined)
        .sort((left, right) => left.pair.localeCompare(right.pair));
    const classes = new Set(["contradiction", "disjoint", "unresolved"]);

    // reading/2 may hold several values per sensor, so "above 0" against
    // "at most 0" cannot be decided; "above 0" against "above 5" overlaps.
    const undeclared = ruleConflicts();
    expect(undeclared).toEqual([
      { pair: "REQ-ALERT-POSITIVE/REQ-NO-ALERT-HIGH", status: "contradiction" },
      {
        pair: "REQ-ALERT-POSITIVE/REQ-NO-ALERT-NON-POSITIVE",
        status: "unresolved",
      },
    ]);
    expect(
      checkAdvisories(ws, "rule-key-arguments-missing").map(
        (advisory) => advisory.entityId,
      ),
    ).toEqual(["REQ-ALERT-POSITIVE/REQ-NO-ALERT-NON-POSITIVE"]);

    // Declaring the sensor as reading/2's key makes one reading per sensor:
    // "above 0" and "at most 0" become disjoint and drop out of the report.
    expect(
      ws.kibi(["upsert"], {
        input: {
          type: "fact",
          id: "FACT-SCHEMA-READING",
          properties: {
            title: "Predicate schema: reading/2",
            status: "active",
            fact_kind: "predicate_schema",
            predicate_name: "reading",
            predicate_arity: 2,
            argument_names: ["sensor", "value"],
            argument_types: ["sensor", "number"],
            key_arguments: ["sensor"],
          },
        },
      }).status,
    ).toBe(0);
    ws.sync();
    const declared = ruleConflicts();
    expect(declared).toEqual([
      { pair: "REQ-ALERT-POSITIVE/REQ-NO-ALERT-HIGH", status: "contradiction" },
    ]);
    expect(checkAdvisories(ws, "rule-key-arguments-missing")).toEqual([]);
    for (const conflict of [...undeclared, ...declared]) {
      expect(classes.has(conflict.status ?? "")).toBe(true);
    }
  }, 300_000);
});

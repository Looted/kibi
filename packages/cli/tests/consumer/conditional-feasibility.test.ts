// implements REQ-kibi-scenario-feasibility-v2, REQ-kibi-conditional-requirement-authoring, REQ-kibi-truthful-consistency
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  checkAdvisories,
  checkViolations,
  coverageRows,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of a conditional requirement. The requirement's semantics
 * come from compile-intent (nothing about the rule is hand-authored), the
 * approved plan is applied, and scenarios are checked through the built CLI:
 * the blocking feasibility rule, the unknown advisory and the proof ladder
 * must give the same answer for each scenario.
 */

const CHECKOUT = "REQ-checkout-positive-total";
const EU_CHECKOUT = "REQ-checkout-eu-positive-total";

type Scenario = Readonly<{ id: string; title: string; assumes: string }>;

const CHECKOUT_SCENARIOS: readonly Scenario[] = [
  {
    id: "SCEN-checkout-zero-total",
    title: "A zero-total cart checks out",
    assumes: "FACT-cart-total-zero",
  },
  {
    id: "SCEN-checkout-free-promo",
    title: "A free promo cart checks out",
    assumes: "FACT-cart-total-zero",
  },
  // "basket amount" is not "cart total": nothing says they are the same.
  {
    id: "SCEN-checkout-zero-basket",
    title: "A zero-amount basket checks out",
    assumes: "FACT-basket-amount-zero",
  },
  // The discounted item total says nothing about fees, so the cart total
  // stays open.
  {
    id: "SCEN-checkout-unstated-fees",
    title: "A cart with free items and unstated fees checks out",
    assumes: "FACT-cart-items-total-zero",
  },
];

const EU_SCENARIOS: readonly Scenario[] = [
  {
    id: "SCEN-checkout-us-zero-total",
    title: "A zero-total US cart checks out",
    assumes: "FACT-cart-total-zero-us",
  },
  {
    id: "SCEN-checkout-eu-zero-total",
    title: "A zero-total EU cart checks out",
    assumes: "FACT-cart-total-zero-eu",
  },
];

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

/**
 * compile-intent turns the prose into a plan (requirement, rule and the
 * scenario drafts it specifies), and apply-plan applies it once approved.
 */
function compileAndApply(
  ws: ConsumerWorkspace,
  intent: string,
  requirementId: string,
  scenarios: readonly Scenario[],
): Json {
  const plan = ws.json(["compile-intent"], {
    intent,
    mode: "create",
    requirementId,
    scenarioDrafts: scenarios.map(({ id, title }) => ({
      id,
      title,
      body: `${title}.`,
    })),
    testDrafts: scenarios.map(({ id, title }) => ({
      id: id.replace(/^SCEN-/, "TEST-"),
      title: `Verify: ${title}`,
      body: `Checks that ${title.toLowerCase()}.`,
      scenarioIds: [id],
    })),
  }).data as Json;
  // Diagnostics ride along so a failure says why the plan is not ready.
  expect({ status: plan.status, diagnostics: plan.diagnostics }).toMatchObject({
    status: "ready",
  });
  expect(plan.propositions).toMatchObject([
    { disposition: "rule", status: "modeled" },
  ]);
  const applied = ws.json(["apply-plan"], {
    plan,
    approvedPlanHash: plan.planHash,
  });
  expect(applied).toMatchObject({ data: { outcome: "applied" } });
  return plan;
}

/** The scenario now expects success under what it assumes. */
function assume(ws: ConsumerWorkspace, scenario: Scenario): void {
  const result = ws.json(["upsert"], {
    type: "scenario",
    id: scenario.id,
    properties: {
      title: scenario.title,
      status: "active",
      expects: "success",
    },
    relationships: [
      { type: "assumes", from: scenario.id, to: scenario.assumes },
    ],
  });
  expect(result).toMatchObject({ status: "success" });
}

function zeroFact(
  id: string,
  title: string,
  subject: string,
  property: string,
  scope?: string,
  window?: Readonly<{ from: string; to: string }>,
): string {
  return doc(`
id: ${id}
title: ${title}
type: fact
status: active
fact_kind: property_value
subject_key: ${subject}
property_key: ${property}
operator: eq
value_type: int
value_int: 0
${scope ? `scope: ${scope}` : ""}
${window ? `valid_from: ${window.from}\nvalid_to: ${window.to}` : ""}
`);
}

/** Blocking infeasibility violations and unknown-feasibility advisories. */
function feasibilityByScenario(ws: ConsumerWorkspace) {
  return {
    infeasible: checkViolations(ws, "scenario-feasibility")
      .map((violation) => violation.entityId)
      .sort(),
    unknown: checkAdvisories(ws, "scenario-feasibility-unknown")
      .map((advisory) => advisory.entityId)
      .sort(),
  };
}

describe("conditional requirement feasibility through the kibi CLI", () => {
  test("an only-when requirement compiled from prose decides checkout scenarios", () => {
    const ws = createConsumerWorkspace("kibi-conditional-feasibility-");
    workspace = ws;

    const facts: Array<[string, string, string, string, string?]> = [
      ["FACT-cart-total-zero", "The cart total is zero", "cart", "total"],
      [
        "FACT-cart-total-zero-us",
        "A US cart total is zero",
        "cart",
        "total",
        "us",
      ],
      [
        "FACT-cart-total-zero-eu",
        "An EU cart total is zero",
        "cart",
        "total",
        "eu",
      ],
      [
        "FACT-basket-amount-zero",
        "The basket amount is zero",
        "basket",
        "amount",
      ],
      [
        "FACT-cart-items-total-zero",
        "The discounted item total is zero",
        "cart",
        "items_total_after_discount",
      ],
    ];
    for (const [id, title, subject, property, scope] of facts)
      ws.write(
        `.kb/facts/${id}.md`,
        zeroFact(id, title, subject, property, scope),
      );
    ws.sync();

    const plan = compileAndApply(
      ws,
      "Checkout may happen only when the cart total is positive.",
      CHECKOUT,
      CHECKOUT_SCENARIOS,
    );
    const ruleStep = (plan.steps as Json[]).find(
      (step) => (step.properties as Json | undefined)?.fact_kind === "rule",
    );
    expect((ruleStep?.properties as Json).title).toBe(
      "Rule: Checkout may happen only when the cart total is positive",
    );
    expect((ruleStep?.properties as Json).rule_ir).toMatchObject({
      modality: "forbid",
      head: { name: "checkout" },
      body: { namespace: "cart", name: "total" },
    });
    compileAndApply(
      ws,
      "In the EU, checkout may happen only when the cart total is positive.",
      EU_CHECKOUT,
      EU_SCENARIOS,
    );
    for (const scenario of [...CHECKOUT_SCENARIOS, ...EU_SCENARIOS])
      assume(ws, scenario);

    // A zero total is infeasible wherever a rule applies. The US scenario is
    // outside the EU rule's scope, so it is not applicable and neither check
    // reports it.
    expect(feasibilityByScenario(ws)).toEqual({
      infeasible: [
        "SCEN-checkout-eu-zero-total",
        "SCEN-checkout-free-promo",
        "SCEN-checkout-zero-total",
      ],
      unknown: ["SCEN-checkout-unstated-fees", "SCEN-checkout-zero-basket"],
    });
    for (const advisory of checkAdvisories(ws, "scenario-feasibility-unknown"))
      expect(advisory.message).toContain(
        "is not constrained by any current requirement that governs this scenario",
      );

    // The proof ladder agrees: it blocks on the infeasible scenarios and
    // notes the undecided ones without counting them as feasible.
    const rows = coverageRows(ws);
    const checkout = rows.get(CHECKOUT)?.proofStages.scenarios;
    expect(checkout?.status).toBe("blocked");
    expect(checkout?.infeasibleScenarios).toEqual([
      "SCEN-checkout-free-promo",
      "SCEN-checkout-zero-total",
    ]);
    expect(checkout?.unknownFeasibility).toEqual([
      {
        scenario: "SCEN-checkout-unstated-fees",
        reason: "unmatched_assumption",
      },
      { scenario: "SCEN-checkout-zero-basket", reason: "unmatched_assumption" },
    ]);
    const eu = rows.get(EU_CHECKOUT)?.proofStages.scenarios;
    expect(eu?.infeasibleScenarios).toEqual(["SCEN-checkout-eu-zero-total"]);
    expect(eu?.unknownFeasibility).toEqual([]);

    // A human-approved exception for the free promo waives the compiled
    // clause for that scenario only. exempts_claims names the claim key
    // compile-intent assigned, and must name a real claim.
    const claimKey = (plan.propositions as Json[])[0]?.claimKey as string;
    const prose = "Free promo checkouts may skip the positive cart total rule.";
    const { contract, propositions } = adviseProse(ws, prose);
    const exception = (claims: string) =>
      doc(
        `
id: REQ-checkout-free-promo-exception
title: Free promo checkouts are exempt from the positive total rule
type: req
status: open
priority: must
approved_by: Product owner
approval_ref: DEC-7
exempts_claims: [${claims}]
${semanticFrontMatter(prose, contract, propositions)}
links:
  - type: exempts
    target: ${CHECKOUT}
  - type: specified_by
    target: SCEN-checkout-free-promo
`,
        prose,
      );

    ws.write(
      ".kb/requirements/REQ-checkout-free-promo-exception.md",
      exception("CLAIM-0000000000000000"),
    );
    ws.sync();
    expect(
      checkViolations(ws, "exception-claim-keys").map((v) => v.entityId),
    ).toEqual(["REQ-checkout-free-promo-exception"]);
    expect(feasibilityByScenario(ws).infeasible).toContain(
      "SCEN-checkout-free-promo",
    );

    ws.write(
      ".kb/requirements/REQ-checkout-free-promo-exception.md",
      exception(claimKey),
    );
    ws.sync();
    expect(checkViolations(ws, "exception-claim-keys")).toEqual([]);
    // Feasible by exception; the unrelated zero-total scenario stays
    // infeasible.
    expect(feasibilityByScenario(ws)).toEqual({
      infeasible: ["SCEN-checkout-eu-zero-total", "SCEN-checkout-zero-total"],
      unknown: ["SCEN-checkout-unstated-fees", "SCEN-checkout-zero-basket"],
    });
    expect(
      coverageRows(ws).get(CHECKOUT)?.proofStages.scenarios
        ?.infeasibleScenarios,
    ).toEqual(["SCEN-checkout-zero-total"]);
  }, 600_000);

  test("a compiled rule decides only scenarios inside its validity window, and an untranslatable conditional stays an open gap", () => {
    const ws = createConsumerWorkspace("kibi-conditional-validity-");
    workspace = ws;

    // When each zero-total checkout happens comes from its assumed fact.
    const dated: Array<[string, string, { from: string; to: string }?]> = [
      [
        "FACT-cart-total-zero-2027",
        "A March 2027 cart total is zero",
        {
          from: "2027-03-01",
          to: "2027-03-31",
        },
      ],
      [
        "FACT-cart-total-zero-2026",
        "A June 2026 cart total is zero",
        {
          from: "2026-06-01",
          to: "2026-06-30",
        },
      ],
      ["FACT-cart-total-zero-undated", "An undated cart total is zero"],
    ];
    for (const [id, title, window] of dated)
      ws.write(
        `.kb/facts/${id}.md`,
        zeroFact(id, title, "cart", "total", undefined, window),
      );
    ws.sync();

    const scenarios: readonly Scenario[] = [
      {
        id: "SCEN-checkout-zero-total-2027",
        title: "A zero-total cart checks out in March 2027",
        assumes: "FACT-cart-total-zero-2027",
      },
      {
        id: "SCEN-checkout-zero-total-2026",
        title: "A zero-total cart checks out in June 2026",
        assumes: "FACT-cart-total-zero-2026",
      },
      {
        id: "SCEN-checkout-zero-total-undated",
        title: "A zero-total cart checks out at an unstated time",
        assumes: "FACT-cart-total-zero-undated",
      },
    ];
    const plan = compileAndApply(
      ws,
      "Checkout may happen only when the cart total is positive.",
      CHECKOUT,
      scenarios,
    );

    // The rule holds during 2027 only. kb_upsert replaces an entity's
    // properties, so the window is written onto the compiled rule as a
    // whole entity.
    const ruleId = (plan.steps as Json[]).find(
      (step) => (step.properties as Json | undefined)?.fact_kind === "rule",
    )?.id as string;
    const rule = (ws.json(["query"], { id: ruleId }).data as Json)
      .entities as Json[];
    const {
      id: _id,
      type: _type,
      source: _source,
      created_at: _createdAt,
      updated_at: _updatedAt,
      ...ruleProperties
    } = rule[0] as Json;
    expect(
      ws.json(["upsert"], {
        type: "fact",
        id: ruleId,
        properties: {
          ...ruleProperties,
          valid_from: "2027-01-01",
          valid_to: "2027-12-31",
        },
      }),
    ).toMatchObject({ status: "success" });
    for (const scenario of scenarios) assume(ws, scenario);

    // Inside the window the rule blocks; before it the rule does not apply;
    // with no stated time the checks cannot tell and say so.
    expect(feasibilityByScenario(ws)).toEqual({
      infeasible: ["SCEN-checkout-zero-total-2027"],
      unknown: ["SCEN-checkout-zero-total-undated"],
    });
    expect(
      checkAdvisories(ws, "scenario-feasibility-unknown")[0]?.message,
    ).toContain("validity window may or may not cover the scenario's time");
    const ladder = coverageRows(ws).get(CHECKOUT)?.proofStages.scenarios;
    expect(ladder?.infeasibleScenarios).toEqual([
      "SCEN-checkout-zero-total-2027",
    ]);
    expect(ladder?.unknownFeasibility).toEqual([
      {
        scenario: "SCEN-checkout-zero-total-undated",
        reason: "undetermined_validity",
      },
    ]);

    // A conditional whose condition the reader cannot translate compiles to
    // no rule and no observation: the clause stays an ontology gap and the
    // plan is not ready to apply.
    const untranslatable =
      "Checkout may happen only when the cart total is positive and the user is verified.";
    const gapPlan = ws.json(["compile-intent"], {
      intent: untranslatable,
      mode: "create",
      requirementId: "REQ-checkout-verified-positive",
    }).data as Json;
    expect(gapPlan.status).toBe("needs_resolution");
    expect(gapPlan.propositions).toMatchObject([{ status: "ontology_gap" }]);
    expect(
      (gapPlan.steps as Json[]).map(
        (step) => (step.properties as Json | undefined)?.fact_kind,
      ),
    ).not.toEqual(expect.arrayContaining(["rule", "observation"]));
    const modeled = ws.json(["model-requirement"], {
      text: untranslatable,
      requirementId: "REQ-checkout-verified-positive",
    }).data as Json;
    expect(modeled.warnings).toMatchObject([
      { kind: "unresolved_conditional_clause" },
    ]);
    expect(modeled.applyPlan).toMatchObject([
      {
        type: "req",
        properties: { semantic_inventory: [{ status: "ontology_gap" }] },
      },
    ]);
  }, 600_000);
});

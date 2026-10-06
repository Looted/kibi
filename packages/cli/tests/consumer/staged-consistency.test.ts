// implements REQ-cli-staged-consistency
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  createConsumerWorkspace,
  doc,
} from "./workspace.js";

/**
 * The pre-commit hook runs `kibi check --staged`. A staged change that makes
 * a success scenario infeasible must fail there exactly as full `kibi check`
 * fails, while a violation already committed must not block an unrelated
 * commit.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const SCENARIO = "SCEN-checkout-free-order";

function stagedCheck(ws: ConsumerWorkspace) {
  ws.stage();
  const run = ws.kibi(["check", "--staged", "--format", "json"]);
  const structured = (JSON.parse(run.stdout) as Json).structuredContent as {
    violations: Array<{ rule: string; entityId: string }>;
  };
  return {
    status: run.status,
    violations: structured.violations.map(({ rule, entityId }) => ({
      rule,
      entityId,
    })),
  };
}

function zeroTotalFact(id: string): string {
  return doc(`
id: ${id}
title: The cart total is zero
type: fact
status: active
fact_kind: property_value
subject_key: cart
property_key: total
operator: eq
value_type: int
value_int: 0
`);
}

describe("kibi check --staged consistency", () => {
  test("blocks a staged infeasible scenario and ignores one already committed", () => {
    const ws = createConsumerWorkspace("kibi-staged-consistency-");
    workspace = ws;
    ws.write(
      ".kb/facts/FACT-cart-total-zero.md",
      zeroTotalFact("FACT-cart-total-zero"),
    );
    ws.sync();

    const plan = ws.json(["compile-intent"], {
      intent: "Checkout may happen only when the cart total is positive.",
      mode: "create",
      requirementId: "REQ-checkout-positive-total",
      scenarioDrafts: [
        {
          id: SCENARIO,
          title: "A 100%-discounted order checks out for free",
          body: "A 100%-discounted order checks out for free.",
        },
      ],
      testDrafts: [
        {
          id: "TEST-checkout-free-order",
          title: "Verify: a 100%-discounted order checks out",
          body: "Checks the free order.",
          scenarioIds: [SCENARIO],
        },
      ],
    }).data as Json;
    expect(plan.status).toBe("ready");
    expect(
      ws.json(["apply-plan"], { plan, approvedPlanHash: plan.planHash }),
    ).toMatchObject({ data: { outcome: "applied" } });
    ws.sync();
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "checkout rule");

    // The scenario now expects success while assuming a zero total.
    expect(
      ws.json(["upsert"], {
        type: "scenario",
        id: SCENARIO,
        properties: {
          title: "A 100%-discounted order checks out for free",
          status: "active",
          expects: "success",
        },
        relationships: [
          { type: "assumes", from: SCENARIO, to: "FACT-cart-total-zero" },
        ],
      }),
    ).toMatchObject({ status: "success" });

    expect(stagedCheck(ws)).toEqual({
      status: 1,
      violations: [{ rule: "scenario-feasibility", entityId: SCENARIO }],
    });

    // Committed anyway (the test workspace runs git without hooks): the
    // violation is now in the base tree and an unrelated change passes.
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "free orders");
    ws.write(
      ".kb/facts/FACT-cart-items-zero.md",
      zeroTotalFact("FACT-cart-items-zero").replace(
        "property_key: total",
        "property_key: items_total",
      ),
    );
    expect(stagedCheck(ws)).toEqual({ status: 0, violations: [] });
  }, 600_000);
});

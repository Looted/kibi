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
      context:
        "Fixture rule for the staged consistency test: checkout needs a positive cart total; no further reason is stated.",
      scenarioDrafts: [
        {
          id: SCENARIO,
          title: "A 100%-discounted order checks out for free",
          body: "A customer applies a full discount so the cart total falls to zero and then tries to check out, which the rule must reject.",
        },
      ],
      testDrafts: [
        {
          id: "TEST-checkout-free-order",
          title: "Verify: a 100%-discounted order checks out",
          body: "Submits the zero total order through checkout and asserts the rule rejects it, so a false pass needs the cart total fact to be missing.",
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

  test("blocks requirement-scoped rules only on the staged requirements", () => {
    const ws = createConsumerWorkspace("kibi-staged-requirement-rules-");
    workspace = ws;
    const text = "Login must return a session token to the user.";
    const requirement = (
      id: string,
      priority: string,
      subjects: string[] | undefined,
    ) => ({
      type: "req",
      id,
      properties: {
        title: "Login returns a session token",
        status: "open",
        priority,
        origin: { kind: "agent" },
        semantic_text: text,
        semantic_inventory_version: "kibi.semantic-inventory.v1",
        semantic_source_field: "semantic_text",
        semantic_source_hash:
          "92116e95c4bd443925a5980bae40d4c14d0f47c65536e27652acce5d25d6e2ac",
        semantic_inventory: [
          {
            claim_key: "CLAIM-AE4C8E430987981E",
            claim_text: "Login must return a session token to the user",
            role: "normative",
            status: "ontology_gap",
            span: { start: 0, end: 45 },
            reason: "No predicate grounds it yet.",
            ...(subjects ? { subjects } : {}),
          },
        ],
        logic_claims: ["CLAIM-AE4C8E430987981E"],
      },
      document: {
        body: `${text}\n\n## Context\n\nFixture requirement for the staged gate test; the reason is not stated.`,
      },
    });
    expect(
      ws.json(["upsert"], {
        type: "fact",
        id: "FACT-subject-login",
        properties: {
          title: "Login",
          status: "active",
          fact_kind: "subject",
          subject_key: "auth.login",
        },
        document: {
          body: "Login is the product action by which a registered user proves their identity to obtain access; it is not account registration.",
        },
      }),
    ).toMatchObject({ status: "success" });
    expect(
      ws.json(
        ["upsert"],
        requirement("REQ-login-session", "must", ["auth.login"]),
      ),
    ).toMatchObject({ status: "success" });
    expect(
      ws.json(
        ["upsert"],
        requirement("REQ-login-anchorless", "should", undefined),
      ),
    ).toMatchObject({ status: "success" });

    expect(stagedCheck(ws)).toEqual({
      status: 1,
      violations: [
        { rule: "claim-subject-missing", entityId: "REQ-login-anchorless" },
        { rule: "must-positive-scenario", entityId: "REQ-login-session" },
      ],
    });

    // Committed anyway: an unrelated staged change no longer judges them.
    ws.git("add", "-A");
    ws.git("commit", "-q", "-m", "login rules");
    ws.write(
      ".kb/facts/FACT-cart-total-zero.md",
      zeroTotalFact("FACT-cart-total-zero"),
    );
    expect(stagedCheck(ws)).toEqual({ status: 0, violations: [] });
  }, 600_000);
});

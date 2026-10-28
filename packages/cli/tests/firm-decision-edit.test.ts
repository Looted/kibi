import { describe, expect, test } from "bun:test";

import {
  type DecisionDocument,
  decisionClaimChanges,
  firmEditGuidance,
  unapprovedFirmEdit,
} from "../src/firm-decision-edit.js";
import { evaluateFirmDecisionEdits } from "../src/public/operations/decision-firmness.js";

const RULE: DecisionDocument = {
  type: "req",
  data: {
    title: "Carts hold at most 50 items",
    status: "open",
    origin: { kind: "import", ref: "docs/policy.md#L4" },
  },
  body: "Carts hold at most 50 items.\n\n## Context\nThe picker handles one cart.\n",
};

describe("firm decision edits", () => {
  test("a requirement's claim is its title and statement, not its context", () => {
    expect(
      decisionClaimChanges(RULE, {
        ...RULE,
        body: "Carts hold at most 50 items.\n\n## Context\nThe picker handles one cart per trip.\n",
      }),
    ).toEqual([]);
    expect(
      decisionClaimChanges(RULE, {
        ...RULE,
        body: RULE.body.replace("50 items.", "80 items."),
      }),
    ).toEqual(["statement"]);
    expect(
      decisionClaimChanges(RULE, {
        ...RULE,
        data: { ...RULE.data, semantic_text: "Carts hold at most 80 items." },
      }),
    ).toEqual(["statement"]);
    expect(
      decisionClaimChanges(RULE, {
        ...RULE,
        data: { ...RULE.data, title: "Carts hold up to 80 items" },
      }),
    ).toEqual(["title"]);
  });

  test("whitespace-only rewording is not a claim change, but joining words is", () => {
    const retitle = (title: unknown) => ({
      ...RULE,
      data: { ...RULE.data, title },
    });
    expect(
      decisionClaimChanges(RULE, retitle("  Carts  hold\tat most\n50 items "))
        .length,
    ).toBe(0);
    expect(
      decisionClaimChanges(RULE, retitle("Carts hold atmost 50 items")),
    ).toEqual(["title"]);
    expect(decisionClaimChanges(retitle(undefined), retitle(""))).toEqual([]);
    expect(decisionClaimChanges(retitle(42), retitle(undefined))).toEqual([]);
  });

  test("an authored statement is compared with the statement the body derives", () => {
    const stated = (semantic_text: string) => ({
      ...RULE,
      data: { ...RULE.data, semantic_text },
    });
    // Writing down the statement the body already makes changes nothing.
    expect(
      decisionClaimChanges(RULE, stated("Carts hold at most 50 items.")),
    ).toEqual([]);
    expect(
      decisionClaimChanges(
        stated("Carts hold at most 50 items."),
        stated("Carts hold at most 80 items."),
      ),
    ).toEqual(["statement"]);
    // With an authored statement, a changed body statement still counts.
    const before = stated("Carts hold at most 50 items.");
    expect(
      decisionClaimChanges(before, {
        ...before,
        body: before.body.replace("50 items.", "80 items."),
      }),
    ).toEqual(["statement"]);
  });

  test("an ADR's claim includes its whole body", () => {
    const adr: DecisionDocument = {
      type: "adr",
      data: { title: "Use Postgres", status: "accepted" },
      body: "We use Postgres.\n",
    };
    expect(
      decisionClaimChanges(adr, { ...adr, body: "We use SQLite.\n" }),
    ).toEqual(["body"]);
    expect(
      decisionClaimChanges(adr, { ...adr, body: "  We use\n  Postgres. " }),
    ).toEqual([]);
  });

  test("only a firm decision is guarded, and new human words release it", () => {
    const edited = {
      ...RULE,
      data: { ...RULE.data, title: "Carts hold up to 80 items" },
    };
    expect(unapprovedFirmEdit(RULE, edited)).toEqual(["title"]);
    expect(
      unapprovedFirmEdit(RULE, {
        ...edited,
        data: { ...edited.data, origin: { kind: "human", ref: "ticket-12" } },
      }),
    ).toEqual([]);
    expect(
      unapprovedFirmEdit(RULE, {
        ...edited,
        data: { ...edited.data, origin: { kind: "agent" } },
      }),
    ).toEqual(["title", "firmness"]);
    const agentChoice = {
      ...RULE,
      data: { ...RULE.data, origin: { kind: "agent" } },
    };
    expect(
      decisionClaimChanges(agentChoice, {
        ...agentChoice,
        data: { ...agentChoice.data, title: "Carts hold up to 80 items" },
      }),
    ).toEqual(["title"]);
    expect(unapprovedFirmEdit(RULE, RULE)).toEqual([]);
    expect(
      unapprovedFirmEdit(agentChoice, {
        ...agentChoice,
        data: { ...agentChoice.data, title: "Carts hold up to 80 items" },
      }),
    ).toEqual([]);
  });

  test("kb_check judges only changed, current decisions that were firm at HEAD", () => {
    const committed =
      "---\nid: REQ-CART\ntype: req\ntitle: Carts hold at most 50 items\nstatus: open\n---\nCarts hold at most 50 items.\n";
    const current = {
      id: "REQ-CART",
      type: "req",
      path: ".kb/requirements/REQ-CART.md",
      data: { title: "Carts hold at most 80 items", status: "open" },
      body: "Carts hold at most 80 items.\n",
    };
    const read = (relative: string) =>
      relative === current.path ? committed : null;
    const findings = evaluateFirmDecisionEdits(
      [current],
      new Map(),
      new Set([current.path]),
      read,
    );
    expect(findings.map((finding) => finding.evidence)).toEqual([
      { type: "req", changed: ["title", "statement"] },
    ]);
    expect(
      evaluateFirmDecisionEdits([current], new Map(), new Set(), read),
    ).toEqual([]);
    expect(
      evaluateFirmDecisionEdits(
        [{ ...current, data: { ...current.data, status: "deprecated" } }],
        new Map(),
        new Set([current.path]),
        read,
      ),
    ).toEqual([]);
  });

  test("the guidance names the reference fields each decision type accepts", () => {
    expect(firmEditGuidance("req")).toBe(
      "Ask the person who stated it. If they agree, either write the change with origin.ref or approval_ref pointing at their words, or supersede it with a new firmness: firm decision that cites them; otherwise leave it and propose the change",
    );
    expect(firmEditGuidance("adr")).toBe(
      "Ask the person who stated it. If they agree, either write the change with origin.ref pointing at their words, or supersede it with a new firmness: firm decision that cites them; otherwise leave it and propose the change",
    );
  });
});

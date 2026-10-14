import { describe, expect, test } from "bun:test";

import {
  type DecisionDocument,
  decisionClaimChanges,
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

  test("an ADR's claim includes its whole body", () => {
    const adr: DecisionDocument = {
      type: "adr",
      data: { title: "Use Postgres", status: "accepted" },
      body: "We use Postgres.\n",
    };
    expect(
      decisionClaimChanges(adr, { ...adr, body: "We use SQLite.\n" }),
    ).toEqual(["body"]);
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
      unapprovedFirmEdit(agentChoice, {
        ...agentChoice,
        data: { ...agentChoice.data, title: "Carts hold up to 80 items" },
      }),
    ).toEqual([]);
  });

  test("kb_check judges only changed, current decisions that were firm at HEAD", () => {
    const committed = `---\nid: REQ-CART\ntype: req\ntitle: Carts hold at most 50 items\nstatus: open\n---\nCarts hold at most 50 items.\n`;
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
});

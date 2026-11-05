import { describe, expect, test } from "bun:test";
import { storedLedgerDriftWarning } from "../../../src/operations/semantic-advisor/stored-ledger-drift.js";
import type { SemanticAdvisorReceipt } from "../../../src/operations/semantic-advisor/types.js";

type Result = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

function fakeProlog(entityRows: string, grounding: Result) {
  const goals: string[] = [];
  return {
    goals,
    prolog: {
      query: async (goal: string): Promise<Result> => {
        goals.push(goal);
        return goal.startsWith("findall([Type,To,ClaimKey]")
          ? grounding
          : { success: true, bindings: { Results: entityRows } };
      },
    },
  };
}

function storedRow(properties: string): string {
  return `[['REQ-a',req,[${properties}]]]`;
}

const inventory = (entries: unknown[]) =>
  `semantic_inventory=${JSON.stringify(JSON.stringify(entries))}`;
const VERSION = 'semantic_inventory_version="kibi.semantic-inventory.v1"';

const receipt = (...propositions: [string, string][]) =>
  ({
    propositions: propositions.map(([claim_key, claim_text]) => ({
      claim_key,
      claim_text,
    })),
  }) as unknown as SemanticAdvisorReceipt;

const noGrounding: Result = { success: true, bindings: { Rows: "[]" } };

const TAIL =
  "A kb_upsert of REQ-a with this ledger fails the proposition-complete claim_key check unless each affected grounding fact is first re-written with the new claim_key and claim_text (same fact id). Keep the stored semantic_text wording to keep the keys, or supersede the requirement for a change of meaning.";

describe("storedLedgerDriftWarning", () => {
  test("is silent without a stored ledger", async () => {
    for (const row of [
      "[]",
      storedRow(inventory([{ claim_key: "CLAIM-A", status: "modeled" }])),
      storedRow(
        `semantic_inventory_version="v0",${inventory([{ claim_key: "CLAIM-A", status: "modeled" }])}`,
      ),
      storedRow(`${VERSION},semantic_inventory="not a list"`),
    ]) {
      const { prolog, goals } = fakeProlog(row, noGrounding);
      expect(
        await storedLedgerDriftWarning(prolog, "REQ-a", "t", receipt()),
      ).toBeNull();
      expect(goals).toHaveLength(1);
    }
  });

  test("is silent when every stored modeled clause is still analyzed", async () => {
    const { prolog, goals } = fakeProlog(
      storedRow(
        `${VERSION},${inventory([
          { claim_key: "CLAIM-A", status: "modeled" },
          { claim_key: "CLAIM-B", status: "ambiguous" },
          "junk",
        ])}`,
      ),
      noGrounding,
    );
    expect(
      await storedLedgerDriftWarning(
        prolog,
        "REQ-a",
        "t",
        receipt(["CLAIM-A", "A"]),
      ),
    ).toBeNull();
    expect(goals).toHaveLength(1);
  });

  test("names drifted clauses, their grounding facts and added clauses", async () => {
    const { prolog, goals } = fakeProlog(
      storedRow(
        `${VERSION},${inventory([
          null,
          {
            claim_key: "CLAIM-A",
            claim_text: "Old wording",
            status: "modeled",
          },
          { claim_key: "CLAIM-B", status: "modeled" },
          { claim_key: "CLAIM-C", claim_text: "Kept", status: "modeled" },
        ])},semantic_text="Stored prose"`,
      ),
      {
        success: true,
        bindings: {
          Rows: "[[requires_property,'FACT-1','CLAIM-A'],[requires_rule,'\"FACT-2\"','CLAIM-A'],[requires_predicate,'FACT-3',''],[requires_property,'FACT-O''x','CLAIM-B']]",
        },
      },
    );
    expect(
      await storedLedgerDriftWarning(
        prolog,
        "REQ-a",
        "New prose",
        receipt(
          ["CLAIM-C", "Kept"],
          ["CLAIM-N", "New wording"],
          ["CLAIM-M", ""],
        ),
      ),
    ).toBe(
      `Claim-key drift against the stored ledger of REQ-a: stored modeled clause(s) not stated by this analysis: 'CLAIM-A' ("Old wording"), grounded by FACT-1 via requires_property and FACT-2 via requires_rule; 'CLAIM-B', grounded by FACT-O'x via requires_property. Clause(s) this analysis adds without a stored grounding: 'CLAIM-N' ("New wording"); 'CLAIM-M'. The analyzed prose differs from the stored semantic_text of REQ-a. ${TAIL}`,
    );
    expect(goals[0]).toBe(
      "findall(['REQ-a','req',Props], kb_entity('REQ-a', 'req', Props), Results)",
    );
    expect(goals[1]).toBe(
      "findall([Type,To,ClaimKey], (member(Type, [requires_property,requires_predicate,requires_rule]), kb_relationship(Type, 'REQ-a', To), ((kb_entity(To, fact, _DriftProps), memberchk(claim_key=_DriftRaw, _DriftProps), normalize_term_atom(_DriftRaw, ClaimKey)) -> true ; ClaimKey = '')), Rows)",
    );
  });

  test("blames derivation when the prose matches or nothing is stored", async () => {
    for (const [extra, text] of [
      [',semantic_text="Same prose"', "Same prose"],
      ["", "Any prose"],
    ] as const) {
      const { prolog } = fakeProlog(
        storedRow(
          `${VERSION},${inventory([{ claim_key: "CLAIM-A", claim_text: "Old", status: "modeled" }])}${extra}`,
        ),
        { success: false, bindings: {} },
      );
      expect(
        await storedLedgerDriftWarning(
          prolog,
          "REQ-a",
          text,
          receipt(["CLAIM-A2", "Old"]),
        ),
      ).toBe(
        `Claim-key drift against the stored ledger of REQ-a: stored modeled clause(s) not stated by this analysis: 'CLAIM-A' ("Old"). Clause(s) this analysis adds without a stored grounding: 'CLAIM-A2' ("Old"). The stored clause keys were derived from different prose. ${TAIL}`,
      );
    }
  });

  test("omits the added clause sentence when the analysis adds nothing", async () => {
    const { prolog } = fakeProlog(
      storedRow(
        `${VERSION},${inventory([{ claim_key: "CLAIM-A", claim_text: "Old", status: "modeled" }])}`,
      ),
      noGrounding,
    );
    expect(
      await storedLedgerDriftWarning(prolog, "O'Brien", "x", receipt()),
    ).toBe(
      `Claim-key drift against the stored ledger of O'Brien: stored modeled clause(s) not stated by this analysis: 'CLAIM-A' ("Old"). The stored clause keys were derived from different prose. ${TAIL.replaceAll("REQ-a", "O'Brien")}`,
    );
  });
});

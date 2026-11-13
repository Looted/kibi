import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  checkViolations,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of positive scenarios: a must requirement written after the
 * schema 17 upgrade states the behaviour it promises as a success scenario
 * that assumes facts on its subjects. Once it does, scenario-feasibility can
 * refuse that behaviour when another current requirement forbids it, even
 * though nobody modeled the new requirement's prose.
 */

const RULE = "must-positive-scenario";
const FREE_TIER_PROSE =
  "A free-tier client must be able to make a call when it has no calls remaining.";

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

function writeFreeTierRequirement(
  ws: ConsumerWorkspace,
  scenarioLink: boolean,
): void {
  const { contract, propositions } = adviseProse(ws, FREE_TIER_PROSE);
  // Nobody modeled the clause; it names the subject it is about.
  const entries = propositions.map((proposition) => ({
    ...proposition,
    status: proposition.status === "modeled" ? "missing" : proposition.status,
    subjects: ["client.call_quota"],
  }));
  ws.write(
    ".kb/requirements/REQ-FREE-TIER-CALLS.md",
    doc(
      `
id: REQ-FREE-TIER-CALLS
title: Free-tier clients can call with no quota left
type: req
status: open
priority: must
${semanticFrontMatter(FREE_TIER_PROSE, contract, entries)}
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
${scenarioLink ? "  - type: specified_by\n    target: SCEN-FREE-TIER-CALL\n" : ""}`,
      [
        FREE_TIER_PROSE,
        "",
        "## Context",
        "",
        "Sales asked for this so free-tier trials never stop mid-demo; nobody checked it against the quota rule.",
      ].join("\n"),
    ),
  );
}

function writeFreeTierScenario(ws: ConsumerWorkspace, assumes: boolean): void {
  ws.write(
    ".kb/scenarios/SCEN-FREE-TIER-CALL.md",
    doc(
      `
id: SCEN-FREE-TIER-CALL
title: A free-tier client with no quota left makes a call
type: scenario
status: active
expects: success
${assumes ? "links:\n  - type: assumes\n    target: FACT-QUOTA-EXHAUSTED\n" : ""}`,
      "Given a free-tier client with no calls remaining, when it makes a call, then the gateway serves it.",
    ),
  );
}

describe("positive scenarios through the kibi CLI", () => {
  test("a new must requirement needs a success scenario on its subjects, which lets feasibility refuse it", () => {
    const ws = createConsumerWorkspace("kibi-positive-scenarios-");
    workspace = ws;

    ws.write(".kb/facts/FACT-QUOTA-SUBJECT.md", QUOTA_SUBJECT);
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-CALL",
      title: "Calls need remaining quota",
      prose: "The remaining call quota must be greater than 0.",
      factId: "FACT-QUOTA-POSITIVE",
      operator: "gt",
      value: 0,
    });

    // The upgrade records the must requirement that already exists.
    const manifest = JSON.parse(ws.read(".kb/manifest.json")) as Json;
    ws.write(
      ".kb/manifest.json",
      `${JSON.stringify({ ...manifest, schemaVersion: 16 }, null, 2)}\n`,
    );
    ws.stage();
    expect(ws.text(["migrate", "--yes"])).toContain(
      "Acknowledged 1 current must requirement(s) recorded before schema 17",
    );
    const upgraded = JSON.parse(ws.read(".kb/manifest.json")) as Json;
    expect(upgraded.schemaVersion).toBe(18);
    expect(upgraded.positiveScenarioAcknowledged).toEqual(["REQ-QUOTA-CALL"]);
    ws.sync();
    expect(checkViolations(ws, RULE)).toEqual([]);

    // A must requirement written after the upgrade owes one.
    writeFreeTierRequirement(ws, false);
    ws.sync();
    const [missing, ...extraMissing] = checkViolations(ws, RULE);
    expect(extraMissing).toEqual([]);
    expect(missing).toMatchObject({
      rule: RULE,
      entityId: "REQ-FREE-TIER-CALLS",
    });
    expect(missing?.description).toContain(
      "has no scenario that expects success",
    );

    // A success scenario that assumes nothing on the subject is not enough.
    writeFreeTierRequirement(ws, true);
    writeFreeTierScenario(ws, false);
    ws.sync();
    const [unassumed] = checkViolations(ws, RULE);
    expect(unassumed?.entityId).toBe("REQ-FREE-TIER-CALLS");
    expect(unassumed?.description).toContain(
      "none assumes a fact on its subjects (client.call_quota)",
    );

    // Once it assumes the quota is used up, the rule passes and the existing
    // quota rule refuses the scenario: the conflict nobody modeled surfaces.
    ws.write(
      ".kb/facts/FACT-QUOTA-EXHAUSTED.md",
      doc(`
id: FACT-QUOTA-EXHAUSTED
title: The client has no calls remaining
type: fact
status: active
fact_kind: property_value
subject_key: client.call_quota
property_key: remaining
operator: eq
value_type: int
value_int: 0
`),
    );
    writeFreeTierScenario(ws, true);
    ws.sync();
    expect(checkViolations(ws, RULE)).toEqual([]);
    const refused = checkViolations(ws, "scenario-feasibility");
    expect(refused.map((violation) => violation.entityId)).toEqual([
      "SCEN-FREE-TIER-CALL",
    ]);
    expect(refused[0]?.description).toContain("REQ-QUOTA-CALL");
  }, 240_000);
});

// implements REQ-kibi-search-answer-layer-v2
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  adviseProse,
  authorQuotaRequirement,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the search answer layer: a small traceability chain with a
 * superseded predecessor, asked about through `kibi search` on the built CLI.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

type Brief = {
  id: string;
  title?: string;
  status?: string;
  supersededBy?: string;
};

describe("search answer layer through the kibi CLI", () => {
  test("answers with the governing requirement, its facts, scenario and test, and lists the superseded one separately", () => {
    const ws = createConsumerWorkspace("kibi-search-answer-");
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
      ".kb/requirements/REQ-QUOTA-CALL-LEGACY.md",
      doc(
        `
id: REQ-QUOTA-CALL-LEGACY
title: Client calls were unlimited
type: req
status: superseded
priority: should
`,
        "Client calls were unlimited.",
      ),
    );
    ws.write(
      ".kb/requirements/REQ-QUOTA-CALL.md",
      doc(
        `
id: REQ-QUOTA-CALL
title: A client call needs remaining call quota
type: req
status: open
priority: must
links:
  - type: constrains
    target: FACT-QUOTA-SUBJECT
  - type: requires_property
    target: FACT-QUOTA-POSITIVE
  - type: supersedes
    target: REQ-QUOTA-CALL-LEGACY
  - type: specified_by
    target: SCEN-QUOTA-CALL
  - type: verified_by
    target: TEST-QUOTA-CALL
`,
        "A client may call only with remaining call quota.",
      ),
    );
    ws.write(
      ".kb/scenarios/SCEN-QUOTA-CALL.md",
      doc(
        `
id: SCEN-QUOTA-CALL
title: A client with remaining call quota can call
type: scenario
status: active
`,
        "Given remaining quota, when the client calls, the call succeeds.",
      ),
    );
    ws.write(
      ".kb/tests/TEST-QUOTA-CALL.md",
      doc(
        `
id: TEST-QUOTA-CALL
title: Client call quota test
type: test
status: passing
`,
        "Checks the client call quota.",
      ),
    );
    ws.write(
      ".kb/facts/FACT-OBS-BILLING-EXPORT.md",
      doc(
        `
id: FACT-OBS-BILLING-EXPORT
title: Billing export runs nightly
type: fact
status: active
fact_kind: observation
`,
        "The billing export runs nightly.",
      ),
    );
    ws.sync();

    // No ranking mode or answer flag: the defaults apply.
    const result = ws.json(["search"], { query: "client call quota" });
    const data = result.data as Json;
    expect((data.queryAnalysis as Json).rankingMode).toBe("intent-v1");

    // The superseded requirement ranks below the current one it was
    // replaced by.
    const ranked = data.results as Array<{ entity: Brief; reasons: string[] }>;
    const ids = ranked.map((row) => row.entity.id);
    expect(ids).toContain("REQ-QUOTA-CALL");
    expect(ids).toContain("REQ-QUOTA-CALL-LEGACY");
    expect(ids.indexOf("REQ-QUOTA-CALL")).toBeLessThan(
      ids.indexOf("REQ-QUOTA-CALL-LEGACY"),
    );
    const legacy = ranked.find(
      (row) => row.entity.id === "REQ-QUOTA-CALL-LEGACY",
    );
    expect(legacy?.reasons.some((reason) => reason.startsWith("demoted"))).toBe(
      true,
    );

    const answer = data.answer as Json;
    expect(answer.version).toBe("kibi.search-answer.v1");
    const governing = answer.governing as Array<
      Brief & { facts: Brief[]; scenarios: Brief[]; tests: Brief[] }
    >;
    expect(governing.map((req) => req.id)).toEqual(["REQ-QUOTA-CALL"]);
    const [current] = governing;
    expect(current?.facts.map((fact) => fact.id).sort()).toEqual([
      "FACT-QUOTA-POSITIVE",
      "FACT-QUOTA-SUBJECT",
    ]);
    expect(current?.scenarios.map((s) => s.id)).toEqual(["SCEN-QUOTA-CALL"]);
    expect(current?.tests.map((t) => t.id)).toEqual(["TEST-QUOTA-CALL"]);
    expect(answer.notGoverning).toEqual([
      {
        id: "REQ-QUOTA-CALL-LEGACY",
        title: "Client calls were unlimited",
        status: "superseded",
        supersededBy: "REQ-QUOTA-CALL",
      },
    ]);
    expect(answer.truncated).toBe(false);
    expect(String(answer.note)).toContain("Links are discovery, not proof");

    // A question that matches only an unowned note says absence of a
    // governing requirement is not evidence.
    const unowned = ws.json(["search"], { query: "billing export" });
    const unownedAnswer = (unowned.data as Json).answer as Json;
    expect(unownedAnswer.governing).toEqual([]);
    expect(String(unownedAnswer.note)).toContain(
      "Absence here is not evidence",
    );
  }, 300_000);

  test("reports the checks' verdict, approved exceptions and the snapshot the answer came from", () => {
    const ws = createConsumerWorkspace("kibi-search-answer-verdict-");
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
      doc(
        `
id: SCEN-ZERO-QUOTA-CALL
title: A zero-quota promo call is answered
type: scenario
status: active
expects: success
links:
  - type: assumes
    target: FACT-QUOTA-ZERO
`,
        "Given a client with zero remaining quota, when it makes a promo call, the call is answered.",
      ),
    );
    ws.sync();

    type Verdict = {
      status: string;
      witnesses: Array<{ check: string; status: string; scenario?: string }>;
    };
    type Answered = Brief & {
      verdict: Verdict;
      exceptions: Array<Brief & { approvedBy?: string }>;
    };
    const ask = () => {
      const result = ws.json(["search"], {
        query: "client call remaining quota",
      });
      const answer = (result.data as Json).answer as Json;
      const governing = answer.governing as Answered[];
      return {
        answer,
        call: governing.find((req) => req.id === "REQ-QUOTA-CALL"),
      };
    };

    // The success scenario assumes a value the requirement forbids: the
    // answer carries the scenario-feasibility witness.
    const blocked = ask();
    expect(blocked.call?.verdict.status).toBe("infeasible");
    expect(blocked.call?.verdict.witnesses).toEqual([
      expect.objectContaining({
        check: "scenario-feasibility",
        status: "infeasible",
        scenario: "SCEN-ZERO-QUOTA-CALL",
      }),
    ]);
    expect(blocked.call?.exceptions).toEqual([]);
    const scope = blocked.answer.scope as Json;
    expect(scope.branch).toBe("main");
    expect(String(scope.snapshotId)).not.toBe("unknown");
    expect(typeof scope.syncedAt).toBe("string");

    // An approved exception that exempts it is listed with its approver, and
    // the scenario is no longer a witness against the requirement.
    const prose = "Promo calls may skip the call quota.";
    const { contract, propositions } = adviseProse(ws, prose);
    ws.write(
      ".kb/requirements/REQ-QUOTA-PROMO-EXCEPTION.md",
      doc(
        `
id: REQ-QUOTA-PROMO-EXCEPTION
title: Promo calls are exempt from the quota
type: req
status: open
priority: must
approved_by: Product owner
approval_ref: DEC-42
${semanticFrontMatter(prose, contract, propositions)}
links:
  - type: exempts
    target: REQ-QUOTA-CALL
  - type: specified_by
    target: SCEN-ZERO-QUOTA-CALL
`,
        prose,
      ),
    );
    ws.sync();

    const exempted = ask();
    expect(exempted.call?.exceptions).toEqual([
      {
        id: "REQ-QUOTA-PROMO-EXCEPTION",
        title: "Promo calls are exempt from the quota",
        status: "open",
        approvedBy: "Product owner",
      },
    ]);
    expect(
      exempted.call?.verdict.witnesses.some(
        (witness) => witness.status === "infeasible",
      ),
    ).toBe(false);
  }, 300_000);

  test("names the conflicting requirement and the clauses the checks could not ground", () => {
    const ws = createConsumerWorkspace("kibi-search-answer-conflict-");
    workspace = ws;

    const prose =
      "The remaining call quota must be greater than 0. Every quota reset must be reviewed by an operator.";
    const { contract, propositions } = adviseProse(ws, prose);
    const [numeric, review] = propositions as [
      (typeof propositions)[number],
      (typeof propositions)[number],
    ];
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
    authorQuotaRequirement(ws, {
      id: "REQ-QUOTA-FREE-TIER",
      title: "Free-tier remaining quota is zero",
      prose: "The free-tier remaining call quota must equal 0.",
      factId: "FACT-QUOTA-ZERO",
      operator: "eq",
      value: 0,
    });
    ws.sync();

    type Answered = Brief & {
      verdict: {
        status: string;
        witnesses: Array<{ check: string; status: string; with?: string }>;
      };
      unknowns: Array<{ kind: string; detail: string }>;
    };
    const result = ws.json(["search"], { query: "remaining call quota" });
    const governing = ((result.data as Json).answer as Json)
      .governing as Answered[];
    const call = governing.find((req) => req.id === "REQ-QUOTA-CALL");
    expect(call?.verdict.status).toBe("contradiction");
    expect(call?.verdict.witnesses).toContainEqual(
      expect.objectContaining({
        check: "domain-contradictions",
        status: "contradiction",
        with: "REQ-QUOTA-FREE-TIER",
      }),
    );
    // The review clause is an ontology gap: the answer says so rather than
    // implying the requirement is fully analysed.
    expect(call?.unknowns).toContainEqual(
      expect.objectContaining({
        kind: "unresolved_proposition",
        detail: `ontology_gap: ${review.claim_text}`,
      }),
    );
  }, 300_000);
});

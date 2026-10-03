// implements REQ-kibi-search-answer-layer
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  QUOTA_SUBJECT,
  createConsumerWorkspace,
  doc,
  quotaValueFact,
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

type Brief = { id: string; status?: string; supersededBy?: string };

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
});

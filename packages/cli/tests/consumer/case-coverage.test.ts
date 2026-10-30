// implements REQ-kibi-case-coverage
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  coverageRows,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the edge-case proof stage: a bound on a count yields the
 * bound, the value past it, zero and one. The value past the bound is
 * predicted refused, so the requirement is not tested until a scenario
 * assumes a value there and expects rejection, or a person approves a case
 * waiver. A draft scenario never covers a case.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const PROSE = "An upload batch must hold at most 5 files.";

const SUBJECT = doc(`
id: FACT-BATCH-SUBJECT
title: Upload batch
type: fact
status: active
fact_kind: subject
subject_key: upload.batch
`);

type CaseRow = {
  caseId: string;
  constraint: string;
  predicted: string;
  coverage: string;
  scenarios: string[];
  assumption: Json;
};

type CasesStage = {
  status: string;
  cases: CaseRow[];
  summary: Record<string, number>;
  waivedCases: Json[];
};

function author(ws: ConsumerWorkspace, extraFact = "", links = ""): void {
  const { contract, propositions } = adviseProse(ws, PROSE);
  const [claim] = propositions;
  if (claim === undefined || propositions.length !== 1) {
    throw new Error(`expected one proposition, got ${propositions.length}`);
  }
  ws.write(".kb/facts/FACT-BATCH-SUBJECT.md", SUBJECT);
  ws.write(
    ".kb/facts/FACT-BATCH-LIMIT.md",
    doc(`
id: FACT-BATCH-LIMIT
title: An upload batch holds at most 5 files
type: fact
status: active
fact_kind: property_value
subject_key: upload.batch
property_key: files_per_batch
operator: lte
value_type: int
value_int: 5
claim_key: ${claim.claim_key}
claim_text: ${claim.claim_text}
${extraFact}`),
  );
  ws.write(
    ".kb/requirements/REQ-BATCH.md",
    doc(
      `
id: REQ-BATCH
title: An upload batch holds at most 5 files
type: req
status: open
priority: must
${semanticFrontMatter(PROSE, contract, [{ ...claim, status: "modeled" }])}
links:
  - type: constrains
    target: FACT-BATCH-SUBJECT
  - type: requires_property
    target: FACT-BATCH-LIMIT
${links}`,
      PROSE,
    ),
  );
  ws.sync();
}

function overLimitScenario(ws: ConsumerWorkspace, status: string): string {
  ws.write(
    ".kb/facts/FACT-BATCH-SIX.md",
    doc(`
id: FACT-BATCH-SIX
title: A batch of six files
type: fact
status: active
fact_kind: property_value
subject_key: upload.batch
property_key: files_per_batch
operator: eq
value_type: int
value_int: 6
`),
  );
  ws.write(
    ".kb/scenarios/SCEN-BATCH-SIX.md",
    doc(`
id: SCEN-BATCH-SIX
title: A batch of six files is refused
type: scenario
status: ${status}
expects: rejection
links:
  - type: assumes
    target: FACT-BATCH-SIX
`),
  );
  return "  - type: specified_by\n    target: SCEN-BATCH-SIX\n";
}

function cases(ws: ConsumerWorkspace) {
  const row = coverageRows(ws).get("REQ-BATCH");
  return {
    gaps: row?.proofGaps ?? [],
    stage: row?.proofStages.cases as CasesStage,
  };
}

function rows(stage: CasesStage): string[] {
  return stage.cases.map(
    (item) => `${item.constraint}:${item.predicted}:${item.coverage}`,
  );
}

describe("edge-case proof stage through the kibi CLI", () => {
  test("the value past a bound needs a rejection scenario that assumes it", () => {
    const ws = createConsumerWorkspace("kibi-case-coverage-");
    workspace = ws;

    // The advisor previews the cases before any fact is written.
    const receipt = (
      ws.json(["semantic-advisor"], { text: PROSE }).data as Json
    ).receipt as { suggestions: Array<Json & { casesPreview?: Json }> };
    const preview = receipt.suggestions.find((item) => item.casesPreview)
      ?.casesPreview as { cases: Array<{ constraint: string; predicted: string }> };
    expect(
      preview.cases.map((item) => `${item.constraint}:${item.predicted}`),
    ).toEqual(["eq 5:success", "gt 5:rejection", "eq 0:success", "eq 1:success"]);

    author(ws);
    const open = cases(ws);
    expect(open.gaps).toContain("uncovered_case");
    expect(open.stage.status).toBe("missing");
    expect(rows(open.stage)).toEqual([
      "eq 5:success:uncovered",
      "gt 5:rejection:uncovered",
      "eq 0:success:uncovered",
      "eq 1:success:uncovered",
    ]);
    const past = open.stage.cases[1];
    expect(past?.caseId).toMatch(/^CASE-[0-9A-F]{12}$/);

    // kibi coverage --cases lists them; proof explain says what to add.
    const listed = ws.text(["coverage", "--cases"]);
    expect(listed).toContain("REQ-BATCH");
    expect(listed).toContain("gt 5");
    const explain = ws.text(["proof", "explain", "REQ-BATCH"]);
    expect(explain).toContain("Edge cases: missing");
    expect(explain).toContain("expects rejection");

    // The repair plan carries an upsert-ready draft scenario for the case.
    const coverage = ws.json(["coverage", "--format", "json"]);
    const plan = JSON.stringify(coverage);
    expect(plan).toContain(`SCEN-CASE-${past?.caseId.replace("CASE-", "")}`);
    expect(plan).toContain('"status":"draft"');

    // A draft scenario at the value past the bound does not cover it.
    author(ws, "", overLimitScenario(ws, "draft"));
    expect(cases(ws).gaps).toContain("uncovered_case");

    // An active one does, and the gap closes.
    author(ws, "", overLimitScenario(ws, "active"));
    const covered = cases(ws);
    expect(covered.gaps).not.toContain("uncovered_case");
    expect(covered.stage.status).toBe("passed");
    expect(covered.stage.cases[1]).toMatchObject({
      constraint: "gt 5",
      coverage: "covered",
      scenarios: ["SCEN-BATCH-SIX"],
    });
  });

  test("a case waiver counts only once a person approved it", () => {
    const ws = createConsumerWorkspace("kibi-case-waiver-");
    workspace = ws;
    const reason =
      "case_waiver: The upload form cannot submit more than 5 files.\n";

    author(ws, reason);
    const pending = cases(ws);
    expect(pending.gaps).toContain("uncovered_case");

    author(ws, `${reason}case_waiver_approved_by: Upload owner\n`);
    const waived = cases(ws);
    expect(waived.gaps).not.toContain("uncovered_case");
    expect(waived.stage.status).toBe("waived");
    // The waiver covers the fact's cases; the one that blocked is listed.
    expect(waived.stage.waivedCases).toMatchObject([
      { constraint: "gt 5", waiver: { approvedBy: "Upload owner" } },
    ]);
  });
});

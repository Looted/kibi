// implements REQ-kibi-dimension-gap
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  adviseProse,
  coverageRows,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * Consumer view of the quantified-claim proof stage: a claim that ranges
 * over every loaded file is not tested while a boolean states only its
 * verdict. Grounding it on a count of what varies closes the gap, and a
 * waiver counts only once a person approved it.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const PROSE = "The loader must instrument every file loaded into a module.";

const SUBJECT = doc(`
id: FACT-LOADER-SUBJECT
title: Module loader
type: fact
status: active
fact_kind: subject
subject_key: module.loader
`);

type Grounding = "boolean" | "count";

function grounding(
  kind: Grounding,
  claim: { claim_key: string; claim_text: string },
  extra = "",
): string {
  const value =
    kind === "boolean"
      ? "property_key: instruments_all_loaded_files\noperator: eq\nvalue_type: bool\nvalue_bool: true"
      : "property_key: uninstrumented_loaded_files\noperator: eq\nvalue_type: int\nvalue_int: 0";
  return doc(`
id: FACT-LOADER-INSTRUMENTS
title: Loaded files are instrumented
type: fact
status: active
fact_kind: property_value
subject_key: module.loader
${value}
claim_key: ${claim.claim_key}
claim_text: ${claim.claim_text}
${extra}`);
}

function author(ws: ConsumerWorkspace, kind: Grounding, extra = ""): void {
  const { contract, propositions } = adviseProse(ws, PROSE);
  const [claim] = propositions;
  if (claim === undefined || propositions.length !== 1) {
    throw new Error(`expected one proposition, got ${propositions.length}`);
  }
  ws.write(".kb/facts/FACT-LOADER-SUBJECT.md", SUBJECT);
  ws.write(
    ".kb/facts/FACT-LOADER-INSTRUMENTS.md",
    grounding(kind, claim, extra),
  );
  ws.write(
    ".kb/requirements/REQ-LOADER.md",
    doc(
      `
id: REQ-LOADER
title: The loader instruments every loaded file
type: req
status: open
priority: must
${semanticFrontMatter(PROSE, contract, [{ ...claim, status: "modeled" }])}
links:
  - type: constrains
    target: FACT-LOADER-SUBJECT
  - type: requires_property
    target: FACT-LOADER-INSTRUMENTS
`,
      PROSE,
    ),
  );
  ws.sync();
}

type DimensionStage = {
  status: string;
  claims: Array<{
    quantifier: string;
    factIds: string[];
    rewrites: string[];
    waiver?: { reason: string; approvedBy?: string };
  }>;
  waivedClaims: Array<{ waiver?: { approvedBy?: string } }>;
};

function dimension(ws: ConsumerWorkspace) {
  const row = coverageRows(ws).get("REQ-LOADER");
  return {
    gaps: row?.proofGaps ?? [],
    stage: row?.proofStages.dimension as DimensionStage,
  };
}

describe("quantified-claim proof stage through the kibi CLI", () => {
  test("a boolean behind an every-claim leaves the gap until a count grounds it", () => {
    const ws = createConsumerWorkspace("kibi-dimension-gap-");
    workspace = ws;

    // The advisor marks the clause before any fact is written.
    const [proposition] = adviseProse(ws, PROSE).propositions as Array<{
      dimension?: unknown;
    }>;
    expect(proposition?.dimension).toEqual({
      quantifier: "every",
      rewrites: ["rule", "count", "set"],
    });

    author(ws, "boolean");
    const verdict = dimension(ws);
    expect(verdict.gaps).toContain("dimension_unrepresented");
    expect(verdict.stage.status).toBe("missing");
    expect(verdict.stage.claims).toMatchObject([
      {
        quantifier: "every",
        factIds: ["FACT-LOADER-INSTRUMENTS"],
        rewrites: ["rule", "count", "set"],
      },
    ]);
    const explain = ws.text(["proof", "explain", "REQ-LOADER"]);
    expect(explain).toContain("Quantified claims: missing");
    expect(explain).toContain("ground it on a rule over a variable");

    author(ws, "count");
    const counted = dimension(ws);
    expect(counted.gaps).not.toContain("dimension_unrepresented");
    expect(counted.stage.status).toBe("not_required");
  });

  test("a dimension waiver counts only once a person approved it", () => {
    const ws = createConsumerWorkspace("kibi-dimension-waiver-");
    workspace = ws;
    const reason =
      "dimension_waiver: Every file here is the single generated entry module.\n";

    author(ws, "boolean", reason);
    const pending = dimension(ws);
    expect(pending.gaps).toContain("dimension_unrepresented");
    expect(pending.stage.claims[0]?.waiver).toEqual({
      reason: "Every file here is the single generated entry module.",
    });
    expect(ws.text(["proof", "explain", "REQ-LOADER"])).toContain(
      "waiver awaiting approval",
    );

    author(
      ws,
      "boolean",
      `${reason}dimension_waiver_approved_by: Loader owner\n`,
    );
    const waived = dimension(ws);
    expect(waived.gaps).not.toContain("dimension_unrepresented");
    expect(waived.stage.status).toBe("waived");
    expect(waived.stage.waivedClaims).toMatchObject([
      { waiver: { approvedBy: "Loader owner" } },
    ]);
  });
});

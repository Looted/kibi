// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * A repository that already has a seeded knowledge base still gets a plan for
 * the intent claims the agent declares: discovered candidates stay off, claims
 * already in the KB are not planned again, and the rest apply through
 * kb_apply_plan instead of one compile and one write per claim.
 */

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});
function workspace(): ConsumerWorkspace {
  if (!ws) throw new Error("Consumer workspace has not been initialized");
  return ws;
}

const handover = {
  id: "handover",
  title: "Product handover",
  kind: "specification",
  locator: "https://example.com/handover",
  authority: "authoritative",
  component: "reports",
};
const tracker = {
  id: "tracker",
  title: "Issue tracker",
  kind: "issue_tracker",
  locator: "https://example.com/tracker",
  authority: "authoritative",
  component: "billing",
};
const claim = (sourceId: string, reference: string, statement: string) => ({
  statement,
  sourceId,
  reference,
  excerpt: `The source says: ${statement}`,
});
const existingClaim = claim(
  "handover",
  "H-1",
  "Users must be able to export reports as CSV.",
);

function plan(bootstrapContext?: Json): Json {
  const result = workspace().json(
    ["plan-bootstrap"],
    bootstrapContext ? { bootstrapContext } : {},
  );
  expect(result.status).toBe("success");
  return result.data as Json;
}

function apply(planned: Json): Json {
  const applied = workspace().json(["apply-plan"], {
    plan: planned,
    approvedPlanHash: planned.planHash,
  });
  expect(applied.status).toBe("success");
  expect((applied.data as Json).outcome).toBe("applied");
  return applied.data as Json;
}

/** One applied claim plus observation facts: a seeded KB, not a thin one. */
function seedKnowledgeBase(): void {
  ws = createConsumerWorkspace("kibi-bootstrap-seeded-");
  ws.write("src/reports.ts", "export const reportFormat = 'csv';\n");
  ws.git("add", ".");
  ws.git("commit", "-m", "Initialize consumer source snapshot");
  ws.sync();
  const thin = plan({
    knowledgeSources: [handover],
    intentClaims: [existingClaim],
  });
  expect((thin.plan as Json).status).toBe("ready");
  apply(thin.plan as Json);
  for (const id of ["exports", "billing"])
    workspace().json(["upsert"], {
      type: "fact",
      id: `FACT-legacy-${id}-observation`,
      properties: {
        title: `Legacy ${id} observation`,
        status: "active",
        fact_kind: "observation",
      },
    });
}

describe("bootstrap on a seeded knowledge base", () => {
  test("declared claims are planned against the existing KB and apply", () => {
    seedKnowledgeBase();
    const before = (workspace().json(["query"], { type: "req" }).data as Json)
      .entities as Json[];
    expect(before).toHaveLength(1);

    // Without declared claims a seeded KB stays a pure handoff that names
    // the path for claims.
    const handoff = plan();
    expect(handoff.status).toBe("handoff");
    expect(handoff.activationMode).toBe("attached_seeded_handoff");
    expect(handoff.applyBlocked).toBe(true);
    expect(handoff.candidates).toEqual([]);
    expect(String(handoff.handoffMessage)).toContain("kb_compile_intent");

    const result = plan({
      projectSummary: "Report exports and billing for a test project.",
      verificationAnchors: ["bun test"],
      knowledgeSources: [handover, tracker],
      intentClaims: [
        existingClaim,
        claim("handover", "H-2", "Logs must be retained for 7 days."),
        claim("tracker", "T-1", "Refunds must not exceed the original charge."),
        claim("tracker", "T-2", "Telemetry must be disabled."),
      ],
    });
    const planned = result.plan as Json;
    expect(result.activationMode).toBe("attached_seeded_handoff");
    expect(planned.status).toBe("ready");
    expect((planned.activation as Json).applyBlocked).toBe(false);
    expect(result.applyBlocked).toBe(false);

    // Only claim-derived candidates: discovered candidates stay off.
    const candidates = planned.candidates as Json[];
    expect(candidates.map((row) => row.sourceKind)).toEqual([
      "intent_claim",
      "intent_claim",
      "intent_claim",
    ]);
    expect(candidates.map((row) => row.sourcePath).sort()).toEqual([
      "H-2",
      "T-1",
      "T-2",
    ]);
    // The claim already in the KB is counted, not planned again.
    expect(planned.suppressedCandidates).toContainEqual(
      expect.objectContaining({ reason: "entity_exists", sourcePath: "H-1" }),
    );
    const diagnostics = planned.diagnostics as string[];
    expect(diagnostics).toContain(
      "Knowledge source handover (authoritative): 2 declared claim(s), 1 planned, 1 already in the KB, 0 filtered out, 0 not planned.",
    );
    expect(diagnostics).toContain(
      "Knowledge source tracker (authoritative): 2 declared claim(s), 2 planned, 0 already in the KB, 0 filtered out, 0 not planned.",
    );
    const actions = result.recommendedActions as Json[];
    expect(
      actions.some(
        (action) =>
          action.kind === "plan" &&
          String(action.description).includes("declared intent claims"),
      ),
    ).toBe(true);

    apply(planned);
    const after = (workspace().json(["query"], { type: "req" }).data as Json)
      .entities as Json[];
    expect(after.map((row) => row.text_ref).sort()).toEqual([
      "handover:H-1",
      "handover:H-2",
      "tracker:T-1",
      "tracker:T-2",
    ]);
    workspace().sync();
    const check = workspace().json(["check"], {
      rules: ["strict-fact-shape", "domain-contradictions", "no-dangling-refs"],
    });
    expect((check.data as Json).violations).toEqual([]);
  }, 240_000);

  test("a claim that restates a human-written requirement is counted as that requirement, not planned again", () => {
    seedKnowledgeBase();
    // A requirement a person wrote by hand, compiled by sync like any other.
    const prose =
      "The report list must keep the selected filter when the user navigates back. Reports must open in the same tab.";
    const { contract, propositions } = adviseProse(workspace(), prose);
    workspace().write(
      ".kb/requirements/REQ-reports-navigation.md",
      doc(
        `
id: REQ-reports-navigation
type: req
title: Report list navigation
status: open
origin:
  kind: human
  ref: docs/reports.md
${semanticFrontMatter(prose, contract, propositions)}
`,
        `${prose}\n\n## Context\n\nSupport tickets showed users losing their report filter after opening a report and returning to the list, so the product owner asked for the filter to survive navigation.`,
      ),
    );
    workspace().sync();
    const human = (
      workspace().json(["query"], { id: "REQ-reports-navigation" }).data as Json
    ).entities as Json[];
    expect(human).toHaveLength(1);

    const exact = claim(
      "tracker",
      "T-1",
      "The report list must keep the selected filter when the user navigates back",
    );
    const fresh = claim(
      "tracker",
      "T-2",
      "Refunds must not exceed the original charge.",
    );
    const near = claim(
      "tracker",
      "T-3",
      "Reports must open in the same browser tab.",
    );
    const bootstrapContext = {
      projectSummary: "Report exports and billing for a test project.",
      verificationAnchors: ["bun test"],
      knowledgeSources: [tracker],
      intentClaims: [exact, fresh, near],
    };
    const result = plan(bootstrapContext);
    const planned = result.plan as Json;
    const candidates = planned.candidates as Json[];

    // The exact restatement is already in the KB, under the human's id.
    expect(candidates.map((row) => row.sourcePath)).not.toContain("T-1");
    expect(planned.suppressedCandidates).toContainEqual(
      expect.objectContaining({
        reason: "entity_exists",
        sourcePath: "T-1",
        matchedId: "REQ-reports-navigation",
        matchedBy: "restatement",
      }),
    );
    // The new claim is planned as before.
    expect(candidates.map((row) => row.sourcePath)).toContain("T-2");
    // The near restatement is kept, with a signal naming the requirement.
    const diagnostics = planned.diagnostics as string[];
    expect(
      diagnostics.some(
        (line) =>
          line.startsWith(
            "Intent claim at tracker:T-3 closely restates current requirement REQ-reports-navigation",
          ) && line.includes("it is still planned"),
      ),
    ).toBe(true);
    expect(
      diagnostics.some((line) =>
        line.startsWith(
          "Knowledge source tracker (authoritative): 3 declared claim(s), 2 planned, 1 already in the KB,",
        ),
      ),
    ).toBe(true);

    // Same KB, same context: same plan.
    expect(plan(bootstrapContext).planHash).toBe(result.planHash);
  }, 240_000);
});

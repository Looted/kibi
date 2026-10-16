// implements REQ-kibi-contradiction-review-candidates
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
 * The contradiction check compares only what has a logical model. An intent
 * the advisor cannot model, or one next to a current requirement that is
 * prose only, must not come back as "no conflict": the outcome stays
 * unresolved with the reason, and the related requirements are named for the
 * agent to compare and judge. The fixture is a drawing editor whose current
 * requirement says Escape cancels an edit without saving.
 */

const ESCAPE = "REQ-editor-escape-cancels";
const LABEL = "REQ-editor-label-length";
const ESCAPE_PROSE =
  "Pressing Escape while editing a shape label cancels the edit. No save operation occurs and the label keeps its previous text.";
const LABEL_PROSE =
  "Shape label length is limited so labels stay readable on the canvas.";
const SAVES_INTENT =
  "Pressing Escape while editing a shape label saves the label text and deselects the shape.";
const LABEL_INTENT = "Shape label length must be at most 200.";
const UNRELATED_INTENT =
  "Exported drawings keep the color profile chosen in the print dialog.";

let ws: ConsumerWorkspace | undefined;
afterEach(() => {
  ws?.cleanup();
  ws = undefined;
});

/**
 * A prose-only current requirement, as a legacy or migrated KB holds it: its
 * clause ledger is complete, but nothing links it to facts.
 */
function writeProseRequirement(
  workspace: ConsumerWorkspace,
  id: string,
  title: string,
  status: string,
  prose: string,
): void {
  const { contract, propositions } = adviseProse(workspace, prose);
  workspace.write(
    `.kb/requirements/${id}.md`,
    doc(
      `
id: ${id}
type: req
title: ${title}
status: ${status}
${semanticFrontMatter(
  prose,
  contract,
  propositions.map((proposition) => ({
    ...proposition,
    status: "ontology_gap",
  })),
)}
`,
      `${prose}\n\n## Context\n\nReason not stated.`,
    ),
  );
}

function editorWorkspace(): ConsumerWorkspace {
  const workspace = createConsumerWorkspace("kibi-contradiction-review-");
  ws = workspace;
  workspace.write("src/editor.ts", "export const editor = true;\n");
  workspace.git("add", ".");
  workspace.git("commit", "-m", "Initialize consumer source snapshot");
  // A closed requirement is delivered, not withdrawn: it is still current.
  writeProseRequirement(
    workspace,
    ESCAPE,
    "Escape cancels a label edit without saving",
    "closed",
    ESCAPE_PROSE,
  );
  writeProseRequirement(
    workspace,
    LABEL,
    "Shape labels stay short",
    "open",
    LABEL_PROSE,
  );
  workspace.stage();
  workspace.sync();
  return workspace;
}

function compile(workspace: ConsumerWorkspace, input: Json): Json {
  const result = workspace.json(["compile-intent"], {
    mode: "create",
    context: "Reason not stated",
    ...input,
  });
  return result.data as Json;
}

function analysis(plan: Json): Json {
  return plan.contradictionAnalysis as Json;
}

function candidateIds(plan: Json): string[] {
  return ((analysis(plan).reviewCandidates as Json[]) ?? []).map((row) =>
    String(row.requirementId),
  );
}

describe("contradiction analysis reports what it could not check", () => {
  test("an unmodeled claim next to a prose-only requirement is unresolved with that requirement to review", () => {
    const workspace = editorWorkspace();

    const plan = compile(workspace, { intent: SAVES_INTENT });
    expect(
      (plan.propositions as Json[]).map((proposition) => proposition.status),
    ).toEqual(["ontology_gap"]);
    expect(analysis(plan)).toMatchObject({
      outcome: "unresolved",
      witnesses: [],
      reasons: [{ reason: "unmodeled_target" }],
    });
    expect(candidateIds(plan)).toContain(ESCAPE);
    const cancelRequirement = (analysis(plan).reviewCandidates as Json[]).find(
      (row) => row.requirementId === ESCAPE,
    ) as Json;
    expect(cancelRequirement).toMatchObject({
      title: "Escape cancels a label edit without saving",
      statement: ESCAPE_PROSE,
      modeled: false,
      review: "pending",
    });
    expect(ESCAPE_PROSE).toContain(String(cancelRequirement.sentence));
    expect(String(analysis(plan).nextAction)).toContain("conflictReviews");

    // The agent judges the pair a conflict: the plan is blocked.
    const conflict = compile(workspace, {
      intent: SAVES_INTENT,
      conflictReviews: [
        {
          requirementId: ESCAPE,
          verdict: "conflict",
          note: "Saving contradicts cancelling without saving.",
        },
      ],
    });
    expect(conflict.status).toBe("blocked");
    expect(analysis(conflict).outcome).toBe("conflict");
    expect(
      (analysis(conflict).reviewCandidates as Json[]).find(
        (row) => row.requirementId === ESCAPE,
      ),
    ).toMatchObject({ review: "conflict" });
    expect(String(analysis(conflict).nextAction)).toContain(
      "Ask the human which rule holds",
    );

    // A review is not a logical check: with the claim still unmodeled the
    // outcome stays unresolved, and only modeling is left to do.
    const reviewed = compile(workspace, {
      intent: SAVES_INTENT,
      conflictReviews: candidateIds(plan).map((requirementId) => ({
        requirementId,
        verdict: "no_conflict",
      })),
    });
    expect(analysis(reviewed)).toMatchObject({
      outcome: "unresolved",
      reasons: [{ reason: "unmodeled_target" }],
    });
    expect(
      (analysis(reviewed).reviewCandidates as Json[]).every(
        (row) => row.review === "no_conflict",
      ),
    ).toBe(true);
    expect(String(analysis(reviewed).nextAction)).toContain("kb_model");
    expect(
      (reviewed.diagnostics as string[]).some((entry) =>
        entry.startsWith("Contradiction check incomplete"),
      ),
    ).toBe(false);
  }, 240_000);

  test("a modeled claim next to a prose-only requirement stays ready but unresolved until reviewed", () => {
    const workspace = editorWorkspace();

    const plan = compile(workspace, { intent: LABEL_INTENT });
    expect(
      (plan.propositions as Json[]).map((proposition) => proposition.status),
    ).toEqual(["modeled"]);
    expect(plan.status).toBe("ready");
    expect(analysis(plan)).toMatchObject({
      outcome: "unresolved",
      reasons: [{ reason: "unmodeled_related" }],
    });
    expect(candidateIds(plan)).toContain(LABEL);
    expect(
      (plan.diagnostics as string[]).some((entry) =>
        entry.startsWith("Contradiction check incomplete"),
      ),
    ).toBe(true);

    const reviewed = compile(workspace, {
      intent: LABEL_INTENT,
      conflictReviews: candidateIds(plan).map((requirementId) => ({
        requirementId,
        verdict: "no_conflict",
      })),
    });
    expect(reviewed.status).toBe("ready");
    expect(analysis(reviewed)).toMatchObject({
      outcome: "no_conflict",
      reasons: [],
    });
    expect(analysis(reviewed).nextAction).toBeUndefined();
  }, 240_000);

  test("a modeled, consistent pair is still no_conflict with nothing to review", () => {
    const workspace = editorWorkspace();
    const first = compile(workspace, {
      intent: "Export file size must be at most 50.",
      requirementId: "REQ-export-size-max",
    });
    expect(first.status).toBe("ready");
    const applied = workspace.json(["apply-plan"], {
      plan: first,
      approvedPlanHash: first.planHash,
    });
    expect(applied).toMatchObject({ data: { outcome: "applied" } });

    const second = compile(workspace, {
      intent: "Export file size must be at least 1.",
    });
    expect(second.status).toBe("ready");
    expect(analysis(second)).toMatchObject({
      outcome: "no_conflict",
      witnesses: [],
      reasons: [],
      reviewCandidates: [],
    });
  }, 240_000);

  test("bootstrap names prose-only requirements a planned claim was not checked against", () => {
    const workspace = editorWorkspace();
    const result = workspace.json(["plan-bootstrap"], {
      bootstrapContext: {
        projectSummary: "A drawing editor for a test project.",
        verificationAnchors: ["bun test"],
        knowledgeSources: [
          {
            id: "tracker",
            title: "Issue tracker",
            kind: "issue_tracker",
            locator: "https://example.com/tracker",
            authority: "authoritative",
            component: "editor",
          },
        ],
        intentClaims: [
          {
            statement: LABEL_INTENT,
            sourceId: "tracker",
            reference: "T-1",
            excerpt: `The tracker says: ${LABEL_INTENT}`,
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    const planned = (result.data as Json).plan as Json;
    const claim = (planned.candidates as Json[]).find(
      (row) => row.sourceKind === "intent_claim",
    ) as Json;
    expect(claim.evidence as string[]).toContain(`review_against:${LABEL}`);
    const diagnostics = planned.diagnostics as string[];
    expect(
      diagnostics.some(
        (entry) =>
          entry.startsWith("conflict-review:") &&
          entry.includes("tracker:T-1") &&
          entry.includes(LABEL),
      ),
    ).toBe(true);
  }, 240_000);

  test("bootstrap names prose-only requirements a claim left for authoring must be compared with", () => {
    const workspace = editorWorkspace();
    const result = workspace.json(["plan-bootstrap"], {
      bootstrapContext: {
        projectSummary: "A drawing editor for a test project.",
        verificationAnchors: ["bun test"],
        knowledgeSources: [
          {
            id: "tracker",
            title: "Issue tracker",
            kind: "issue_tracker",
            locator: "https://example.com/tracker",
            authority: "authoritative",
            component: "editor",
          },
        ],
        intentClaims: [
          {
            statement: SAVES_INTENT,
            sourceId: "tracker",
            reference: "T-2",
            excerpt: `The tracker says: ${SAVES_INTENT}`,
          },
          {
            statement: UNRELATED_INTENT,
            sourceId: "tracker",
            reference: "T-3",
            excerpt: `The tracker says: ${UNRELATED_INTENT}`,
          },
        ],
      },
    });
    expect(result.status).toBe("success");
    const data = result.data as Json;
    const planned = data.plan as Json;
    const diagnostics = planned.diagnostics as string[];
    // Neither claim can be modeled: both are left for authoring.
    expect(diagnostics).toContain(
      `Intent claim needs authoring at tracker:T-2: ${SAVES_INTENT}`,
    );
    expect(diagnostics).toContain(
      `Intent claim needs authoring at tracker:T-3: ${UNRELATED_INTENT}`,
    );
    const review = diagnostics.filter((entry) =>
      entry.startsWith("conflict-review:"),
    );
    const escapeReview = review.find((entry) => entry.includes("tracker:T-2"));
    expect(escapeReview).toBeDefined();
    expect(escapeReview).toContain(
      `${ESCAPE} ("Escape cancels a label edit without saving")`,
    );
    expect(escapeReview).toContain("kb_compile_intent");
    expect(escapeReview).toContain("conflictReviews");
    expect(review.some((entry) => entry.includes("tracker:T-3"))).toBe(false);
    expect(
      diagnostics.some(
        (entry) =>
          entry.startsWith("Knowledge source tracker") &&
          entry.includes("1 of them need a conflict review"),
      ),
    ).toBe(true);
    const handoff = (data.recommendedActions as Json[]).find((action) =>
      String(action.description).startsWith("Author REQ entities"),
    ) as Json;
    expect(String(handoff.description)).toContain(
      "1 intent claim(s) left for authoring need a conflict review",
    );
  }, 240_000);
});

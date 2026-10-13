// implements REQ-model-predicates-grounding-guards
import { afterEach, describe, expect, test } from "bun:test";
import {
  type ConsumerWorkspace,
  type Json,
  adviseProse,
  checkViolations,
  createConsumerWorkspace,
  doc,
  semanticFrontMatter,
} from "./workspace.js";

/**
 * The guards kb_model mode predicates applies before an agent writes a
 * grounding: a requirement that already grounds the candidate's predicate
 * tuple in other words is recognised by canonical_key; a claim the
 * requirement's ledger does not state is not planned as an unlinked fact but
 * sent back to extend the requirement; and a complete candidate that
 * contradicts a stored decision is warned about even when no hash-bound
 * plan ran the contradiction analysis. kb_upsert echoes the claim_key it
 * derived for a written fact, and reports no semantic advisor receipt for a
 * fact: the receipt describes requirement prose, and analysing the fact's
 * title would report a claim key nothing declares.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const ALLOW_PROSE =
  "Coaches can read analysis requests that are not assigned to them.";
const ALLOW_REWORDED =
  "A coach may read analysis requests not assigned to the coach.";
const DENY_PROSE =
  "Coaches cannot read analysis requests that are not assigned to them.";
const ASSIGNED_PROSE = "Coaches can read analysis requests assigned to them.";
const EXPORT_PROSE = "Coaches can export analysis requests assigned to them.";
const TWO_CLAUSE_REQ = "REQ-coach-assigned-read-and-export";
const PERMISSION_SCHEMA = "FACT-SCHEMA-PERMISSION-RULE";
const ALLOW_FACT = "FACT-coach-read-unassigned-allow";
const ALLOW_REQ = "REQ-coach-read-unassigned";
const ASSIGNED_REQ = "REQ-coach-read-assigned";
const ALLOW_KEY =
  "permission_rule(coach,read,unassigned_analysis_request,allow)";
const DENY_KEY = "permission_rule(coach,read,unassigned_analysis_request,deny)";

function requirementDoc(
  ws: ConsumerWorkspace,
  id: string,
  prose: string,
  links = "",
  clauses = 1,
): string {
  const { contract, propositions } = adviseProse(ws, prose);
  expect(propositions).toHaveLength(clauses);
  const frontMatter = `id: ${id}
title: ${prose}
type: req
status: open
priority: must
${semanticFrontMatter(
  prose,
  contract,
  propositions.map((claim) => ({
    ...claim,
    status: links ? "modeled" : "missing",
  })),
)}`;
  return doc(links ? `${frontMatter}\n${links}` : frontMatter, prose);
}

function allowFact(claimKey: string, claimText: string): string {
  return doc(`
id: ${ALLOW_FACT}
title: Coach allow reading unassigned analysis requests
type: fact
status: active
fact_kind: predicate
predicate_name: permission_rule
predicate_args: [coach, read, unassigned_analysis_request, allow]
polarity: assert
canonical_key: ${ALLOW_KEY}
claim_key: ${claimKey}
claim_text: ${claimText}
`);
}

/** The allow rule stored and linked; the assigned requirement ungrounded. */
function seed(): ConsumerWorkspace {
  const ws = createConsumerWorkspace("kibi-grounding-guards-");
  workspace = ws;
  const { propositions } = adviseProse(ws, ALLOW_PROSE);
  const [claim] = propositions as [(typeof propositions)[number]];
  ws.write(
    `.kb/facts/${ALLOW_FACT}.md`,
    allowFact(claim.claim_key, claim.claim_text),
  );
  ws.write(
    `.kb/requirements/${ALLOW_REQ}.md`,
    requirementDoc(
      ws,
      ALLOW_REQ,
      ALLOW_PROSE,
      `links:\n  - type: requires_predicate\n    target: ${ALLOW_FACT}`,
    ),
  );
  ws.write(
    `.kb/requirements/${ASSIGNED_REQ}.md`,
    requirementDoc(ws, ASSIGNED_REQ, ASSIGNED_PROSE),
  );
  ws.write(
    `.kb/requirements/${TWO_CLAUSE_REQ}.md`,
    requirementDoc(
      ws,
      TWO_CLAUSE_REQ,
      `${ASSIGNED_PROSE} ${EXPORT_PROSE}`,
      "",
      2,
    ),
  );
  ws.sync();
  expect(checkViolations(ws, "domain-contradictions")).toEqual([]);
  return ws;
}

function modelPredicates(
  ws: ConsumerWorkspace,
  requirementId: string,
  text: string,
  bindings: Readonly<Record<string, string>>,
): Json {
  return ws.json(["model"], {
    mode: "predicates",
    text,
    requirementId,
    schemaId: PERMISSION_SCHEMA,
    argumentBindings: bindings,
  }).data as Json;
}

const COACH_READ_UNASSIGNED = {
  actor: "coach",
  action: "read",
  resource: "unassigned_analysis_request",
};

describe("grounding guards before a predicate write", () => {
  test("a requirement that already grounds the candidate's tuple in other words is recognised by canonical_key, with or without the decision bound", () => {
    const ws = seed();

    // Bound in full: the reworded claim has another claim_key, yet the same
    // predicate tuple is already linked, so nothing is written or swapped.
    const bound = modelPredicates(ws, ALLOW_REQ, ALLOW_REWORDED, {
      ...COACH_READ_UNASSIGNED,
      decision: "allow",
    });
    expect(bound.recommendedAction).toBe("keep_existing_grounding");
    expect(bound.existingGrounding).toEqual([
      {
        relationship: {
          type: "requires_predicate",
          from: ALLOW_REQ,
          to: ALLOW_FACT,
        },
        factId: ALLOW_FACT,
        factKind: "predicate",
        claimKey: adviseProse(ws, ALLOW_PROSE).propositions[0]?.claim_key,
        canonicalKey: ALLOW_KEY,
        matchedBy: "canonical_key",
      },
    ]);
    expect(bound.applyPlan).toEqual([]);
    expect(bound.relationshipPlan).toBeNull();
    expect(bound.replacementPlan).toBeNull();
    expect(bound.plan).toBeNull();
    expect(bound.relationshipTarget).toBeNull();
    expect(bound.decisionConflicts).toEqual([]);
    const warnings = JSON.stringify(bound.warnings);
    expect(warnings).toContain(`already grounds the predicate ${ALLOW_KEY}`);
    expect(warnings).toContain("matched by canonical_key");
    expect(warnings).not.toContain("proposition-complete");

    // The decision left to inference: the candidate is incomplete, but the
    // stored fact carries the inferred tuple, so the answer is the same.
    const inferred = modelPredicates(
      ws,
      ALLOW_REQ,
      ALLOW_REWORDED,
      COACH_READ_UNASSIGNED,
    );
    const [candidate] = inferred.candidates as [Json];
    expect(candidate.canonical_key).toBe(ALLOW_KEY);
    expect(inferred.recommendedAction).toBe("keep_existing_grounding");
    expect(
      (inferred.existingGrounding as Json[]).map((row) => row.factId),
    ).toEqual([ALLOW_FACT]);
    expect(inferred.applyPlan).toEqual([]);
    expect(inferred.replacementPlan).toBeNull();
  }, 300_000);

  test("a claim the requirement does not state is sent back to extend the requirement, and the stored decision it contradicts is named without a plan", () => {
    const ws = seed();

    // Under the requirement that owns the allow rule: its ledger has no
    // deny claim, so no fact is planned, and the allow fact it links is the
    // conflict kb_upsert would refuse.
    const sameRequirement = modelPredicates(ws, ALLOW_REQ, DENY_PROSE, {
      ...COACH_READ_UNASSIGNED,
      decision: "deny",
    });
    expect(sameRequirement.recommendedAction).toBe("extend_requirement");
    expect(sameRequirement.existingGrounding).toEqual([]);
    expect(sameRequirement.applyPlan).toEqual([]);
    expect(sameRequirement.relationshipPlan).toBeNull();
    expect(sameRequirement.relationshipTarget).toBeNull();
    expect(sameRequirement.plan).toBeNull();
    expect(sameRequirement.decisionConflicts).toEqual([
      {
        requirementId: ALLOW_REQ,
        factId: ALLOW_FACT,
        effect: "allow",
        proposedEffect: "deny",
        canonicalKey: DENY_KEY,
      },
    ]);
    const sameWarnings = JSON.stringify(sameRequirement.warnings);
    expect(sameWarnings).toContain(
      `The proposition ledger of ${ALLOW_REQ} has no claim ${sameRequirement.claimKey as string}`,
    );
    expect(sameWarnings).toContain("No fact was planned");
    expect(sameWarnings).toContain(
      `contradicts ${ALLOW_FACT} (allow) under ${ALLOW_REQ}, the requirement this claim would ground`,
    );
    expect(String((sameRequirement as { text?: string }).text ?? "")).toBe(
      DENY_PROSE,
    );
    // Nothing was written.
    expect(ws.read(`.kb/requirements/${ALLOW_REQ}.md`)).not.toContain("deny");

    // Under another requirement whose ledger lacks the claim: the same
    // guard, and the conflict names the other requirement's fact.
    const otherRequirement = modelPredicates(ws, ASSIGNED_REQ, DENY_PROSE, {
      ...COACH_READ_UNASSIGNED,
      decision: "deny",
    });
    expect(otherRequirement.recommendedAction).toBe("extend_requirement");
    expect(otherRequirement.applyPlan).toEqual([]);
    expect(otherRequirement.plan).toBeNull();
    expect(
      (otherRequirement.decisionConflicts as Json[]).map((row) => [
        row.requirementId,
        row.factId,
      ]),
    ).toEqual([[ALLOW_REQ, ALLOW_FACT]]);
    expect(JSON.stringify(otherRequirement.warnings)).not.toContain(
      "the requirement this claim would ground",
    );

    // A claim the requirement does state keeps its hash-bound plan, which
    // carries the contradiction analysis itself: no separate conflict list.
    const stated = modelPredicates(ws, ASSIGNED_REQ, ASSIGNED_PROSE, {
      ...COACH_READ_UNASSIGNED,
      resource: "assigned_analysis_request",
      decision: "allow",
    });
    expect(stated.recommendedAction).toBe("apply_requires_predicate");
    expect((stated.plan as Json).status).toBe("ready");
    expect(stated.decisionConflicts).toEqual([]);
  }, 300_000);

  test("the hash-bound plan of a multi-clause requirement keeps the stored claim manifest and applies", () => {
    const ws = seed();
    const twoClause = modelPredicates(ws, TWO_CLAUSE_REQ, EXPORT_PROSE, {
      actor: "coach",
      action: "export",
      resource: "assigned_analysis_request",
      decision: "allow",
    });
    expect(twoClause.recommendedAction).toBe("apply_requires_predicate");
    const plan = twoClause.plan as Json;
    expect(plan.status).toBe("ready");
    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
    });
    expect(applied.status).toBe("success");
    const [stored] = (
      ws.json(["query"], { id: TWO_CLAUSE_REQ }).data as { entities: Json[] }
    ).entities as [Json];
    const keys = adviseProse(ws, `${ASSIGNED_PROSE} ${EXPORT_PROSE}`)
      .propositions.map((claim) => claim.claim_key)
      .sort();
    expect([...(stored.logic_claims as string[])].sort()).toEqual(keys);
    expect(
      (stored.semantic_inventory as Json[]).map((row) => row.status),
    ).toEqual(["missing", "modeled"]);
    expect(
      checkViolations(ws, "logic-coverage,domain-contradictions").filter(
        (violation) => violation.entityId.includes(TWO_CLAUSE_REQ),
      ),
    ).toEqual([]);
  }, 300_000);

  test("kb_upsert returns the claim_key it derived for a written fact, without a requirement advisor receipt", () => {
    const ws = createConsumerWorkspace("kibi-upsert-claim-key-");
    workspace = ws;
    const claimText = "Coaches can export their own analysis requests.";
    const input = {
      type: "fact",
      id: "FACT-coach-export-own-allow",
      properties: {
        title: "Coach allow exporting own analysis requests",
        status: "active",
        fact_kind: "predicate",
        predicate_name: "permission_rule",
        predicate_args: ["coach", "export", "own_analysis_request", "allow"],
        polarity: "assert",
        canonical_key:
          "permission_rule(coach,export,own_analysis_request,allow)",
        claim_text: claimText,
      },
    };
    const preview = ws.json(["upsert"], { ...input, dryRun: true })
      .data as Json;
    expect(preview.valid).toBe(true);
    const derived = (preview.normalizedPreview as Json).claim_key as string;
    expect(derived).toMatch(/^CLAIM-[0-9A-F]{16}$/);
    // No receipt minting a claim key from the title, so nothing reports a
    // missing or unresolved claim key the fact never declared.
    expect(preview.semanticAdvisor).toBeNull();
    expect(preview.warnings).toEqual([]);

    const written = ws.json(["upsert"], input).data as Json;
    expect(written.created).toBe(1);
    expect(written.claimKey).toBe(derived);
    expect(written.semanticAdvisor).toBeUndefined();
    const [stored] = (
      ws.json(["query"], { id: input.id }).data as { entities: Json[] }
    ).entities as [Json];
    expect(stored.claim_key).toBe(derived);

    // A requirement write carries no claim key.
    const requirement = ws.json(["upsert"], {
      type: "req",
      id: "REQ-coach-export-own",
      properties: { title: "Coach export", status: "open", priority: "must" },
    }).data as Json;
    expect(requirement.created).toBe(1);
    expect(requirement.claimKey).toBeUndefined();
    // A requirement keeps its advisor receipt.
    expect(requirement.semanticAdvisor).toMatchObject({
      version: "semantic-advisor-v2",
    });
  }, 300_000);
});

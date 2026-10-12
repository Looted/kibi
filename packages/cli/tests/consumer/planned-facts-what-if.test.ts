// implements REQ-model-what-if-planned-facts
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
 * The what-if route an agent takes before any fact exists: kb_model plans the
 * permission fact for a requirement, the dry run of that requirement stages
 * the planned fact, and the decision conflict with a stored allow rule is
 * reported there, not after the fact has been written. The plan kb_model
 * returns is hash-bound, so a non-conflicting grounding lands through one
 * kb_apply_plan call.
 */

let workspace: ConsumerWorkspace | undefined;

afterEach(() => {
  workspace?.cleanup();
  workspace = undefined;
});

const ALLOW_PROSE =
  "Coaches can read analysis requests that are not assigned to them.";
const DENY_PROSE =
  "Coaches cannot read analysis requests that are not assigned to them.";
const ASSIGNED_PROSE = "Coaches can read analysis requests assigned to them.";
const PERMISSION_SCHEMA = "FACT-SCHEMA-PERMISSION-RULE";
const CONFLICT =
  "Decision conflict on default:permission_rule(coach,read,unassigned_analysis_request)";

function requirementDoc(
  ws: ConsumerWorkspace,
  id: string,
  prose: string,
  links = "",
): string {
  const { contract, propositions } = adviseProse(ws, prose);
  expect(propositions).toHaveLength(1);
  const [claim] = propositions as [(typeof propositions)[number]];
  const frontMatter = `id: ${id}
title: ${prose}
type: req
status: open
priority: must
${semanticFrontMatter(prose, contract, [
  { ...claim, status: links ? "modeled" : "missing" },
])}`;
  return doc(links ? `${frontMatter}\n${links}` : frontMatter, prose);
}

function allowFact(claimKey: string, claimText: string): string {
  return doc(`
id: FACT-coach-read-unassigned-allow
title: Coach allow reading unassigned analysis requests
type: fact
status: active
fact_kind: predicate
predicate_name: permission_rule
predicate_args: [coach, read, unassigned_analysis_request, allow]
polarity: assert
canonical_key: permission_rule(coach,read,unassigned_analysis_request,allow)
claim_key: ${claimKey}
claim_text: ${claimText}
`);
}

/** A workspace with the allow rule stored and the two other requirements ungrounded. */
function seed(): ConsumerWorkspace {
  const ws = createConsumerWorkspace("kibi-planned-facts-");
  workspace = ws;
  const { propositions } = adviseProse(ws, ALLOW_PROSE);
  const [claim] = propositions as [(typeof propositions)[number]];
  ws.write(
    ".kb/facts/FACT-coach-read-unassigned-allow.md",
    allowFact(claim.claim_key, claim.claim_text),
  );
  ws.write(
    ".kb/requirements/REQ-coach-read-unassigned.md",
    requirementDoc(
      ws,
      "REQ-coach-read-unassigned",
      ALLOW_PROSE,
      "links:\n  - type: requires_predicate\n    target: FACT-coach-read-unassigned-allow",
    ),
  );
  ws.write(
    ".kb/requirements/REQ-coach-read-unassigned-denied.md",
    requirementDoc(ws, "REQ-coach-read-unassigned-denied", DENY_PROSE),
  );
  ws.write(
    ".kb/requirements/REQ-coach-read-assigned.md",
    requirementDoc(ws, "REQ-coach-read-assigned", ASSIGNED_PROSE),
  );
  ws.sync();
  expect(checkViolations(ws, "domain-contradictions")).toEqual([]);
  return ws;
}

function claimKeyOf(modelResult: Json): string {
  return modelResult.claimKey as string;
}

function modelPredicates(
  ws: ConsumerWorkspace,
  requirementId: string,
  text: string,
  resource: string,
  decision: "allow" | "deny",
): Json {
  return ws.json(["model"], {
    mode: "predicates",
    text,
    requirementId,
    schemaId: PERMISSION_SCHEMA,
    argumentBindings: { actor: "coach", action: "read", resource, decision },
  }).data as Json;
}

function requirementDryRun(
  ws: ConsumerWorkspace,
  requirementId: string,
  prose: string,
  factId: string,
  plannedFacts?: readonly Json[],
  dryRun = true,
): { status: number | null; data: Json } {
  const { contract, propositions } = adviseProse(ws, prose);
  const [claim] = propositions as [(typeof propositions)[number]];
  const input = {
    type: "req",
    id: requirementId,
    properties: {
      title: prose,
      status: "open",
      priority: "must",
      semantic_text: prose,
      semantic_inventory_version: contract.version,
      semantic_source_field: contract.source_field,
      semantic_source_hash: contract.source_hash,
      semantic_inventory: [{ ...claim, status: "modeled" }],
      logic_claims: [claim.claim_key],
    },
    relationships: [
      { type: "requires_predicate", from: requirementId, to: factId },
    ],
    ...(plannedFacts ? { plannedFacts } : {}),
    ...(dryRun ? { dryRun: true } : {}),
  };
  const run = ws.kibi(["upsert"], { input });
  const parsed = JSON.parse(run.stdout) as Json;
  return {
    status: run.status,
    data: (parsed.data ?? parsed) as Json,
  };
}

describe("what-if before the fact exists", () => {
  test("kb_model reports the decision conflict in its plan, the dry run refuses the requirement with its planned fact staged, and a non-conflicting plan applies through kb_apply_plan", () => {
    const ws = seed();

    // 1. kb_model: the deny grounding for an ungrounded requirement. The
    //    candidate is complete, yet the plan is blocked because the KB
    //    already holds the allow rule on the same key.
    const denied = modelPredicates(
      ws,
      "REQ-coach-read-unassigned-denied",
      DENY_PROSE,
      "unassigned_analysis_request",
      "deny",
    );
    expect(denied.recommendedAction).toBe("apply_requires_predicate");
    const deniedPlan = denied.plan as Json;
    expect(deniedPlan.version).toBe("kibi.compile-plan.v1");
    expect(deniedPlan.status).toBe("blocked");
    expect(typeof deniedPlan.planHash).toBe("string");
    const analysis = deniedPlan.contradictionAnalysis as Json;
    expect(analysis.outcome).toBe("conflict");
    expect(JSON.stringify(analysis.witnesses)).toContain(CONFLICT);
    expect(JSON.stringify(denied.warnings)).toContain("plan.status is blocked");
    const [deniedFact] = denied.applyPlan as [Json];
    const deniedFactId = deniedFact.id as string;
    expect(deniedFactId).toMatch(/^FACT-PRED-/);

    // 2. Without staging, the dry run cannot even see the planned fact.
    const bare = requirementDryRun(
      ws,
      "REQ-coach-read-unassigned-denied",
      DENY_PROSE,
      deniedFactId,
    );
    expect(bare.data.valid).toBe(false);
    expect(JSON.stringify(bare.data.errors)).toContain(deniedFactId);
    expect(JSON.stringify(bare.data.errors)).not.toContain(CONFLICT);

    // 3. With the planned fact staged, the dry run resolves the grounding
    //    target and refuses the batch for the conflict the commit would hit.
    const staged = requirementDryRun(
      ws,
      "REQ-coach-read-unassigned-denied",
      DENY_PROSE,
      deniedFactId,
      [deniedFact],
    );
    expect(staged.data.valid).toBe(false);
    expect(JSON.stringify(staged.data.errors)).toContain(
      "Contradiction detected for requirement REQ-coach-read-unassigned-denied",
    );
    expect(JSON.stringify(staged.data.errors)).toContain(CONFLICT);
    expect(JSON.stringify(staged.data.errors)).toContain("plannedFacts staged");

    // 4. plannedFacts never rides a real write.
    const written = requirementDryRun(
      ws,
      "REQ-coach-read-unassigned-denied",
      DENY_PROSE,
      deniedFactId,
      [deniedFact],
      false,
    );
    expect(written.status).not.toBe(0);
    expect(JSON.stringify(written.data)).toContain("dryRun-only");
    expect(
      ws.read(".kb/requirements/REQ-coach-read-unassigned-denied.md"),
    ).not.toContain("requires_predicate");

    // 5. A grounding on another key: the plan is ready, the staged dry run is
    //    valid and reports what the batch introduces (nothing), and the plan
    //    applies in one call.
    const assigned = modelPredicates(
      ws,
      "REQ-coach-read-assigned",
      ASSIGNED_PROSE,
      "assigned_analysis_request",
      "allow",
    );
    const plan = assigned.plan as Json;
    expect(plan.status).toBe("ready");
    expect((plan.contradictionAnalysis as Json).outcome).toBe("no_conflict");
    const [assignedFact] = assigned.applyPlan as [Json];
    const preview = requirementDryRun(
      ws,
      "REQ-coach-read-assigned",
      ASSIGNED_PROSE,
      assignedFact.id as string,
      [assignedFact],
    );
    expect(preview.data.valid).toBe(true);
    expect(preview.data.stagedFacts).toEqual([assignedFact.id]);
    expect((preview.data.whatIf as Json).introduced).toEqual([]);

    const applied = ws.json(["apply-plan"], {
      plan,
      approvedPlanHash: plan.planHash,
    });
    expect(applied.status).toBe("success");
    const requirement = ws.read(".kb/requirements/REQ-coach-read-assigned.md");
    const [stored] = (
      ws.json(["query"], { id: "REQ-coach-read-assigned" }).data as {
        entities: Json[];
      }
    ).entities as [Json];
    expect(stored.requires_predicate).toBe(
      `kb:entity/${assignedFact.id as string}`,
    );
    // The requirement keeps its ledger, with this claim now modeled.
    expect(stored.semantic_inventory_version).toBe(
      "kibi.semantic-inventory.v1",
    );
    expect(requirement).toContain(`claim_key: ${claimKeyOf(assigned)}`);
    expect(requirement).toContain("status: modeled");
    // The requirement's authored body survives the relink.
    expect(requirement.trimEnd().endsWith(ASSIGNED_PROSE)).toBe(true);
    expect(ws.read(`.kb/facts/${assignedFact.id as string}.md`)).toContain(
      "permission_rule(coach,read,assigned_analysis_request,allow)",
    );
    expect(
      checkViolations(ws, "domain-contradictions,logic-coverage").filter(
        (violation) => violation.entityId.includes("REQ-coach-read-assigned"),
      ),
    ).toEqual([]);
  }, 300_000);
});

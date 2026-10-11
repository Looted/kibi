// implements REQ-kibi-truthful-consistency
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
 * "Coaches can read unassigned requests" and "Coaches cannot read
 * unassigned requests" ground permission_rule(coach, read, ..., allow) and
 * permission_rule(coach, read, ..., deny). Before the fix the two facts had
 * different arguments, so no contradiction rule compared them, and the bare
 * "can" sentence was not even a normative clause.
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

function permissionFact(
  id: string,
  decision: "allow" | "deny",
  claim: { claim_key: string; claim_text: string },
): string {
  return doc(`
id: ${id}
title: Coach ${decision} reading unassigned analysis requests
type: fact
status: active
fact_kind: predicate
predicate_name: permission_rule
predicate_args: [coach, read, unassigned_analysis_request, ${decision}]
polarity: ${decision === "allow" ? "assert" : "deny"}
canonical_key: permission_rule(coach,read,unassigned_analysis_request,${decision})
claim_key: ${claim.claim_key}
claim_text: ${claim.claim_text}
`);
}

function requirementPayload(
  ws: ConsumerWorkspace,
  id: string,
  prose: string,
  factId: string,
  decision: "allow" | "deny",
): { fact: string; links: string; frontMatter: string } {
  const { contract, propositions } = adviseProse(ws, prose);
  expect(propositions).toHaveLength(1);
  const [claim] = propositions as [(typeof propositions)[number]];
  return {
    fact: permissionFact(factId, decision, claim),
    links: `links:\n  - type: requires_predicate\n    target: ${factId}`,
    frontMatter: `id: ${id}
title: Coach access to unassigned analysis requests (${decision})
type: req
status: open
priority: must
${semanticFrontMatter(prose, contract, [{ ...claim, status: "modeled" }])}`,
  };
}

describe("allow and deny decisions on the same permission contradict", () => {
  test("kb_upsert dryRun refuses the second requirement and kb_check reports the pair", () => {
    const ws = createConsumerWorkspace("kibi-permission-decision-");
    workspace = ws;

    const allow = requirementPayload(
      ws,
      "REQ-coach-read-unassigned",
      ALLOW_PROSE,
      "FACT-coach-read-unassigned-allow",
      "allow",
    );
    ws.write(".kb/facts/FACT-coach-read-unassigned-allow.md", allow.fact);
    ws.write(
      ".kb/requirements/REQ-coach-read-unassigned.md",
      doc(`${allow.frontMatter}\n${allow.links}`, ALLOW_PROSE),
    );
    const deny = requirementPayload(
      ws,
      "REQ-coach-read-unassigned-denied",
      DENY_PROSE,
      "FACT-coach-read-unassigned-deny",
      "deny",
    );
    ws.write(".kb/facts/FACT-coach-read-unassigned-deny.md", deny.fact);
    ws.sync();
    expect(checkViolations(ws, "domain-contradictions")).toEqual([]);

    // The dry run of the requirement that links the deny fact previews the
    // commit-time contradiction check.
    const { contract, propositions } = adviseProse(ws, DENY_PROSE);
    const [claim] = propositions as [(typeof propositions)[number]];
    const preview = ws.json(["upsert"], {
      type: "req",
      id: "REQ-coach-read-unassigned-denied",
      properties: {
        title: "Coach access to unassigned analysis requests (deny)",
        status: "open",
        semantic_text: DENY_PROSE,
        semantic_inventory_version: contract.version,
        semantic_source_field: contract.source_field,
        semantic_source_hash: contract.source_hash,
        semantic_inventory: [{ ...claim, status: "modeled" }],
        logic_claims: [claim.claim_key],
      },
      document: { body: `${DENY_PROSE}\n` },
      relationships: [
        {
          type: "requires_predicate",
          from: "REQ-coach-read-unassigned-denied",
          to: "FACT-coach-read-unassigned-deny",
        },
      ],
      dryRun: true,
    });
    const previewData = preview.data as Json;
    expect(previewData.valid).toBe(false);
    expect(JSON.stringify(previewData.errors)).toContain(
      "Contradiction detected",
    );
    expect(JSON.stringify(previewData.errors)).toContain(
      "Decision conflict on default:permission_rule(coach,read,unassigned_analysis_request)",
    );

    // Authored directly, the pair surfaces through kb_check.
    ws.write(
      ".kb/requirements/REQ-coach-read-unassigned-denied.md",
      doc(`${deny.frontMatter}\n${deny.links}`, DENY_PROSE),
    );
    ws.sync();
    const violations = checkViolations(ws, "domain-contradictions");
    expect(violations).toHaveLength(1);
    expect(violations[0]?.entityId).toBe(
      "REQ-coach-read-unassigned/REQ-coach-read-unassigned-denied",
    );
    expect(violations[0]?.description).toContain(
      "REQ-coach-read-unassigned decides allow while REQ-coach-read-unassigned-denied decides deny",
    );
  }, 300_000);
});

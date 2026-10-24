---
title: The contradiction check names requirements it could not compare with new intent instead of reporting no conflict
status: open
required_evidence: tested
priority: must
tags:
  - contradictions
  - compile-intent
  - bootstrap
  - truthful-consistency
semantic_text: When kb_compile_intent cannot compare the intent with a related current requirement, it must report the contradiction outcome as unresolved with that requirement as a review candidate. kb_plan_bootstrap must name each current requirement without a logical representation that a planned intent claim was not checked against.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: cb4921a782b884e4d37a0f313074e124dda55261847ce2acf39996e31b15ce40
semantic_inventory:
  - claim_key: CLAIM-187C4A7FE60430CF
    claim_text: When kb_compile_intent cannot compare the intent with a related current requirement, it must report the contradiction outcome as unresolved with that requirement as a review candidate. kb_plan_bootstrap must name each current requirement without a logical representation that a planned intent claim was not checked against
    role: condition
    status: modeled
    span:
      start: 0
      end: 322
logic_claims:
  - CLAIM-187C4A7FE60430CF
origin:
  kind: agent
  recorded_at: '2026-10-15T16:05:19.640Z'
id: REQ-kibi-contradiction-review-candidates
type: req
---
When kb_compile_intent cannot compare the intent with a related current requirement, it must report the contradiction outcome as unresolved with that requirement as a review candidate. kb_plan_bootstrap must name each current requirement without a logical representation that a planned intent claim was not checked against.

## Context

`kb_compile_intent` derived `no_conflict` from "no Prolog witnesses", but witnesses can only exist between requirements with a logical model. In a test project migrated from a legacy KB, 26 of 28 compiled claims were ontology gaps and every one came back `no_conflict`; for the claim that Escape saves an annotation, discovery in the same response returned a current requirement saying Escape cancels without saving. The agent found all four real source conflicts itself. Reported by the project owner.

Kibi cannot judge prose, so it names what it could not compare and makes the agent judge it: `reasons` say why the check could not decide, `reviewCandidates` list the related current requirements with their statements, and `conflictReviews` carry the agent's verdicts back, a conflict blocking the plan. Bootstrap plans name the same requirements for review before approval.

## Source

> `outcome: "unresolved"` with a reason when a target proposition is unmodeled or related current requirements from discovery have no logic, plus a list of review candidates the agent must compare and resolve.

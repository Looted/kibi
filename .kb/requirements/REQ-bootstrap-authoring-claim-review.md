---
title: Bootstrap names what to compare for intent claims it leaves for authoring
status: open
required_evidence: tested
priority: must
tags:
  - bootstrap
  - contradictions
  - truthful-consistency
origin:
  kind: agent
  recorded_at: '2026-10-16T08:59:22.548Z'
id: REQ-bootstrap-authoring-claim-review
type: req
semantic_text: kb_plan_bootstrap must name each current requirement without a logical representation that an intent claim left for authoring was not checked against.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 798e1f8efe8214bd3226daaf50ee9bc6efc490885289933f700c93def41bb673
semantic_inventory:
  - claim_key: CLAIM-24C26960E95A71A7
    claim_text: kb_plan_bootstrap must name each current requirement without a logical representation that an intent claim left for authoring was not checked against
    role: normative
    status: modeled
    span:
      start: 0
      end: 149
logic_claims:
  - CLAIM-24C26960E95A71A7
---
kb_plan_bootstrap must name each current requirement without a logical representation that an intent claim left for authoring was not checked against.

## Context

`kb_plan_bootstrap` compared only the intent claims it planned with the prose-only current requirements on the same topic. A claim it could not model was left as "Intent claim needs authoring" with no `review_against` evidence and no `conflict-review:` diagnostic, although those claims are exactly the ones Kibi cannot check. In a regression run on a test project migrated from a legacy KB, the claim that Escape saves an annotation sat next to a current requirement saying Escape cancels without saving, and the plan came back `ready` with only the authoring line. `kb_compile_intent` on the same claim did report the requirement, but the bootstrap plan is where the agent sees every claim at once. The project owner asked for the fix.

## Source

> Every "needs authoring" intent claim is ranked against the unmodeled current requirements with the same ranking, floor and cap that the planned claims use, and the claim's diagnostic names them.

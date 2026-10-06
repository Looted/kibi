---
title: Review observation facts may quote a claim without its claim key
status: open
priority: must
tags:
  - facts
  - observation
  - review
rationale: Test project onboarding could not record review:invalid-write observations that quoted the claim, because claim_text required claim_key on every fact.
semantic_text: Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key. Kibi must reject any other fact that carries claim_text without claim_key.
semantic_clauses:
  - Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key.
  - Kibi must reject any other fact that carries claim_text without claim_key.
logic_claims:
  - CLAIM-8CB418131CE3FC33
  - CLAIM-D4C266B0D0756615
origin:
  kind: agent
  ref: 'Piotr thread 2026-10-06: test project onboarding round 3 (advisor roles, relationship upserts, review observations)'
  recorded_at: '2026-10-06T20:44:15.593Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 438d96ebc725d6c44c778f6d210de8921ee195207b56abeed1ae524ec8ff405e
semantic_inventory:
  - claim_key: CLAIM-8CB418131CE3FC33
    claim_text: Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key
    role: normative
    span:
      start: 0
      end: 96
    status: modeled
  - claim_key: CLAIM-D4C266B0D0756615
    claim_text: Kibi must reject any other fact that carries claim_text without claim_key
    role: normative
    span:
      start: 98
      end: 171
    status: modeled
id: REQ-kibi-review-observation-claim-text
type: req
---
Kibi must accept an observation or meta fact that quotes a claim in claim_text without claim_key. Kibi must reject any other fact that carries claim_text without claim_key.

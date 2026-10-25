---
title: A committed kb_upsert returns the claim key it stored for a fact
status: open
required_evidence: tested
priority: must
tags:
  - modeling
  - mutation
  - search-lane
rationale: Search-lane round 2 showed that an agent writing a grounding fact without a dry run could not learn the claim key Kibi derived from claim_text without a kb_query.
semantic_text: A committed kb_upsert of a fact must return the claim key it stored for that fact.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2ca0242e7ee6c3b70cb731a7fa6877309bf16f7338479527af9ecb554cdce83e
semantic_inventory:
  - claim_key: CLAIM-5F99B49B92FC42D6
    claim_text: A committed kb_upsert of a fact must return the claim key it stored for that fact
    role: normative
    span:
      start: 0
      end: 81
    status: modeled
logic_claims:
  - CLAIM-5F99B49B92FC42D6
origin:
  kind: agent
  recorded_at: '2026-10-12T18:54:49.600Z'
id: REQ-upsert-committed-claim-key
type: req
---
## Context

Since grounding facts get their claim key derived from claim_text, an agent that writes a fact without a dry run never saw the key it would need for the requirement's ledger and had to run kb_query to learn it. The committed kb_upsert payload now carries it as claimKey, the same value a dry run shows in normalizedPreview.claim_key.
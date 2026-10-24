---
title: kb_model guards a predicate grounding against the ledger, existing groundings and stored decisions
status: open
required_evidence: tested
priority: must
tags:
  - modeling
  - mutation
  - search-lane
rationale: Search-lane round 2 showed kb_model planning an unlinked predicate fact for a claim the requirement did not state, missing a grounding that was worded differently, and proposing an allow fact under a requirement that owns the deny without a warning.
semantic_text: The kb_model predicates mode must recognise an existing requirement grounding whose predicate fact carries the candidate canonical key. The kb_model predicates mode must recommend extending the requirement when its stored proposition ledger lacks the claim instead of planning an unlinked predicate fact. The kb_model predicates mode must name the stored decision facts of current requirements that a complete candidate contradicts when no hash-bound requirement plan carried the contradiction analysis.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: adcebb60cca3a40278815f2a04c9897bc21619cdfce2939571c099d203e93b7e
semantic_inventory:
  - claim_key: CLAIM-9DF8A9A1ED8AA8E6
    claim_text: The kb_model predicates mode must recognise an existing requirement grounding whose predicate fact carries the candidate canonical key
    role: normative
    span:
      start: 0
      end: 134
    status: modeled
    reason: Grounded by the FACT-PRED-ED0A499237AA predicate fact this plan writes.
  - claim_key: CLAIM-2E83CF2FFA90C9AF
    claim_text: The kb_model predicates mode must recommend extending the requirement when its stored proposition ledger lacks the claim instead of planning an unlinked predicate fact
    role: normative
    span:
      start: 136
      end: 303
    status: modeled
    reason: Grounded by the FACT-PRED-C30D862B1B1C predicate fact this plan writes.
  - claim_key: CLAIM-5F296B5845D0D0C7
    claim_text: The kb_model predicates mode must name the stored decision facts of current requirements that a complete candidate contradicts when no hash-bound requirement plan carried the contradiction analysis
    role: normative
    span:
      start: 305
      end: 502
    status: modeled
    reason: Grounded by the FACT-PRED-5FAA2BAEE02D predicate fact this plan writes.
logic_claims:
  - CLAIM-9DF8A9A1ED8AA8E6
  - CLAIM-2E83CF2FFA90C9AF
  - CLAIM-5F296B5845D0D0C7
origin:
  kind: agent
  recorded_at: '2026-10-12T18:49:37.119Z'
id: REQ-model-predicates-grounding-guards
type: req
---
## Context

The second search-lane evaluation round on a test project showed three ways kb_model mode predicates let an agent write a wrong grounding: it planned a predicate fact for a clause the requirement's ledger did not state, so the fact was written and stayed unlinked; it did not see that the requirement already grounded the same predicate tuple under a differently worded claim, and asked for bindings instead; and it proposed an allow fact under a requirement that already owned the deny on the same key arguments without a word about the conflict, because only the hash-bound plan ran the contradiction analysis. Each clause here closes one of those gaps before any write.
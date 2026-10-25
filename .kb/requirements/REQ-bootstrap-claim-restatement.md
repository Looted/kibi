---
title: Bootstrap counts intent claims that restate a current requirement as already in the KB
status: open
required_evidence: tested
tags:
  - bootstrap
  - intent-claims
  - knowledge-sources
priority: must
origin:
  kind: agent
  ref: Onboarding test finding on bootstrap claim deduplication (2026-10-14)
  recorded_at: '2026-10-14T08:56:29.666Z'
semantic_text: The bootstrap planner must count a declared intent claim whose normalized statement or excerpt equals the title, the semantic text or one sentence of the semantic text of a current requirement as already in the KB under that requirement id. The bootstrap planner must keep a declared intent claim that closely restates a current requirement without matching it exactly and must name that requirement in a review diagnostic. The close restatement threshold must be a token-set Jaccard similarity of 0.8.
logic_claims:
  - CLAIM-8038E29829F69DAC
  - CLAIM-F4DEEAE961FCB464
  - CLAIM-D75EA03CE26FF1F2
semantic_clauses:
  - The bootstrap planner must count a declared intent claim whose normalized statement or excerpt equals the title, the semantic text or one sentence of the semantic text of a current requirement as already in the KB under that requirement id
  - The bootstrap planner must keep a declared intent claim that closely restates a current requirement without matching it exactly and must name that requirement in a review diagnostic
  - The close restatement threshold must be a token-set Jaccard similarity of 0.8
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
rationale: A seeded onboarding test planned two declared claims that restated human-written requirements as new requirements, because the planner compared only derived ids.
semantic_source_hash: 08a2b3625a42b4d4ff76acf34cd25af40af060166f3b9f15d632a1be090201a6
semantic_inventory:
  - claim_key: CLAIM-8038E29829F69DAC
    claim_text: The bootstrap planner must count a declared intent claim whose normalized statement or excerpt equals the title, the semantic text or one sentence of the semantic text of a current requirement as already in the KB under that requirement id
    role: normative
    status: modeled
    span:
      start: 0
      end: 239
  - claim_key: CLAIM-F4DEEAE961FCB464
    claim_text: The bootstrap planner must keep a declared intent claim that closely restates a current requirement without matching it exactly and must name that requirement in a review diagnostic
    role: normative
    status: modeled
    span:
      start: 241
      end: 422
  - claim_key: CLAIM-D75EA03CE26FF1F2
    claim_text: The close restatement threshold must be a token-set Jaccard similarity of 0.8
    role: normative
    status: modeled
    span:
      start: 424
      end: 501
id: REQ-bootstrap-claim-restatement
type: req
---
The bootstrap planner must count a declared intent claim whose normalized statement or excerpt equals the title, the semantic text or one sentence of the semantic text of a current requirement as already in the KB under that requirement id. The bootstrap planner must keep a declared intent claim that closely restates a current requirement without matching it exactly and must name that requirement in a review diagnostic. The close restatement threshold must be a token-set Jaccard similarity of 0.8.

## Context

An onboarding test on a test project ran bootstrap on a knowledge base that already held human-written requirements and declared ten intent claims. Two of them restated existing requirements (one was nearly the first sentence of an existing requirement), yet both were planned as new REQ-AUTO requirements and the per-source accounting reported none already in the KB, because the planner compared only the derived id of each claim. Only a normalized exact match is safe to drop automatically; similar wording can state a different rule, so a close match stays planned and is shown to the human. The 0.8 threshold is the one the entity-context check already uses to call a context section a restatement of its title.

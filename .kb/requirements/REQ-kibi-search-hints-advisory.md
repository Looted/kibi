---
title: Search hints stay advisory and never cost the answer
status: open
semantic_text: Search hints must not change the ranked results, the answer layer or abstention. A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer. Shadow search hints providers must be reported only as comparisons.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: b15c335ba7e311f3fe8460532c72ead4cdf76a624c3dca72aad1d272667daee1
semantic_inventory:
  - claim_key: CLAIM-8D339DFF9F8901C2
    claim_text: Search hints must not change the ranked results, the answer layer or abstention
    role: normative
    status: modeled
    span:
      start: 0
      end: 79
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-73FFF7BAEB1625ED
    claim_text: A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer
    role: normative
    status: modeled
    span:
      start: 81
      end: 225
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-60780132F98C5FB4
    claim_text: Shadow search hints providers must be reported only as comparisons
    role: normative
    status: modeled
    span:
      start: 227
      end: 293
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-8D339DFF9F8901C2
  - CLAIM-73FFF7BAEB1625ED
  - CLAIM-60780132F98C5FB4
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:55:30.995Z'
priority: should
required_evidence: tested
tags:
  - search
  - plugins
id: REQ-kibi-search-hints-advisory
type: req
---
Search hints must not change the ranked results, the answer layer or abstention. A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer. Shadow search hints providers must be reported only as comparisons.

## Context

composeSearchHints in packages/cli/src/plugins/compose-search-hints.ts runs the configured providers beside the lexical answer.

On Kibi's own KB, reworded questions found the expected requirement 2 times in 20, and the ranker still answered them with confident wrong requirements. Score fusion with embeddings lost most of the gain once abstention was kept, so hints are shown beside the lexical answer rather than merged into it. The 0.44 cut-off and the limit of 10 were measured on Kibi's KB: the trigger catches 17 of 18 reworded misses while firing on 6 of 30 gold questions, and 10 lifted hints include the expected requirement for 11 of 18 misses. All entity types are hinted because scenarios and tests often carry the user's wording, and a hit on one is shown as its requirement. A failing provider must never cost the agent the lexical answer.

## Why this changed

Split from REQ-kibi-search-hints-host by behavior: when hints are asked for, how a provider stays advisory, and which hints are shown. Each child is owned by the one function that decides it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."

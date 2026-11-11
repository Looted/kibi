---
title: kb_search asks for search hints only on a weak answer
status: open
semantic_text: Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fb3cecbbb18176a5d0dc328605181d7726765643e36723bb08936388f7b09176
semantic_inventory:
  - claim_key: CLAIM-8F329BC6BF5B7424
    claim_text: Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-8F329BC6BF5B7424
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:55:17.330Z'
priority: should
required_evidence: tested
tags:
  - search
  - plugins
id: REQ-kibi-search-hints-when-asked
type: req
---
Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44.

## Context

searchHintsTrigger in packages/cli/src/search-hints.ts decides whether an answer is weak enough to ask a provider.

On Kibi's own KB, reworded questions found the expected requirement 2 times in 20, and the ranker still answered them with confident wrong requirements. Score fusion with embeddings lost most of the gain once abstention was kept, so hints are shown beside the lexical answer rather than merged into it. The 0.44 cut-off and the limit of 10 were measured on Kibi's KB: the trigger catches 17 of 18 reworded misses while firing on 6 of 30 gold questions, and 10 lifted hints include the expected requirement for 11 of 18 misses. All entity types are hinted because scenarios and tests often carry the user's wording, and a hit on one is shown as its requirement. A failing provider must never cost the agent the lexical answer.

## Why this changed

Split from REQ-kibi-search-hints-host by behavior: when hints are asked for, how a provider stays advisory, and which hints are shown. Each child is owned by the one function that decides it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."

---
title: Which search hints are shown
status: open
semantic_text: A hint on a scenario, test or fact must be shown as the current requirement linked to it. At most 10 search hints must be shown, and the top three governing requirements of the answer must be omitted from them.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ef253515d3dd62261eb7b42e0b5ef15825affc12b0bb0f83a3a71785bd5a2a43
semantic_inventory:
  - claim_key: CLAIM-F640B005BF2EF4C0
    claim_text: A hint on a scenario, test or fact must be shown as the current requirement linked to it
    role: normative
    status: modeled
    span:
      start: 0
      end: 88
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-93A0ED478CA7630C
    claim_text: At most 10 search hints must be shown
    role: normative
    status: modeled
    span:
      start: 90
      end: 127
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-4B16FFAFEA181051
    claim_text: the top three governing requirements of the answer must be omitted from them
    role: normative
    status: modeled
    span:
      start: 133
      end: 209
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-F640B005BF2EF4C0
  - CLAIM-93A0ED478CA7630C
  - CLAIM-4B16FFAFEA181051
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."'
  approved_by: maintainer
  recorded_at: '2026-11-04T14:55:45.036Z'
priority: should
required_evidence: tested
tags:
  - search
  - plugins
id: REQ-kibi-search-hints-shown
type: req
---
A hint on a scenario, test or fact must be shown as the current requirement linked to it. At most 10 search hints must be shown, and the top three governing requirements of the answer must be omitted from them.

## Context

buildSearchHints in packages/cli/src/search-hints.ts lifts provider hits to requirements and trims the list.

On Kibi's own KB, reworded questions found the expected requirement 2 times in 20, and the ranker still answered them with confident wrong requirements. Score fusion with embeddings lost most of the gain once abstention was kept, so hints are shown beside the lexical answer rather than merged into it. The 0.44 cut-off and the limit of 10 were measured on Kibi's KB: the trigger catches 17 of 18 reworded misses while firing on 6 of 30 gold questions, and 10 lifted hints include the expected requirement for 11 of 18 misses. All entity types are hinted because scenarios and tests often carry the user's wording, and a hit on one is shown as its requirement. A failing provider must never cost the agent the lexical answer.

## Why this changed

Split from REQ-kibi-search-hints-host by behavior: when hints are asked for, how a provider stays advisory, and which hints are shown. Each child is owned by the one function that decides it.

## Source

> Maintainer decision, 2026-11-04, approving the behavior splits of broad requirements in the KB gold-standard review (split batch 1): "Agree to all."

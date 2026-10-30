---
title: kb_search adds advisory search hints to weak answers without changing the answer
status: open
priority: should
tags:
  - search
  - plugins
semantic_text: Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44. Search hints must not change the ranked results, the answer layer or abstention. A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer. A hint on a scenario, test or fact must be shown as the current requirement linked to it. At most 10 search hints must be shown, and the top three governing requirements of the answer must be omitted from them. Shadow search hints providers must be reported only as comparisons.
required_evidence: tested
origin:
  kind: agent
  recorded_at: '2026-10-29T19:17:31.538Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 334f0e855f4c7d0832bf3e9366e3906d5cd94dab3f27d4e880a4416972a76779
semantic_inventory:
  - claim_key: CLAIM-8F329BC6BF5B7424
    claim_text: Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44
    role: normative
    status: modeled
    span:
      start: 0
      end: 125
  - claim_key: CLAIM-8D339DFF9F8901C2
    claim_text: Search hints must not change the ranked results, the answer layer or abstention
    role: normative
    status: modeled
    span:
      start: 127
      end: 206
  - claim_key: CLAIM-73FFF7BAEB1625ED
    claim_text: A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer
    role: normative
    status: modeled
    span:
      start: 208
      end: 352
  - claim_key: CLAIM-F640B005BF2EF4C0
    claim_text: A hint on a scenario, test or fact must be shown as the current requirement linked to it
    role: normative
    status: modeled
    span:
      start: 354
      end: 442
  - claim_key: CLAIM-93A0ED478CA7630C
    claim_text: At most 10 search hints must be shown
    role: normative
    status: modeled
    span:
      start: 444
      end: 481
  - claim_key: CLAIM-4B16FFAFEA181051
    claim_text: the top three governing requirements of the answer must be omitted from them
    role: normative
    status: modeled
    span:
      start: 487
      end: 563
  - claim_key: CLAIM-60780132F98C5FB4
    claim_text: Shadow search hints providers must be reported only as comparisons
    role: normative
    status: modeled
    span:
      start: 565
      end: 631
logic_claims:
  - CLAIM-8F329BC6BF5B7424
  - CLAIM-8D339DFF9F8901C2
  - CLAIM-73FFF7BAEB1625ED
  - CLAIM-F640B005BF2EF4C0
  - CLAIM-93A0ED478CA7630C
  - CLAIM-4B16FFAFEA181051
  - CLAIM-60780132F98C5FB4
id: REQ-kibi-search-hints-host
type: req
---
Search hints must be requested from a provider only when the kb_search intent answer abstained or its top score is below 0.44. Search hints must not change the ranked results, the answer layer or abstention. A search hints provider that fails, times out or returns an invalid result must give no hints and a diagnostic, and the search must still answer. A hint on a scenario, test or fact must be shown as the current requirement linked to it. At most 10 search hints must be shown, and the top three governing requirements of the answer must be omitted from them. Shadow search hints providers must be reported only as comparisons.

## Context

On Kibi's own KB, reworded questions found the expected requirement 2 times in 20, and the ranker still answered them with confident wrong requirements. Score fusion with embeddings lost most of the gain once abstention was kept, so hints are shown beside the lexical answer rather than merged into it. The 0.44 cut-off and the limit of 10 were measured on Kibi's KB: the trigger catches 17 of 18 reworded misses while firing on 6 of 30 gold questions, and 10 lifted hints include the expected requirement for 11 of 18 misses. All entity types are hinted because scenarios and tests often carry the user's wording, and a hit on one is shown as its requirement. A failing provider must never cost the agent the lexical answer.

## Source

> Install in kibis own repo, all entities are fine, I'll leave the limits up to you (you can use kibis own kb and possibly measure)

Maintainer, project thread on semantic search, 2026-10-29.

---
title: The decision search limits
status: open
priority: must
required_evidence: tested
firmness: firm
tags:
  - search
  - retrieval
semantic_text: The kb_search meaning list shall hold at most 7 decisions. A kibi.search-hints.v1 request shall score at most 50000 entities. The kb_search meaning weight shall be 0.5. The kb_search default card count shall be 5. The kb_search governing coverage shall be 0.5.
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts). The values were measured on Kibi''s own gold sets under the earlier maintainer decision of 2026-10-29 on search limits: "I''ll leave the limits up to you (you can use kibis own kb and possibly measure)"'
  approved_by: maintainer
  recorded_at: '2026-11-25T19:29:23.493Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5fc647b42967f770a3e96df1605f3a67fa39f9aaa54b305ad128912b1dfcbec1
semantic_inventory:
  - claim_key: CLAIM-34F3B0773620022A
    claim_text: The kb_search meaning list shall hold at most 7 decisions
    role: normative
    status: modeled
    span:
      start: 0
      end: 57
  - claim_key: CLAIM-371DE5AA30FDA0A5
    claim_text: A kibi.search-hints.v1 request shall score at most 50000 entities
    role: normative
    status: modeled
    span:
      start: 59
      end: 124
  - claim_key: CLAIM-70305D5C0ABA4A52
    claim_text: The kb_search meaning weight shall be 0.5
    role: normative
    status: modeled
    span:
      start: 126
      end: 167
  - claim_key: CLAIM-65E191858CF4CFBC
    claim_text: The kb_search default card count shall be 5
    role: normative
    status: modeled
    span:
      start: 169
      end: 212
  - claim_key: CLAIM-68AA9A329F41C36B
    claim_text: The kb_search governing coverage shall be 0.5
    role: normative
    status: modeled
    span:
      start: 214
      end: 259
logic_claims:
  - CLAIM-34F3B0773620022A
  - CLAIM-371DE5AA30FDA0A5
  - CLAIM-70305D5C0ABA4A52
  - CLAIM-65E191858CF4CFBC
  - CLAIM-68AA9A329F41C36B
id: REQ-search-meaning-limits
type: req
---
The kb_search meaning list shall hold at most 7 decisions. A kibi.search-hints.v1 request shall score at most 50000 entities. The kb_search meaning weight shall be 0.5. The kb_search default card count shall be 5. The kb_search governing coverage shall be 0.5.

## Why this changed

At full weight close paraphrases pushed exact word matches out of the top three on Kibi's repository gold set; at weight 0.5 they keep their place and the plain-language Papra questions rank as well as at full weight. Kibi's own knowledge base sends about 4,800 decisions and linked entities to the provider, so the cap of 20 hints no longer fits; 50000 leaves room for a store ten times larger. Every question the knowledge base cannot answer stays below 0.4 coverage on the gold sets, so 0.5 separates them.

## Context

The meaning weight is the share of the meaning ranking against the word ranking in the fusion REQ-search-meaning-fusion records. The governing coverage is the share of the question's weight a card must cover for REQ-search-weak-answer to name it governing. This replaces REQ-kibi-search-hints-limits, whose weak score and ten shown hints no longer apply.

## Source

> Maintainer decision, 2026-11-25, on the question "Approve the six search requirement changes as worded?", after the offline replay of the retrieval rethink: "Approve all six". Maintainer decision, 2026-11-25, on the question "Keep a short related-by-meaning list beside the five decision cards?": "Keep up to 7 meaning-based ids" (every search shows 5 cards plus up to 7 ids ranked by embeddings through linked scenarios, tests and facts). The values were measured on Kibi's own gold sets under the earlier maintainer decision of 2026-10-29 on search limits: "I'll leave the limits up to you (you can use kibis own kb and possibly measure)"

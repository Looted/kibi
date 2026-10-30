---
title: The search hints limits
status: open
priority: must
firmness: firm
semantic_text: The search hints weak top score shall be 0.44. The search hints host shall show at most 10 hints. A kibi.search-hints.v1 result shall hold at most 20 hints. The bootstrap plan shall offer search hints from 50 requirement documents.
semantic_clauses:
  - The search hints weak top score shall be 0.44.
  - The search hints host shall show at most 10 hints.
  - A kibi.search-hints.v1 result shall hold at most 20 hints.
  - The bootstrap plan shall offer search hints from 50 requirement documents.
tags:
  - search
  - plugins
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-29, on the search hints limits: "I''ll leave the limits up to you (you can use kibis own kb and possibly measure)". Asked for proof of them the same day: "Did you create kibi proof?"'
  approved_by: maintainer
  recorded_at: '2026-10-29T21:27:19.027Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 13e51a6b1890e35cfa505b988e0d9b526469744a090ae383a79c765eaf70edd7
semantic_inventory:
  - claim_key: CLAIM-0258F9C5F29FFA38
    claim_text: The search hints weak top score shall be 0.44
    role: normative
    status: modeled
    span:
      start: 0
      end: 45
  - claim_key: CLAIM-B5C1FB6E9FBCDB23
    claim_text: The search hints host shall show at most 10 hints
    role: normative
    status: modeled
    span:
      start: 47
      end: 96
  - claim_key: CLAIM-B97B16DBF59019BC
    claim_text: A kibi.search-hints.v1 result shall hold at most 20 hints
    role: normative
    status: modeled
    span:
      start: 98
      end: 155
  - claim_key: CLAIM-7DEE8C099960FB94
    claim_text: The bootstrap plan shall offer search hints from 50 requirement documents
    role: normative
    status: modeled
    span:
      start: 157
      end: 230
logic_claims:
  - CLAIM-0258F9C5F29FFA38
  - CLAIM-B5C1FB6E9FBCDB23
  - CLAIM-B97B16DBF59019BC
  - CLAIM-7DEE8C099960FB94
id: REQ-kibi-search-hints-limits
type: req
---
The search hints weak top score shall be 0.44. The search hints host shall show at most 10 hints. A kibi.search-hints.v1 result shall hold at most 20 hints. The bootstrap plan shall offer search hints from 50 requirement documents.

## Context

These are the fixed numbers of kb_search search hints: SEARCH_HINT_WEAK_SCORE and SEARCH_HINT_LIMIT in packages/cli/src/search-hints.ts, SEARCH_HINTS_MAX_LIMIT in packages/plugin-sdk/src/capabilities/search-hints.ts and SEARCH_HINTS_OFFER_REQUIREMENTS in packages/cli/src/operations/bootstrap/plugin-offers.ts. They were measured on Kibi's own KB. Each one is stated here as a number so it is proved against the constant itself; how each is used stays in REQ-kibi-search-hints-host, REQ-capability-search-hints-v1 and REQ-kibi-plugin-search-hints.

## Source

"I'll leave the limits up to you (you can use kibis own kb and possibly measure)". Asked for proof of them the same day: "Did you create kibi proof?"
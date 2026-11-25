---
title: The search hints limits
status: closed
priority: must
firmness: firm
semantic_text: The search hints weak top score shall be 0.44. The search hints host shall show at most 10 hints. A kibi.search-hints.v1 result shall hold at most 20 hints.
semantic_clauses:
  - The search hints weak top score shall be 0.44.
  - The search hints host shall show at most 10 hints.
  - A kibi.search-hints.v1 result shall hold at most 20 hints.
tags:
  - search
  - plugins
  - proof
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-10-29, on the search hints limits: "I''ll leave the limits up to you (you can use kibis own kb and possibly measure)". Asked for proof of them the same day: "Did you create kibi proof?" Maintainer decision, 2026-11-24, on the question "Ship search hints on by default, or only offer them at every size?": "On by default, opt-out". The statement and context were brought in line with that decision the same day.'
  approved_by: maintainer
  recorded_at: '2026-11-24T08:20:13.143Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 8cc449476e4564bd4220d5eef33e7c3ca69feacb83d111bedc7e33b864cb9185
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
logic_claims:
  - CLAIM-0258F9C5F29FFA38
  - CLAIM-B5C1FB6E9FBCDB23
  - CLAIM-B97B16DBF59019BC
id: REQ-kibi-search-hints-limits
type: req
---
The search hints weak top score shall be 0.44. The search hints host shall show at most 10 hints. A kibi.search-hints.v1 result shall hold at most 20 hints.

## Context

These are the fixed numbers of kb_search search hints: SEARCH_HINT_WEAK_SCORE and SEARCH_HINT_LIMIT in packages/cli/src/search-hints.ts and SEARCH_HINTS_MAX_LIMIT in packages/plugin-sdk/src/capabilities/search-hints.ts. They were measured on Kibi's own KB. Each one is stated here as a number so it is proved against the constant itself; how each is used stays in REQ-kibi-search-hints-shown, REQ-capability-search-hints-v1 and REQ-kibi-plugin-search-hints. A fourth limit, the number of requirement documents from which bootstrap offers search hints, is gone: search hints are on by default, as REQ-kibi-search-hints-default states.

## Source

> Maintainer decision, 2026-10-29, on the search hints limits: "I'll leave the limits up to you (you can use kibis own kb and possibly measure)". Asked for proof of them the same day: "Did you create kibi proof?" Maintainer decision, 2026-11-24, on the question "Ship search hints on by default, or only offer them at every size?": "On by default, opt-out".
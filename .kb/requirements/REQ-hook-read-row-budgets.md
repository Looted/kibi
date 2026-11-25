---
title: Read and search rows stay within per-event and per-session budgets, each requirement once
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 4 of 6: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:29:06.242Z'
semantic_text: A read or search hook must show at most 3 rows per event, or 5 for a whole file, and at most 10 rows and 2,300 characters per session. A read or search hook must show each requirement at most once per session, counting rows that a Kibi tool result already showed, except that it shows a firm requirement of the focused symbol once.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5d60571dd7575ad012b63c42f8c07c096b6a6a71bdb6b7ae8a8fa23d06271e03
semantic_inventory:
  - claim_key: CLAIM-886415574118F48E
    claim_text: A read or search hook must show at most 3 rows per event, or 5 for a whole file, and at most 10 rows and 2,300 characters per session
    role: normative
    status: modeled
    span:
      start: 0
      end: 133
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
  - claim_key: CLAIM-E1F55BBCFBB61C24
    claim_text: A read or search hook must show each requirement at most once per session, counting rows that a Kibi tool result already showed, except that it shows a firm requirement of the focused symbol once
    role: exception
    status: modeled
    span:
      start: 135
      end: 330
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-886415574118F48E
  - CLAIM-E1F55BBCFBB61C24
rationale: Benchmark cost work found that repeated and oversized context drives cost without improving success; the budgets keep read hooks below the old per-session text while a firm rule still reaches the agent before it changes the code.
id: REQ-hook-read-row-budgets
type: req
---
A read or search hook must show at most 3 rows per event, or 5 for a whole file, and at most 10 rows and 2,300 characters per session. A read or search hook must show each requirement at most once per session, counting rows that a Kibi tool result already showed, except that it shows a firm requirement of the focused symbol once.

## Context

Benchmark cost work found that repeated and oversized context drives cost without improving success; the budgets keep read hooks below the old per-session text while a firm rule still reaches the agent before it changes the code.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, statement 4 of 6: 'Approve all as worded'.

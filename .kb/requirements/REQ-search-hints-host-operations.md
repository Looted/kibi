---
title: Operations that may ask for search hints
status: open
priority: must
firmness: firm
tags:
  - proof
semantic_text: An operation that may call an external search hints provider shall be kb_search.
semantic_clauses:
  - An operation that may call an external search hints provider shall be kb_search.
origin:
  kind: agent
  ref: 'Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"'
  approved_by: maintainer
  recorded_at: '2026-10-30T19:43:27.448Z'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0b625fa0d6614c062a80cd525493754304c9d2481bbfa983047da8f5ad3b163c
semantic_inventory:
  - claim_key: CLAIM-D55E7279A67FA32C
    claim_text: An operation that may call an external search hints provider shall be kb_search
    role: normative
    status: modeled
    span:
      start: 0
      end: 79
logic_claims:
  - CLAIM-D55E7279A67FA32C
id: REQ-search-hints-host-operations
type: req
---
An operation that may call an external search hints provider shall be kb_search.

## Context

REQ-kibi-search-hints-host lets an external search-hints provider add advice next to a search answer, while checks, proofs and writes stay builtin-only. The operations that may call such a provider are stated here so they are proved against EXTERNAL_SEARCH_HINTS_OPERATIONS in packages/cli/src/plugins/external-allowlist.ts.

## Source

Maintainer request, 2026-10-30, to keep proving structural requirements: "Can you continue prooving additional requirements?"

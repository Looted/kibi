---
title: The one-time search tip is skipped when the first search already gets rows
status: open
priority: must
firmness: default
required_evidence: tested
tags:
  - hooks
  - read-rows
origin:
  kind: agent
  ref: 'Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, changed statements: ''Approve all as worded''.'
  approved_by: maintainer
  recorded_at: '2026-11-25T14:30:33.493Z'
semantic_text: A host hook must skip the one-time search tip when the session's first search already gets requirement rows.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f645b7c951b75e9de02b5b3ff64bbf5bb8e09b6455f4ec9c423ae10efbd4a076
semantic_inventory:
  - claim_key: CLAIM-702044181C6C0136
    claim_text: A host hook must skip the one-time search tip when the session's first search already gets requirement rows
    role: normative
    status: modeled
    span:
      start: 0
      end: 107
    subjects:
      - kibi.host.read_rows
    reason: Grounded by the linked fact with this claim key.
logic_claims:
  - CLAIM-702044181C6C0136
rationale: A search that already shows the requirements of the code it matched has the answer the tip points to, so the tip only adds cost.
id: REQ-hook-search-tip-after-rows
type: req
---
A host hook must skip the one-time search tip when the session's first search already gets requirement rows.

## Context

A search that already shows the requirements of the code it matched has the answer the tip points to, so the tip only adds cost.

## Source

> Maintainer approval of the read and search hook statements built on the Nov 25 cost analysis, changed statements: 'Approve all as worded'.

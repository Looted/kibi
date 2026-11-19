---
title: A cut list result returns at least one row
status: open
priority: must
required_evidence: tested
semantic_text: A list result cut to the size budget must return at least one row.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ea05a4519a5dcf1aeaeafd0b4ce005b2fa0bdb85580c9833d22e29b9f199357d
semantic_inventory:
  - claim_key: CLAIM-9F15CD82492548EB
    claim_text: A list result cut to the size budget must return at least one row
    role: normative
    status: modeled
    span:
      start: 0
      end: 65
logic_claims:
  - CLAIM-9F15CD82492548EB
rationale: A page of no rows would leave the agent nothing to act on and no way forward, since the next offset would not move.
id: REQ-result-budget-min-row
type: req
---
A list result cut to the size budget must return at least one row.

## Why

A page of no rows would leave the agent nothing to act on and no way forward, since the next offset would not move.

## Context

rowsWithinBudget counts the rows that fit and never fewer than one when there are rows; a single row past the budget is cut instead.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

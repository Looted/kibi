---
title: kb_coverage and kb_query list summary rows by default
status: open
priority: must
required_evidence: tested
semantic_text: kb_coverage, and kb_query without an id, must return summary rows unless the call passes fields full.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: f281b04afd32085ef8cb99cb2634eafcbb2abf0737dd5242eac02e213d3af43f
semantic_inventory:
  - claim_key: CLAIM-A7AE6BF79B3CAA40
    claim_text: kb_coverage, and kb_query without an id, must return summary rows unless the call passes fields full
    role: exception
    status: modeled
    span:
      start: 0
      end: 100
logic_claims:
  - CLAIM-A7AE6BF79B3CAA40
rationale: A listing is read to pick the next row to open; summary rows fit many more rows in the budget, and the full row is one call with an id or fields full away.
id: REQ-summary-rows-default
type: req
---
kb_coverage, and kb_query without an id, must return summary rows unless the call passes fields full.

## Why

A listing is read to pick the next row to open; summary rows fit many more rows in the budget, and the full row is one call with an id or fields full away.

## Context

kb_query summary rows keep the summary fields and firmness. kb_coverage summary rows drop test resolutions and reduce each proof stage to its status. kb_query with an id keeps the full entity.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

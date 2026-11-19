---
title: kb_coverage reports how many rows match its filters
status: open
priority: must
required_evidence: tested
semantic_text: kb_coverage must report the number of rows that match its filters.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0b3fdefada43164f600159c162b31932539f564c71fffea2b2a3bdcd1150dd6a
semantic_inventory:
  - claim_key: CLAIM-4A4D7DC83A23AECA
    claim_text: kb_coverage must report the number of rows that match its filters
    role: normative
    status: modeled
    span:
      start: 0
      end: 65
logic_claims:
  - CLAIM-4A4D7DC83A23AECA
rationale: 'Paging needs the total: without it an agent cannot tell how many pages are left or whether a short page was the last.'
id: REQ-coverage-matched-count
type: req
---
kb_coverage must report the number of rows that match its filters.

## Why

Paging needs the total: without it an agent cannot tell how many pages are left or whether a short page was the last.

## Context

The engine counts the sorted rows before the page is taken and returns it as matched; the truncation total uses it.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

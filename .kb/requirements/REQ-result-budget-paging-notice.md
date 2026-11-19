---
title: A cut result says what it left out and how to page on
status: open
priority: must
required_evidence: tested
semantic_text: A result cut to the size budget must state how many rows it returned, how many it left out and the offset to call again with, and name that call in its next actions.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0cf992a9782cb3761bf799cde74c95d7d94768de099ac3a300986dde2589381c
semantic_inventory:
  - claim_key: CLAIM-7406D1765BB0EA20
    claim_text: A result cut to the size budget must state how many rows it returned, how many it left out and the offset to call again with, and name that call in its next actions
    role: normative
    status: modeled
    span:
      start: 0
      end: 164
logic_claims:
  - CLAIM-7406D1765BB0EA20
rationale: An agent that cannot tell a result was cut reads a partial answer as the whole one; naming the next call lets it page without guessing.
id: REQ-result-budget-paging-notice
type: req
---
A result cut to the size budget must state how many rows it returned, how many it left out and the offset to call again with, and name that call in its next actions.

## Why

An agent that cannot tell a result was cut reads a partial answer as the whole one; naming the next call lets it page without guessing.

## Context

The result carries truncated and truncation (returned, total, omitted, nextOffset, hint), a RESULT_TRUNCATED diagnostic, the paging sentence in its text and a next action with the offset.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

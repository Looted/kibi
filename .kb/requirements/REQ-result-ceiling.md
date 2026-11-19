---
title: A list or report read over 64,000 characters is refused
status: open
priority: must
required_evidence: tested
semantic_text: A list or report read result larger than 64,000 characters must be refused with RESULT_TOO_LARGE.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: a55637e8e4e9963adce06216236ccbb663e28fcd1263211e929e574af4a3bc0f
semantic_inventory:
  - claim_key: CLAIM-EF5419EC9C36D96C
    claim_text: A list or report read result larger than 64,000 characters must be refused with RESULT_TOO_LARGE
    role: normative
    status: modeled
    span:
      start: 0
      end: 96
logic_claims:
  - CLAIM-EF5419EC9C36D96C
rationale: An operation that has not declared a cut, or one whose cut fails, must not hand a host a result it cannot carry; a coded refusal tells the agent to narrow the call.
id: REQ-result-ceiling
type: req
---
A list or report read result larger than 64,000 characters must be refused with RESULT_TOO_LARGE.

## Why

An operation that has not declared a cut, or one whose cut fails, must not hand a host a result it cannot carry; a coded refusal tells the agent to narrow the call.

## Context

refuseOverCeiling runs after the cut on both routes. A write has already committed, so its result is returned as it is. An operation declared bounded (a status, a skill, the prepare-impact-review template) has no smaller form to ask for and is returned whole. Maintainer decision, 2026-11-19: outputs that cannot be narrowed are exempt.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

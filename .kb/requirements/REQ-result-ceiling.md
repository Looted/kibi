---
title: A read result over 64,000 characters is refused
status: open
priority: must
required_evidence: tested
semantic_text: A read operation result larger than 64,000 characters must be refused with RESULT_TOO_LARGE.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4f669b7227901e5d3f42f129aabc77e9f7abe9930cd794d0d084233352229976
semantic_inventory:
  - claim_key: CLAIM-AA3C191D2A8A9B73
    claim_text: A read operation result larger than 64,000 characters must be refused with RESULT_TOO_LARGE
    role: normative
    status: modeled
    span:
      start: 0
      end: 91
logic_claims:
  - CLAIM-AA3C191D2A8A9B73
rationale: An operation that has not declared a cut, or one whose cut fails, must not hand a host a result it cannot carry; a coded refusal tells the agent to narrow the call.
id: REQ-result-ceiling
type: req
---
A read operation result larger than 64,000 characters must be refused with RESULT_TOO_LARGE.

## Why

An operation that has not declared a cut, or one whose cut fails, must not hand a host a result it cannot carry; a coded refusal tells the agent to narrow the call.

## Context

refuseOverCeiling runs after the cut on both routes. A write has already committed, so its result is returned as it is.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

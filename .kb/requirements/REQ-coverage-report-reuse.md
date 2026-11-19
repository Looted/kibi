---
title: A repeated kb_coverage call reuses its report
status: open
priority: must
required_evidence: tested
semantic_text: A repeated kb_coverage call on an unchanged store must not recompute the report.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 46a73dc86644510b29c610b417ec0b8e21f67ed01b039a3bd3fa08ef535d4c46
semantic_inventory:
  - claim_key: CLAIM-FC0CC3C697C9B42A
    claim_text: A repeated kb_coverage call on an unchanged store must not recompute the report
    role: normative
    status: modeled
    span:
      start: 0
      end: 79
logic_claims:
  - CLAIM-FC0CC3C697C9B42A
rationale: A coverage report took about 8 seconds and was rebuilt for every page because its cache key held the call's own time; paging through it ran past a host's 60-second timeout.
id: REQ-coverage-report-reuse
type: req
---
A repeated kb_coverage call on an unchanged store must not recompute the report.

## Why

A coverage report took about 8 seconds and was rebuilt for every page because its cache key held the call's own time; paging through it ran past a host's 60-second timeout.

## Context

coverageCheckTime rounds the check time down to a 15-minute window, so the engine's memo key repeats for calls on the same store.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

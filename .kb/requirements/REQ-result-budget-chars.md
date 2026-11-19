---
title: An operation result keeps its data within 24,000 characters
status: open
priority: must
required_evidence: tested
semantic_text: Each operation result returned over MCP or the CLI JSON route must keep its data within 24,000 characters.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 0ebcde24816cec05f2f100334327186caa84f0bfec1727b5cac8a0c6b332d5f2
semantic_inventory:
  - claim_key: CLAIM-9B42F6BC43A4E742
    claim_text: Each operation result returned over MCP or the CLI JSON route must keep its data within 24,000 characters
    role: normative
    status: modeled
    span:
      start: 0
      end: 105
logic_claims:
  - CLAIM-9B42F6BC43A4E742
rationale: A host with a tool-result cap refuses or cuts an oversized result, and an agent pays for every character it reads; one budget for every operation keeps every result readable on every host.
id: REQ-result-budget-chars
type: req
---
Each operation result returned over MCP or the CLI JSON route must keep its data within 24,000 characters.

## Why

A host with a tool-result cap refuses or cuts an oversized result, and an agent pays for every character it reads; one budget for every operation keeps every result readable on every host.

## Context

The budget is RESULT_BUDGET_CHARS in result-budget.ts. A list operation cuts its rows to it; kb_coverage and kb_check fit their own results to it; an operation whose result is bounded by its input declares why.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

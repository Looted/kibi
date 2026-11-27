---
title: kb_coverage returns its plans as summaries by default
status: open
priority: must
required_evidence: tested
semantic_text: kb_coverage must return its repair and migration plans as summaries unless the call passes fields full.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 1fb13e1c929037bba235b2e6b417d057d36b0ed451e5e9e5c1e587db5460ced7
semantic_inventory:
  - claim_key: CLAIM-344BCCACD34F6B1B
    claim_text: kb_coverage must return its repair and migration plans as summaries unless the call passes fields full
    role: exception
    status: modeled
    span:
      start: 0
      end: 102
logic_claims:
  - CLAIM-344BCCACD34F6B1B
rationale: The plans repeat every batch and action of every row and were most of a 5 MB result; their summaries say what is ready and where the full plan is.
id: REQ-coverage-plan-summaries
type: req
---
kb_coverage must return its repair and migration plans as summaries unless the call passes fields full.

## Why

The plans repeat every batch and action of every row and were most of a 5 MB result; their summaries say what is ready and where the full plan is.

## Context

repairPlanSummary, symbolRepairPlanSummary and migrationPlanSummary carry a hint naming fields full and kb_check includeMigrationPlan.

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

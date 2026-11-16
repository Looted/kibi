---
title: An unscoped kb_check keeps to the scoped check's size budget
status: open
priority: must
required_evidence: tested
semantic_text: kb_check run without a rule or file scope must cut its result to the same size budget as a scoped check, keeping each blocking rule and the full violation count.
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
  ref: 'Measured on Kibi''s own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413.'
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 843d1b027dfd95a3dbe3d16555637d0ca2cd6bdb31278678372f219d581cd6db
semantic_inventory:
  - claim_key: CLAIM-0022C0CB43F80E52
    claim_text: kb_check run without a rule or file scope must cut its result to the same size budget as a scoped check, keeping each blocking rule and the full violation count
    role: normative
    status: modeled
    span:
      start: 0
      end: 160
logic_claims:
  - CLAIM-0022C0CB43F80E52
id: REQ-check-unscoped-budget
type: req
---
kb_check run without a rule or file scope must cut its result to the same size budget as a scoped check, keeping each blocking rule and the full violation count.

## Why

A scoped kb_check already keeps to 24,000 characters, but the unfiltered check that skills ask for before completion had no limit, so a KB with many findings returned a result a host with a tool-result cap may cut or refuse. Cutting it the same way keeps the verdict and every blocking rule visible, and a rule selection or kibi check --format json still lists every finding.

## Context

The budget reduces advisory findings to counts by id first, then a migration plan not asked for in full to its summary, then lists blocking findings past the budget by rule and entity id. The kibi check command and kb_apply_plan's remaining-plan read keep the full listing.

## Source

> Measured on Kibi's own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413.
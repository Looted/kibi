---
title: kb_check gives the advice impact diagnostics of one kind share once
status: open
firmness: default
priority: should
required_evidence: tested
tags:
  - check
  - mcp
  - cost
semantic_text: kb_check must give the advice shared by impact diagnostics of one kind once per result, not once per diagnostic.
origin:
  kind: agent
  ref: 'Maintainer approval, 2026-11-24, of the statement as worded: "All approved."'
  approved_by: maintainer
  recorded_at: '2026-11-24T19:21:17.135Z'
semantic_inventory:
  - claim_key: CLAIM-7940B35306DD7AF0
    claim_text: kb_check must give the advice shared by impact diagnostics of one kind once per result, not once per diagnostic
    role: normative
    status: modeled
    span:
      start: 0
      end: 111
logic_claims:
  - CLAIM-7940B35306DD7AF0
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5156d68e402de8426959179b681484fc060d53406532d362681afbbe44b94201
rationale: 'Every requirement_statement_unverified and symbol_semantic_review_needed diagnostic carried the same advice paragraph with only its ids changed: 6,803 of the 22,988 impact-diagnostic characters of a kb_check scoped to packages/cli/src/public/operations/check-format-shared.ts.'
id: REQ-kb-check-impact-advice-once
type: req
---
kb_check must give the advice shared by impact diagnostics of one kind once per result, not once per diagnostic.

## Context

Every requirement_statement_unverified and symbol_semantic_review_needed diagnostic carried the same advice paragraph with only its ids changed: 6,803 of the 22,988 impact-diagnostic characters of a kb_check scoped to packages/cli/src/public/operations/check-format-shared.ts.

## Source

> All approved.

Maintainer reply, 2026-11-24, to the four statements proposed for the second benchmark cost change.

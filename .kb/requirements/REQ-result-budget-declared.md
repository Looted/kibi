---
title: Every operation declares how its result keeps to the budget
status: open
priority: must
required_evidence: tested
semantic_text: Every operation in the catalog must declare how its result is kept to the size budget.
tags:
  - result-budget
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host''s 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout. Maintainer decision, 2026-11-19, approving this statement as worded.'
  recorded_at: '2026-11-19T16:00:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: d8d7ae1636def8d5954d2f3fc262868512675cb90c4d43166516068913497ea9
semantic_inventory:
  - claim_key: CLAIM-65ED34B69518029E
    claim_text: Every operation in the catalog must declare how its result is kept to the size budget
    role: normative
    status: modeled
    span:
      start: 0
      end: 85
logic_claims:
  - CLAIM-65ED34B69518029E
rationale: A new operation without a declaration would be the next oversized result; the declaration makes the choice explicit and testable.
id: REQ-result-budget-declared
type: req
---
Every operation in the catalog must declare how its result is kept to the size budget.

## Why

A new operation without a declaration would be the next oversized result; the declaration makes the choice explicit and testable.

## Context

RESULT_BUDGETS maps each catalog operation to rows (cut by the shared fitter), fitted (the operation fits itself) or bounded (its input bounds its result, with the reason).

## Source

> Measured on Kibi's own KB, 2026-11-19: kb_coverage returned 5 MB by default and 21 MB with limit 500, past another host's 8 MiB tool-result cap, and kb_query and kb_find_gaps calls ran past its 60-second timeout.

---
title: A kb_check scoped to changed files lists what concerns the change and fits a budget
status: open
priority: must
required_evidence: tested
tags:
  - check
  - mcp
  - impact
semantic_text: 'A kb_check scoped to sourceFiles without selected rules must list only these blocking violations: those on entities the changed symbols link to, on entities whose KB document differs from HEAD, on relationships with either end among them, on the checked files, and from store-level rules. A scoped kb_check must count every blocking violation it leaves out, and its count must include them. A scoped kb_check must return the migration plan''s summary unless includeMigrationPlan is set. A scoped kb_check result larger than 24,000 characters must be cut to that budget and marked truncated, and must keep every blocking violation''s rule and every impact diagnostic.'
semantic_clauses:
  - 'A kb_check scoped to sourceFiles without selected rules must list only these blocking violations: those on entities the changed symbols link to, on entities whose KB document differs from HEAD, on relationships with either end among them, on the checked files, and from store-level rules.'
  - A scoped kb_check must count every blocking violation it leaves out, and its count must include them.
  - A scoped kb_check must return the migration plan's summary unless includeMigrationPlan is set.
  - A scoped kb_check result larger than 24,000 characters must be cut to that budget and marked truncated, and must keep every blocking violation's rule and every impact diagnostic.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2ba823beae146d535a27fe3c4b3c422fd6e6a23ba95d794ee79faf6501ba4fce
semantic_inventory:
  - claim_key: CLAIM-AA5115AE449B1349
    claim_text: 'A kb_check scoped to sourceFiles without selected rules must list only these blocking violations: those on entities the changed symbols link to, on entities whose KB document differs from HEAD, on relationships with either end among them, on the checked files, and from store-level rules'
    role: normative
    status: modeled
    span:
      start: 0
      end: 287
  - claim_key: CLAIM-9F12A730665987AD
    claim_text: A scoped kb_check must count every blocking violation it leaves out, and its count must include them
    role: normative
    status: modeled
    span:
      start: 289
      end: 389
  - claim_key: CLAIM-97388A7FA57B32CB
    claim_text: A scoped kb_check must return the migration plan's summary unless includeMigrationPlan is set
    role: exception
    status: modeled
    span:
      start: 391
      end: 484
  - claim_key: CLAIM-561CD37B5094F913
    claim_text: A scoped kb_check result larger than 24,000 characters must be cut to that budget and marked truncated, and must keep every blocking violation's rule and every impact diagnostic
    role: normative
    status: modeled
    span:
      start: 486
      end: 663
logic_claims:
  - CLAIM-AA5115AE449B1349
  - CLAIM-9F12A730665987AD
  - CLAIM-97388A7FA57B32CB
  - CLAIM-561CD37B5094F913
origin:
  kind: agent
  approved_by: maintainer
  recorded_at: '2026-11-15T18:42:15.306Z'
rationale: On a large knowledge base one kb_check scoped to the changed files returned about 655,000 characters, nearly all of it violations the change did not touch.
id: REQ-kibi-scoped-check-output
type: req
---
A kb_check scoped to sourceFiles without selected rules must list only these blocking violations: those on entities the changed symbols link to, on entities whose KB document differs from HEAD, on relationships with either end among them, on the checked files, and from store-level rules. A scoped kb_check must count every blocking violation it leaves out, and its count must include them. A scoped kb_check must return the migration plan's summary unless includeMigrationPlan is set. A scoped kb_check result larger than 24,000 characters must be cut to that budget and marked truncated, and must keep every blocking violation's rule and every impact diagnostic.

## Context

An agent checks the files it changed with kb_check sourceFiles. On a large knowledge base with many unrelated blocking violations, one such check returned about 655,000 characters, nearly all of it findings the change did not touch, and the agent paid for that output on every check. The scoped result now lists what concerns the change and counts the rest, so the agent still learns that the KB blocks elsewhere; the full list stays one unscoped kb_check away. The budget keeps every blocking rule visible, so cutting the output never hides why the check blocks.

## Source

Maintainer-approved statement (2026-11-15): "A kb_check scoped to sourceFiles without selected rules must list only these blocking violations: those on entities the changed symbols link to, on entities whose KB document differs from HEAD, on relationships with either end among them, on the checked files, and from store-level rules. A scoped kb_check must count every blocking violation it leaves out, and its count must include them. A scoped kb_check must return the migration plan's summary unless includeMigrationPlan is set. A scoped kb_check result larger than 24,000 characters must be cut to that budget and marked truncated, and must keep every blocking violation's rule and every impact diagnostic."
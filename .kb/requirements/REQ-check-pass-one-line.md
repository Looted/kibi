---
title: A passing check is one line
status: open
priority: must
required_evidence: tested
semantic_text: A passing kibi check must give its verdict, the number of rules evaluated and the count of non-blocking unrecorded declarations on one line, and kb_check must report the evaluated rules as a count, naming them only when fewer than the default rules ran.
tags:
  - check
origin:
  kind: agent
  ref: 'Measured on Kibi''s own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413. Maintainer decision, 2026-11-16, approving this statement as worded.'
  recorded_at: '2026-11-16T15:47:00.000Z'
  approved_by: maintainer
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: dffd4baa052a1aa4c36399d3110be626c7623fbd325c3d39b65bcf7bd87618c0
semantic_inventory:
  - claim_key: CLAIM-D681119B9237EF78
    claim_text: A passing kibi check must give its verdict, the number of rules evaluated and the count of non-blocking unrecorded declarations on one line, and kb_check must report the evaluated rules as a count, naming them only when fewer than the default rules ran
    role: normative
    status: modeled
    span:
      start: 0
      end: 252
logic_claims:
  - CLAIM-D681119B9237EF78
id: REQ-check-pass-one-line
type: req
---
A passing kibi check must give its verdict, the number of rules evaluated and the count of non-blocking unrecorded declarations on one line, and kb_check must report the evaluated rules as a count, naming them only when fewer than the default rules ran.

## Why

A pass is the most common check result and the one an agent needs least detail about. The rule list alone was 1,655 characters of a 2,500-character scoped pass, and naming every rule tells the agent nothing it acts on. A count still shows that rules ran, so "no violations" is never read as "nothing evaluated"; the names matter only when a run skipped some.

## Context

The target line reads: ✓ No violations. 66 rules. 2,924 unrecorded declarations in 522 files do not block (kibi check --symbol-debt lists them). Advisory quality diagnostics still follow the line when there are any.

## Source

> Measured on Kibi's own KB, 2026-11-16: a passing kibi check printed 89,524 characters and an unfiltered kb_check returned 105,413.
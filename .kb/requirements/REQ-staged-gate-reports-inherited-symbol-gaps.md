---
title: Staged gate reports inherited symbol gaps as a non-blocking note
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must report the number of unrecorded declarations the commit did not touch as a non-blocking line per staged file that says no action is required.
semantic_clauses:
  - kibi check --staged must report the number of unrecorded declarations the commit did not touch as a non-blocking line per staged file that says no action is required.
logic_claims:
  - CLAIM-6D1CFAACB8D8D730
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 5371ab476b7103d02779b0fe92dfd878b9ca7f78ad6779c569d53be58d205a75
semantic_inventory:
  - claim_key: CLAIM-6D1CFAACB8D8D730
    claim_text: kibi check --staged must report the number of unrecorded declarations the commit did not touch as a non-blocking line per staged file that says no action is required
    role: normative
    status: modeled
    span:
      start: 0
      end: 165
    reason: Grounded by the linked fact with this claim key.
tags:
  - staged-gate
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement as written.'
id: REQ-staged-gate-reports-inherited-symbol-gaps
type: req
---
kibi check --staged must report the number of unrecorded declarations the commit did not touch as a non-blocking line per staged file that says no action is required.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. Once untouched declarations stop being judged they must not disappear: the staged check names the count per file as a note that says no action is required, and lists them in its JSON output as inheritedSymbolGaps, so the gap stays visible without blocking or prompting an agent to backfill it mid-change.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement as written.

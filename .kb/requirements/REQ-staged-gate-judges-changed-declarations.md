---
title: Staged gate judges symbol records only for the declarations a commit touches
status: open
priority: must
required_evidence: tested
semantic_text: kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record.
semantic_clauses:
  - kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record.
logic_claims:
  - CLAIM-D3EB3F22D7FCEF6A
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: ff1a625cfb88fdc96ac2b5e716fb3011e0f096c3e3860346eff7d69ffbe33d0e
semantic_inventory:
  - claim_key: CLAIM-D3EB3F22D7FCEF6A
    claim_text: kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record
    role: normative
    status: modeled
    span:
      start: 0
      end: 270
    reason: Grounded by the linked fact with this claim key.
tags:
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
  approved_by: maintainer
  ref: 'Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.'
id: REQ-staged-gate-judges-changed-declarations
type: req
---
kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record.

## Context

A benchmark run of agents working in an onboarded open-source repository showed the staged gate refusing 57% of correct commits. Onboarding records the code that decides each behavior, not every declaration, so most source files keep declarations without a symbol record; the gate demanded a record for every declaration in each staged file, and an agent whose change touched one function was blocked over neighbours it never edited. Judging only what the commit adds, changes, removes or renames keeps every gap the commit creates blocking while the gaps it inherited stop refusing correct work. This narrows the symbols_manifest_stale part of REQ-cli-staged-impact-enforcement and needs no mode or configuration.

## Source

> Maintainer, in review on 2026-11-16: approved this requirement statement in its reworded form.

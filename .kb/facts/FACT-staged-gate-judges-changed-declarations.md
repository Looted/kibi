---
title: kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: judges_symbol_records_only_for_touched_declarations
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-D3EB3F22D7FCEF6A
claim_text: kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record
text_ref: REQ-staged-gate-judges-changed-declarations
tags:
  - lane:strict
  - fact:property_value
  - staged-gate
  - symbols
  - traceability
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-staged-gate-judges-changed-declarations
type: fact
---
kibi check --staged must block on a missing symbol record only for a declaration the staged commit adds or changes or whose record the commit removes, and on an orphaned record only when the staged commit removes or renames its declaration or adds or changes that record. Grounds the clause of REQ-staged-gate-judges-changed-declarations.
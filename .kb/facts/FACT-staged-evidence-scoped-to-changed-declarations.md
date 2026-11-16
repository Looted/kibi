---
title: kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: unrecorded_changed_declarations_in_covered_file
operator: eq
value_type: int
value_int: 0
claim_key: CLAIM-880E2296A2D19722
claim_text: kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record
text_ref: REQ-staged-evidence-scoped-to-changed-declarations
tags:
  - lane:strict
  - fact:property_value
  - staged-gate
  - symbols
  - impact
origin:
  kind: agent
  recorded_at: '2026-11-16T09:00:00.000Z'
id: FACT-staged-evidence-scoped-to-changed-declarations
type: fact
---
kibi check --staged must not raise kibi_impact_evidence_missing for a staged file when every declaration the commit adds or changes in that file has a symbol record. Grounds the clause of REQ-staged-evidence-scoped-to-changed-declarations.
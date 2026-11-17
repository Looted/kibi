---
title: An unscoped check lists symbol debt per file only when asked
status: active
fact_kind: property_value
subject_key: kibi.check
property_key: symbol_debt_files_listed_unasked
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - check
  - symbols
origin:
  kind: agent
  recorded_at: '2026-11-16T15:47:00.000Z'
claim_key: CLAIM-EE6659EC1CAF94D7
claim_text: kibi check and kb_check run without a rule or file scope must report unrecorded declarations in files that have at least one symbol record as a non-blocking count of declarations and files, and must list them per file only when asked with kibi check --symbol-debt or kb_check includeSymbolDebt:true
text_ref: REQ-check-symbol-debt-count
id: FACT-check-symbol-debt-count
type: fact
---
An unscoped check reports symbol debt as counts of declarations and files; no file is listed unless kibi check --symbol-debt or kb_check includeSymbolDebt:true asks. Grounds the clause of REQ-check-symbol-debt-count.
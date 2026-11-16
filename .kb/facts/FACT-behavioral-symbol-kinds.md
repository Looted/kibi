---
title: The extracted symbol kinds that always need an implements link shall be function, class, method, property and accessor
status: active
fact_kind: property_value
subject_key: kibi.cli.check.staged
property_key: behavioral_symbol_kinds
operator: eq
value_type: set
value_set:
  - function
  - class
  - method
  - property
  - accessor
claim_key: CLAIM-90076AA08D1342F3
claim_text: The extracted symbol kinds that always need an implements link shall be function, class, method, property and accessor
text_ref: REQ-behavioral-kinds-keep-implements
origin:
  kind: agent
  recorded_at: '2026-11-16T11:03:59.017Z'
id: FACT-behavioral-symbol-kinds
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still lists exactly these values.
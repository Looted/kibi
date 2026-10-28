---
title: Claim-bound proofs shall start at KB schema version 12
status: active
fact_kind: property_value
subject_key: kibi.claim_bound_proof.settings
claim_key: CLAIM-5946ECFCE6EFE677
claim_text: Claim-bound proofs shall start at KB schema version 12
text_ref: REQ-kibi-claim-bound-proof-settings
property_key: claim_binding_schema_version
operator: eq
value_type: int
value_int: 12
origin:
  kind: agent
  recorded_at: '2026-10-28T10:57:37.433Z'
id: FACT-claim-binding-schema-version
type: fact
---
REQ-kibi-claim-bound-proofs binds proofs to claims: a receipt records one of a closed list of outcomes, the binding arrived with KB schema 12, and kb_check reports contracts that name no claims under its own rule. Each is stated here so it is proved against the constant.
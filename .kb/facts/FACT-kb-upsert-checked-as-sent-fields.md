---
title: The ledger fields whose presence makes a kb_upsert be checked as sent shall be semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims
status: active
fact_kind: property_value
subject_key: mcp.kb_upsert
property_key: checked_as_sent_ledger_fields
operator: eq
value_type: set
value_set:
  - semantic_inventory_version
  - semantic_source_field
  - semantic_source_hash
  - logic_claims
claim_key: CLAIM-5519F3DAE9238E3D
claim_text: The ledger fields whose presence makes a kb_upsert be checked as sent shall be semantic_inventory_version, semantic_source_field, semantic_source_hash and logic_claims
text_ref: REQ-kb-upsert-derives-proposition-ledger
origin:
  kind: agent
  recorded_at: '2026-11-16T11:03:04.117Z'
id: FACT-kb-upsert-checked-as-sent-fields
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still lists exactly these fields.
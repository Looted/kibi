---
title: A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale
status: active
fact_kind: property_value
subject_key: kibi.staged_impact.identifiers
claim_key: CLAIM-F99938945F5E84C3
claim_text: A staged impact diagnostic shall be kibi_impact_evidence_missing or symbols_manifest_stale
text_ref: REQ-staged-impact-identifiers
property_key: diagnostic_ids
operator: eq
value_type: set
value_set:
  - kibi_impact_evidence_missing
  - symbols_manifest_stale
origin:
  kind: agent
  recorded_at: '2026-10-28T18:56:38.750Z'
id: FACT-impact-diagnostic-ids
type: fact
---
Kibi proves this claim with a certificate it re-runs against the code itself, so the claim stays proved only while the code still holds the stated value.